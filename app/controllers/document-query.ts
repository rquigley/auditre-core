import dedent from 'dedent';
import * as z from 'zod';

import { getById as getDocumentById } from '@/controllers/document';
import { call, DEFAULT_OPENAI_MODEL } from '@/lib/ai';
import { db } from '@/lib/db';
import { documentAiQuestions } from '@/lib/document-ai-questions';
import { requestTypes } from '@/lib/request-types';
import { delay, head, humanCase } from '@/lib/util';

import type { OpenAIMessage } from '@/lib/ai';
import type { FormField } from '@/lib/request-types';
import type {
  Document,
  DocumentId,
  DocumentQuery,
  DocumentQueryId,
  DocumentQueryUpdate,
  NewDocumentQuery,
  OpenAIModel,
} from '@/types';

export const documentClassificationTypes = [
  'AUDIT',
  'ARTICLES_OF_INCORPORATION',
  'ASC_606_ANALYSIS',
  'ASC_842_MEMO',
  'CAP_TABLE',
  'CERTIFICATE_TRANSACTION',
  'CHART_OF_ACCOUNTS',
  'DEBT_FINANCING_AGREEMENT',
  'EQUITY_FINANCING',
  'STOCK_BASED_COMPENSATION_REPORT',
  'STOCK_PLAN',
  'TRIAL_BALANCE',
  'AUDIT_YEAR_TAX_PROVISION',

  // Special types
  'UNCLASSIFIED',
  'UNKNOWN',
  'BYLAWS',
] as const;
export type DocumentClassificationType =
  (typeof documentClassificationTypes)[number];

export async function create(
  documentQuery: NewDocumentQuery,
): Promise<DocumentQuery> {
  return db
    .insertInto('documentQuery')
    .values({ ...documentQuery })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: DocumentQueryId): Promise<DocumentQuery> {
  return await db
    .selectFrom('documentQuery')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getByDocumentIdAndIdentifier(
  documentId: DocumentId,
  identifier: string,
): Promise<DocumentQuery | undefined> {
  return await db
    .selectFrom('documentQuery')
    .where('documentId', '=', documentId)
    .where('identifier', '=', identifier)
    .where('isDeleted', '=', false)
    // We only want the most recent classification
    .orderBy('createdAt', 'desc')
    .selectAll()
    .executeTakeFirst();
}

export async function pollGetByDocumentIdAndIdentifier(
  documentId: DocumentId,
  identifier: string,
): Promise<Pick<DocumentQuery, 'result' | 'isValidated'> | undefined> {
  for (let i = 0; i < 60; i++) {
    const res = await db
      .selectFrom('documentQuery')
      .select(['result', 'isValidated'])
      .where('documentId', '=', documentId)
      .where('identifier', '=', identifier)
      .where('isDeleted', '=', false)
      // We only want the most recent classification
      .orderBy('createdAt', 'desc')
      .executeTakeFirst();
    if (res) {
      return res;
    }
    await delay(1000);
    console.log(
      `pollGetByDocumentIdAndIdentifier${
        i === 59 ? ' (no response)' : ''
      }: ${documentId}, ${identifier}`,
    );
  }
  return undefined;
}

export async function getAllByDocumentId(
  documentId: DocumentId,
): Promise<DocumentQuery[]> {
  return await db
    .selectFrom('documentQuery')
    .where('documentId', '=', documentId)
    .where('isDeleted', '=', false)
    .orderBy('createdAt', 'asc')
    .selectAll()
    .execute();
}

export async function update(
  id: DocumentQueryId,
  updateWith: DocumentQueryUpdate,
) {
  return await db
    .updateTable('documentQuery')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function askQuestion({
  document,
  question,
  identifier,
  model = DEFAULT_OPENAI_MODEL,
  preProcess,
  respondInJSON,
  validate,
}: {
  document: Document;
  question: string;
  identifier?: string;
  model?: OpenAIModel;
  preProcess?: (content: string) => string;
  respondInJSON?: boolean;
  validate?: z.ZodType<any>;
}): Promise<DocumentQuery> {
  if (!document.extracted) {
    throw new Error('Document not extracted yet');
  }

  let content = document.extracted;
  if (preProcess) {
    content = preProcess(content);
  }

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: question,
    },
    { role: 'user', content: `"""${content}"""` },
  ];

  const {
    message,
    model: usedModel,
    usage,
  } = await call({
    messages,
    requestedModel: model,
    respondInJSON,
  });

  if (!identifier) {
    identifier = 'OTHER';
  }
  let result;
  let isValidated = false;
  if (validate) {
    const parseRes = validate.safeParse(message);
    if (parseRes.success) {
      isValidated = true;
      result = parseRes.data;
    } else {
      console.error(
        `askQuestion: failed validation for "${identifier}" with message "${parseRes.error.message}"`,
      );
    }
  } else {
    result = message as any;
  }

  return await create({
    documentId: document.id,
    model: usedModel,
    query: { messages },
    identifier,
    usage,
    result,
    isValidated,
  });
}

