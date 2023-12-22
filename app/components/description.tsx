export function DescriptionLink({
  href,
  children,
}: {
  href: string;
  children: any;
}) {
  return (
    <a
      target="_blank"
      className="text-slate-500 hover:text-sky-700 underline hover:no-underline"
      href={href}
    >
      {children}
    </a>
  );
}

export function DescriptionList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc ml-4">{children}</ul>;
}
