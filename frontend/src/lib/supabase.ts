import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Loan, NftAchievement, Pool } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isPlaceholderSupabase = !supabaseUrl
  || !supabaseAnonKey
  || supabaseUrl.includes('your-project')
  || supabaseAnonKey.includes('your-supabase');

export const supabase: SupabaseClient | null = !isPlaceholderSupabase
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

const demoPool: Pool = {
  id: 'demo-pool',
  name: 'Local Community Pool',
  total_liquidity: 100000,
  available_funds: 85000,
  total_loaned: 15000,
  expected_returns: 4200,
  min_trust_score: 40,
  interest_rate: 6,
};

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw) as T : fallback;
}

function writeLocal<T>(key: string, value: T): T {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
  return value;
}

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
  if (!supabase) {
    const loans = readLocal<Loan[]>('trustlend:loans', []);
    return borrowerId ? loans.filter(loan => loan.borrower_id === borrowerId) : loans;
  }
  let query = supabase.from('loans').select('*, borrower:users!loans_borrower_id_fkey(*)').order('created_at', { ascending: false });
  if (borrowerId) query = query.eq('borrower_id', borrowerId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createLoan(loanData: Record<string, unknown>) {
  if (!supabase) {
    const now = new Date().toISOString();
    const loan: Loan = {
      id: `local-loan-${crypto.randomUUID()}`,
      borrower_id: String(loanData.borrower_id),
      lender_id: null,
      amount: Number(loanData.amount),
      purpose: String(loanData.purpose),
      duration_months: Number(loanData.duration_months),
      description: null,
      interest_rate: Number(loanData.interest_rate || 6),
      status: 'approved',
      risk_level: loanData.risk_level === 'low' || loanData.risk_level === 'high' ? loanData.risk_level : 'medium',
      amount_repaid: 0,
      remaining_amount: Number(loanData.amount),
      due_date: new Date(Date.now() + Number(loanData.duration_months) * 30 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: now,
      repaid_at: null,
      created_at: now,
      updated_at: now,
    };
    const loans = readLocal<Loan[]>('trustlend:loans', []);
    return writeLocal('trustlend:loans', [loan, ...loans])[0];
  }
  const { data, error } = await supabase.from('loans').insert([{ ...loanData, remaining_amount: loanData.amount, status: 'pending' }]).select().single();
  if (error) throw error;
  return data;
}

export async function repayLoan(loanId: string, amount: number) {
  if (!supabase) {
    const loans = readLocal<Loan[]>('trustlend:loans', []);
    const updatedLoans = loans.map(loan => {
      if (loan.id !== loanId) return loan;
      const amountRepaid = Number(loan.amount_repaid || 0) + amount;
      const remaining = Math.max(0, Number(loan.amount) - amountRepaid);
      return {
        ...loan,
        amount_repaid: amountRepaid,
        remaining_amount: remaining,
        status: remaining <= 0 ? 'repaid' as const : 'approved' as const,
        repaid_at: remaining <= 0 ? new Date().toISOString() : loan.repaid_at,
        updated_at: new Date().toISOString(),
      };
    });
    writeLocal('trustlend:loans', updatedLoans);
    return updatedLoans.find(loan => loan.id === loanId) ?? null;
  }
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
  if (!supabase) return readLocal<Pool>('trustlend:pool', demoPool);
  const { data, error } = await supabase.from('pools').select('*').limit(1).single();
  if (error) throw error;
  return data;
}

export async function depositToPool(poolId: string, userId: string, amount: number) {
  if (!supabase) {
    const pool = readLocal<Pool>('trustlend:pool', demoPool);
    writeLocal('trustlend:pool', {
      ...pool,
      total_liquidity: Number(pool.total_liquidity) + amount,
      available_funds: Number(pool.available_funds) + amount,
    });
    void poolId;
    void userId;
    return;
  }
  const { data: pool } = await supabase.from('pools').select('*').eq('id', poolId).single();
  if (!pool) throw new Error('Pool not found');
  await supabase.from('pools').update({
    total_liquidity: pool.total_liquidity + amount,
    available_funds: pool.available_funds + amount,
  }).eq('id', poolId);
  await supabase.from('pool_transactions').insert([{ pool_id: poolId, user_id: userId, type: 'deposit', amount }]);
}

export async function getNftAchievements(userId: string) {
  if (!supabase) return readLocal<NftAchievement[]>(`trustlend:nfts:${userId}`, []);
  const { data, error } = await supabase.from('nft_achievements').select('*').eq('user_id', userId).order('earned_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDashboardStats() {
  if (!supabase) {
    const pool = readLocal<Pool>('trustlend:pool', demoPool);
    const loans = readLocal<Loan[]>('trustlend:loans', []);
    const finished = loans.filter(loan => loan.status === 'repaid').length;
    const issued = loans.filter(loan => loan.status !== 'pending');
    return {
      totalValueLocked: pool.total_liquidity,
      totalLoansIssued: issued.reduce((sum, loan) => sum + Number(loan.amount), 0),
      activeBorrowers: Math.max(1, new Set(loans.map(loan => loan.borrower_id)).size),
      repaymentRate: issued.length > 0 ? Math.round((finished / issued.length) * 100) : 97,
    };
  }
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
