import '../globals.css';

import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

import { DocumentOverlay } from '@/components/document-overlay';
import { Navbar } from '@/components/navbar';
import { PageSpinner } from '@/components/spinner';
import { getById as getOrgById } from '@/controllers/org';
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
  const org = await getOrgById(user.orgId);

  return (
    <html lang="en" className={inter.className}>
      <link rel="icon shortcut" href="/img/favicon.ico" type="image/x-icon" />
      <body className="bg-red-300">
        {/* <div className="h-100vh flex overflow-hidden min-h-100vh items-stretch"> */}
        <div className="h-screen flex bg-green-300">
          <Navbar
            orgName={org.name || ''}
            userName={user.name}
            userImage={user.image}
          />
          <div className="lg:pl-56 w-screen bg-white h-screen bg-blue-300 overflow-clip ">
            <Suspense fallback={<PageSpinner />}>{children}</Suspense>
          </div>
        </div>
        <Toaster richColors />
        <DocumentOverlay />
      </body>
    </html>
  );
}
