import { NextResponse } from 'next/server';
import { redirect, notFound } from 'next/navigation';
import { getCurrent } from '@/controllers/session-user';
import { getById } from '@/controllers/document';
import { streamFile } from '@/lib/aws';

export async function GET(
  req: Request,
  {
    params: { document: id },
  }: {
    params: { document: string };
  },
) {
  const user = await getCurrent();
  const document = await getById(id);
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
