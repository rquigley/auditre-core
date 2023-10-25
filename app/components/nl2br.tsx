export function nl2br(str: string): React.ReactNode {
  return (
    <>
      {str.split('\n').map((item, key) => {
        return (
          <span key={key}>
            {item}
            <br />
          </span>
        );
      })}
    </>
  );
}
