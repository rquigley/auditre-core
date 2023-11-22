import { db } from '@/lib/db';

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
  value: any;
}): Promise<void> {
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
}: {
  orgId: OrgId;
  auditId?: AuditId;
  key: string;
}): Promise<string | undefined> {
  const rawKey = `${orgId}:${auditId}:${key}`;

  const res = await db
    .selectFrom('kv')
    .where('key', '=', rawKey)
    .selectAll()
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
  updater: (prevKey: string | undefined) => any;
}): Promise<void> {
  const rawKey = `${orgId}:${auditId}:${key}`;

  await db.transaction().execute(async (trx) => {
    const res = await trx
      .selectFrom('kv')
      .where('key', '=', rawKey)
      .selectAll()
      .executeTakeFirst();

    const newValue = String(updater(res?.value));
    console.log('new Value', newValue, 'prev', res?.value);

    await trx
      .insertInto('kv')
      .values({ key: rawKey, value: newValue })
      .onConflict((oc) => oc.column('key').doUpdateSet({ value: newValue }))
      .execute();
  });
}
