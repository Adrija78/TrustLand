import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export async function getUserByWallet(walletAddress: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('users').select('*').eq('wallet_address', walletAddress).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createUser(userData: { wallet_address: string; role: string; name?: string }) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('users').insert([userData]).select().single();
  if (error) throw error;
  return data;
}

export async function updateUser(id: string, userData: Record<string, unknown>) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('users').update({ ...userData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getLoans(borrowerId?: string) {
  if (!supabase) return [];
  let query = supabase.from('loans').select('*, borrower:users!loans_borrower_id_fkey(*)').order('created_at', { ascending: false });
  if (borrowerId) query = query.eq('borrower_id', borrowerId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createLoan(loanData: Record<string, unknown>) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('loans').insert([{ ...loanData, remaining_amount: loanData.amount, status: 'pending' }]).select().single();
  if (error) throw error;
  return data;
}

export async function repayLoan(loanId: string, amount: number) {
  if (!supabase) return null;
  const { data: loan } = await supabase.from('loans').select('*').eq('id', loanId).single();
  if (!loan) throw new Error('Loan not found');
  const newRepaid = (loan.amount_repaid || 0) + amount;
  const remaining = loan.amount - newRepaid;
  const { data, error } = await supabase.from('loans').update({
    amount_repaid: newRepaid,
    remaining_amount: Math.max(0, remaining),
    status: remaining <= 0 ? 'repaid' : 'approved',
    updated_at: new Date().toISOString(),
  }).eq('id', loanId).select().single();
  if (error) throw error;
  return data;
}

export async function getPool() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('pools').select('*').limit(1).single();
  if (error) throw error;
  return data;
}

export async function depositToPool(poolId: string, userId: string, amount: number) {
  if (!supabase) return;
  const { data: pool } = await supabase.from('pools').select('*').eq('id', poolId).single();
  if (!pool) throw new Error('Pool not found');
  await supabase.from('pools').update({
    total_liquidity: pool.total_liquidity + amount,
    available_funds: pool.available_funds + amount,
  }).eq('id', poolId);
  await supabase.from('pool_transactions').insert([{ pool_id: poolId, user_id: userId, type: 'deposit', amount }]);
}

export async function getNftAchievements(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('nft_achievements').select('*').eq('user_id', userId).order('earned_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDashboardStats() {
  if (!supabase) return { totalValueLocked: 100000, totalLoansIssued: 250000, activeBorrowers: 1250, repaymentRate: 97 };
  const [poolRes, loansRes, usersRes] = await Promise.all([
    supabase.from('pools').select('total_liquidity').single(),
    supabase.from('loans').select('amount, status'),
    supabase.from('users').select('id').eq('role', 'borrower'),
  ]);
  const loans = loansRes.data || [];
  const totalRepaid = loans.filter(l => l.status === 'repaid').length;
  const totalLoans = loans.filter(l => l.status !== 'pending').length;
  return {
    totalValueLocked: poolRes.data?.total_liquidity || 0,
    totalLoansIssued: loans.reduce((s, l) => l.status !== 'pending' ? s + Number(l.amount) : s, 0),
    activeBorrowers: usersRes.data?.length || 0,
    repaymentRate: totalLoans > 0 ? Math.round((totalRepaid / totalLoans) * 100) : 0,
  };
}
