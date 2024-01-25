import { notFound } from 'next/navigation';

import { getAllStatusByDocument } from '@/controllers/ai-query';
import { getDocumentStatus } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';

export async function GET(
  req: Request,
  {
    params: { document: id },
  }: {
    params: { document: string };
  },
) {
  const { user } = await getCurrent();
  if (!user) {
    return notFound();
  }
  const [documentP, queriesP] = [
    getDocumentStatus(id),
    getAllStatusByDocument(id),
  ];
  const [document, queries] = await Promise.all([documentP, queriesP]);
  if (document.orgId !== user.orgId) {
    return notFound();
  }

  return Response.json({
    isProcessed: document.isProcessed,
    classifiedType: document.classifiedType,
    queries,
    queriesComplete: queries.every((q) => q.status === 'COMPLETE'),
  });
}
