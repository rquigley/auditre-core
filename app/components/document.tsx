import { FiletypeIcon } from '@/components/filetype-icon';

export function Document({ docKey, name }: { docKey: string; name: string }) {
  return (
    <div className="h-12 flex items-center">
      <div className="flex items-center border border-white hover:border-slate-300 p-1 cursor-pointer">
        <FiletypeIcon filename={docKey} />
        <span className="ml-2 text-sm text-slate-700">{name}</span>
      </div>
    </div>
  );
}
