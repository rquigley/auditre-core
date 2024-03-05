import Link from 'next/link';

type OrgWithChildren = {
  id: string;
  name: string;
  auditCount: number;
  userCount: number;
  canHaveChildOrgs: boolean;
};
export default function ChildOrgs({ orgs }: { orgs: OrgWithChildren[] }) {
  return (
    <div className="text-sm">
      {/* <Orgs orgs={sortedOrgs} /> */}
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr className="divide-x divide-gray-200 text-slate-600">
            <th
              scope="col"
              className="whitespace-nowrap py-1 pl-2 pr-3 text-left align-bottom text-xs font-medium"
            >
              Organization
            </th>
            <th
              scope="col"
              className="whitespace-nowrap py-1 pl-2 pr-3 text-left align-bottom text-xs font-medium"
            >
              Audits
            </th>
            <th
              scope="col"
              className="whitespace-nowrap py-1 pl-2 pr-3 text-left align-bottom text-xs font-medium"
            >
              Users
            </th>
            <th
              scope="col"
              className="whitespace-nowrap py-1 pl-2 pr-3 text-left align-bottom text-xs font-medium"
            >
              Can create child orgs
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {orgs.map((org) => (
            <tr
              key={org.id}
              className="group divide-x divide-gray-100 hover:bg-slate-50"
            >
              <td className="px-2 py-2 text-xs font-normal text-gray-500">
                <Link
                  href={`/organization/${org.id}`}
                  className="hover:text-gray-900"
                >
                  {org.name}
                </Link>
              </td>
              <td className="px-2 py-2 text-xs font-normal text-gray-500">
                {org.auditCount > 0 ? org.auditCount : '-'}
              </td>
              <td className="px-2 py-2 text-xs font-normal text-gray-500">
                {org.userCount > 0 ? org.userCount : '-'}
              </td>
              <td className="px-2 py-2 text-xs font-normal text-gray-500">
                {org.canHaveChildOrgs ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-5 w-5 text-green-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
