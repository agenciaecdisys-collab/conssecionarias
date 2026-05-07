-- Create whatsapp_instances table
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  instance_id TEXT,
  token TEXT,
  instance_name TEXT,
  admin_field_01 TEXT,
  phone TEXT,
  webhook_created BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  qr_code TEXT,
  pairing_code TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_dealership ON whatsapp_instances (dealership_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances (status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_instances_updated_at ON whatsapp_instances;
CREATE TRIGGER whatsapp_instances_updated_at
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view own instances"
  ON whatsapp_instances FOR SELECT
  USING (dealership_id = get_user_dealership_id());

CREATE POLICY "Tenant users can insert own instances"
  ON whatsapp_instances FOR INSERT
  WITH CHECK (dealership_id = get_user_dealership_id());

CREATE POLICY "Tenant users can update own instances"
  ON whatsapp_instances FOR UPDATE
  USING (dealership_id = get_user_dealership_id());

CREATE POLICY "Tenant users can delete own instances"
  ON whatsapp_instances FOR DELETE
  USING (dealership_id = get_user_dealership_id());

CREATE POLICY "Super admins full access to whatsapp_instances"
  ON whatsapp_instances FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
