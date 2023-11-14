import { program } from 'commander';

import { create as createAudit } from '@/controllers/audit';
import { addDemoData } from '@/controllers/audit-demo';
import { create as createOrg } from '@/controllers/org';
import { createUser } from '@/controllers/user';
import { db } from '@/lib/db';

async function main() {
  const dn = Date.now();
  for (let m = 0; m < 1000; m++) {
    const org = await createOrg({ name: `test ${dn} org ${m}` });
    for (let n = 0; n < 5; n++) {
      const user = await createUser(org.id, {
        email: `user${n}@test-${dn}-org${m}.debug`,
      });
      const audit = await createAudit({
        orgId: org.id,
        name: `Audit $n`,
      });
      await addDemoData(audit.id, user.id);
    }
    console.log(`Org created: ${m}`);
  }
  await db.destroy();
}

program
  .description('Create a demo org, user, and account.')
  .option('-n, --name <name>', "Set the organization's name")
  .parse();

main();
