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

export const documentClassificationTypes = {
  AUDIT: '',
  ARTICLES_OF_INCORPORATION: '',
  ASC_606_ANALYSIS:
    'Asc 606 analysis. This document identifies five different steps – 1. Identify the contract with a customer, 2. Identify the performance obligations of the contract, 3. Determine the transaction price, 4. Allocate the transaction price, and 5. Recognize revenue when the entity satisfies a performance obligations.',
  ASC_842_MEMO:
    'ASC 842 memo. This document identifies leases and states “ASC 842” within the document.',
  CAP_TABLE:
    'Cap table. The cap table will itemize the number of shares by shareholder. The shares are typically identified as common or preferred shares.',
  CERTIFICATE_TRANSACTION:
    'Certificate transaction. The certificate transaction report will itemize the share count, cost, and unique identifier for each shareholder.',
  CHART_OF_ACCOUNTS:
    'chart of accounts aka a complete listing, by category, of every account in the general ledger of a company. It can include an account name, identifier, account type, additional description, and sometimes the total balance for that account.',
  DEBT_FINANCING_AGREEMENT: 'Debt financing agreements',
  EQUITY_FINANCING: 'Equity financing documents',
  STOCK_BASED_COMPENSATION_REPORT: '',
  STOCK_PLAN:
    'Stock option plan & amendments. This includes the terms and definitions of stated with an equity incentive plan.',
  TRIAL_BALANCE: '',
  AUDIT_YEAR_TAX_PROVISION: '',

  // Types we want to ignore but are included to prevent misclassification of other types
  BYLAWS:
    'Bylaws. This document identifies the board of directors, committees, officers, and voting for the business.',

  // Special types
  UNCLASSIFIED: '', // Set on document creation. Postgres default value
  UNKNOWN: '', // Set by AI if it can't classify
} as const;
export type DocumentClassificationType =
  keyof typeof documentClassificationTypes;

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

export async function classifyDocument(
  document: Document,
): Promise<DocumentClassificationType> {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }

  let documentTypeStr: string = '';
  for (const type of Object.keys(
    documentClassificationTypes,
  ) as DocumentClassificationType[]) {
    const hint = documentClassificationTypes[type] || humanCase(type);
    documentTypeStr += `- ${type}: ${hint}\n`;
  }

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: dedent`
      You are a CPA. You are tasked with looking at content that includes a "filename: [e.g. filename.doc]", and text (delimited by triple quotes).
      You will classify it as a type of document. To help you, I'm providing types along with a description of each type of document
        - [identifier]: [type of content along with a description]

      Here are the document types:
      ${documentTypeStr}

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
  if (documentType in documentClassificationTypes === false) {
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
