UPDATE org SET can_have_child_orgs = TRUE WHERE name = 'AuditRe, Inc.';
UPDATE org SET parent_org_id = (SELECT id FROM org where name = 'AuditRe, Inc.') WHERE name = 'Acme Test Org';
