import { program } from 'commander';
import { getAll } from '@/controllers/audit';
import { upsertDefault } from '@/controllers/request';
import { db } from '@/lib/db';

async function main() {
  const audits = await getAll();
  for (const audit of audits) {
    await upsertDefault({ auditId: audit.id, orgId: audit.orgId });
  }
  console.log(`Updated ${audits.length} audits.`);
  await db.destroy();
}

program.description('Update the default requests for all accounts.').parse();

main();
