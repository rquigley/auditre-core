import { CheckCircleIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

export default function SaveNotice({ cb }: { cb: (visible: boolean) => void }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHidden(true);
      cb(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [cb]);
  return (
    <div>
      <div
        className={clsx(
          hidden ? 'opacity-0' : 'opacity-100',
          'inline-flex transition',
        )}
      >
        <div className="flex-shrink-0">
          <CheckCircleIcon
            className="size-5 text-green-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-green-800">
            Your changes have been saved
          </p>
        </div>
      </div>
    </div>
  );
}
