import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import {
  fromIni,
  fromSSO,
  fromContainerMetadata,
} from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
const { writeFile } = require('node:fs/promises');

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
  keySchema.parse(key);

  let credentials;
  if (process.env.NODE_ENV === 'production') {
    credentials = await fromContainerMetadata();
  } else {
    credentials = await fromSSO({ profile: process.env.AWS_PROFILE })();
  }
  //   const credentials = fromIni({
  //     profile: process.env.AWS_PROFILE,
  //   });
  const client = new S3Client({
    credentials,
    region,
  });
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const { Body } = await client.send(command);

  await writeFile(outputFilename, Body);
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

  let credentials;
  if (process.env.NODE_ENV === 'production') {
    credentials = await fromContainerMetadata();
  } else {
    credentials = await fromSSO({ profile: process.env.AWS_PROFILE })();
  }
  const client = new S3Client({
    credentials,
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
  let credentials;
  if (process.env.NODE_ENV === 'production') {
    credentials = await fromContainerMetadata();
  } else {
    credentials = await fromSSO({ profile: process.env.AWS_PROFILE })();
  }

  const client = new S3Client({ credentials, region });
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const resp = await client.send(command);
  const readStream = resp.Body!;
  const webStream = readStream.transformToWebStream();
  return webStream;
}
