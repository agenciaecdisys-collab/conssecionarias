-- Expand dealerships table with additional fields
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 3;

-- Index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_dealerships_slug ON dealerships (slug);
