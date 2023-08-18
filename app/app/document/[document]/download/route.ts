import { NextResponse } from 'next/server';
import { redirect, notFound } from 'next/navigation';
import { getCurrent } from '@/controllers/session-user';
import { getByExternalId } from '@/controllers/document';
import { streamFile } from '@/lib/aws';

export async function GET(
  req: Request,
  {
    params: { document: externalId },
  }: {
    params: { document: string };
  },
) {
  const user = await getCurrent();
  if (!user) {
    redirect(`/login?next=/document/${externalId}/download`);
  }
  const document = await getByExternalId(externalId);
  if (document.orgId !== user.orgId) {
    return notFound();
  }

  const stream = await streamFile({
    bucket: document.bucket,
    key: document.key,
  });
  return new NextResponse(stream, {
    headers: {
      'content-disposition': `attachment; filename=${document.name}`,
      'content-type': document.type,
      'content-length': document.size + '',
    },
  });
}
