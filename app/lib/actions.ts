'use server';
import { getPresignedUrl } from './aws';
import { z } from 'zod';
import { getByExternalId } from '@/controllers/request';
import { getById } from '@/controllers/audit';
import { getById as getOrgById } from '@/controllers/org';
import { nanoid } from 'nanoid';

const bucketSchema = z.string();
const filenameSchema = z.string().min(4).max(128);

export async function getPresignedUploadUrl({
  filename: unsanitizedFilename,
  requestExternalId,
}: {
  filename: string;
  requestExternalId: string;
}) {
  const filename = filenameSchema.parse(unsanitizedFilename);
  const bucket = bucketSchema.parse(process.env.AWS_S3_BUCKET);

  const request = await getByExternalId(requestExternalId);
  const audit = await getById(request.auditId);
  const org = await getOrgById(audit.orgId);

  const key = `${org.externalId}/${audit.externalId}/${
    request.externalId
  }/${nanoid()}/${filename}`;
  const url = await getPresignedUrl({
    key,
    bucket,
  });
  return {
    url,
    key,
    bucket,
  };
}
