import { Requests } from './requests';

import type { AuditId } from '@/types';

export default async function RequestLayout({
  params,
  children,
}: {
  params: { audit: AuditId; request: string };
  children: React.ReactNode;
}) {
  const auditId = params.audit;

  return (
    <div className="flex h-full gap-y-10">
      <div className="flex-auto basis-1/4 h-full w-full min-w-min overflow-auto pt-4 border-r border-gray-200 flex flex-col">
        <Requests auditId={auditId} />
      </div>

      <div className="basis-3/4 w-full min-w-min max-w-2xl overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
