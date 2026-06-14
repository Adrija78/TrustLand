import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BrowserProvider } from 'ethers';
import type { User, UserRole } from '../types';
import { getUserByWallet, createUser, updateUser } from '../lib/supabase';
import { calculateTrustScore } from '../lib/trustScore';

interface WalletContextType {
  address: string | null;
  user: User | null;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<string>;
  disconnect: () => void;
  updateUserProfile: (profile: Partial<User>) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const createLocalUser = (walletAddress: string, role: UserRole = 'borrower'): User => ({
  id: `local-${walletAddress.toLowerCase()}`,
  wallet_address: walletAddress,
  role,
  user_type: null,
  name: null,
  email: null,
  age: null,
  occupation: null,
  education: null,
  certifications: null,
  monthly_income: null,
  experience_years: null,
  portfolio_url: null,
  rating: null,
  completed_tasks: null,
  hackathons: null,
  internships: null,
  skills: null,
  trust_score: 0,
  risk_category: 'medium',
  max_loan_amount: 1000,
  suggested_interest_rate: 5,
  reputation_level: 1,
  successful_loans: 0,
  total_repaid: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const loadWalletUser = useCallback(async (walletAddress: string) => {
    try {
      let userData = await getUserByWallet(walletAddress);
      if (!userData) userData = await createUser({ wallet_address: walletAddress, role: 'borrower' });
      return userData ?? createLocalUser(walletAddress);
    } catch (err) {
      console.error('Wallet profile error:', err);
      return createLocalUser(walletAddress);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_accounts', []);
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setUser(await loadWalletUser(accounts[0]));
      }
    } catch (err) { console.error('Wallet check error:', err); }
  }, [loadWalletUser]);

  useEffect(() => {
    checkConnection();
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: unknown) => {
        const acc = accounts as string[];
        if (acc.length === 0) { setAddress(null); setUser(null); }
        else { setAddress(acc[0]); checkConnection(); }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => { window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged); };
    }
  }, [checkConnection]);

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') throw new Error('Please install MetaMask');
    setIsConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAddress(accounts[0]);
      setUser(await loadWalletUser(accounts[0]));
      return accounts[0];
    } finally { setIsConnecting(false); }
  };

  const disconnect = () => { setAddress(null); setUser(null); };

  const updateUserProfile = async (profile: Partial<User>) => {
    if (!user) return;
    const cleanProfile = Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v ?? undefined]));
    let nextUser: User = { ...user, ...cleanProfile, updated_at: new Date().toISOString() };

    try {
      if (!user.id.startsWith('local-')) {
        nextUser = await updateUser(user.id, cleanProfile) ?? nextUser;
      }
    } catch (err) {
      console.error('Wallet profile update error:', err);
    }

    setUser(nextUser);
    if (profile.education || profile.certifications || profile.experience_years || profile.monthly_income || 
        profile.rating || profile.completed_tasks || profile.hackathons || profile.internships || profile.skills || profile.occupation) {
      const result = calculateTrustScore({
        user_type: nextUser.user_type ?? undefined,
        education: nextUser.education ?? undefined,
        certifications: nextUser.certifications ?? undefined,
        experience_years: nextUser.experience_years ?? undefined,
        monthly_income: nextUser.monthly_income ?? undefined,
        successful_loans: user.successful_loans,
        portfolio_url: nextUser.portfolio_url ?? undefined,
        rating: nextUser.rating ?? undefined,
        completed_tasks: nextUser.completed_tasks ?? undefined,
        hackathons: nextUser.hackathons ?? undefined,
        internships: nextUser.internships ?? undefined,
        skills: nextUser.skills ?? undefined,
        occupation: nextUser.occupation ?? undefined,
      });
      const scoredUser = {
        ...nextUser,
        trust_score: result.score,
        risk_category: result.risk,
        max_loan_amount: result.maxLoan,
        suggested_interest_rate: result.interestRate,
        updated_at: new Date().toISOString(),
      };

      try {
        if (!user.id.startsWith('local-')) {
          setUser(await updateUser(user.id, {
            trust_score: result.score,
            risk_category: result.risk,
            max_loan_amount: result.maxLoan,
            suggested_interest_rate: result.interestRate,
          }) ?? scoredUser);
          return;
        }
      } catch (err) {
        console.error('Wallet score update error:', err);
      }

      setUser(scoredUser);
    }
  };

  return (
    <WalletContext.Provider value={{ address, user, isConnecting, isConnected: !!address && !!user, connect, disconnect, updateUserProfile }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, cb: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
      removeAllListeners: (event: string) => void;
      send: (method: string, params?: unknown[]) => Promise<unknown>;
    };
  }
}
