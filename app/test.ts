import {
  create as createUser,
  getById,
  update,
  getByAccountProviderAndProviderId,
} from '@/controllers/user';
import { create as createAccount } from '@/controllers/account';
import * as sessionCtrl from '@/controllers/session';
import { NewUser, UserUpdate } from '@/types';
import { loadEnvConfig } from '@next/env';
import { db } from '@/lib/db';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function run1() {
  const newUser: NewUser = {
    name: 'New User',
    email: `newuser${Date.now()}@example.com`,
    //password: "newpassword",
  };
  const createdUser = await createUser(newUser);
  //console.log(createdUser);
  const testUserId = createdUser.id;

  const provider = 'github';
  const providerAccountId = Date.now().toString();
  const account = await createAccount({
    userId: createdUser.id,
    type: 'github',
    provider,
    providerAccountId,
  });
  //console.log(account);

  const data = await getByAccountProviderAndProviderId(
    provider,
    providerAccountId,
  );
  console.log(data);

  // const user = await getById(testUserId);
  // const updateWith: UserUpdate = {
  //   name: "Updated User",
  // };
  // await update(testUserId, updateWith);
  // const updatedUser = await getById(testUserId);
  // console.log(updatedUser);

  db.destroy();
}

async function run2() {
  const account = await sessionCtrl.create({
    userId: 1,
    sessionToken: '2sdfhfsdhfdshfds',
    expires: new Date(Date.now()),
  });
  console.log(account.id);
  const res = await sessionCtrl.deleteBySessionToken('2sdfhfsdhfdshfds');
  console.log(res);
  db.destroy();
}

run2();
