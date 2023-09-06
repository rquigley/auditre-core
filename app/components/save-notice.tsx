import { useEffect, useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';

export default function SaveNotice() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHidden(true);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (hidden) return null;
  return (
    <div>
      <div className="flex">
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
