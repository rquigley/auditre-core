import type { OrgId } from '@/types';

export function groupOrgs<
  T extends {
    parentOrgId: OrgId | null;
    id: OrgId;
  },
>(orgs: T[]) {
  type WithChildren = T & {
    children: WithChildren[];
  };
  const orgMap: { [key: string]: WithChildren } = {};
  const ret: WithChildren[] = [];

  orgs.forEach((org) => {
    orgMap[org.id] = { ...org, children: [] };
  });

  orgs.forEach((org) => {
    if (org.parentOrgId && orgMap[org.parentOrgId]) {
      orgMap[org.parentOrgId].children.push(orgMap[org.id]);
      return;
    }
    ret.push(orgMap[org.id]);
  });

  return ret;
}
