-- Core TrustLend schema: wallet profiles, trust scores, lending pool, loans,
-- repayments, pool transactions, and NFT reputation records.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('borrower', 'lender', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('student', 'freelancer', 'gig_worker');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM ('pending', 'approved', 'rejected', 'repaid', 'defaulted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pool_transaction_type AS ENUM ('deposit', 'withdraw', 'loan_funded', 'repayment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE nft_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'borrower',
  user_type user_type,
  name text,
  email text,
  age integer CHECK (age IS NULL OR age >= 13),
  occupation text,
  education text,
  certifications text[] DEFAULT '{}',
  monthly_income numeric(14, 2) CHECK (monthly_income IS NULL OR monthly_income >= 0),
  experience_years integer CHECK (experience_years IS NULL OR experience_years >= 0),
  trust_score integer NOT NULL DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  risk_category risk_level NOT NULL DEFAULT 'medium',
  max_loan_amount numeric(14, 2) NOT NULL DEFAULT 1000 CHECK (max_loan_amount >= 0),
  suggested_interest_rate numeric(6, 2) NOT NULL DEFAULT 8 CHECK (suggested_interest_rate >= 0),
  reputation_level integer NOT NULL DEFAULT 1 CHECK (reputation_level >= 1),
  successful_loans integer NOT NULL DEFAULT 0 CHECK (successful_loans >= 0),
  total_repaid numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_repaid >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Community Lending Pool',
  total_liquidity numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_liquidity >= 0),
  available_funds numeric(14, 2) NOT NULL DEFAULT 0 CHECK (available_funds >= 0),
  total_loaned numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_loaned >= 0),
  expected_returns numeric(14, 2) NOT NULL DEFAULT 0 CHECK (expected_returns >= 0),
  min_trust_score integer NOT NULL DEFAULT 40 CHECK (min_trust_score BETWEEN 0 AND 100),
  interest_rate numeric(6, 2) NOT NULL DEFAULT 8 CHECK (interest_rate >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  purpose text NOT NULL,
  duration_months integer NOT NULL CHECK (duration_months > 0),
  description text,
  interest_rate numeric(6, 2) NOT NULL CHECK (interest_rate >= 0),
  status loan_status NOT NULL DEFAULT 'pending',
  risk_level risk_level NOT NULL DEFAULT 'medium',
  amount_repaid numeric(14, 2) NOT NULL DEFAULT 0 CHECK (amount_repaid >= 0),
  remaining_amount numeric(14, 2) NOT NULL CHECK (remaining_amount >= 0),
  due_date timestamptz,
  approved_at timestamptz,
  repaid_at timestamptz,
  chain_loan_id numeric(78, 0),
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  loan_id uuid REFERENCES loans(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pool_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type pool_transaction_type NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nft_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  tier nft_tier NOT NULL,
  token_id numeric(78, 0),
  token_uri text,
  tx_hash text,
  earned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reputation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_score integer,
  new_score integer NOT NULL CHECK (new_score BETWEEN 0 AND 100),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_pool_transactions_pool_id ON pool_transactions(pool_id);
CREATE INDEX IF NOT EXISTS idx_nft_achievements_user_id ON nft_achievements(user_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pools_updated_at ON pools;
CREATE TRIGGER trg_pools_updated_at
BEFORE UPDATE ON pools
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_loans_updated_at ON loans;
CREATE TRIGGER trg_loans_updated_at
BEFORE UPDATE ON loans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO pools (name, total_liquidity, available_funds, min_trust_score, interest_rate)
SELECT 'Community Lending Pool', 100000, 100000, 40, 8
WHERE NOT EXISTS (SELECT 1 FROM pools);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_history ENABLE ROW LEVEL SECURITY;
