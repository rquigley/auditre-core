import { program } from 'commander';
import prompts from 'prompts';
import { loadEnvConfig } from '@next/env';

import { create as createUser } from '@/controllers/user';
import { create as createPassword } from '@/controllers/password';
import { create as createOrg } from '@/controllers/org';
import { db } from '@/lib/db';
import type { OrgId } from '@/types';

const dev = process.env.NODE_ENV !== 'production';
loadEnvConfig(process.cwd(), dev, { info: () => null, error: console.error });

async function registerUser(orgId: OrgId, email: string, password?: string) {
  const user = await createUser({
    orgId,
    email,
  });

  await createPassword({
    userId: user.id,
    value: password,
  });
  console.log(
    `Created User with\nID: ${user.id}\nEmail: ${email}\nPassword: ${password}`,
  );
}
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
  .description('Creates a user with a given email.')
  .argument('<orgId>', 'Organization ID')
  .argument('<email>', 'user email')
  .option('-P', 'Prompt for a password')
  .action(async (orgId, email, opts) => {
    let password;

    if (opts.P) {
      const resp = await prompts({
        type: 'password',
        name: 'value',
        message: 'Password:',
        validate: (value) => {
          // TODO: Use a password validator
          if (value.length < 4) {
            return 'Invalid password';
          } else {
            return true;
          }
        },
      });
      password = resp.value;
    }

    await registerUser(orgId, email, password);
    await db.destroy();
  });
program.parse();
