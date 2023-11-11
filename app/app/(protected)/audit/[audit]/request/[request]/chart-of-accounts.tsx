import { AccountExtractionButton } from '@/components/account-extraction-button';
import {
  accountTypes,
  getAllAccountMappingsByAuditId,
} from '@/controllers/account-mapping';
import { getById as getDocumentById } from '@/controllers/document';

import type { AccountType, AuditId, DocumentId } from '@/types';

export async function ChartOfAccounts({
  auditId,
  documentId,
}: {
  auditId: AuditId;
  documentId: DocumentId;
}) {
  const document = await getDocumentById(documentId);
  const accountMapping = (await getAllAccountMappingsByAuditId(auditId)) || [];

  // console.log('account mapping', accountMapping);
  const aTypes = groupAccountTypes(accountTypes);

  return (
    <div className="mt-8">
      {documentId ? (
        <div className="mb-4">
          <AccountExtractionButton
            auditId={auditId}
            document={{ id: document.id, name: document.name }}
          />
        </div>
      ) : null}

      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th
              scope="col"
              className="whitespace-nowrap py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
            >
              Account Id
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Account Name
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Mapped to
            </th>
            {/* <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Commision
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Price
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Quantity
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              Net amount
            </th>
            <th
              scope="col"
              className="relative whitespace-nowrap py-3.5 pl-3 pr-4 sm:pr-0"
            >
              <span className="sr-only">Edit</span>
            </th> */}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {accountMapping.map((am) => (
            <tr key={am.id}>
              <td className="w-30 py-2 pl-4 pr-3 text-sm text-gray-500 sm:pl-0">
                {am.accountNumber}
              </td>
              <td className="w-30 px-2 py-2 text-sm font-medium text-gray-900">
                {am.accountName}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-900">
                <select
                  id="location"
                  name="location"
                  className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  defaultValue="Canada"
                >
                  {Object.keys(aTypes).map((group) => (
                    <optgroup key={group} label={group}>
                      {Object.keys(aTypes[group]).map((t) => (
                        <option key={t} value={t}>
                          {
                            // @ts-expect-error
                            aTypes[group][t]
                          }
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </td>
              {/* <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">
                {transaction.commission}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">
                {transaction.price}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">
                {transaction.quantity}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">
                {transaction.netAmount}
              </td>
              <td className="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                <a href="#" className="text-indigo-600 hover:text-indigo-900">
                  Edit<span className="sr-only">, {am.id}</span>
                </a>
              </td>*/}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function groupAccountTypes(
  types: Record<AccountType, string>,
): Record<string, Record<AccountType, string>> {
  const grouped: Record<string, Record<AccountType, string>> = {
    // @ts-expect-error
    Asset: {},
    // @ts-expect-error
    Liability: {},
    // @ts-expect-error
    Equity: {},
  };

  for (const key in types) {
    if (key.startsWith('ASSET_')) {
      // @ts-expect-error
      grouped.Asset[key] = types[key];
    } else if (key.startsWith('LIABILITY_')) {
      // @ts-expect-error
      grouped.Liability[key] = types[key];
    } else if (key.startsWith('EQUITY_')) {
      // @ts-expect-error
      grouped.Equity[key] = types[key];
    }
  }

  return grouped;
}
