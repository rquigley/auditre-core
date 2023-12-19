import dedent from 'dedent';
import * as z from 'zod';

import { call, DEFAULT_OPENAI_MODEL } from '@/lib/ai';
import { db, sql } from '@/lib/db';
import { delay } from '@/lib/util';

import type { OpenAIMessage } from '@/lib/ai';
import type { AIQuestion } from '@/lib/document-ai-questions';
import type {
  AiQuery,
  AiQueryId,
  AiQueryUpdate,
  Document,
  DocumentId,
  NewAiQuery,
  OpenAIModel,
} from '@/types';

export async function createAiQuery(aiQuery: NewAiQuery): Promise<AiQuery> {
  return db
    .insertInto('aiQuery')
    .values({ ...aiQuery })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateAiQuery(id: AiQueryId, updateWith: AiQueryUpdate) {
  return await db
    .updateTable('aiQuery')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function getById(id: AiQueryId): Promise<AiQuery> {
  return await db
    .selectFrom('aiQuery')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getByDocumentIdAndIdentifier(
  documentId: DocumentId,
  identifier: string,
): Promise<AiQuery | undefined> {
  return await db
    .selectFrom('aiQuery')
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
): Promise<Pick<AiQuery, 'result' | 'isValidated'> | undefined> {
  for (let i = 0; i < 60; i++) {
    const res = await db
      .selectFrom('aiQuery')
      .select(['result', 'isValidated', 'status'])
      .where('documentId', '=', documentId)
      .where('identifier', '=', identifier)
      .where('isDeleted', '=', false)
      // Do not include status check. We want the most recent classification, regardless.
      .orderBy('createdAt', 'desc')
      .limit(1)
      .executeTakeFirst();
    if (res && res.status === 'COMPLETE') {
      return {
        result: res.result,
        isValidated: res.isValidated,
      };
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
): Promise<AiQuery[]> {
  return await db
    .selectFrom('aiQuery')
    .where('documentId', '=', documentId)
    .where('isDeleted', '=', false)
    .orderBy('createdAt', 'asc')
    .selectAll()
    .execute();
}

export async function getAllStatusByDocument(documentId: DocumentId) {
  return (await getAllMostRecentByDocumentId(documentId)).map((row) => ({
    identifier: row.identifier,
    status: row.status,
    isValidated: row.isValidated,
  }));
}

export async function getAllMostRecentByDocumentId(
  documentId: DocumentId,
): Promise<
  Pick<AiQuery, 'identifier' | 'isValidated' | 'result' | 'status'>[]
> {
  // TODO This should factor in status = 'COMPLETE'
  const subQuery = db
    .selectFrom('aiQuery')
    .select([
      'identifier',
      'result',
      'isValidated',
      'status',
      sql`row_number() over (partition by identifier order by created_at desc)`.as(
        'rn',
      ),
    ])
    .where('documentId', '=', documentId)
    .where('isDeleted', '=', false)
    .where('identifier', '!=', 'DOCUMENT_TYPE')
    .as('subquery');

  const mostRecentRows = await db
    .selectFrom(subQuery)
    .select(['identifier', 'isValidated', 'result', 'status'])
    .where('rn', '=', 1)
    .execute();

  return mostRecentRows;
}

export async function update(id: AiQueryId, updateWith: AiQueryUpdate) {
  return await db
    .updateTable('aiQuery')
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
}): Promise<AiQuery> {
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

  if (!identifier) {
    identifier = 'OTHER';
  }

  const aiQuery = await createAiQuery({
    documentId: document.id,
    model,
    status: 'PENDING',
    query: { messages },
    identifier,
  });

  const {
    message,
    model: usedModel,
    usage,
  } = await call({
    messages,
    requestedModel: model,
    respondInJSON,
  });

  // TODO deal with error

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

  await updateAiQuery(aiQuery.id, {
    model: usedModel,
    status: 'COMPLETE',
    usage,
    result,
    isValidated,
    answeredAt: new Date(),
  });
  return await getById(aiQuery.id);
}
