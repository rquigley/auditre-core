import * as Sentry from '@sentry/nextjs';
import dedent from 'dedent';
import { revalidatePath } from 'next/cache';
import { inferSchema, initParser } from 'udsv';
import { z } from 'zod';

import {
  askQuestion,
  createAiQuery,
  getAllMostRecentByDocumentId,
} from '@/controllers/ai-query';
import { getById as getDocumentById } from '@/controllers/document';
import { call, DEFAULT_OPENAI_MODEL } from '@/lib/ai';
import { getExtractedContent, NoSuchKey } from '@/lib/aws';
import { db } from '@/lib/db';
import { documentAiQuestions } from '@/lib/document-ai-questions';
import { delay, head, humanCase } from '@/lib/util';
import { getAuditIdsForDocument } from './request-data';

import type { OpenAIMessage } from '@/lib/ai';
import type {
  AuditId,
  Document,
  DocumentId,
  DocumentUpdate,
  NewDocument,
  OpenAIModel,
  OrgId,
} from '@/types';
import type { Schema } from 'udsv';

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

export async function create(document: NewDocument) {
  return await db
    .insertInto('document')
    .values({ ...document })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getById(id: DocumentId) {
  return await db
    .selectFrom('document')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function getDocumentStatus(id: DocumentId) {
  return await db
    .selectFrom('document')
    .select(['orgId', 'isProcessed', 'classifiedType'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();
}

export async function getAllByOrgId(orgId: OrgId) {
  return await db
    .selectFrom('document')
    .select(['id', 'createdAt', 'name'])
    .where('orgId', '=', orgId)
    .where('isDeleted', '=', false)
    .execute();
}

export async function getAllByAuditId(auditId: AuditId) {
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
    let t1 = Date.now(); // for task-dependent timing
    const usage = {
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

    for (const auditId of await getAuditIdsForDocument(id)) {
      revalidatePath(`/audit/${auditId}`);
    }
  } catch (e) {
    console.log(e);
    Sentry.captureException(e);
  }
}

// See PAGE_DELIMITER in core/ops-app/packages/extract-content-lambda/lambda_function.py
export const PAGE_DELIMITER = '-'.repeat(30) + '@@' + '-'.repeat(30);

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

  const requestedModel: OpenAIModel = DEFAULT_OPENAI_MODEL;

  const resp = await call({
    requestedModel,
    messages,
    // https://twitter.com/mattshumer_/status/1720108414049636404
    stopSequences: ['('],
  });

  const resultStr = resp.message as string;
  await createAiQuery({
    documentId: document.id,
    model: resp.model,
    status: 'COMPLETE',
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

export async function askDefaultQuestions(document: Document) {
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
        respondInJSON: 'respondInJSON' in obj ? obj.respondInJSON : false,
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

export async function reAskQuestion(document: Document, identifier: string) {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }
  const questions = documentAiQuestions[document.classifiedType];
  if (!questions || !Object.keys(questions).length) {
    return 0;
  }
  const obj = questions[identifier];
  if (!obj) {
    throw new Error('Invalid question identifier');
  }
  if ('fn' in obj) {
    await obj.fn(document);
  } else if ('question' in obj) {
    await askQuestion({
      document,
      question: obj.question,
      model: obj.model ? (obj.model as OpenAIModel) : undefined,
      identifier,
      preProcess: obj.preProcess ? obj.preProcess : undefined,
      respondInJSON: 'respondInJSON' in obj ? obj.respondInJSON : false,
      validate: obj.validate,
    });
  } else {
    throw new Error('Invalid question');
  }
}

type FormattedQueryDataWithLabels = Record<
  string,
  {
    value: string | undefined;
    label: string | undefined;
    status: string | undefined;
  }
>;
export async function getAiDataWithLabels(
  documentId: DocumentId,
): Promise<FormattedQueryDataWithLabels> {
  const { classifiedType } = await getDocumentById(documentId);
  const answeredQuestions = await getAllMostRecentByDocumentId(documentId);
  const defaultQuestions = { ...documentAiQuestions[classifiedType] };
  if (classifiedType in documentAiQuestions === false) {
    return {};
  }

  const res: FormattedQueryDataWithLabels = {};
  Object.keys(defaultQuestions).forEach((identifier) => {
    const answered = answeredQuestions.find(
      (aq) => aq.identifier === identifier,
    );
    res[identifier] = {
      label: defaultQuestions[identifier].label,
      status: answered?.status || 'PENDING',
      value: answered?.result || '',
    };
  });
  return res;
}

export async function getAiDataForDocumentId(documentId: DocumentId) {
  const { classifiedType } = await getDocumentById(documentId);

  const answeredQuestions = (
    await getAllMostRecentByDocumentId(documentId)
  ).filter((row) => row.status === 'COMPLETE' && row.isValidated);

  const defaultQuestions = { ...documentAiQuestions[classifiedType] };
  const res: Record<string, string> = {};
  Object.keys(defaultQuestions).forEach((identifier) => {
    const answered = answeredQuestions.find(
      (aq) => aq.identifier === identifier,
    );
    res[identifier] = answered?.result || '';
  });

  return res;
}

function parseSheet(sheet: string) {
  sheet = sheet.trim();
  if (!sheet) {
    return undefined;
  }

  let sheetTitle;
  let csvRaw;

  // CSV files will lack the "META:" line
  if (sheet.startsWith('META:')) {
    const lines = sheet.split('\n');
    const metaLine = lines.shift();
    csvRaw = lines.join('\n');

    if (!metaLine) {
      throw new Error('No meta line');
    }
    const meta = JSON.parse(metaLine.slice(5));
    const metaSchema = z.object({
      sheetTitle: z.string(),
    });
    const parsed = metaSchema.parse(meta);
    sheetTitle = parsed.sheetTitle;
  } else {
    sheetTitle = '';
    csvRaw = sheet;
  }

  // udsv will choke if there's no newline at the end of the file
  if (!csvRaw.includes('\n')) {
    csvRaw += '\n';
  }

  const headerRowNum = findHeaderRow(csvRaw);
  csvRaw = csvRaw.split('\n').slice(headerRowNum).join('\n');

  const schema = inferSchema(csvRaw);
  const parser = initParser(schema);
  const rows = parser.stringArrs(csvRaw);

  return { sheetTitle, schema, rows };
}

export function getSheetData(document: Document) {
  if (!document.extracted) {
    throw new Error('Document has no extracted content');
  }
  const sheets = document.extracted.split(PAGE_DELIMITER);

  return sheets.map(parseSheet).filter(Boolean);
}

/**
 * Find the header row number. Use the following:
 * - Look for informative column names e.g. credit/debit.
 * - If 70% of cols have a value, assume it's the header row.
 **/
function findHeaderRow(csvRaw: string, currRow = 0): number {
  const schema = inferSchema(csvRaw);
  if (
    schema.cols.some(
      (c) =>
        c.name.toLowerCase() === 'credit' || c.name.toLowerCase() === 'debit',
    )
  ) {
    return currRow;
  }

  const count = schema.cols.filter((c) => c.name !== '').length;
  if (count / schema.cols.length > 0.7) {
    return currRow;
  } else {
    csvRaw = csvRaw.split('\n').slice(1).join('\n');
    // we're at the end of the file, give up.
    if (!csvRaw.includes('\n')) {
      return 0;
    }
    return findHeaderRow(csvRaw, currRow + 1);
  }
}

export function getColumnMap(
  schema: Schema,
  map: Record<string, RegExp | string>,
) {
  const ret = Object.fromEntries(Object.keys(map).map((k) => [k, -1]));
  for (const [key, needle] of Object.entries(map)) {
    ret[key] = schema.cols.findIndex((col) =>
      col.name.toLowerCase().match(needle),
    );
  }

  return ret;
}
