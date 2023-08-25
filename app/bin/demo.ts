import { program } from 'commander';
//import prompts from 'prompts';
import { create as createOrg } from '@/controllers/org';
import { create as createAudit } from '@/controllers/audit';
import { create as createInvitation } from '@/controllers/invitation';
import { upsertDefault } from '@/controllers/request';
import { db } from '@/lib/db';
import type { OrgId } from '@/types';

async function setupAccount(): Promise<OrgId> {
  const org = await createOrg({ name: 'Test Org' });
  const testUserEmail = 'ryan@auditre.co';

  const invitation = await createInvitation({
    orgId: org.id,
    email: testUserEmail,
  });

  console.log(`Created User with\nEmail: ${testUserEmail}`);

  return org.id;
}

async function setupAudit(orgId: OrgId) {
  const audit1 = await createAudit({
    orgId,
    name: 'Our First Audit',
    year: 2023,
  });
  await upsertDefault({ auditId: audit1.id, orgId: orgId });
  const audit2 = await createAudit({
    orgId,
    name: 'Old Audit',
    year: 2022,
  });
  await upsertDefault({ auditId: audit2.id, orgId: orgId });
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
