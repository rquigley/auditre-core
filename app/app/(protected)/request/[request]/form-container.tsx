import { randomUUID } from 'node:crypto';
import { extname } from 'path';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';

import {
  create as createDocument,
  getAllByRequestId,
  getStatus,
} from '@/controllers/document';
import { getAllByDocumentId } from '@/controllers/document-query';
import { updateData } from '@/controllers/request';
import { getPresignedUrl } from '@/lib/aws';
import { requestTypes } from '@/lib/request-types';
import { clientSafe } from '@/lib/util';
import BasicForm from './basic-form';

import type {
  Audit,
  ClientSafeRequest,
  DocumentId,
  Request,
  S3File,
  User,
} from '@/types';

const bucketSchema = z.string();
const filenameSchema = z.string().min(4).max(128);
const contentTypeSchema = z.string().min(4).max(128);

type Props = {
  request: Request;
  user: User;
  audit: Audit;
};

export default async function FormContainer({ request, user, audit }: Props) {
  const requestConfig = requestTypes[request.type];
  const formSchema = requestConfig.schema;

  const documents = await getAllByRequestId(request.id);

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

  async function getPresignedUploadUrl({
    filename: unsanitizedFilename,
    contentType: unsanitizedContentType,
  }: {
    filename: string;
    contentType: string;
  }) {
    'use server';
    const filename = filenameSchema.parse(unsanitizedFilename);
    const bucket = bucketSchema.parse(process.env.AWS_S3_BUCKET);
    const contentType = contentTypeSchema.parse(unsanitizedContentType);
    const documentId = randomUUID();
    const key = `${request.orgId}/${documentId}${extname(filename)}`;
    const url = await getPresignedUrl({
      key,
      bucket,
      contentType,
    });
    return {
      documentId,
      url,
      key,
      bucket,
    };
  }

  async function createDoc(file: S3File) {
    'use server';
    const doc = await createDocument({
      id: file.documentId,
      key: file.key,
      bucket: file.bucket,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      lastModified: new Date(file.lastModified),
      orgId: audit.orgId,
      requestId: request.id,
    });

    // Do not await this.
    //processDocument(doc.id);

    return doc.id;
  }

  async function getDocumentStatus(documentId: DocumentId) {
    'use server';
    return await getStatus(documentId);
  }

  const documentWithQueries = await Promise.all(
    documents.map(async (document) => {
      const queries = await getAllByDocumentId(document.id);
      return {
        ...document,
        queries,
      };
    }),
  );

  return (
    <BasicForm
      request={clientSafe(request) as ClientSafeRequest}
      data={request.data}
      saveData={saveData}
      createDocument={createDoc}
      //getDocumentStatus={getDocumentStatus}
      getPresignedUploadUrl={getPresignedUploadUrl}
      documents={documentWithQueries}
    />
  );
}
