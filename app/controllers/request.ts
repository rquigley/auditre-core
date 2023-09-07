// import 'server-only';

import { db } from '@/lib/db';
import type {
  RequestUpdate,
  Actor,
  Request,
  RequestChangeValue,
  NewRequest,
  OrgId,
  AuditId,
  RequestId,
  RequestChange,
} from '@/types';
import { requestTypes, RequestType } from '@/lib/request-types';

type CreateRequest = Omit<NewRequest, 'value'> & {
  data: any;
};

export async function create(
  request: CreateRequest,
  actor: Actor,
): Promise<Request> {
  const res = await db
    .insertInto('request')
    .values({ ...request })
    .returningAll()
    .executeTakeFirstOrThrow();

  await logChange({
    requestId: res.id,
    newData: request.data,
    actor,
    auditId: request.auditId,
  });

  return res;
}

export async function upsertDefault({
  auditId,
  orgId,
}: {
  auditId: AuditId;
  orgId: OrgId;
}) {
  const currentReqs = await getAllByAuditId(auditId);
  const createPromises = [];
  for (let type in requestTypes) {
    if (type === 'USER_REQUESTED' || currentReqs.find((r) => r.type === type)) {
      // TODO: check for different value shape here.
      continue;
    }
    const request = requestTypes[type as RequestType];
    createPromises.push(
      create(
        {
          auditId,
          orgId,
          type: type as RequestType,
          name: request.name,
          status: 'requested',
          data: request.defaultValue,
        },
        { type: 'SYSTEM' },
      ),
    );
  }
  await Promise.allSettled(createPromises);
  await Promise.all(createPromises); // throw if any fail
}

export function getById(id: RequestId): Promise<Request> {
  return db
    .selectFrom('request')
    .where('id', '=', id)
    .where('isDeleted', '=', false)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByAuditId(auditId: AuditId): Promise<Request[]> {
  return db
    .selectFrom('request')
    .where('auditId', '=', auditId)
    .where('isDeleted', '=', false)
    .orderBy('createdAt')
    .selectAll()
    .execute();
}

export async function update(
  id: RequestId,
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
    ...request.data,
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

export async function updateData({
  id,
  data,
  actor,
  type,
}: {
  id: RequestId;
  data: string;
  actor: Actor;
  type: RequestType;
}) {
  const schema = requestTypes[type].schema;
  const parsed = schema.parse(data);

  const status = requestTypes[type].completeOnSet ? 'complete' : undefined;
  //@ts-ignore
  return await update(id, { data: parsed, status }, actor);
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
      auditId,
      actor,
      newData,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getChangesById(
  requestId: RequestId,
): Promise<RequestChange[]> {
  return await db
    .selectFrom('requestChange')
    .where('requestId', '=', requestId)
    .orderBy('createdAt')
    .selectAll()
    .execute();
}
