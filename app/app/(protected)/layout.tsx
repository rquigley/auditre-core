import '../globals.css';

import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

import { DocumentOverlay } from '@/components/document-overlay';
import Navbar from '@/components/navbar';
import { getCurrent } from '@/controllers/session-user';
import { setPostAuthUrl } from '@/lib/actions';
import Redirector from './redirector';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'AuditRe',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getCurrent();
  } catch (err) {}

  if (!user) {
    return (
      <html lang="en" className={inter.className}>
        <link rel="icon shortcut" href="/img/favicon.ico" type="image/x-icon" />
        <body className="h-full bg-slate-100">
          <Redirector setPostAuthUrl={setPostAuthUrl} />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={inter.className}>
      <link rel="icon shortcut" href="/img/favicon.ico" type="image/x-icon" />
      <body className="h-full bg-slate-100">
        <Navbar userName={user.name} userImage={user.image} />
        <div className="py-5 lg:pl-48 px-4 sm:px-6 bg-slate-100">
          <div className="bg-white rounded-sm p-5">
            <Suspense fallback="">{children}</Suspense>
          </div>
        </div>
        <Toaster richColors />
        <DocumentOverlay />
      </body>
    </html>
  );
}
