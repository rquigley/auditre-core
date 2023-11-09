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
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 h-screen">
      <div className="col-start-1 lg:col-span-2 lg:row-span-2 lg:row-end-3 overflow-y-scroll pt-4 border-r border-gray-200">
        <Requests auditId={auditId} />
      </div>

      <div className="shadow-sm col-span-2 lg:col-span-4 lg:row-span-2 lg:row-end-3  overflow-y-scroll ">
        {children}
      </div>
    </div>
  );

  return (
    <div className="grid max-w-2xl grid-cols-1 grid-rows-1 gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-6 h-[calc(100vh-100px)]">
      <div className="col-start-1 lg:col-span-2 lg:row-span-2 lg:row-end-3 overflow-y-scroll pt-4 border-r border-gray-200">
        <Requests auditId={auditId} />
      </div>

      <div className="shadow-sm col-span-2 lg:col-span-4 lg:row-span-2 lg:row-end-3  overflow-y-scroll ">
        {children}
      </div>
    </div>
  );
}
