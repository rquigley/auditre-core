// import { inferSchema, initParser } from 'udsv';
// import { string } from 'zod';
import * as Sentry from '@sentry/node';

import { create as createMapping } from '@/controllers/account-mapping';
import { getById as getAuditById } from '@/controllers/audit';
import {
  askDefaultQuestions,
  classifyDocument,
  getByDocumentIdAndIdentifier,
} from '@/controllers/document-query';
import { getExtractedContent, NoSuchKey } from '@/lib/aws';
import { db } from '@/lib/db';
import { delay } from '@/lib/util';
import { getAllByDocumentId } from './document-queue';
import { getAllByAuditId as getAllRequestsByAuditId } from './request';

import type {
  AccountType,
  AuditId,
  Document,
  DocumentId,
  DocumentUpdate,
  NewDocument,
  OrgId,
  RequestId,
} from '@/types';

export async function create(document: NewDocument): Promise<Document> {
  return await db
    .insertInto('document')
    .values({ ...document })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: DocumentId): Promise<Document> {
  return await db
    .selectFrom('document')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getAllByOrgId(orgId: OrgId): Promise<Document[]> {
  return await db
    .selectFrom('document')
    .where('orgId', '=', orgId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export async function getAllByAuditId(auditId: AuditId): Promise<Document[]> {
  const audit = await getAuditById(auditId);
  const requests = await getAllRequestsByAuditId(auditId);
  let documents: DocumentId[] = [];
  for (const request of requests) {
    Object.keys(request.data || {}).forEach((key) => {
      if (key.indexOf('ocumentId') !== -1 && request.data[key]) {
        console.log(key, request.data[key]);
        documents.push(request.data[key]);
      }
    });
  }
  if (!documents.length) {
    return [];
  }
  return await db
    .selectFrom('document')
    .where('orgId', '=', audit.orgId)
    .where('isDeleted', '=', false)
    .where('id', 'in', documents)
    .selectAll()
    .execute();
}

export async function getAllByRequestId(
  requestId: RequestId,
): Promise<Document[]> {
  return await db
    .selectFrom('document')
    .where('requestId', '=', requestId)
    .where('isDeleted', '=', false)
    .selectAll()
    .execute();
}

export async function update(id: DocumentId, updateWith: DocumentUpdate) {
  return await db
    .updateTable('document')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export async function deleteDocument(id: DocumentId) {
  return await update(id, { isDeleted: true });
}

export async function didExtractAndUpdateContent(document: Document) {
  try {
    const content = await getExtractedContent({
      bucket: document.bucket,
      key: document.key,
    });
    await update(document.id, { extracted: content });
    return true;
  } catch (e) {
    if (e instanceof NoSuchKey) {
      return false;
    } else {
      throw e;
    }
  }
}

export async function process(id: DocumentId): Promise<void> {
  try {
    const t0 = Date.now();
    let usage = {
      extractMs: 0,
      classifyMs: 0,
      askQuestionsMs: 0,
      numQuestions: 0,
    };

    const doc = await getById(id);
    if (!doc.isProcessed) {
      await update(id, { isProcessed: false });
    }

    if (!doc.extracted) {
      for (let i = 0; i < 30; i++) {
        await delay(1000);
        console.log(`checking for extracted content: ${Date.now() - t0}ms`);
        if (await didExtractAndUpdateContent(doc)) {
          usage.extractMs = Date.now() - t0;
          break;
        }
      }
    }

    const extractedDoc = await getById(id);
    if (!extractedDoc.extracted) {
      console.log('Document process complete, no extracted content:', usage);

      await update(id, { isProcessed: true, usage });
      return;
    }

    const classifiedType = await classifyDocument(extractedDoc);
    usage.classifyMs = Date.now() - t0;

    await update(id, { classifiedType, usage });

    // don't await this
    // const extractJob = await addJob({ documentId: id, status: 'TO_EXTRACT' });
    // const askQuestionsJob = await addJob({
    //   documentId: id,
    //   status: 'TO_ASK_DEFAULT_QUESTIONS',
    // });
    // await completeJob(askQuestionsJob.id);
    const classifiedDoc = await getById(id);
    usage.numQuestions = await askDefaultQuestions(classifiedDoc);
    usage.askQuestionsMs = Date.now() - t0;

    // await completeJob(askQuestionsJob.id);
    await update(id, { isProcessed: true, usage });

    // await completeJob(askQuestionsJob.id);
    // await update(id, { isProcessed: true });
    // const docType = await getType(id);
    // // What should we do if we don't have extracted info?
    // if (docType === 'CHART_OF_ACCOUNTS') {
    //   await extractChartOfAccountsMapping(document);
    // }
    console.log('Document process complete:', usage);
    console.log(`total time: ${Date.now() - t0}ms`);
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
  }
}

export type DocumentStatus = 'COMPLETE' | 'INCOMPLETE';
export async function getStatus(
  id: DocumentId,
): Promise<{ status: DocumentStatus }> {
  const queueJobs = await getAllByDocumentId(id);
  if (queueJobs.length === 0) {
    return {
      status: 'COMPLETE',
    };
  }
  return {
    status: 'INCOMPLETE',
  };
}

export async function extractChartOfAccountsMapping(
  document: Document,
  auditId: AuditId,
) {
  if (!document.extracted) {
    return;
  }
  const mappingQuery = await getByDocumentIdAndIdentifier(
    document.id,
    'ACCOUNT_MAPPING',
  );
  if (!mappingQuery || !mappingQuery.result) {
    return;
  }

  // const accountNameColumn = await getByDocumentIdAndIdentifier(
  //   document.id,
  //   'ACCOUNT_MAPPING',
  // );
  // if (!mappingQuery || !mappingQuery.result) {
  //   return;
  // }

  // let schema = inferSchema(document.extracted);
  // let parser = initParser(schema);

  // let stringArrs = parser.stringArrs(document.extracted);

  // console.log(stringArrs);

  let mapping;
  try {
    mapping = JSON.parse(mappingQuery.result) as {
      name: string;
      type: AccountType | null;
    }[];
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('Invalid JSON');
    }
  }
  if (!mapping || !mapping.length) {
    return;
  }

  const amPromises = mapping.map(({ name, type }) => {
    return createMapping({
      documentId: document.id,
      orgId: document.orgId,
      auditId: auditId,
      accountId: name,
      accountMappedTo: type,
    });
  });

  await Promise.allSettled(amPromises);
  await Promise.all(amPromises);
}
