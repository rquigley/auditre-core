import { stripIndent } from 'common-tags';

import { call, askQuestion as OpenAIAskQuestion } from '@/lib/ai';
import { db } from '@/lib/db';
import { requestTypes } from '@/lib/request-types';
import { head } from '@/lib/util';

import type { OpenAIMessage } from '@/lib/ai';
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
  model = 'gpt-3.5-turbo',
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

export const documentTypes = {
  ARTICLES_OF_INCORPORATION: 'Articles of Incorporation',
  BYLAWS: 'Company Bylaws (but NOT the Board Approval)',
  TRIAL_BALANCE: 'Trial Balance',
  CHART_OF_ACCOUNTS:
    'Chart of Accounts aka a complete listing, by category, of every account in the general ledger of a company. It can include an account name, identifier, account type, additional description, and sometimes the total balance for that account.',
  STOCK_PLAN:
    'Stock Option Plan & Amendments. This might include the issuance of stock to founders, employees, or investors.',
  UNKNOWN: 'Unknown',
} as const;
export type DocumentType = keyof typeof documentTypes;

export async function classifyDocument(
  document: Document,
): Promise<DocumentType> {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: stripIndent`
      You are a CPA. You are tasked with looking at content that includes a "filename: [e.g. filename.doc]", and text (delimited by triple quotes).
      You will classify it as a type of document. To help you, I'm providing types along with a description of each type of document
        - [identifier]: [type of content along with a description]

      Here are the document types:
      ${Object.entries(documentTypes)
        .map(([identifier, description]) => `- ${identifier}: ${description}`)
        .join('\n')}

        Attempt to identify it as one of the listed types. Return the [identifier] e.g. if the content can be identified e.g. "Stock Option Plan & Amendments" returns "STOCK_PLAN"
        If it cannot be identifed with confidence, return UNKNOWN
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
        "Does your response only include the document's type? If there is any extraneous text, remove it",
    },
  ];

  const resp = await call({
    requestedModel: 'gpt-3.5-turbo',
    messages,
  });

  await create({
    documentId: document.id,
    model: resp.model,
    query: { messages },
    identifier: 'DOCUMENT_TYPE',
    usage: resp.usage,
    result: resp.message,
  });

  if (resp.message in documentTypes === false) {
    throw new Error(`Invalid document type ${resp.message}`);
  }

  return resp.message as DocumentType;
}

export async function askDefaultQuestions(document: Document) {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }

  let questions = [];
  if (
    document.classifiedType === 'ARTICLES_OF_INCORPORATION' &&
    requestTypes.ARTICLES_OF_INCORPORATION.form.documentId.extractionQuestions
  ) {
    questions.push(
      ...requestTypes.ARTICLES_OF_INCORPORATION.form.documentId
        .extractionQuestions,
    );
  } else if (
    document.classifiedType === 'CHART_OF_ACCOUNTS' &&
    requestTypes.CHART_OF_ACCOUNTS.form.documentId.extractionQuestions
  ) {
    questions.push(
      ...requestTypes.CHART_OF_ACCOUNTS.form.documentId.extractionQuestions,
    );
  } else if (
    document.classifiedType === 'TRIAL_BALANCE' &&
    requestTypes.TRIAL_BALANCE.form.documentId.extractionQuestions
  ) {
    questions.push(
      ...requestTypes.TRIAL_BALANCE.form.documentId.extractionQuestions,
    );
  }
  const aiPromises = questions.map((obj) =>
    askQuestion({
      document,
      question: obj.question,
      // @ts-ignore
      model: obj.model ? obj.model : undefined,
      identifier: obj.identifier,
      // @ts-ignore
      preProcess: obj.preProcess ? obj.preProcess : undefined,
    }),
  );
  await Promise.allSettled(aiPromises);
  await Promise.all(aiPromises);
}
