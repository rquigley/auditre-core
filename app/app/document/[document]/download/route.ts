import { NextResponse } from 'next/server';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/controllers/user';
import { getByExternalId } from '@/controllers/document';
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
    params: { document: externalId },
  }: {
    params: { document: string };
  },
) {
  console.log(externalId);
  const user = await getUser();
  const document = await getByExternalId(externalId);
  console.log(document);
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
