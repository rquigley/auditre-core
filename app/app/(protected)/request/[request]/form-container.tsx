import { revalidatePath } from 'next/cache';
import { Suspense } from 'react';
import * as z from 'zod';

import { Await } from '@/components/await';
import { getById as getDocumentById } from '@/controllers/document';
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

  let documents: Record<string, JSX.Element> = {};
  Object.keys(request.data).forEach((key) => {
    if (key.endsWith('ocumentId')) {
      const id: DocumentId = request.data[key];
      documents[key] = <DocumentCmp documentId={id} />;
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

async function DocumentCmp({ documentId }: { documentId: DocumentId }) {
  if (!documentId) {
    return null;
  }
  return (
    <Suspense fallback={'...'}>
      <Await promise={getDocumentById(documentId)}>
        {(document) => (
          <div className="text-xs">
            Doc: {documentId}
            {document.name}
          </div>
        )}
      </Await>
    </Suspense>
  );
}
