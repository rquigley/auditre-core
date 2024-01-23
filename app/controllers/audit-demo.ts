import { randomUUID } from 'node:crypto';
import { extname } from 'path';

import { createAiQuery } from '@/controllers/ai-query';
import { getById } from '@/controllers/audit';
import { create as createDocument } from '@/controllers/document';
import { saveRequestData } from '@/controllers/request';
import { getDataForRequestAttribute2 } from '@/controllers/request-data';
import {
  AIQuestion,
  AIQuestionBasic,
  AIQuestionCustom,
  AIQuestionJSON,
  documentAiQuestions,
} from '@/lib/document-ai-questions';

import type { DocumentClassificationType } from '@/controllers/document';
import type { OpenAIMessage } from '@/lib/ai';
import type { AuditId, OrgId, UserId } from '@/types';

export async function addDemoData(auditId: AuditId, actorUserId: UserId) {
  const audit = await getById(auditId);
  const orgId = audit.orgId;

  await saveRequestData({
    auditId,
    requestType: 'basic-info',
    data: {
      businessName: 'AuditRe, Inc.',
      description:
        'Audit readiness for startups and small businesses. They generate audit-ready financial statements in a matter of days instead of months – at a fraction of the cost – by bringing technology to the traditional audit process.',
      businessModels: ['SOFTWARE_AS_A_SERVICE'],
      chiefDecisionMaker: 'Jason Gordon',
    },
    actorUserId,
  });
  const existingYear = (await getDataForRequestAttribute2(
    auditId,
    'audit-info',
    'year',
  )) as string;
  await saveRequestData({
    auditId,
    requestType: 'audit-info',
    data: {
      // year might be saved at creation.
      year: existingYear,
      fiscalYearMonthEnd: '12',
      hasBeenAudited: false,
      previousAuditDocumentId: [],
    },
    actorUserId,
  });

  let docId;
  let docId2;
  docId = await createDemoDocument({
    orgId,
    filename: 'Articles-of-incorporation.pdf',
    classifiedType: 'ARTICLES_OF_INCORPORATION',
    actorUserId,
    ai: {
      incorporationDate: 'June 22, 2010',
      numberOfShares: '5000000',
      parValuePerShare: '0.00001',
      incorporationJurisdiction: 'Delaware',
    },
  });
  await saveRequestData({
    auditId,
    requestType: 'articles-of-incorporation',
    data: {
      documentId: [docId],
    },
    actorUserId,
  });

  docId = await createDemoDocument({
    orgId,
    filename: 'ASC 606 Analysis.pdf',
    classifiedType: 'ASC_606_ANALYSIS',
    actorUserId,
    ai: {},
  });
  await saveRequestData({
    auditId,
    requestType: 'revenue-recognition-policy',
    data: {
      hasCompletedASC606Analysis: false,
      asc606DocumentId: [docId],
      revenueRecognitionProcess: 'We recognize revenue by trialing...',
    },
    actorUserId,
  });

  docId = await createDemoDocument({
    orgId,
    filename: 'Equity Financing 1.pdf',
    classifiedType: 'EQUITY_FINANCING',
    actorUserId,
    ai: {},
  });
  docId2 = await createDemoDocument({
    orgId,
    filename: 'Debt Financing 1.pdf',
    classifiedType: 'DEBT_FINANCING_AGREEMENT',
    actorUserId,
    ai: {},
  });
  await saveRequestData({
    auditId,
    requestType: 'financing-documents',
    data: {
      equityFinancingDocumentIds: [docId],
      debtFinancingAgreementDocumentIds: [docId2],
    },
    actorUserId,
  });

  docId = await createDemoDocument({
    orgId,
    filename: 'ASC 842 Memo.pdf',
    classifiedType: 'ASC_842_MEMO',
    actorUserId,
    ai: {},
  });
  await saveRequestData({
    auditId,
    requestType: 'leases',
    data: {
      hasLeases: false,
      didPerformASC842Analysis: false,
      yearOfASC842Analysis: '2000',
      asc606DocumentId: [docId],
    },
    actorUserId,
  });

  docId = await createDemoDocument({
    orgId,
    filename: 'Cap Table detail.pdf',
    classifiedType: 'CAP_TABLE',
    actorUserId,
    ai: {},
  });
  docId2 = await createDemoDocument({
    orgId,
    filename: 'Certificate transaction 1.pdf',
    classifiedType: 'CERTIFICATE_TRANSACTION',
    actorUserId,
    ai: {},
  });
  let docId3 = await createDemoDocument({
    orgId,
    filename: 'Stock comp report.pdf',
    classifiedType: 'STOCK_BASED_COMPENSATION_REPORT',
    actorUserId,
    ai: {},
  });
  let docId4 = await createDemoDocument({
    orgId,
    filename: 'Stock Plan 1.pdf',
    classifiedType: 'STOCK_PLAN',
    actorUserId,
    ai: {},
  });
  await saveRequestData({
    auditId,
    requestType: 'equity',
    data: {
      capTableDetailDocumentId: [docId],
      certificateTransactionDocumentId: [docId2],
      hasEmployeeStockPlan: false,
      debtFinancingAgreementDocumentIds: [docId3],
      employeeStockPlanDocumentId: [docId4],
    },
    actorUserId,
  });

  await saveRequestData({
    auditId,
    requestType: 'material-changes-post-audit',
    data: {
      hasPostAuditChanges: false,
      postAuditChanges:
        'The following changes occured after the audit was conducted...',
    },
    actorUserId,
  });

  await saveRequestData({
    auditId,
    requestType: 'outstanding-legal-matters',
    data: {
      hasLegalMatters: false,
      legalMatters: 'The following litigation is ongoing...',
    },
    actorUserId,
  });

  await saveRequestData({
    auditId,
    requestType: 'related-party-transactions',
    data: {
      hasRelatedPartyTransactions: false,
      relatedPartyTransactions: 'The following agreements...',
    },
    actorUserId,
  });

  await saveRequestData({
    auditId,
    requestType: 'employee-401k',
    data: {
      has401K: true,
      doesMatch: true,
      pctMatch: '20',
    },
    actorUserId,
  });

  docId = await createDemoDocument({
    orgId,
    filename: 'Audit year tax.xlsx',
    classifiedType: 'AUDIT_YEAR_TAX_PROVISION',
    actorUserId,
    ai: {},
  });
  await saveRequestData({
    auditId,
    requestType: 'audit-year-tax-provision',
    data: {
      documentId: [docId],
    },
    actorUserId,
  });
}

