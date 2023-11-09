import clsx from 'clsx';

export async function Content({
  children,
  pad = false,
}: {
  children: React.ReactNode;
  pad?: boolean;
}) {
  //   return <div className="mt-14 h-full flow-root">{children}</div>;
  //   return <div className="mt-14  h-[calc(100vh-14)] flow-root">{children}</div>;
  return (
    <div
      className={clsx(
        pad ? 'p-5' : '',
        'pt-14 h-screen flow-root overflow-y-scroll',
      )}
    >
      {children}
    </div>
  );
}
