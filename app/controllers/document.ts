// import { inferSchema, initParser } from 'udsv';
// import { string } from 'zod';
import * as Sentry from '@sentry/node';
import retry from 'async-retry';

import { create as createMapping } from '@/controllers/account-mapping';
import {
  askDefaultQuestions,
  classifyDocument,
  getByDocumentIdAndIdentifier,
} from '@/controllers/document-query';
import { getExtractedContent } from '@/lib/aws';
import { db } from '@/lib/db';
import { addJob, completeJob, getAllByDocumentId } from './document-queue';

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

export async function extractAndUpdateContent(document: Document) {
  const content = await getExtractedContent({
    bucket: document.bucket,
    key: document.key,
  });
  if (!content) {
    throw new Error('No data found');
  }
  await update(document.id, { extracted: content });
}

export async function process(id: DocumentId): Promise<void> {
  try {
    const t0 = Date.now();

    const doc = await getById(id);
    if (!doc.isProcessed) {
      await update(id, { isProcessed: false });
    }
    if (!doc.extracted) {
      await retry(
        // TODO: bail should change to error
        async (bail) => {
          console.log(`checking for extracted content: ${Date.now() - t0}ms`);
          return await extractAndUpdateContent(doc);
        },
        {
          minTimeout: 4000,
          factor: 1.5,
          maxTimeout: 10000,
          maxRetryTime: 60000,
        },
      );
      console.log(`extract done time: ${Date.now() - t0}ms`);
    }

    const extractedDoc = await getById(id);
    if (!extractedDoc.extracted) {
      console.log('no extracted content, skipping');
      await update(id, { isProcessed: true });
      return;
    }

    const classifiedType = await classifyDocument(extractedDoc);
    await update(id, { classifiedType });
    console.log(`classify time: ${Date.now() - t0}ms`);

    // don't await this
    // const extractJob = await addJob({ documentId: id, status: 'TO_EXTRACT' });
    // const askQuestionsJob = await addJob({
    //   documentId: id,
    //   status: 'TO_ASK_DEFAULT_QUESTIONS',
    // });
    // await completeJob(askQuestionsJob.id);
    await askDefaultQuestions(extractedDoc);
    console.log('default questions asked');
    console.log(`total time: ${Date.now() - t0}ms`);
    // await completeJob(askQuestionsJob.id);
    await update(id, { isProcessed: true });

    // await completeJob(askQuestionsJob.id);
    // await update(id, { isProcessed: true });
    // const docType = await getType(id);
    // // What should we do if we don't have extracted info?
    // if (docType === 'CHART_OF_ACCOUNTS') {
    //   await extractChartOfAccountsMapping(document);
    // }
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
