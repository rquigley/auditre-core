import { program } from 'commander';

import { create as createAudit } from '@/controllers/audit';
import { create as createInvitation } from '@/controllers/invitation';
//import prompts from 'prompts';
import { create as createOrg } from '@/controllers/org';
import { upsertDefault } from '@/controllers/request';
import { db } from '@/lib/db';

import type { OrgId } from '@/types';

async function setupAccount(): Promise<OrgId> {
  const org = await createOrg({ name: 'Test Org' });

  for (let email of ['ryan@auditre.co', 'jason@auditre.co']) {
    await createInvitation({
      orgId: org.id,
      email,
    });
    console.log(`Created invite for: ${email}`);
  }

  return org.id;
}

async function setupAudit(orgId: OrgId) {
  const audit1 = await createAudit({
    orgId,
    name: 'Initial Audit',
    year: 2023,
  });
  await upsertDefault({ auditId: audit1.id, orgId: orgId });
  // const audit2 = await createAudit({
  //   orgId,
  //   name: 'Old Audit',
  //   year: 2022,
  // });
  // await upsertDefault({ auditId: audit2.id, orgId: orgId });
}

async function main() {
  const orgId = await setupAccount();
  await setupAudit(orgId);
  await db.destroy();
}

program
  .description('Create a demo org, user, and account.')
  .option('-n, --name <name>', "Set the organization's name")
  .parse();

main();
