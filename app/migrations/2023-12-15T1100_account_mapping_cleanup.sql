ALTER TABLE "account_balance" DROP COLUMN "account_number";
ALTER TABLE "account_balance" DROP COLUMN "account_mapping_id";
ALTER TABLE "account_balance" ALTER COLUMN "account_name" SET NOT NULL;

DROP TABLE "account_mapping";