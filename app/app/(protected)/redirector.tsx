'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
