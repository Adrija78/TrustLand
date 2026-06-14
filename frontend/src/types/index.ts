export type UserRole = 'borrower' | 'lender' | 'admin';
export type UserType = 'student' | 'freelancer' | 'gig_worker';
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'repaid' | 'defaulted';
export type RiskLevel = 'low' | 'medium' | 'high';
export type NftTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface User {
  id: string;
  wallet_address: string;
  role: UserRole;
  user_type: UserType | null;
  name: string | null;
  email: string | null;
  age: number | null;
  occupation: string | null;
  education: string | null;
  certifications: string[] | null;
  monthly_income: number | null;
  experience_years: number | null;
  portfolio_url: string | null;
  rating: number | null;
  completed_tasks: number | null;
  hackathons: number | null;
  internships: number | null;
  skills: string[] | null;
  trust_score: number;
  risk_category: RiskLevel;
  max_loan_amount: number;
  suggested_interest_rate: number;
  reputation_level: number;
  successful_loans: number;
  total_repaid: number;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  borrower_id: string;
  lender_id: string | null;
  amount: number;
  purpose: string;
  duration_months: number;
  description: string | null;
  interest_rate: number;
  status: LoanStatus;
  risk_level: RiskLevel;
  amount_repaid: number;
  remaining_amount: number;
  due_date: string | null;
  approved_at: string | null;
  repaid_at: string | null;
  created_at: string;
  updated_at: string;
  borrower?: User;
}

export interface Pool {
  id: string;
  name: string;
  total_liquidity: number;
  available_funds: number;
  total_loaned: number;
  expected_returns: number;
  min_trust_score: number;
  interest_rate: number;
}

export interface NftAchievement {
  id: string;
  user_id: string;
  name: string;
  tier: NftTier;
  earned_at: string;
}

export interface TrustScoreResult {
  score: number;
  risk: RiskLevel;
  maxLoan: number;
  interestRate: number;
}

export interface DashboardStats {
  totalValueLocked: number;
  totalLoansIssued: number;
  activeBorrowers: number;
  repaymentRate: number;
}
