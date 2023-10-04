'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function GenerateButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <a
      type="button"
      href="#"
      onClick={() => router.push(pathname + '?new=1')}
      className="rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      Create audit
    </a>
  );
}
