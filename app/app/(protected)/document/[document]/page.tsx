// import { UserCircleIcon } from '@heroicons/react/24/outline';
import { notFound } from 'next/navigation';

import AI from '@/components/ai';
import { Content } from '@/components/content';
import { Header } from '@/components/header';
import { getById } from '@/controllers/document';
import { getCurrent } from '@/controllers/session-user';

// import { Document } from '@/types';

export default async function DocumentPage({
  params: { document: id },
}: {
  params: { document: string };
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  const document = await getById(id);
  if (document.orgId !== user.orgId) {
    return notFound();
  }

  const breadcrumbs = [{ name: 'Documents', href: '/documents' }];

  return (
    <>
      <Header title={document.name} breadcrumbs={breadcrumbs} />
      <Content pad={true}>
        <div className="text-sm mb-4">
          <div>Classified as: {document.classifiedType}</div>
          {document.usage ? (
            <ul className="text-sm">
              <li>Extraction: {document.usage.extractMs / 1000} seconds</li>
              <li>Classify: {document.usage.classifyMs / 1000} seconds</li>
              <li>
                Ask questions: {document.usage.askQuestionsMs / 1000} seconds
              </li>
              <li>Num questions: {document.usage.numQuestions}</li>
            </ul>
          ) : null}
        </div>
        <div className="text-med leading-6 text-gray-500">Raw Content</div>
        <div className="text-xs h-48 overflow-y-scroll p-4 rounded-lg shadow-sm ring-1 ring-inset ring-gray-300">
          {document.extracted}
        </div>

        {process.env.NEXT_PUBLIC_ENVIRONMENT !== 'production' && (
          <AI document={document} />
        )}

        {/* <div className="lg:col-start-3">
            {/* <Actions document={document} /> */}
        {/* <Activity changes={await getChangesById(id)} user={user} /> */}
      </Content>
    </>
  );
}

// function Actions({ document }: { document: Document }) {
//   return (
//     <div className="lg:col-start-3 lg:row-end-1 mb-5">
//       <h2 className="sr-only">Document Info</h2>
//       <div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5">
//         <dl className="flex flex-wrap">
//           <div className="flex w-full flex-none gap-x-4 px-3 pt-6">
//             <dt className="flex-none">
//               <span className="sr-only">Document Info</span>
//               <UserCircleIcon
//                 className="h-6 w-5 text-gray-400"
//                 aria-hidden="true"
//               />
//             </dt>
//             <dd className="text-sm font-medium leading-6 text-gray-900">
//               Download
//             </dd>
//           </div>
//           <div className="flex w-full flex-none gap-x-4 px-3">
//             <dt className="flex-none">
//               <span className="sr-only">Client</span>
//               <UserCircleIcon
//                 className="h-6 w-5 text-gray-400"
//                 aria-hidden="true"
//               />
//             </dt>
//             <dd className="text-sm font-medium leading-6 text-gray-900">AI</dd>
//           </div>

//           {/* <div className="flex-auto pl-6 pt-6">
//             <dt className="text-sm font-semibold leading-6 text-gray-900">
//               Amount
//             </dt>
//             <dd className="mt-1 text-base font-semibold leading-6 text-gray-900">
//               $10,560.00
//             </dd>
//           </div>
//           <div className="flex-none self-end px-6 pt-4">
//             <dt className="sr-only">Status</dt>
//             <dd className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-600/20">
//               Paid
//             </dd>
//           </div> */}
//           <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
//             <dt className="flex-none">
//               <span className="sr-only">Client</span>
//               <UserCircleIcon
//                 className="h-6 w-5 text-gray-400"
//                 aria-hidden="true"
//               />
//             </dt>
//             <dd className="text-sm font-medium leading-6 text-gray-900">
//               Alex Curren
//             </dd>
//           </div>
//           <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
//             <dt className="flex-none">
//               <span className="sr-only">Due date</span>
//               {/* <CalendarDaysIcon
//                 className="h-6 w-5 text-gray-400"
//                 aria-hidden="true"
//               /> */}
//             </dt>
//             <dd className="text-sm leading-6 text-gray-500">
//               <time dateTime="2023-01-31">January 31, 2023</time>
//             </dd>
//           </div>
//           <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
//             <dt className="flex-none">
//               <span className="sr-only">Status</span>
//               {/* <CreditCardIcon
//                 className="h-6 w-5 text-gray-400"
//                 aria-hidden="true"
//               /> */}
//             </dt>
//             <dd className="text-sm leading-6 text-gray-500">
//               Paid with MasterCard
//             </dd>
//           </div>
//         </dl>
//         <div className="mt-6 border-t border-gray-900/5 px-6 py-6">
//           <a href="#" className="text-sm font-semibold leading-6 text-gray-900">
//             Download receipt <span aria-hidden="true">&rarr;</span>
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// }
