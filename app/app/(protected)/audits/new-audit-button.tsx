'use client';

import { usePathname, useRouter } from 'next/navigation';

import { PrimaryButton } from '@/components/button';

export default function GenerateButton() {
  const router = useRouter();
  const pathname = usePathname();

  return PrimaryButton({
    onClick: () => router.push(pathname + '?new=1'),
    label: 'Create audit',
  });
}
