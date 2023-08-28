'use client';
import { redirect } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

export default function Redirector({ hasUser }: { hasUser: boolean }) {
  const searchParams = useSearchParams();

  const nextUrl = searchParams?.get('url') || '/';
  if (hasUser && nextUrl) {
    return redirect(nextUrl);
  }
  return null;
}
