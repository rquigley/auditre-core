import '../globals.css';

import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

import { DocumentOverlay } from '@/components/document-overlay';
import Intercom from '@/components/intercom';
import { Navbar } from '@/components/navbar';
import { PageSpinner } from '@/components/spinner';
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

  return (
    <html lang="en" className={inter.className}>
      <link rel="icon shortcut" href="/img/favicon.ico" type="image/x-icon" />
      <body className="bg-white">
        <div className="h-screen flex">
          <Navbar
            orgName={user.orgName}
            userName={user.name}
            userImage={user.image}
            orgId={user.orgId}
            availableOrgs={user.orgs}
            canManageOrgs={user.hasPerm('orgs:manage')}
          />
          <div className="lg:pl-56 w-screen bg-white h-screen overflow-clip ">
            <Suspense fallback={<PageSpinner />}>{children}</Suspense>
          </div>
        </div>
        <Toaster richColors />
        <DocumentOverlay />
        <Intercom name={user.name} email={user.email || ''} />
      </body>
    </html>
  );
}
