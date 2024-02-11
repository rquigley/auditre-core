import { notFound } from 'next/navigation';

import { getById } from '@/controllers/org';
import { getCurrent } from '@/controllers/session-user';
import { OrgId } from '@/types';

export default async function OrgPage({
  params: { orgId },
}: {
  params: { orgId: OrgId };
}) {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }
  // console.log(orgId);
  const org = await getById(orgId);

  if (org.id !== user.orgId) {
    return notFound();
  }

  console.log(org);
  return null;
  // return (
  //   <>
  //     <Header title={document.name} breadcrumbs={breadcrumbs} />
  //     <Content pad={true}>
  //       <div className="text-sm mb-4">
  //         <div>Classified as: {document.classifiedType}</div>
  //         {document.usage ? (
  //           <ul className="text-sm">
  //             <li>Extraction: {document.usage.extractMs / 1000} seconds</li>
  //             <li>Classify: {document.usage.classifyMs / 1000} seconds</li>
  //             <li>
  //               Ask questions: {document.usage.askQuestionsMs / 1000} seconds
  //             </li>
  //             <li>Num questions: {document.usage.numQuestions}</li>
  //           </ul>
  //         ) : null}
  //       </div>
  //       <div className="text-med leading-6 text-gray-500">Raw Content</div>
  //       <div className="text-xs h-48 overflow-y-scroll p-4 rounded-lg shadow-sm ring-1 ring-inset ring-gray-300">
  //         {document.extracted}
  //       </div>
  //       <AI document={document} />

  //       {/* <div className="lg:col-start-3">
  //           {/* <Actions document={document} /> */}
  //       {/* <Activity changes={await getChangesById(id)} user={user} /> */}
  //     </Content>
  //   </>
  // );
}
