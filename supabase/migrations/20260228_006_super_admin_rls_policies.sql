-- Super admin ALL policy for every major table

-- vehicles
CREATE POLICY "Super admins full access to vehicles"
  ON vehicles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- leads
CREATE POLICY "Super admins full access to leads"
  ON leads FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- appointments
CREATE POLICY "Super admins full access to appointments"
  ON appointments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- conversations
CREATE POLICY "Super admins full access to conversations"
  ON conversations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- messages
CREATE POLICY "Super admins full access to messages"
  ON messages FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- knowledge_base_files
CREATE POLICY "Super admins full access to knowledge_base_files"
  ON knowledge_base_files FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- faqs
CREATE POLICY "Super admins full access to faqs"
  ON faqs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- agent_configs
CREATE POLICY "Super admins full access to agent_configs"
  ON agent_configs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- dealerships
CREATE POLICY "Super admins full access to dealerships"
  ON dealerships FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- profiles
CREATE POLICY "Super admins full access to profiles"
  ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
