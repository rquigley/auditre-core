// import { string } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { inferSchema, initParser } from 'udsv';

import { createAccountMapping } from '@/controllers/account-mapping';
import {
  askDefaultQuestions,
  classifyDocument,
  getByDocumentIdAndIdentifier,
} from '@/controllers/document-query';
import { getExtractedContent, NoSuchKey } from '@/lib/aws';
import { db } from '@/lib/db';
import { delay } from '@/lib/util';
import { getAllByDocumentId } from './document-queue';

import type {
  AccountType,
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
      // The extract lambda can take up to 60 seconds to run for especially large excel docs
      for (let i = 0; i < 60; i++) {
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

// See PAGE_DELIMITER in core/ops-app/packages/extract-content-lambda/lambda_function.py
const PAGE_DELIMITER = '-'.repeat(30) + '@@' + '-'.repeat(30);

function getSheetData(document: Document) {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }
  let sheets = document.extracted.split(PAGE_DELIMITER);
  let csvData;
  let meta;
  if (sheets.length === 1) {
    // This is a CSV
    csvData = sheets[0];
    meta = {};
  } else {
    sheets = sheets.slice(1);
    const lines = sheets[0].trim().split('\n');
    const metaLine = lines[0];
    if (metaLine.slice(0, 5) !== 'META:') {
      throw new Error('Line 1 must be meta data');
    }
    meta = JSON.parse(metaLine.slice(5));
    csvData = lines.slice(1).join('\n');
  }

  const schema = inferSchema(csvData);
  const colIdxs = getColIdxs(schema);

  const parser = initParser(schema);
  const rows = parser.stringArrs(csvData);

  return { meta, colIdxs, rows };
}

function getColIdxs(schema: ReturnType<typeof inferSchema>) {
  if ('cols' in schema === false) {
    throw new Error('Invalid schema');
  }
  const cols = schema.cols;
  // TODO
  return {
    accountNumber: 0,
    accountName: 1,
  };
}

export async function extractChartOfAccountsMapping(
  documentId: DocumentId,
  auditId: AuditId,
) {
  const document = await getById(documentId);

  if (document.classifiedType !== 'CHART_OF_ACCOUNTS') {
    throw new Error('Invalid classified type');
  }

  const { meta, rows, colIdxs } = getSheetData(document);

  let insertP = [];
  for (const row of rows) {
    const accountNumber = row[colIdxs.accountNumber];
    const accountName = row[colIdxs.accountName];
    if (!accountNumber || !accountName) {
      continue;
    }
    insertP.push(
      createAccountMapping({
        auditId: auditId,
        accountNumber,
        accountName,
        documentId: document.id,
      }),
    );
  }
  await Promise.allSettled(insertP);
  await Promise.all(insertP);
  // return;
  // const mappingQuery = await getByDocumentIdAndIdentifier(
  //   document.id,
  //   'ACCOUNT_MAPPING',
  // );
  // if (!mappingQuery || !mappingQuery.result) {
  //   return;
  // }

  // // const accountNameColumn = await getByDocumentIdAndIdentifier(
  // //   document.id,
  // //   'ACCOUNT_MAPPING',
  // // );
  // // if (!mappingQuery || !mappingQuery.result) {
  // //   return;
  // // }

  // // let schema = inferSchema(document.extracted);
  // // let parser = initParser(schema);

  // // let stringArrs = parser.stringArrs(document.extracted);

  // // console.log(stringArrs);

  // let mapping;
  // try {
  //   mapping = JSON.parse(mappingQuery.result) as {
  //     name: string;
  //     type: AccountType | null;
  //   }[];
  // } catch (e) {
  //   if (e instanceof SyntaxError) {
  //     throw new Error('Invalid JSON');
  //   }
  // }
  // if (!mapping || !mapping.length) {
  //   return;
  // }

  // const amPromises = mapping.map(({ name, type }) => {
  //   return createMapping({
  //     documentId: document.id,
  //     // orgId: document.orgId,
  //     auditId: auditId,
  //     accountId: name,
  //     accountType: type,
  //   });
  // });

  // await Promise.allSettled(amPromises);
  // await Promise.all(amPromises);
}
