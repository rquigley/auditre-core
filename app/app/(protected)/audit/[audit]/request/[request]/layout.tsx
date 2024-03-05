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
      <div className="flex h-full w-full flex-auto basis-1/4 flex-col overflow-auto border-r border-gray-200 pt-4">
        <Requests auditId={auditId} />
      </div>

      <div className="w-1/2 max-w-3xl basis-3/4 overflow-y-auto xl:max-w-5xl">
        {children}
      </div>
    </div>
  );
}
