// import 'server-only';

import { db, json } from '@/lib/db';
import type {
  RequestUpdate,
  Actor,
  Request,
  RequestData,
  RequestChangeValue,
  NewRequest,
  UserId,
  AuditId,
  RequestId,
  RequestChange,
  NewRequestChange,
  RequestType,
} from '@/types';
import { nanoid } from 'nanoid';
import { getById as getUserById } from '@/controllers/user';
import type { ZodTypeAny } from 'zod';
import * as schemas from '@/lib/form-schema';

type CreateRequest = Omit<NewRequest, 'externalId' | 'value'> & {
  data: any;
};

type RequestFormType = {
  name: string;
  defaultValue: RequestData;
  schema: ZodTypeAny;
};
type RequestTypes = {
  [key in RequestType]: RequestFormType;
};

export const requestTypes: RequestTypes = {
  BUSINESS_NAME: {
    name: 'Legal Name of business',
    defaultValue: {
      value: '',
    },
    schema: schemas.businessNameSchema,
  },
  BUSINESS_MODEL: {
    name: 'Business Model',
    defaultValue: {
      value: '',
    },
    schema: schemas.businessModelSchema,
  },
  BUSINESS_DESCRIPTION: {
    name: 'Business Description',
    defaultValue: {
      value: '',
    },
    schema: schemas.businessModelSchema,
  },
  MULTIPLE_BUSINESS_LINES: {
    name: 'Multiple lines',
    defaultValue: {
      value: '',
    },
    schema: schemas.businessModelSchema,
  },
  USER_REQUESTED: {
    name: '???',
    defaultValue: {
      value: '',
    },
    schema: schemas.businessModelSchema,
  },
} as const;

export async function create(
  request: CreateRequest,
  actor: Actor,
): Promise<Request> {
  const res = await db
    .insertInto('request')
    .values({ ...request, externalId: nanoid(), data: json(request.data) })
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

export async function upsertDefault(auditId: AuditId) {
  const currentReqs = await getAllByAuditId(auditId);
  for (let type in requestTypes) {
    if (type === 'USER_REQUESTED' || currentReqs.find((r) => r.type === type)) {
      // TODO: check for different value shape here.
      continue;
    }
    const request = requestTypes[type as RequestType];
    await create(
      {
        auditId,
        type: type as RequestType,
        name: request.name,
        status: 'requested',
        data: request.defaultValue,
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
  schema,
}: {
  id: RequestId;
  data: string;
  actor: Actor;
  schema: ZodTypeAny;
}) {
  console.log('new', data);
  const parsed = schema.parse(data);

  return await update(id, { data: parsed }, actor);
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
      if (changes[n - 1].newData !== change.newData) {
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
