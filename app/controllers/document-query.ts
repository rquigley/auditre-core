import dedent from 'dedent';

import { getById as getDocumentById } from '@/controllers/document';
import { call, DEFAULT_OPENAI_MODEL } from '@/lib/ai';
import { db } from '@/lib/db';
import { documentAiQuestions } from '@/lib/document-ai-questions';
import { requestTypes } from '@/lib/request-types';
import { head, humanCase, isKey } from '@/lib/util';

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
}: {
  document: Document;
  question: string;
  identifier?: string;
  model?: OpenAIModel;
  preProcess?: (content: string) => string;
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
  });
  if (!identifier) {
    identifier = 'OTHER';
  }
  return await create({
    documentId: document.id,
    model: usedModel,
    query: { messages },
    identifier,
    usage,
    result: message,
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

export async function classifyDocument(document: Document): Promise<string> {
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

  await create({
    documentId: document.id,
    model: resp.model,
    query: { messages },
    identifier: 'DOCUMENT_TYPE',
    usage: resp.usage,
    result: resp.message,
  });

  const [documentTypeRaw, ...reasoningA] = resp.message.split(' ');
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

  return documentType as string;
}

export async function askDefaultQuestions(document: Document): Promise<number> {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }

  const config = documentAiQuestions[document.classifiedType];
  if (!config || !config.questions.length) {
    return 0;
  }

  const aiPromises = config.questions.map((obj) => {
    return askQuestion({
      document,
      question: obj.question,
      model: obj.model ? (obj.model as OpenAIModel) : undefined,
      identifier: obj.id,
      preProcess: obj.preProcess ? obj.preProcess : undefined,
    });
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
  defaultQuestions.questions.forEach((q) => {
    const answered = answeredQuestions.find((aq) => aq.identifier === q.id);
    res[q.id] = {
      value: answered?.result,
      label: q.label,
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
  defaultQuestions.questions.forEach((q) => {
    const answered = answeredQuestions.find((aq) => aq.identifier === q.id);
    res[q.id] = answered?.result;
  });

  return res;
}
