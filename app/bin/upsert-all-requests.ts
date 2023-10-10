import { program } from 'commander';

import { upsertAll } from '@/controllers/request';
import { db } from '@/lib/db';

import type { OrgId } from '@/types';

async function main() {
  await upsertAll();
  await db.destroy();
}

program
  .description('Create a demo org, user, and account.')
  .option('-n, --name <name>', "Set the organization's name")
  .parse();

main();
