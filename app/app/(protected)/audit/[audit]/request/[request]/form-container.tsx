import { revalidatePath, revalidateTag } from 'next/cache';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Await } from '@/components/await';
import { Document } from '@/components/document';
import { MiniSpinner } from '@/components/spinner';
import {
  getAiDataWithLabels,
  getById as getDocumentById,
} from '@/controllers/document';
import { setKV } from '@/controllers/kv';
import { saveRequestData } from '@/controllers/request';
import { getDataForRequestType } from '@/controllers/request-data';
import { getCurrent } from '@/controllers/session-user';
import { extractTrialBalance } from '@/lib/actions';
import { FormField, isFormFieldFile } from '@/lib/request-types';
import { BasicForm } from './basic-form';
import { TrialBalance } from './trial-balance/trial-balance';

import type { Props as BasicFormProps } from './basic-form';
import type { Request } from '@/controllers/request';
import type { AuditId, DocumentId, OrgId, UserId } from '@/types';

type Props = {
  request: Request;
  userId: UserId;
  auditId: AuditId;
  orgId: OrgId;
};

export default async function FormContainer({
  request,
  userId,
  auditId,
  orgId,
}: Props) {
  async function saveData(data: Record<string, FormField['defaultValue']>) {
    'use server';

    const { user } = await getCurrent();
    if (!user) {
      return notFound();
    }

    await saveRequestData({
      auditId: auditId,
      requestType: request.id,
      data: data,
      actorUserId: userId,
    });

    let postSaveAction;
    if (request.id === 'trial-balance') {
      postSaveAction = 'trial-balance';
      await setKV({
        orgId,
        auditId,
        key: 'tb-to-process-total',
        value: -1,
      });
      // Kick off extraction. Don't await this
      extractTrialBalance(auditId);
    }

    revalidatePath(`/audit/${auditId}/request/${request.id}`);
    // audit-info.year is cached for the audit header
    revalidateTag('client-audit');

    return { data, postSaveAction };
  }

  const { data: requestData, uninitializedFields } =
    await getDataForRequestType(auditId, request);

  let documents: BasicFormProps['documents'] = {};
  for (const field of Object.keys(requestData)) {
    if (!isFormFieldFile(request.form[field])) {
      continue;
    }
    const fieldData = requestData[field] as DocumentId[];
    documents[field] = fieldData.map((id: DocumentId) => ({
      id,
      doc: <AwaitDocument documentId={id} />,
      data: <DocumentData documentId={id} />,
    }));
  }

  let secondaryCmp;
  if (request.id === 'trial-balance') {
    secondaryCmp = <TrialBalance auditId={auditId} />;
  } else {
    secondaryCmp = null;
  }
  return (
    <>
      <BasicForm
        auditId={auditId}
        request={request}
        requestData={requestData}
        dataMatchesConfig={uninitializedFields.length === 0}
        saveData={saveData}
        documents={documents}
      />
      {secondaryCmp ? (
        <Suspense fallback={null}>{secondaryCmp}</Suspense>
      ) : null}
    </>
  );
}

function AwaitDocument({ documentId }: { documentId: DocumentId }) {
  if (!documentId) {
    return null;
  }
  return (
    <Suspense fallback={<div className="h-12 flex items-center"></div>}>
      <Await promise={getDocumentById(documentId)}>
        {(d) => (
          <Document documentId={documentId} docKey={d.key} name={d.name} />
        )}
      </Await>
    </Suspense>
  );
}

function DocumentData({ documentId }: { documentId: string }) {
  if (!documentId) {
    return null;
  }
  return (
    <>
      {/* <span className="text-xs leading-5 text-gray-600">
        Extracted document data
      </span> */}
      <div className="text-xs leading-5 text-gray-600">
        <Suspense fallback={null}>
          <Await promise={getAiDataWithLabels(documentId)}>
            {(data) => (
              <div>
                {Object.keys(data).map((identifier) => (
                  <DataRow
                    key={identifier}
                    identifier={identifier}
                    data={data[identifier]}
                  />
                ))}
              </div>
            )}
          </Await>
        </Suspense>
      </div>
    </>
  );
}

function DataRow({
  identifier,
  data,
}: {
  identifier: string;
  data: {
    value: string | undefined;
    label: string | undefined;
    status: string | undefined;
  };
}) {
  if (!data.label) {
    return null;
  }
  return (
    <div className="mb-2">
      <div className="text-xs leading-5 font-semibold text-gray-600">
        {data.label}
      </div>
      <p className="text-xs leading-5 text-gray-600">
        {data.status === 'PENDING' ? <MiniSpinner /> : data.value}
      </p>
    </div>
  );
}
