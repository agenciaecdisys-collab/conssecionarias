-- Add is_super_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Helper function to get the dealership_id for the current authenticated user
CREATE OR REPLACE FUNCTION get_user_dealership_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT dealership_id FROM profiles WHERE id = auth.uid();
$$;
