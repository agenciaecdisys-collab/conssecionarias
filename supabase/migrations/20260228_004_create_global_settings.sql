-- Create global_settings table (single-row)
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  openai_api_key TEXT,
  support_whatsapp TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default row
INSERT INTO global_settings (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Updated_at trigger
DROP TRIGGER IF EXISTS global_settings_updated_at ON global_settings;
CREATE TRIGGER global_settings_updated_at
  BEFORE UPDATE ON global_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: super admins only
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read global_settings"
  ON global_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Super admins can update global_settings"
  ON global_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
