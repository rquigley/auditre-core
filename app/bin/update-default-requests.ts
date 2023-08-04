import { program } from 'commander';
import { loadEnvConfig } from '@next/env';
import { getAll } from '@/controllers/audit';
import { upsertDefault } from '@/controllers/request';
import { db } from '@/lib/db';

const dev = process.env.NODE_ENV !== 'production';
loadEnvConfig(process.cwd(), dev, { info: () => null, error: console.error });

async function main() {
  const audits = await getAll();
  for (const audit of audits) {
    await upsertDefault(audit.id);
  }
  console.log(`Updated ${audits.length} audits.`);
  await db.destroy();
}

program.description('Update the default requests for all accounts.').parse();

main();
