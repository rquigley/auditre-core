'use client';

import Image from 'next/image';

export function FiletypeIcon({ filename }: { filename: string }) {
  const fileExt = filename.split('.').pop();
  const dim = 32;
  switch (fileExt) {
    case 'pdf':
      return (
        <Image
          src="/icons/filetype/pdf.png"
          width={dim}
          height={dim}
          alt={fileExt}
          className="min-w-fit"
        />
      );

    case 'doc':
    case 'docx':
      return (
        <Image
          src="/icons/filetype/doc.png"
          width={dim}
          height={dim}
          alt={fileExt}
          className="min-w-fit"
        />
      );
    case 'xls':
    case 'xlsx':
      return (
        <Image
          src="/icons/filetype/xls.png"
          width={dim}
          height={dim}
          alt={fileExt}
          className="min-w-fit"
        />
      );
    default:
      return <div>{fileExt}</div>;
  }
}
