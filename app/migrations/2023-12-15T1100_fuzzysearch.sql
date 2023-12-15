CREATE EXTENSION pg_trgm;

CREATE INDEX idx_account_balance_audit_id_1 ON account_balance (audit_id);