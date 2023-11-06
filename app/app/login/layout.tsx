import '../globals.css';

import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'AuditRe',
  //description: 'AuditRe',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <link rel="icon shortcut" href="/img/favicon.ico" type="image/x-icon" />

      <body className="h-full bg-slate-100">{children}</body>
    </html>
  );
}
