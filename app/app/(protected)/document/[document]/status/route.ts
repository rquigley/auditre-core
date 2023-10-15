import { notFound } from 'next/navigation';

import { getById } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';

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

  return Response.json({
    isProcessed: document.isProcessed,
    classifiedType: document.classifiedType,
  });
}
