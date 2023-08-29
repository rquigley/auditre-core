'use client';
import { useEffect, useState } from 'react';
import { usePathname, redirect } from 'next/navigation';

export default function Redirector({
  setPostAuthUrl,
}: {
  setPostAuthUrl: (url: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pathname) {
      setPostAuthUrl(pathname).then(() => {
        setRedirectUrl(pathname);
        console.log('redirecting to login', pathname);
      });
    }
  }, [pathname]);

  if (redirectUrl) {
    redirect('/login');
  }
  return null;
}
