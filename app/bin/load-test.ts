import { create as createAudit } from '@/controllers/audit';
import { addDemoData } from '@/controllers/audit-demo';
import { createOrg } from '@/controllers/org';
import { createUser } from '@/controllers/user';
import { db } from '@/lib/db';

async function main() {
  const dn = Date.now();
  for (let m = 0; m < 1000; m++) {
    const org = await createOrg({
      name: `test ${dn} org ${m}`,
      canHaveChildOrgs: false,
      url: '',
      image: '',
    });
    for (let n = 0; n < 5; n++) {
      const user = await createUser({
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

main();
