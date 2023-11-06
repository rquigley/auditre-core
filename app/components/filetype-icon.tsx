'use client';

import Image from 'next/image';

export function FiletypeIcon({ filename }: { filename: string }) {
  const fileExt = filename.split('.').pop();
  const dim = 32;
  const className = 'w-6';
  let icon;
  switch (fileExt) {
    case 'pdf':
      icon = (
        <Image
          src="/img/icons/filetype/pdf.png"
          width={dim}
          height={dim}
          alt={fileExt}
          className={className}
        />
      );
      break;

    case 'doc':
    case 'docx':
      icon = (
        <Image
          src="/img/icons/filetype/doc.png"
          width={dim}
          height={dim}
          alt={fileExt}
          className={className}
        />
      );
      break;
    case 'xls':
    case 'xlsx':
      icon = (
        <Image
          src="/img/icons/filetype/xls.png"
          width={dim}
          height={dim}
          alt={fileExt}
          className={className}
        />
      );
      break;
    default:
      icon = <div className="text-xs">{fileExt}</div>;
  }
  return <div className="h-6 w-6">{icon}</div>;
}
