import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { fromIni, fromSSO } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { parseUrl } from '@aws-sdk/url-parser';
import { z } from 'zod';

const region = 'us-east-2';

const keySchema = z.string().min(4).max(120);

export async function getPresignedUrl({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  if (!bucket) {
    throw new Error('Missing bucket');
  }
  keySchema.parse(key);
  const url = parseUrl(`https://${bucket}.s3.${region}.amazonaws.com/${key}`);

  const credentials = await fromSSO({ profile: process.env.AWS_PROFILE })();
  //   const credentials = fromIni({
  //     profile: process.env.AWS_PROFILE,
  //   });
  const client = new S3Client({
    credentials,
    region,
  });

  const command = new PutObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function streamFile({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  const credentials = await fromSSO({ profile: process.env.AWS_PROFILE })();

  const client = new S3Client({ credentials, region });
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const resp = await client.send(command);
  const readStream = resp.Body!;
  const webStream = readStream.transformToWebStream();
  return webStream;
}
