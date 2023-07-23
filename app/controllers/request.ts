// import 'server-only';

import { db, json } from '@/lib/db';
import type {
  RequestUpdate,
  Actor,
  Request,
  RequestValue,
  RequestChangeValue,
  NewRequest,
  UserId,
  AuditId,
  RequestId,
  RequestChange,
  NewRequestChange,
} from '@/types';
import { nanoid } from 'nanoid';
import { getById as getUserById } from '@/controllers/user';

type CreateRequest = Omit<NewRequest, 'externalId' | 'value'> & {
  value: any;
};
export async function create(
  request: CreateRequest,
  actor: Actor,
): Promise<Request> {
  const res = await db
    .insertInto('request')
    .values({ ...request, externalId: nanoid(), value: json(request.value) })
    .returningAll()
    .executeTakeFirstOrThrow();

  await logChange({
    requestId: res.id,
    newData: request.value,
    actor,
    auditId: request.auditId,
  });

  return res;
}

export async function upsertDefault(auditId: AuditId) {
  const currentReqs = await getAllByAuditId(auditId);
  if (!currentReqs.find((r) => r.type === 'BUSINESS_NAME')) {
    await create(
      {
        auditId,
        type: 'BUSINESS_NAME',
        name: 'Legal Name of business',
        status: 'requested',
        value: { value: '' },
      },
      { type: 'SYSTEM' },
    );
  }
  if (!currentReqs.find((r) => r.type === 'BUSINESS_NAME')) {
    await create(
      {
        auditId,
        type: 'BUSINESS_MODEL',
        name: 'Business Model',
        status: 'requested',
        value: { value: '' },
      },
      { type: 'SYSTEM' },
    );
  }
  if (!currentReqs.find((r) => r.type === 'BUSINESS_DESCRIPTION')) {
    await create(
      {
        auditId,
        type: 'BUSINESS_DESCRIPTION',
        name: 'Business Description',
        description: 'Description of the business',
        status: 'requested',
        value: { value: '' },
      },
      { type: 'SYSTEM' },
    );
  }
  if (!currentReqs.find((r) => r.type === 'MULTIPLE_BUSINESS_LINES')) {
    await create(
      {
        auditId,
        type: 'MULTIPLE_BUSINESS_LINES',
        name: 'Multiple lines',
        description: 'Does the business have multiple business lines?',
        status: 'requested',
        value: { value: '' },
      },
      { type: 'SYSTEM' },
    );
  }
}

export function getById(id: RequestId): Promise<Request> {
  return db
    .selectFrom('request')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getByExternalId(externalId: string): Promise<Request> {
  return db
    .selectFrom('request')
    .where('externalId', '=', externalId)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByAuditId(auditId: AuditId): Promise<Request[]> {
  return db
    .selectFrom('request')
    .where('auditId', '=', auditId)
    .selectAll()
    .execute();
}

export async function update(
  id: number,
  updateWith: RequestUpdate,
  actor: Actor,
) {
  const request = await db
    .updateTable('request')
    .set({ ...updateWith })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();

  const newData = {
    ...request.value,
    status: request.status,
    dueDate: request.dueDate,
    isDeleted: request.isDeleted,
  };
  await logChange({
    requestId: request.id,
    actor,
    auditId: request.auditId,
    newData,
  });
}

export async function updateValue(id: number, value: string, actor: Actor) {
  return update(id, { value: { value } }, actor);
}

export function logChange({
  requestId,
  actor,
  auditId,
  newData,
}: {
  requestId: RequestId;
  actor: Actor;
  auditId: AuditId;
  newData: RequestChangeValue;
}): Promise<RequestChange> {
  return db
    .insertInto('requestChange')
    .values({
      requestId,
      externalId: nanoid(),
      auditId,
      actor,
      newData,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export type Change = {
  type: 'CREATED' | 'VALUE';
  createdAt: Date;
  actor: { type: 'USER'; name: string } | { type: 'SYSTEM' };
};
export async function getChangesById(requestId: RequestId): Promise<Change[]> {
  const changes = await db
    .selectFrom('requestChange')
    .where('requestId', '=', requestId)
    .orderBy('createdAt')
    .selectAll()
    .execute();

  let ret: Change[] = [];

  for (let n = 0; n < changes.length; n++) {
    let change = changes[n];
    let actor;
    if (change.actor.type === 'USER') {
      const user = await getUserById(change.actor.userId);
      actor = { type: 'USER', name: user.name };
    } else {
      actor = { type: 'SYSTEM' };
    }
    if (n === 0) {
      ret.push({
        type: 'CREATED',
        createdAt: change.createdAt,
        actor,
      });
    } else {
      if (changes[n - 1].newData.value !== change.newData.value) {
        ret.push({
          type: 'VALUE',
          createdAt: change.createdAt,
          actor,
        });
      }
    }
  }
  return ret;
}
