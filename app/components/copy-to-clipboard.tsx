'use client';

import type { ReactNode } from 'react';

export default function CopyToClipboard({
  elementId,
  children,
}: {
  elementId: string;
  children: ReactNode;
}) {
  return (
    <div>
      <a
        href="#"
        onClick={() => {
          console.log(document.getElementById(elementId)?.innerText);
          navigator.clipboard.writeText(
            document.getElementById(elementId)?.innerHTML || '',
          );
        }}
      >
        {children}
      </a>
    </div>
  );
}
