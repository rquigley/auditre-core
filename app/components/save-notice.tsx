import { CheckCircleIcon } from '@heroicons/react/20/solid';

export default function SaveNotice() {
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
