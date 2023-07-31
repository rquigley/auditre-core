import { fromIni, fromSSO } from '@aws-sdk/credential-providers';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { parseUrl } from '@aws-sdk/url-parser';
import { formatUrl } from '@aws-sdk/util-format-url';
import { Hash } from '@aws-sdk/hash-node';
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
  const presigner = new S3RequestPresigner({
    credentials,
    region,
    sha256: Hash.bind(null, 'sha256'),
  });

  const signedUrlObject = await presigner.presign(
    new HttpRequest({ ...url, method: 'PUT' }),
  );
  return formatUrl(signedUrlObject);
}
