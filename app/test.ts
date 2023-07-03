import {
  create as createUser,
  getById,
  update,
  getByAccountProviderAndProviderId,
} from "@/controllers/user";
import { create as createAccount } from "@/controllers/account";
import { NewUser, UserUpdate } from "@/types";
import { loadEnvConfig } from "@next/env";
import { db } from "@/lib/db";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function run() {
  const newUser: NewUser = {
    name: "New User",
    email: `newuser${Date.now()}@example.com`,
    //password: "newpassword",
  };
  const createdUser = await createUser(newUser);
  //console.log(createdUser);
  const testUserId = createdUser.id;

  const provider = "github";
  const providerAccountId = Date.now().toString();
  const account = await createAccount({
    userId: createdUser.id,
    type: "github",
    provider,
    providerAccountId,
  });
  //console.log(account);

  const data = await getByAccountProviderAndProviderId(
    provider,
    providerAccountId
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

run();