type DocumentType = {
  type: string;
  hint: string;
};
function getDocumentTypes(config: typeof requestTypes): {
  str: string;
  lookup: Record<string, string>;
} {
  const result: DocumentType[] = [];
  const lookup: Record<string, string> = {};

  requestTypes.forEach((rt) => {
    Object.values(rt.form).forEach((field: FormField) => {
      if ('aiClassificationType' in field && field.aiClassificationType) {
        const type = field.aiClassificationType;
        const hint = field.aiClassificationHint || humanCase(type);
        result.push({ type, hint });
        lookup[type] = hint;
      }
    });
  });

  // Types we want to ignore but are included to prevent misclassification of other types
  result.push({
    type: 'BYLAWS',
    hint: 'Bylaws. This document identifies the board of directors, committees, officers, and voting for the business.',
  });
  lookup['BYLAWS'] = '--IGNORE--';

  // Default type
  result.push({ type: 'UNKNOWN', hint: 'Unknown' });
  lookup['UNKNOWN'] = 'Unknown';

  return {
    str: result.map((r) => `- ${r.type}: ${r.hint}`).join('\n'),
    lookup,
  };
}

const documentTypes = getDocumentTypes(requestTypes);

export async function classifyDocument(
  document: Document,
): Promise<DocumentClassificationType> {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: dedent`
      You are a CPA. You are tasked with looking at content that includes a "filename: [e.g. filename.doc]", and text (delimited by triple quotes).
      You will classify it as a type of document. To help you, I'm providing types along with a description of each type of document
        - [identifier]: [type of content along with a description]

      Here are the document types:
      ${documentTypes.str}

        Attempt to identify it as one of the listed types. Return the [identifier] e.g. if the content can be identified along with your reasoning within parenthesis like
        \`\`\`
        STOCK_PLAN (The document is a stock option plan because it includes a breakdown of the number of shares, the vesting schedule, and the exercise price)
        \`\`\`
        If it cannot be identifed with confidence, return UNKNOWN along with the reasoning like
        \`\`\`
        UNKNOWN (It appears to be an order confirmation email with details about the items purchased, shipping information, and payment details.)
        \`\`\`
    `,
    },
    {
      role: 'user',
      content: `filename: ${document.name}\n"""${head(
        document.extracted,
        300,
      )}"""`,
    },
    {
      role: 'system',
      content:
        "Does your response only include the document's type and the reasoning in parenthesis? If there is any extraneous text, remove it",
    },
  ];

  let requestedModel: OpenAIModel = DEFAULT_OPENAI_MODEL;

  const resp = await call({
    requestedModel,
    messages,
    // https://twitter.com/mattshumer_/status/1720108414049636404
    stopSequences: ['('],
  });

  const resultStr = resp.message as string;
  await create({
    documentId: document.id,
    model: resp.model,
    query: { messages },
    identifier: 'DOCUMENT_TYPE',
    usage: resp.usage,
    result: resultStr,
  });

  const [documentTypeRaw, ...reasoningA] = resultStr.split(' ');
  const documentType = documentTypeRaw.toUpperCase();
  // This only works if stopSequesnces is commented out above
  const reasoning = reasoningA.join(' ').trim() as string;
  if (documentType in documentTypes.lookup === false) {
    throw new Error('Invalid document type');
  }
  if (reasoning) {
    console.log(
      `doc_classification: classified as "${documentType}". Reasoning is: "${reasoning}"`,
    );
  } else {
    console.log(`doc_classification: classified as "${documentType}"`);
  }

  return documentType as DocumentClassificationType;
}

export async function askDefaultQuestions(document: Document): Promise<number> {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }

  const questions = documentAiQuestions[document.classifiedType];
  if (!questions || !Object.keys(questions).length) {
    return 0;
  }

  const aiPromises = Object.keys(questions).map((identifier) => {
    const obj = questions[identifier];
    if ('fn' in obj) {
      return obj.fn(document);
    } else if ('question' in obj) {
      return askQuestion({
        document,
        question: obj.question,
        model: obj.model ? (obj.model as OpenAIModel) : undefined,
        identifier,
        preProcess: obj.preProcess ? obj.preProcess : undefined,
        respondInJSON: obj.respondInJSON,
        validate: obj.validate,
      });
    } else {
      throw new Error('Invalid question');
    }
  });
  await Promise.allSettled(aiPromises);
  await Promise.all(aiPromises);

  return aiPromises.length;
}

type FormattedQueryDataWithLabels = Record<
  string,
  {
    value: string | undefined;
    label: string | undefined;
  }
>;
export async function getDataWithLabels(
  documentId: DocumentId,
): Promise<FormattedQueryDataWithLabels> {
  const { classifiedType } = await getDocumentById(documentId);
  const answeredQuestions = await getAllByDocumentId(documentId);
  const defaultQuestions = documentAiQuestions[classifiedType];
  if (!defaultQuestions) {
    return {};
  }
  let res: FormattedQueryDataWithLabels = {};
  Object.keys(defaultQuestions).forEach((identifier) => {
    const answered = answeredQuestions.find(
      (aq) => aq.identifier === identifier,
    );
    res[identifier] = {
      value: answered?.result,
      label: defaultQuestions[identifier].label,
    };
  });
  return res;
}

type FormattedQueryData = Record<string, string | undefined>;
export async function getData(
  documentId: DocumentId,
): Promise<FormattedQueryData> {
  const { classifiedType } = await getDocumentById(documentId);
  const answeredQuestions = await getAllByDocumentId(documentId);
  const defaultQuestions = documentAiQuestions[classifiedType];
  if (!defaultQuestions) {
    return {};
  }
  let res: FormattedQueryData = {};
  Object.keys(defaultQuestions).forEach((identifier) => {
    const answered = answeredQuestions.find(
      (aq) => aq.identifier === identifier,
    );
    res[identifier] = answered?.result;
  });

  return res;
}
