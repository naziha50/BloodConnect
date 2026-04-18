-- These columns are now in schema.sql; this file is a no-op for fresh installs
ALTER TABLE donors ADD COLUMN IF NOT EXISTS available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS last_donation_date DATE;
