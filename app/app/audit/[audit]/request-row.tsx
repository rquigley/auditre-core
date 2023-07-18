'use client';
import { Request } from '@/controllers/request';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'requested':
      return (
        <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20">
          Requested
        </span>
      );
    case 'complete':
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          Complete
        </span>
      );
    case 'overdue':
      return (
        <span className="inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20">
          Overdue
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          {status}
        </span>
      );
  }
}

export default function RequestRow({ request }: { request: Request }) {
  const router = useRouter();
  return (
    <tr key={request.id} className="hover:bg-gray-100">
      <td className="relative whitespace-nowrap py-5 pl-3 pr-4 text-sm font-medium sm:pr-0">
        <Link
          href={`/request/${request.id}`}
          className="text-indigo-600 hover:text-indigo-900"
        >
          View<span className="sr-only">, {request.name}</span>
        </Link>
      </td>
      <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
        <div className="text-gray-900 font-semibold">
          <Link
            href={`/requests/${request.id}`}
            className="hover:underline hover:text-blue-500"
          >
            {request.name}
          </Link>
        </div>

        <div className="text-gray-900">{request.description}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        <StatusBadge status={request.status} />
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        <div className="text-gray-900">
          {request.dueDate ? dayjs(request.dueDate).format('MM/DD/YYYY') : null}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        {request.owners
          ? request.owners.map((owner) => <div key={owner}>{owner}</div>)
          : null}
      </td>
    </tr>
  );
}
