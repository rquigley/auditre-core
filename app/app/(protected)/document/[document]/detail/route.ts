import { notFound } from 'next/navigation';

import { getById } from '@/controllers/document';
import { getDataWithLabels } from '@/controllers/document-query';
import { getCurrent } from '@/controllers/session-user';
import { getById as getUserById } from '@/controllers/user';

import type { Document, User } from '@/types';

export type DocumentDetails = Pick<
  Document,
  | 'id'
  | 'name'
  | 'key'
  | 'createdAt'
  | 'fileLastModified'
  | 'usage'
  | 'isProcessed'
  | 'classifiedType'
> & {
  uploadedByUser: Pick<User, 'id' | 'name' | 'image'> | null;
  dataWithLabels: Awaited<ReturnType<typeof getDataWithLabels>>;
};
export async function GET(
  req: Request,
  {
    params: { document: documentId },
  }: {
    params: { document: string };
  },
) {
  const { user } = await getCurrent();
  if (!user) {
    return notFound();
  }
  const document = await getById(documentId);
  if (document.orgId !== user.orgId) {
    return notFound();
  }

  const dataWithLabels = await getDataWithLabels(documentId);

  let uploadedByUser;
  if (document.uploadedByUserId) {
    const { id, name, image } = await getUserById(document.uploadedByUserId);
    uploadedByUser = {
      id,
      name,
      image,
    };
  } else {
    uploadedByUser = null;
  }
  const ret: DocumentDetails = {
    id: documentId,
    name: document.name,
    key: document.key,
    createdAt: document.createdAt,
    fileLastModified: document.fileLastModified,
    usage: document.usage,
    isProcessed: document.isProcessed,
    classifiedType: document.classifiedType,
    uploadedByUser,
    dataWithLabels,
  };
  return Response.json(ret);
}
