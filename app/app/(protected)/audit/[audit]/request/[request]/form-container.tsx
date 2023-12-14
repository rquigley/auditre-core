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
import { saveRequestData } from '@/controllers/request';
import { getDataForRequestType } from '@/controllers/request-data';
import { getCurrent } from '@/controllers/session-user';
import { BasicForm } from './basic-form';
import { TrialBalance } from './trial-balance/trial-balance';

import type { Props as BasicFormProps } from './basic-form';
import type { Request } from '@/controllers/request';
import type { AuditId, DocumentId, UserId } from '@/types';

type Props = {
  request: Request;
  userId: UserId;
  auditId: AuditId;
};

export default async function FormContainer({
  request,
  userId,
  auditId,
}: Props) {
  async function saveData(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
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

    revalidatePath(`/audit/${auditId}/request/${request.id}`);
    // audit-info.year is cached for the audit header
    revalidateTag('client-audit');

    return data;
  }

  const { data: requestData, uninitializedFields } =
    await getDataForRequestType(auditId, request);

  let documents: BasicFormProps['documents'] = {};
  for (const field of Object.keys(requestData)) {
    // @ts-expect-error
    if (!requestData[field]?.isDocuments) {
      continue;
    }
    const data = requestData[field] as {
      documentIds: DocumentId[];
      isDocuments: true;
    };

    documents[field] = data.documentIds.map((id: DocumentId) => ({
      id,
      doc: <AwaitDocument documentId={id} />,
      data: <DocumentData documentId={id} />,
    }));
  }

  let secondaryCmp;
  let postSaveAction;
  if (request.id === 'trial-balance') {
    secondaryCmp = <TrialBalance auditId={auditId} />;
    postSaveAction = 'trial-balance';
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
        postSaveAction={postSaveAction}
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
