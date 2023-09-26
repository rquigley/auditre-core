import CommentForm from './comment-form';
import Datetime from '@/components/datetime';
import { getAllByRequestId as getAllCommentsByRequestId } from '@/controllers/comment';
import { create as createComment } from '@/controllers/comment';
import { getChangesById } from '@/controllers/request';
import { userLoader } from '@/controllers/user';
import { classNames } from '@/lib/util';
import type { Request, User } from '@/types';
import { revalidatePath } from 'next/cache';
import z from 'zod';

const schema = z.object({
  comment: z.string().max(500),
});

export default async function Activity({
  request,
  user,
}: {
  request: Request;
  user: User;
}) {
  const feed = await getFeed(request);

  async function saveData(data: z.infer<typeof schema>) {
    'use server';

    await createComment({
      orgId: user.orgId,
      requestId: request.id,
      comment: data.comment,
      userId: user.id,
    });
    revalidatePath(`/request/${request.id}`);
  }

  return (
    <>
      <ul role="list" className="mt-6 space-y-6">
        {feed.map((item, idx) => (
          <li key={idx} className="relative flex gap-x-4">
            <div
              className={classNames(
                idx === feed.length - 1 ? 'h-6' : '-bottom-6',
                'absolute left-0 top-0 flex w-6 justify-center',
              )}
            >
              <div className="w-px bg-gray-200" />
            </div>
            {item.type === 'COMMENT' ? (
              <>
                {item.actor.type === 'USER' && item.actor.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.actor.image}
                    alt=""
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
                  {(item.type === 'CREATED' && 'created the request') ||
                    'updated the request'}
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
          <img
            src={user.image}
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

async function getFeed(request: Request) {
  const rawChanges = await getChangesById(request.id);
  const rawComments = await getAllCommentsByRequestId(request.id);

  let ret: Change[] = [];

  for (let n = 0; n < rawChanges.length; n++) {
    let change = rawChanges[n];
    let actor;
    if (change.actor.type === 'USER') {
      const user = await userLoader.load(change.actor.userId);
      actor = { type: 'USER', name: user.name, image: user.image } as UserActor;
    } else {
      actor = { type: 'SYSTEM' } as SystemActor;
    }
    if (n === 0) {
      ret.push({
        type: 'CREATED',
        createdAt: change.createdAt,
        actor,
      });
    } else {
      if (rawChanges[n - 1].newData !== change.newData) {
        ret.push({
          type: 'VALUE',
          createdAt: change.createdAt,
          actor,
        });
      }
    }
  }
  for (let n = 0; n < rawComments.length; n++) {
    let comment = rawComments[n];
    let actor;
    const user = await userLoader.load(comment.userId);
    actor = { type: 'USER', name: user.name, image: user.image } as UserActor;

    ret.push({
      type: 'COMMENT',
      createdAt: comment.createdAt,
      actor,
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
