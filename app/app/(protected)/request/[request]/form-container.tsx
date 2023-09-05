import * as z from 'zod';
import { updateData } from '@/controllers/request';
import {
  create as createDocument,
  updateWithExtractedData,
} from '@/controllers/document';
import BasicForm from './basic-form';
import { requestTypes } from '@/lib/request-types';
import type { Request, User, Audit, S3File, ClientSafeRequest } from '@/types';
import { clientSafe } from '@/lib/util';
import { revalidatePath } from 'next/cache';
import { extname } from 'path';
import { getPresignedUrl } from '@/lib/aws';
import { randomUUID } from 'node:crypto';
import retry from 'async-retry';

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

  async function saveData(data: z.infer<typeof formSchema>) {
    'use server';

    await updateData({
      id: request.id,

      // @ts-ignore
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
      type: file.type,
      lastModified: new Date(file.lastModified),
      orgId: audit.orgId,
      requestId: request.id,
    });
    const ha = await retry(async (bail) => {
      return await updateWithExtractedData(doc.id);
    });

    return doc.id;
  }

  return (
    <BasicForm
      request={clientSafe(request) as ClientSafeRequest}
      data={request.data}
      // @ts-ignore
      saveData={saveData}
      createDocument={createDoc}
      getPresignedUploadUrl={getPresignedUploadUrl}
    />
  );
}
