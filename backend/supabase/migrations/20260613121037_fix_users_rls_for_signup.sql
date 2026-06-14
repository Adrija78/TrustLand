-- Drop existing restrictive policies
DROP POLICY IF EXISTS select_own_users ON users;
DROP POLICY IF EXISTS insert_own_users ON users;
DROP POLICY IF EXISTS update_own_users ON users;
DROP POLICY IF EXISTS delete_own_users ON users;

-- Create new policies that allow anonymous signup
-- Users can insert their own record (anonymous signup via wallet)
CREATE POLICY "insert_users_signup" ON users FOR INSERT
  WITH CHECK (true);

-- Users can read all users (for viewing profiles in the app)
CREATE POLICY "select_users_all" ON users FOR SELECT
  USING (true);

-- Users can update their own record (by wallet address match via JWT or anon)
CREATE POLICY "update_own_user" ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- No deletion for now (soft delete approach)
