import { program } from 'commander';

import { create as createAudit } from '@/controllers/audit';
import { create as createInvitation } from '@/controllers/invitation';
import { create as createOrg } from '@/controllers/org';
import { saveRequestData } from '@/controllers/request';
import { db } from '@/lib/db';

import type { OrgId } from '@/types';

async function setupAccount(): Promise<OrgId> {
  const org = await createOrg({ name: 'Test Org', canHaveChildOrgs: false });

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
  const audit = await createAudit({
    orgId,
    name: 'Initial Audit',
  });

  let rdP = [
    saveRequestData({
      auditId: audit.id,
      requestType: 'basic-info',
      data: {
        businessName: 'AuditRe, Inc.',
        description:
          'Audit readiness for startups and small businesses. They generate audit-ready financial statements in a matter of days instead of months – at a fraction of the cost – by bringing technology to the traditional audit process.',
        businessModels: ['SOFTWARE_AS_A_SERVICE'],
        chiefDecisionMaker: 'Jason Gordon',
      },
    }),
    saveRequestData({
      auditId: audit.id,
      requestType: 'audit-info',
      data: {
        year: '2021',
        fiscalYearMonthEnd: '12',
        hasBeenAudited: false,
      },
    }),
    saveRequestData({
      auditId: audit.id,
      requestType: 'leases',
      data: {
        hasLeases: false,
        didPerformASC842Analysis: false,
      },
    }),
  ];
  await Promise.all(rdP);
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
