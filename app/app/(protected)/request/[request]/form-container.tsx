import { revalidatePath } from 'next/cache';
import { Suspense } from 'react';
import * as z from 'zod';

import { Await } from '@/components/await';
import { Document } from '@/components/document';
import { getById as getDocumentById } from '@/controllers/document';
import { getData } from '@/controllers/document-query';
import { updateData } from '@/controllers/request';
import { requestTypes } from '@/lib/request-types';
import { clientSafe } from '@/lib/util';
import BasicForm from './basic-form';

import type {
  Audit,
  ClientSafeRequest,
  DocumentId,
  Request,
  User,
} from '@/types';

type Props = {
  request: Request;
  user: User;
  audit: Audit;
};

export default async function FormContainer({ request, user, audit }: Props) {
  const requestConfig = requestTypes[request.type];
  const formSchema = requestConfig.schema;

  async function saveData(data: z.infer<typeof formSchema>) {
    'use server';

    await updateData({
      id: request.id,
      data,
      actor: {
        type: 'USER',
        userId: user.id,
      },
      type: request.type,
    });

    revalidatePath(`/request/${request.id}`);
  }

  let documents: Record<
    string,
    { id: DocumentId; doc: JSX.Element; data: JSX.Element }
  > = {};
  Object.keys(request.data).forEach((key) => {
    if (key.endsWith('ocumentId')) {
      const id: DocumentId = request.data[key];
      documents[key] = {
        id,
        doc: <AwaitDocument documentId={id} />,
        data: <DocumentData documentId={id} />,
      };
    }
  });

  return (
    <BasicForm
      request={clientSafe(request) as ClientSafeRequest}
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
        {(d) => <Document docKey={d.key} name={d.name} />}
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
          <Await promise={getData(documentId)}>
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
