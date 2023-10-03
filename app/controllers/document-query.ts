import { stripIndent } from 'common-tags';

import { askQuestion as OpenAIAskQuestion } from '@/lib/ai';
import { db } from '@/lib/db';
import { requestTypes } from '@/lib/request-types';

import type {
  Document,
  DocumentId,
  DocumentQuery,
  DocumentQueryId,
  DocumentQueryResult,
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
  model,
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

  const {
    message,
    model: usedModel,
    usage,
  } = await OpenAIAskQuestion({
    question,
    content,
    model,
  });
  if (!identifier) {
    identifier = 'OTHER';
  }
  return await create({
    documentId: document.id,
    model: usedModel,
    query: question,
    identifier,
    usage,
    result: message as DocumentQueryResult,
  });
}

export async function askDefaultQuestions(document: Document) {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }
  const typeQuestion = await askQuestion({
    document,
    question: stripIndent`
  You are an auditer, CPA, or lawyer. You are tasked with looking at some content and classifying it as a type of document. To help you, I'm providing types along with a description of each type of document
    - [identifier]: [type of content along with a description]
  
  Here are the document types:
    - ARTICLES_OF_INCORPORATION: Articles of Incorporation
    - BYLAWS: Company Bylaws (but NOT the Board Approval)
    - TRIAL_BALANCE: Trial Balance
    - CHART_OF_ACCOUNTS: Chart of Accounts aka a complete listing, by category, of every account in the general ledger of a company. It can include an account name, identifier, account type, additional description, and sometimes the total balance for that account.
    - STOCK_PLAN: Stock Option Plan & Amendments. This might include the issuance of stock to founders, employees, or investors.

    For the following content to classify, attempt to identify it as one of the listed types. Return the [identifier] e.g. if the content can be identified as "Stock Option Plan & Amendments" return "STOCK_PLAN"
    If it cannot be identifed with confidence, return UNKNOWN
  `,
    identifier: 'DOCUMENT_TYPE',
  });
  let questions = [];
  if (typeQuestion.result?.content === 'ARTICLES_OF_INCORPORATION') {
    questions.push(
      ...requestTypes.ARTICLES_OF_INCORPORATION.form.value.extractionQuestions,
    );
  } else if (typeQuestion.result?.content === 'CHART_OF_ACCOUNTS') {
    questions.push(
      ...requestTypes.CHART_OF_ACCOUNTS.form.value.extractionQuestions,
    );
  } else if (typeQuestion.result?.content === 'TRIAL_BALANCE') {
    questions.push(
      ...requestTypes.TRIAL_BALANCE.form.value.extractionQuestions,
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
