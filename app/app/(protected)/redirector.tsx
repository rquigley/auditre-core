'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Redirector({
  setPostAuthUrl,
}: {
  setPostAuthUrl: (url: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setPostAuthUrl(pathname).then(() => {
      router.replace(`/login`);
    });
  }, [pathname, setPostAuthUrl, router]);

  return null;
}
