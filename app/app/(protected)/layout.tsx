import '../globals.css';

import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

import { DocumentOverlay } from '@/components/document-overlay';
import { Navbar } from '@/components/navbar';
import { PageSpinner } from '@/components/spinner';
import { getById as getOrgById } from '@/controllers/org';
import { getCurrent } from '@/controllers/session-user';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'AuditRe',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }

  const org = await getOrgById(user.orgId);

  return (
    <html lang="en" className={inter.className}>
      <link rel="icon shortcut" href="/img/favicon.ico" type="image/x-icon" />
      <body className="bg-white">
        <div className="h-screen flex">
          <Navbar
            orgName={org.name || ''}
            userName={user.name}
            userImage={user.image}
          />
          <div className="lg:pl-56 w-screen bg-white h-screen overflow-clip ">
            <Suspense fallback={<PageSpinner />}>{children}</Suspense>
          </div>
        </div>
        <Toaster richColors />
        <DocumentOverlay />
      </body>
    </html>
  );
}
