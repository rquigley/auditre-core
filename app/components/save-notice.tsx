import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { useEffect, useState } from 'react';

import { classNames } from '@/lib/util';

export default function SaveNotice() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHidden(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <div>
      <div
        className={classNames(
          hidden ? 'opacity-0' : 'opacity-100',
          'flex transition',
        )}
      >
        <div className="flex-shrink-0">
          <CheckCircleIcon
            className="h-5 w-5 text-green-400"
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
