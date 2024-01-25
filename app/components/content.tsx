export async function Content({
  children,
  pad = false,
}: {
  children: React.ReactNode;
  pad?: boolean;
}) {
  return (
    <div className="my-14 pb-14 w-full h-full flex flex-col">
      <div className="overflow-auto h-full">
        {pad ? <div className="m-5">{children}</div> : children}
      </div>
    </div>
  );
}
