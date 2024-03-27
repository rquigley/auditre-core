import Image from 'next/image';

export function Avatar({
  id,
  name,
  image,
  email,
}: {
  id?: string;
  name: string | null;
  image: string | null;
  email: string | null;
}) {
  let inner;

  if (!name && !image && !email) {
    inner = '';
  } else {
    if (image) {
      inner = <Image width="36" height="36" src={image} alt={name || ''} />;
    } else {
      let initials;
      if (name) {
        initials = name.charAt(0)?.toUpperCase();
      } else if (email) {
        initials = email.charAt(0).toUpperCase();
      } else {
        initials = '';
      }
      inner = (
        <div className="font-sans text-xs text-slate-800">{initials}</div>
      );
    }
  }
  return (
    <div className="relative flex size-5 items-center justify-center overflow-hidden rounded-full bg-gray-200">
      {inner}
    </div>
  );
}
