import { db } from '@/lib/db';
import type {
  DocumentQueryUpdate,
  DocumentQuery,
  DocumentQueryId,
  DocumentQueryResult,
  NewDocumentQuery,
  DocumentId,
  Document,
  OpenAIModel,
} from '@/types';
import { askQuestion as OpenAIAskQuestion } from '@/lib/ai';
import { requestTypes } from '@/lib/request-types';

export function create(
  documentQuery: NewDocumentQuery,
): Promise<DocumentQuery> {
  return db
    .insertInto('documentQuery')
    .values({ ...documentQuery })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: DocumentQueryId): Promise<DocumentQuery> {
  return db
    .selectFrom('documentQuery')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

// export function getByDocumentIdAndIdentifier(
//   documentId: DocumentId,
//   identifier: string,
// ): Promise<DocumentQuery> {
//   return db
//     .selectFrom('documentQuery')
//     .where('documentId', '=', documentId)
//     .where('identifier', '=', identifier)
//     .where('isDeleted', '=', false)
//     .selectAll()
//     .executeTakeFirstOrThrow();
// }

export function getAllByDocumentId(
  documentId: DocumentId,
): Promise<DocumentQuery[]> {
  return db
    .selectFrom('documentQuery')
    .where('documentId', '=', documentId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export function update(id: DocumentQueryId, updateWith: DocumentQueryUpdate) {
  return db
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
}: {
  document: Document;
  question: string;
  identifier?: string;
  model?: OpenAIModel;
}): Promise<DocumentQuery> {
  if (!document.extracted) {
    throw new Error('Document not extracted yet');
  }

  const {
    message,
    model: usedModel,
    usage,
  } = await OpenAIAskQuestion({
    question,
    content: document.extracted,
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
    question: `Here are a number of types of content along with an identifier string in the format of
  [type of content]: [identifer]:
  - Articles of Incorporation: ARTICLES_OF_INCORPORATION
  - Company Bylaws (but NOT the Board Approval): BYLAWS
  - Trial Balance: TRIAL_BALANCE
  - The complete listing, by category, of every account in the general ledger of a company: CHART_OF_ACCOUNTS
  - Stock Option Plan & Amendments: STOCK_PLAN

  For the following content, attempt to identify it as one of the listed types. Return the [identifier] e.g.
  if the content can be identified as "Stock Option Plan & Amendments" return "STOCK_PLAN"
  If it cannot be identifed with confidence, return UNKNOWN
  `,
    identifier: 'DOCUMENT_TYPE',
  });
  if (typeQuestion.result?.content === 'ARTICLES_OF_INCORPORATION') {
    const questions =
      requestTypes.ARTICLES_OF_INCORPORATION.form.value.extractionQuestions;
    const aiPromises = questions.map((obj) =>
      askQuestion({
        document,
        question: obj.question,
        // @ts-ignore - we don't yet have one defined and it's not typed
        model: obj.model ? obj.model : undefined,
        identifier: obj.identifier,
      }),
    );
    await Promise.allSettled(aiPromises);
    await Promise.all(aiPromises);
  }
}
