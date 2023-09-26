import '../globals.css';
import Redirector from './redirector';
import Navbar from '@/components/navbar';
import { getCurrentOrNone } from '@/controllers/session-user';
import { setPostAuthUrl } from '@/lib/actions';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'AuditRe',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentOrNone();
  if (!user) {
    return (
      <html lang="en" className={inter.className}>
        <body className="h-full bg-slate-100">
          <Redirector setPostAuthUrl={setPostAuthUrl} />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={inter.className}>
      <body className="h-full bg-slate-100">
        <Navbar userName={user.name} userImage={user.image} />
        <div className="py-10 lg:pl-80 px-4 sm:px-6 bg-slate-100">
          <div className="bg-white rounded-sm p-5">
            <Suspense fallback="">{children}</Suspense>
          </div>
        </div>
      </body>
    </html>
  );
}
