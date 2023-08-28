'use client';
import { useEffect, useState } from 'react';
import { usePathname, redirect } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { cookies } from 'next/headers';

export default function Redirector({
  setPostAuthUrl,
}: {
  setPostAuthUrl: (url: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log('shit', pathname);
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
  //const { status } = useSession();
  const status = 'asd';
  console.log({ status, pathname });
  return (
    <div>
      <div>
        <a href={`/login?url=${pathname}`}>login</a>
      </div>
      {JSON.stringify({ status, pathname })}
    </div>
  );
}
