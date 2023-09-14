'use client';
import Image from 'next/image';

export default function FiletypeIcon({ filename }: { filename: string }) {
  const fileExt = filename.split('.').pop();
  const dim = 64;
  switch (fileExt) {
    case 'pdf':
      return (
        <Image
          src="/icons/filetype/pdf.png"
          width={dim}
          height={dim}
          alt="PDF"
        />
      );

    case 'doc':
    case 'docx':
      return (
        <Image
          src="/icons/filetype/doc.png"
          width={dim}
          height={dim}
          alt="PDF"
        />
      );
    case 'xls':
    case 'xlsx':
      return (
        <Image
          src="/icons/filetype/xls.png"
          width={dim}
          height={dim}
          alt="PDF"
        />
      );
    default:
      return <div>{fileExt}</div>;
  }
}
