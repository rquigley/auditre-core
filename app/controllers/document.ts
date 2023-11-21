import * as Sentry from '@sentry/nextjs';

import {
  askDefaultQuestions,
  classifyDocument,
} from '@/controllers/document-query';
import { getExtractedContent, NoSuchKey } from '@/lib/aws';
import { db } from '@/lib/db';
import { delay } from '@/lib/util';
import { getAllByDocumentId } from './document-queue';

import type {
  AuditId,
  Document,
  DocumentId,
  DocumentUpdate,
  NewDocument,
  OrgId,
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

export type OrgDocument = Pick<Document, 'id' | 'createdAt' | 'name'>;
export async function getAllByOrgId(orgId: OrgId): Promise<OrgDocument[]> {
  return await db
    .selectFrom('document')
    .select(['id', 'createdAt', 'name'])
    .where('orgId', '=', orgId)
    .where('isDeleted', '=', false)
    .execute();
}

export type DocumentWithRequestData = Pick<
  Document,
  'id' | 'createdAt' | 'name' | 'key'
> & {
  requestType: string;
  requestId: string;
};
export async function getAllByAuditId(
  auditId: AuditId,
): Promise<DocumentWithRequestData[]> {
  return await db
    .selectFrom('document as d')
    .innerJoin('requestDataDocument as rdd', 'd.id', 'rdd.documentId')
    .innerJoin('requestData as rd', 'rdd.requestDataId', 'rd.id')
    .select([
      'd.id',
      'd.createdAt',
      'd.name',
      'd.key',
      'rd.requestType',
      'rd.requestId',
    ])
    .distinctOn(['rd.auditId', 'rd.requestType', 'rd.requestId'])
    .where('rd.auditId', '=', auditId)
    .orderBy(['auditId', 'requestType', 'requestId', 'createdAt desc'])
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
    let t0 = Date.now();
    let t1 = Date.now(); // for task-dependent timing
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
      // The extract lambda can take up to 60 seconds to run for especially large excel docs
      for (let i = 0; i < 60; i++) {
        await delay(1000);
        console.log(`checking for extracted content: ${Date.now() - t1}ms`);
        if (await didExtractAndUpdateContent(doc)) {
          usage.extractMs = Date.now() - t1;
          t1 = Date.now();
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
    usage.classifyMs = Date.now() - t1;
    t1 = Date.now();
    console.log('Document classified', usage);

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
    usage.askQuestionsMs = Date.now() - t1;
    t1 = Date.now();

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

// See PAGE_DELIMITER in core/ops-app/packages/extract-content-lambda/lambda_function.py
export const PAGE_DELIMITER = '-'.repeat(30) + '@@' + '-'.repeat(30);
