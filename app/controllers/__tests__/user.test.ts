import * as orgCtrl from '@/controllers/org';
import { createUser, getById, updateUser } from '@/controllers/user';
import { db } from '@/lib/db';

import type { Org, OrgId, UserUpdate } from '@/types';

describe('User Controller', () => {
  let testOrg: Org;
  let testOrgId: OrgId;

  beforeAll(async () => {
    const createdOrg = await orgCtrl.create({ name: 'my org' });
    testOrgId = createdOrg.id;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const email = `newuser${Date.now().toString()}@example.com`;
      const newUser = {
        orgId: testOrgId,
        name: 'New User',
        email,
      };
      const createdUser = await createUser(newUser);
      expect(createdUser.name).toBe(newUser.name);
      expect(createdUser.email).toBe(newUser.email);
    });
  });

  describe('getById', () => {
    it('should get a user by id', async () => {
      const testUser = await createUser({
        orgId: testOrgId,
        name: 'New User',
        email: `newuser${Date.now().toString()}@example.com`,
      });

      const user = await getById(testUser.id);
      expect(user.name).toBe(testUser.name);
      expect(user.email).toBe(testUser.email);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const testUser = await createUser({
        orgId: testOrgId,
        name: 'New User',
        email: `newuser${Date.now().toString()}@example.com`,
      });
      const updateWith: UserUpdate = {
        name: 'Updated User',
      };
      await updateUser(testUser.id, updateWith);
      const updatedUser = await getById(testUser.id);
      expect(updatedUser.name).toBe(updateWith.name);
    });
  });
});
