export async function Content({
  children,
  pad = false,
}: {
  children: React.ReactNode;
  pad?: boolean;
}) {
  return (
    <div className="my-14 flex h-full w-full flex-col pb-14">
      <div className="h-full overflow-auto">
        {pad ? <div className="m-5">{children}</div> : children}
      </div>
    </div>
  );
}
