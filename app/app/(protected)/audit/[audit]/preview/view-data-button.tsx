'use client';

import { usePathname, useRouter } from 'next/navigation';

export function ViewDataButton() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <a
      href="#"
      onClick={() => router.push(pathname + '?view-data=1')}
      className="mr-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      View all data
    </a>
  );
}
