import clsx from 'clsx';
import { revalidatePath } from 'next/cache';
import Image from 'next/image';
import z from 'zod';

import Datetime from '@/components/datetime';
import {
  create as createComment,
  getAllForRequest as getAllCommentsForRequest,
} from '@/controllers/comment';
import { getChangesForRequestType } from '@/controllers/request-data';
import { getCurrent, UnauthorizedError } from '@/controllers/session-user';
import CommentForm from './comment-form';

import type { Request } from '@/controllers/request';
import type { SessionUser } from '@/controllers/session-user';
import type { AuditId } from '@/types';

const schema = z.object({
  comment: z.string().max(500),
});

export default async function Activity({
  auditId,
  request,
  user,
}: {
  auditId: AuditId;
  request: Request;
  user: SessionUser;
}) {
  const feed = await getFeed(auditId, request);

  async function saveData(dataRaw: z.infer<typeof schema>) {
    'use server';

    const { user } = await getCurrent();
    if (!user) {
      throw new UnauthorizedError();
    }

    const data = schema.parse(dataRaw);

    await createComment({
      orgId: user.orgId,
      auditId,
      requestType: request.id,
      comment: data.comment,
      userId: user.id,
    });
    revalidatePath(`/audit/${auditId}/request/${request.id}`);
  }

  return (
    <>
      <ul role="list" className="mt-6 space-y-6">
        {feed.map((item, idx) => (
          <li key={idx} className="relative flex gap-x-4">
            <div
              className={clsx(
                idx === feed.length - 1 ? 'h-6' : '-bottom-6',
                'absolute left-0 top-0 flex w-6 justify-center',
              )}
            >
              <div className="w-px bg-gray-200" />
            </div>
            {item.type === 'COMMENT' ? (
              <>
                {item.actor.type === 'USER' && item.actor.image && (
                  <Image
                    src={item.actor.image}
                    alt=""
                    width="36"
                    height="36"
                    className="relative mt-3 h-6 w-6 flex-none rounded-full bg-gray-50"
                  />
                )}
                <div className="flex-auto rounded-md p-3 ring-1 ring-inset ring-lime-500">
                  <div className="flex justify-between gap-x-4">
                    <div className="py-0.5 text-xs leading-5 text-gray-500">
                      <span className="font-medium text-gray-900">
                        {item.actor.type === 'USER' && item.actor.name}
                      </span>{' '}
                      commented
                    </div>
                    <Datetime
                      className="flex-none py-0.5 text-xs leading-5 text-gray-500"
                      dateTime={item.createdAt}
                    />
                  </div>
                  <p className="text-sm leading-6 text-gray-500">
                    {item.comment}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
                  {/* {
                      item.type === 'paid' ? (
                        <InformationCircleIcon
                          className="h-6 w-6 text-sky-700"
                          aria-hidden="true"
                        />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300" />
                      )
                    } */}
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300" />
                </div>
                <p className="flex-auto py-0.5 text-xs leading-5 text-gray-500">
                  <span className="font-medium text-gray-900">
                    {item.actor.type === 'USER' && item.actor.name}
                  </span>{' '}
                  updated the request
                </p>
                <Datetime
                  className="flex-none py-0.5 text-xs leading-5 text-gray-500"
                  dateTime={item.createdAt}
                />
              </>
            )}
          </li>
        ))}
      </ul>

      {/* New comment form */}
      <div className="mt-6 flex gap-x-3">
        {user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <Image
            src={user.image}
            width="36"
            height="36"
            alt=""
            className="h-6 w-6 flex-none rounded-full bg-gray-50"
          />
        )}
        <CommentForm saveData={saveData} />
      </div>
    </>
  );
}

type UserActor = { type: 'USER'; name: string; image: string | null };
type SystemActor = { type: 'SYSTEM' };
export type Change = {
  type: 'CREATED' | 'VALUE' | 'COMMENT';
  createdAt: Date;
  actor: UserActor | SystemActor;
  comment?: string;
};

async function getFeed(auditId: AuditId, request: Request) {
  const rawChanges = await getChangesForRequestType(auditId, request);
  const rawComments = await getAllCommentsForRequest(auditId, request.id);

  let ret: Change[] = [];

  for (let n = 0; n < rawChanges.length; n++) {
    let change = rawChanges[n];
    let actor;
    if (change.actorUserId) {
      actor = {
        type: 'USER',
        name: change.name,
        image: change.image,
      } as UserActor;
    } else {
      actor = { type: 'SYSTEM' } as SystemActor;
    }

    ret.push({
      type: 'VALUE',
      createdAt: change.createdAt,
      actor,
    });
  }

  for (let n = 0; n < rawComments.length; n++) {
    let comment = rawComments[n];
    ret.push({
      type: 'COMMENT',
      createdAt: comment.createdAt,
      actor: {
        type: 'USER',
        name: comment.name || '',
        image: comment.image || '',
      },
      comment: comment.comment,
    });
  }
  return ret.sort(sortByCreatedAt);
}

function sortByCreatedAt(
  a: { createdAt: Date },
  b: { createdAt: Date },
): number {
  return a.createdAt.getTime() - b.createdAt.getTime();
}
