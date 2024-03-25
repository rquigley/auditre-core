-- NOTE: this requires the name of the database to be fixed
ALTER DATABASE auditre SET log_min_duration_statement = '100ms';
ALTER DATABASE auditre SET statement_timeout = '30s';

-- TODO: add auto_explain
-- https://docs.crunchybridge.com/extensions-and-languages/auto_explain