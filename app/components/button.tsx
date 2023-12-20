'use client';

import { type } from 'os';
import { PlusIcon } from '@heroicons/react/20/solid';

import { Spinner } from '@/components/spinner';

type PrimaryButtonProps = {
  onClick?: (ev: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'submit' | 'button';
  label: string;
  icon?: 'plus';
  submitting?: boolean;
};
export function PrimaryButton(props: PrimaryButtonProps) {
  return (
    <button
      type={props.type || 'button'}
      onClick={props.onClick}
      disabled={props.submitting}
      className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      {props.submitting && <Spinner />}

      {props.icon === 'plus' ? (
        <PlusIcon className="-ml-0.5 mr-1.5 size-5" aria-hidden="true" />
      ) : null}

      {props.label}
    </button>
  );
}
type SecondaryButtonProps = {
  onClick?: (ev: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'submit' | 'button';
  label: string;
  submitting?: boolean;
};
export function SecondaryButton(props: SecondaryButtonProps) {
  return (
    <button
      type={props.type || 'button'}
      onClick={props.onClick}
      disabled={props.submitting}
      className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      {props.label}
    </button>
  );
}
