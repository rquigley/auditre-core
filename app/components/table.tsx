'use client';

import clsx from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function Arrow({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={clsx(
        isActive ? 'text-sky-700' : 'text-slate-300',
        'rounded block bg-white group-hover:bg-slate-50 p-0.5 ',
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fillRule="evenodd"
          d="M10 5a.75.75 0 01.75.75v6.638l1.96-2.158a.75.75 0 111.08 1.04l-3.25 3.5a.75.75 0 01-1.08 0l-3.25-3.5a.75.75 0 111.08-1.04l1.96 2.158V5.75A.75.75 0 0110 5z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

export function SortableHeader({
  column,
  children,
}: {
  column: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get('sort');
  const currentOrder = searchParams.get('order');
  const isActive = currentSort === column;

  return (
    <button
      onClick={() => {
        if (isActive && currentOrder === 'asc') {
          router.push(`${pathname}?sort=${column}&order=desc`, {
            scroll: false,
          });
        } else {
          router.push(`${pathname}?sort=${column}&order=asc`, {
            scroll: false,
          });
        }
      }}
      className="hover:underline group flex items-center"
    >
      <span
        className={clsx(
          isActive ? 'underline' : '',
          currentSort && !isActive ? 'font-normal' : '',
          'hover:underline',
        )}
      >
        {children}
      </span>

      <span
        className={clsx(
          isActive && currentOrder === 'asc' ? 'rotate-180' : '',
          'block ml-1 transition-all',
        )}
      >
        <Arrow isActive={isActive} />
      </span>
    </button>
  );
}

export function Help({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <span className="inline-block align-middle ml-1 text-slate-500 hover:text-slate-800">
        <button
          onMouseOver={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </span>
      {isOpen && (
        <div className="absolute z-10 w-80 p-4 mt-2 text-xs leading-5 text-gray-600 bg-white border border-gray-300 rounded-md shadow-lg">
          {children}
        </div>
      )}
    </>
  );
}
