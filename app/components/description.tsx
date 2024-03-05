export function DescriptionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      target="_blank"
      className="text-slate-500 underline hover:text-sky-700 hover:no-underline"
      href={href}
    >
      {children}
    </a>
  );
}

export function DescriptionList({ children }: { children: React.ReactNode }) {
  return <ul className="ml-4 list-disc">{children}</ul>;
}
