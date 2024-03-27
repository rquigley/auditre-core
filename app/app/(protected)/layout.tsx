import '../globals.css';

import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

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
        <div className="flex h-screen">
          <Navbar
            orgName={user.orgName}
            userName={user.name}
            userImage={user.image}
            userEmail={user.email}
            orgId={user.orgId}
            availableOrgs={user.orgs}
            canManageOrgSettings={user.hasPermForAnyOrg('org:manage-users')}
            canManageOrgs={user.hasPermForAnyOrg('org:can-add-child-orgs')}
          />
          <div className="h-screen w-screen overflow-clip bg-white lg:pl-56">
            <Suspense fallback={<PageSpinner />}>{children}</Suspense>
          </div>
        </div>
        <Toaster richColors />
        <Intercom name={user.name} email={user.email || ''} />
      </body>
    </html>
  );
}
