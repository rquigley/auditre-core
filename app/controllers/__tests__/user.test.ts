import { create, getById, update } from "../user";
import { db } from "@/lib/db";
import { NewUser, UserUpdate } from "@/types";
// import pg from "pg";
// delete pg.native;

describe("User Controller", () => {
  let testUser: NewUser;
  let testUserId: number;

  // beforeAll(async () => {
  //   // Connect to the test database
  //   await getDb({ database: "test" }).connect();

  //   // Create a test user
  //   testUser = {
  //     name: "Test User",
  //     email: "testuser@example.com",
  //     password: "testpassword",
  //   };
  //   const createdUser = await create(testUser);
  //   testUserId = createdUser.id;
  // });

  // afterAll(async () => {
  //   // Delete the test user
  //   await getDb().deleteFrom("user").where("id", "=", testUserId).execute();

  //   // Disconnect from the test database
  //   await getDb().disconnect();
  // });

  describe("create", () => {
    it("should create a new user", async () => {
      const newUser: NewUser = {
        name: "New User",
        email: "newuser@example.com",
        //password: "newpassword",
      };
      const createdUser = await create(newUser);
      expect(createdUser.name).toBe(newUser.name);
      expect(createdUser.email).toBe(newUser.email);
      //expect(createdUser.password).toBe(newUser.password);
    });
  });

  describe("getById", () => {
    it("should get a user by id", async () => {
      const user = await getById(testUserId);
      expect(user.name).toBe(testUser.name);
      expect(user.email).toBe(testUser.email);
      //expect(user.password).toBe(testUser.password);
    });
  });

  describe("update", () => {
    it("should update a user", async () => {
      const updateWith: UserUpdate = {
        name: "Updated User",
      };
      await update(testUserId, updateWith);
      const updatedUser = await getById(testUserId);
      expect(updatedUser.name).toBe(updateWith.name);
    });
  });
});
