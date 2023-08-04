import { NextResponse } from 'next/server';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/controllers/user';
import { getByExternalId, getChangesById } from '@/controllers/request';
import { getById as getAuditById } from '@/controllers/audit';
import type { S3File } from '@/types';
import { streamFile } from '@/lib/aws';

async function getUser() {
  try {
    const user = await getCurrentUser();
    return user;
  } catch (err) {
    redirect(`/login?next=/requests`);
  }
}

// export an async GET function. This is a convention in NextJS
export async function GET(
  req: Request,
  {
    params: { request: externalId, field },
  }: {
    params: { request: string; field: string };
  },
) {
  console.log(externalId, field);
  const user = await getUser();
  const request = await getByExternalId(externalId);
  const audit = await getAuditById(request.auditId);
  if (audit.orgId !== user.orgId) {
    return notFound();
  }
  // filename for the file that the user is trying to download
  // TODO: validate field!!!!
  const { bucket, key, name, size, type } = request.data[field] as S3File;

  const stream = await streamFile({ bucket, key });
  return new NextResponse(stream, {
    headers: {
      'content-disposition': `attachment; filename=${name}`,
      'content-type': type,
      'content-length': size + '',
    },
  });
}