async function createDemoDocument({
  orgId,
  filename,
  classifiedType,
  ai,
  actorUserId,
}: {
  orgId: OrgId;
  filename: string;
  classifiedType: DocumentClassificationType;
  ai?: any;
  actorUserId: UserId;
}) {
  const ext = extname(filename);
  let mimeType;
  switch (ext) {
    case '.pdf':
      mimeType = 'application/pdf';
      break;
    case '.xlsx':
    case '.xls':
      mimeType = 'application/xls';
      break;
    default:
      mimeType = 'UNKNOWN';
  }

  const documentId = randomUUID();
  const extracted = '___Extracted text___';
  const key = `${orgId}/${documentId}${ext}`;
  const doc = await createDocument({
    id: documentId,
    orgId,
    key,
    bucket: `POINT THIS TO TEMP BUCKET`,
    name: filename,
    size: 1000,
    mimeType,
    classifiedType,
    extracted,
    isProcessed: true,
    fileLastModified: new Date(),
    uploadedByUserId: actorUserId,
  });

  if (classifiedType in documentAiQuestions === false) {
    return doc.id;
  }
  const qObj = { ...documentAiQuestions[classifiedType] };
  const identifiers = Object.keys(qObj);
  for (const identifier of identifiers) {
    if ('question' in qObj[identifier] === false) {
      continue;
    }
    const aiObject = qObj[identifier] as AIQuestionBasic | AIQuestionJSON;

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: aiObject.question,
      },
      { role: 'user', content: `"""${extracted}"""` },
    ];
    if (!ai[identifier]) {
      console.error(
        `Missing demo ai answer for ${classifiedType}: ${identifier}`,
      );
    }
    await createAiQuery({
      documentId: doc.id,
      status: 'COMPLETE',
      model: 'gpt-4',
      query: { messages },
      identifier,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        timeMs: 0,
      },
      result: ai[identifier] || '',
    });
  }
  return doc.id;
}
