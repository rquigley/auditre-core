import { create, getById, update } from "@/controllers/user";
import { getDb } from "@/lib/db";
import { NewUser, UserUpdate } from "@/types";

async function run() {
  const newUser: NewUser = {
    name: "New User",
    email: "newuser@example.com",
    //password: "newpassword",
  };
  const createdUser = await create(newUser);
  console.log(createdUser);
  const testUserId = createdUser.id;

  const user = await getById(testUserId);
  const updateWith: UserUpdate = {
    name: "Updated User",
  };
  await update(testUserId, updateWith);
  const updatedUser = await getById(testUserId);
  console.log(updatedUser);
}

run();
