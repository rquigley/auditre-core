DROP TABLE "account_mapping";

ALTER TABLE "account_balance" DROP COLUMN "account_number";
ALTER TABLE "account_balance" ALTER COLUMN "account_name" SET NOT NULL;
