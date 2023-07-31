'use server';
import { getPresignedUrl } from './aws';
import { z } from 'zod';

const bucketSchema = z.string();

export async function getPresignedUploadUrl(key: string) {
  const bucket = bucketSchema.parse(process.env.AWS_S3_BUCKET);

  return await getPresignedUrl({
    key,
    bucket,
  });
}
