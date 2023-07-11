import './globals.css';
//import { Inter } from 'next/font/google';

//const inter = Inter({ subsets: ['latin'] });

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
    <html className="h-full bg-slate-100">
      <body className="h-full">{children}</body>
    </html>
  );
}
