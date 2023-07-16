'use client';
import { Request } from '@/controllers/request';
import dayjs from 'dayjs';

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
  return (
    <tr
      key={request.id}
      className="hover:bg-gray-100"
      onClick={() => console.log('sdfsdf')}
    >
      <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
        <div className="text-gray-900 font-semibold">{request.name}</div>

        <div className="text-gray-900">{request.description}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        <StatusBadge status={request.status} />
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        <div className="text-gray-900">
          {dayjs(request.dueDate).format('MM/DD/YYYY')}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
        {request.owners.map((owner) => (
          <div key={owner}>{owner}</div>
        ))}
      </td>
      <td className="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
        <a href="#" className="text-indigo-600 hover:text-indigo-900">
          Edit<span className="sr-only">, {request.name}</span>
        </a>
      </td>
    </tr>
  );
}
