'use client';

import { usePathname, useRouter } from 'next/navigation';

import { PrimaryButton } from '@/components/button';

export function ViewDataButton() {
  const router = useRouter();
  const pathname = usePathname();
  return PrimaryButton({
    onClick: () => router.push(pathname + '?view-data=1'),
    label: 'View all data',
  });
}
