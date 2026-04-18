-- Add password_hash column for authentication
ALTER TABLE donors ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Make email unique (safe if already exists)
DO $$ BEGIN
  ALTER TABLE donors ADD CONSTRAINT donors_email_unique UNIQUE (email);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
