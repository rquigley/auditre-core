import { writeFile } from 'node:fs/promises';
import { extname } from 'path';
import {
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { fromContainerMetadata, fromSSO } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

import type { Readable } from 'stream';

export { NoSuchKey };

const region = 'us-east-2';

const keySchema = z.string().min(1);

export async function getFile({
  bucket,
  key,
  outputFilename,
}: {
  bucket: string;
  key: string;
  outputFilename: string;
}) {
  const client = new S3Client({
    credentials: await getCredentials(),
    region,
  });
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  const stream = response.Body as Readable;
  await writeFile(outputFilename, stream);
}

const nonExtractableExts = ['.csv', '.txt', '.json', '.md'];
export async function getExtractedContent({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  let extractedKey;
  // The extractor doesn't run on plaintext files, so we need to use the original key
  if (nonExtractableExts.includes(extname(key))) {
    extractedKey = key;
  } else {
    extractedKey = `${key}.extracted`;
  }
  const client = new S3Client({
    credentials: await getCredentials(),
    region,
  });
  const command = new GetObjectCommand({ Bucket: bucket, Key: extractedKey });
  const response = await client.send(command);
  if (!response.Body) {
    throw new Error('Missing response body');
  }
  return await response.Body.transformToString('utf-8');
}

export async function getPresignedUrl({
  bucket,
  key,
  contentType,
}: {
  bucket: string;
  key: string;
  contentType: string;
}) {
  if (!bucket) {
    throw new Error('Missing bucket');
  }
  keySchema.parse(key);

  const client = new S3Client({
    credentials: await getCredentials(),
    region,
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function streamFile({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  const client = new S3Client({ credentials: await getCredentials(), region });
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const resp = await client.send(command);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const readStream = resp.Body!;
  const webStream = readStream.transformToWebStream();
  return webStream;
}

async function getCredentials() {
  if (process.env.NODE_ENV === 'production') {
    return await fromContainerMetadata();
  } else {
    if (!process.env.AWS_PROFILE) {
      throw new Error('Missing AWS_PROFILE');
    }
    return await fromSSO({ profile: process.env.AWS_PROFILE })();
  }
}
