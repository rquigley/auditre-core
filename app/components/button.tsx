'use client';

type PrimaryButtonProps = {
  onClick: () => void;
  label: string;
};
export function PrimaryButton(props: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      {props.label}
    </button>
  );
}
type SecondaryButtonProps = {
  onClick: () => void;
  label: string;
};
export function SecondaryButton(props: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      {props.label}
    </button>
  );
}
