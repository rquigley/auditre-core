'use server';
import { getPresignedUrl } from './aws';
import { z } from 'zod';
import { getById as getRequestById } from '@/controllers/request';
import { getById } from '@/controllers/audit';
import { getById as getOrgById } from '@/controllers/org';
import { nanoid } from 'nanoid';
import { extname } from 'path';
import { cookies } from 'next/headers';

const bucketSchema = z.string();
const filenameSchema = z.string().min(4).max(128);
const contentTypeSchema = z.string().min(4).max(128);

export async function getPresignedUploadUrl({
  filename: unsanitizedFilename,
  requestId,
  contentType: unsanitizedContentType,
}: {
  filename: string;
  requestId: string;
  contentType: string;
}) {
  const filename = filenameSchema.parse(unsanitizedFilename);
  const bucket = bucketSchema.parse(process.env.AWS_S3_BUCKET);
  const contentType = contentTypeSchema.parse(unsanitizedContentType);

  const request = await getRequestById(requestId);
  const audit = await getById(request.auditId);
  const org = await getOrgById(audit.orgId);

  const key = `${org.id}/${audit.id}/${request.id}/${nanoid()}${extname(
    filename,
  )}`;
  const url = await getPresignedUrl({
    key,
    bucket,
    contentType,
  });
  return {
    url,
    key,
    bucket,
  };
}

const POST_AUTH_URL = 'post-login-url';
export async function setPostAuthUrl(url: string) {
  cookies().set(POST_AUTH_URL, url);
}

export async function getPostAuthUrl() {
  const url = cookies().get(POST_AUTH_URL)?.value || '/';
  // TODO: currently seeing a bug where this cannot be called unless in a server action
  // but this is... a server action.
  //cookies().delete(POST_AUTH_URL);
  return url;
}

export async function deletePostAuthUrl() {
  cookies().delete(POST_AUTH_URL);
}
