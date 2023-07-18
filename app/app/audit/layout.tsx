import Nav from '@/app/nav';

export default function RequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />

      <main className="py-10 lg:pl-72 bg-slate-100">
        <div className="px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </>
  );
}
