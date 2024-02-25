import { db, sql } from '@/lib/db';

import type { AuditId, OrgId } from '@/types';

export async function setKV({
  orgId,
  auditId,
  key,
  value,
}: {
  orgId: OrgId;
  auditId?: AuditId;
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}) {
  const rawKey = `${orgId}:${auditId}:${key}`;
  await db
    .insertInto('kv')
    .values({ key: rawKey, value: String(value) })
    .onConflict((oc) => oc.column('key').doUpdateSet({ value }))
    .execute();
}

export async function getKV({
  orgId,
  auditId,
  key,
  sinceMs,
}: {
  orgId: OrgId;
  auditId?: AuditId;
  key: string;
  sinceMs?: number;
}) {
  const rawKey = `${orgId}:${auditId}:${key}`;

  const res = await db
    .selectFrom('kv')
    .select('value')
    .$if(Boolean(sinceMs), (q) =>
      q.where(
        'modifiedAt',
        '>',
        sql<Date>`now() - interval ${sql.lit(`${sinceMs} milliseconds`)}`,
      ),
    )
    .where('key', '=', rawKey)
    .executeTakeFirst();

  return res?.value;
}

export async function updateKV({
  orgId,
  auditId,
  key,
  updater,
}: {
  orgId: OrgId;
  auditId?: AuditId;
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updater: (prevKey: string | undefined) => any;
}) {
  const rawKey = `${orgId}:${auditId}:${key}`;

  await db.transaction().execute(async (trx) => {
    const res = await trx
      .selectFrom('kv')
      .where('key', '=', rawKey)
      .selectAll()
      .executeTakeFirst();

    const newValue = String(updater(res?.value));

    await trx
      .insertInto('kv')
      .values({ key: rawKey, value: newValue })
      .onConflict((oc) => oc.column('key').doUpdateSet({ value: newValue }))
      .execute();
  });
}

export async function deleteKV({
  orgId,
  auditId,
  key,
}: {
  orgId: OrgId;
  auditId?: AuditId;
  key: string;
}) {
  const rawKey = `${orgId}:${auditId}:${key}`;
  await db.deleteFrom('kv').where('key', '=', rawKey).execute();
}
