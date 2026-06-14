-- Fix loans table RLS
DROP POLICY IF EXISTS select_own_loans ON loans;
DROP POLICY IF EXISTS insert_own_loans ON loans;
DROP POLICY IF EXISTS update_own_loans ON loans;
DROP POLICY IF EXISTS delete_own_loans ON loans;

CREATE POLICY "select_loans_all" ON loans FOR SELECT USING (true);
CREATE POLICY "insert_loans_all" ON loans FOR INSERT WITH CHECK (true);
CREATE POLICY "update_loans_all" ON loans FOR UPDATE USING (true) WITH CHECK (true);

-- Fix nft_achievements
DROP POLICY IF EXISTS select_nft_achievements ON nft_achievements;
DROP POLICY IF EXISTS insert_nft_achievements ON nft_achievements;

CREATE POLICY "select_nft_all" ON nft_achievements FOR SELECT USING (true);
CREATE POLICY "insert_nft_all" ON nft_achievements FOR INSERT WITH CHECK (true);

-- Fix pool_transactions
DROP POLICY IF EXISTS select_pool_transactions ON pool_transactions;
DROP POLICY IF EXISTS insert_pool_transactions ON pool_transactions;

CREATE POLICY "select_pool_tx_all" ON pool_transactions FOR SELECT USING (true);
CREATE POLICY "insert_pool_tx_all" ON pool_transactions FOR INSERT WITH CHECK (true);

-- Fix pools
DROP POLICY IF EXISTS select_pools ON pools;
DROP POLICY IF EXISTS insert_pools ON pools;
DROP POLICY IF EXISTS update_pools ON pools;

CREATE POLICY "select_pools_all" ON pools FOR SELECT USING (true);
CREATE POLICY "insert_pools_all" ON pools FOR INSERT WITH CHECK (true);
CREATE POLICY "update_pools_all" ON pools FOR UPDATE USING (true) WITH CHECK (true);

-- Fix transactions
DROP POLICY IF EXISTS select_transactions ON transactions;
DROP POLICY IF EXISTS insert_transactions ON transactions;

CREATE POLICY "select_trans_all" ON transactions FOR SELECT USING (true);
CREATE POLICY "insert_trans_all" ON transactions FOR INSERT WITH CHECK (true);

-- Fix reputation_history
DROP POLICY IF EXISTS select_reputation_history ON reputation_history;
DROP POLICY IF EXISTS insert_reputation_history ON reputation_history;

CREATE POLICY "select_rephist_all" ON reputation_history FOR SELECT USING (true);
CREATE POLICY "insert_rephist_all" ON reputation_history FOR INSERT WITH CHECK (true);
