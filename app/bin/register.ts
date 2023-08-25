import { program } from 'commander';
import { create as createInvitation } from '@/controllers/invitation';
import { create as createOrg } from '@/controllers/org';
import { db } from '@/lib/db';

program
  .command('org')
  .description('Creates an organization.')
  .option('-n, --name <name>', "Set the organization's name")
  .action(async (opts) => {
    const org = await createOrg({
      name: opts.name,
    });
    console.log(`Created Org with ID: ${org.id}`);
    await db.destroy();
  });

program
  .command('user')
  .description('Creates an invite for a given email.')
  .argument('<orgId>', 'Organization ID')
  .argument('<email>', 'user email')
  .action(async (orgId, email, opts) => {
    await createInvitation({
      orgId: orgId,
      email,
    });
    await db.destroy();
  });
program.parse();
