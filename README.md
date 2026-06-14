TrustLend
=========

TrustLend is a DeFi micro-lending platform for students, freelancers, and gig workers. Borrowers build an AI-generated trust score from profile signals instead of traditional credit history, lenders fund a community pool, smart contracts manage loan funding and repayment, and non-transferable NFT reputation badges record successful repayment milestones.

Project Structure
-----------------

- `frontend/`: Vite + React app for wallet connection, borrower onboarding, trust score preview, loans, pool, and NFT reputation screens.
- `backend/`: FastAPI service for trust-score calculation, wallet profiles, profile updates, loan creation, approval, and repayments.
- `backend/supabase/migrations/`: Supabase schema and RLS policy migrations.
- `contracts/`: Hardhat project with the `TrustLend` Solidity contract, deployment script, and tests.

Frontend
--------

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Required frontend environment values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`
- `VITE_TRUSTLEND_CONTRACT_ADDRESS`

Backend
-------

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Backend endpoints include:

- `GET /health`
- `POST /trust-score`
- `GET /users/wallet/{wallet_address}`
- `PATCH /users/{user_id}`
- `GET /loans`
- `POST /loans`
- `POST /loans/{loan_id}/approve`
- `POST /loans/{loan_id}/repay`

Supabase
--------

Run the migrations in `backend/supabase/migrations` against your Supabase project. The schema creates:

- wallet user profiles
- AI trust score and risk fields
- community lending pools
- loans and repayments
- pool transactions
- NFT achievement records
- reputation history

Contracts
---------

```bash
cd contracts
npm install
npm run compile
npm test
```

Deploy to a local Hardhat node:

```bash
npx hardhat node
npm run deploy:localhost
```

The Solidity contract supports:

- lender deposits and withdrawals
- owner-updated borrower trust scores
- trust-score-gated loan requests
- pool-funded loans
- borrower repayments
- default marking for overdue loans
- soulbound NFT reputation badges at 1, 3, 5, and 10 successful repayments

Concept Coverage
----------------

The current implementation now has the core layers needed for the TrustLend concept:

- AI-style trust scoring is shared between frontend preview and backend service.
- Wallet profiles are stored in Supabase and can fall back locally in frontend demos.
- Loans are represented in both Supabase and the smart contract.
- Community funding exists in the pool UI, database schema, backend records, and Solidity pool.
- NFT reputation exists in the UI, database, and contract as non-transferable badges.

Before production, tighten RLS policies, replace the demo trust-score formula with a model-backed scoring service, add contract event indexing, and connect frontend loan actions directly to contract transactions.
