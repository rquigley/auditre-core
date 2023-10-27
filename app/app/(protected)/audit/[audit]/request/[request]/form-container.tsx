import { revalidatePath } from 'next/cache';
import { Suspense } from 'react';

import { Await } from '@/components/await';
import { Document } from '@/components/document';
import { getById as getDocumentById } from '@/controllers/document';
import { getDataWithLabels } from '@/controllers/document-query';
import { saveRequestData } from '@/controllers/request';
import { getDataForRequestType } from '@/controllers/request-data';
import { BasicForm } from './basic-form';

import type { Props as BasicFormProps } from './basic-form';
import type { Request } from '@/controllers/request';
import type { Audit, DocumentId, User } from '@/types';

type Props = {
  request: Request;
  user: User;
  audit: { id: Audit['id'] };
};

export default async function FormContainer({ request, user, audit }: Props) {
  async function saveData(data: Record<string, unknown>) {
    'use server';

    await saveRequestData({
      auditId: audit.id,
      requestType: request.id,
      data: data,
      actorUserId: user.id,
    });

    revalidatePath(`/audit/${audit.id}/request/${request.id}`);
  }

  const { data: requestData, uninitializedFields } =
    await getDataForRequestType(request.auditId, request);

  let documents: BasicFormProps['documents'] = {};
  for (const field of Object.keys(requestData)) {
    if (
      typeof requestData[field] !== 'object' ||
      requestData[field] === null ||
      // @ts-expect-error
      !requestData[field].isDocuments
    ) {
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

  return (
    <BasicForm
      request={request}
      requestData={requestData}
      dataMatchesConfig={uninitializedFields.length === 0}
      saveData={saveData}
      documents={documents}
    />
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
      <span className="text-xs font-semibold leading-5 text-gray-600">
        Extracted document data
      </span>
      <div className="text-xs leading-5 text-gray-600">
        <Suspense fallback={null}>
          <Await promise={getDataWithLabels(documentId)}>
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
  data: { value: string | undefined; label: string | undefined };
}) {
  if (!data.label) {
    return null;
  }
  return (
    <div className="flex items-center justify-between">
      {/* <span className="text-xs leading-5 text-gray-600 hover:text-gray-800 hover:underline cursor-pointer"> */}
      <span className="text-xs leading-5 text-gray-600">{data.label}</span>
      <p className="text-xs leading-5 text-gray-600">{data.value}</p>
    </div>
  );
}
