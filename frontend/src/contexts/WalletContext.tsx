import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { getUserByWallet, createUser, updateUser } from '../lib/supabase';
import { calculateTrustScore } from '../lib/trustScore';

interface WalletContextType {
  address: string | null;
  user: User | null;
  isConnecting: boolean;
  isConnected: boolean;
  walletError: string | null;
  connect: () => Promise<string>;
  disconnect: () => void;
  clearWalletError: () => void;
  updateUserProfile: (profile: Partial<User>) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const APP_WALLET_SESSION_KEYS = [
  'trustlend:active-wallet',
  'trustlend:connected-wallet',
  'trustlend:wallet-address',
];

function getWalletErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error && error.code === 4001) {
    return 'Wallet connection was cancelled in MetaMask.';
  }
  if (typeof error === 'object' && error && 'code' in error && error.code === -32002) {
    return 'MetaMask already has a connection request open. Please check the MetaMask popup.';
  }
  const message = error instanceof Error ? error.message : 'Wallet connection failed.';
  if (message.toLowerCase().includes('user rejected')) return 'Wallet connection was cancelled in MetaMask.';
  return message;
}

function normalizeAccounts(accounts: unknown): string[] {
  return Array.isArray(accounts) ? accounts.filter((account): account is string => typeof account === 'string') : [];
}

function localUserKey(walletAddress: string) {
  return `trustlend:user:${walletAddress.toLowerCase()}`;
}

function readLocalUser(walletAddress: string): User | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(localUserKey(walletAddress));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as User;
    return parsed.wallet_address?.toLowerCase() === walletAddress.toLowerCase() ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalUser(user: User) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(localUserKey(user.wallet_address), JSON.stringify(user));
  }
  return user;
}

function clearWalletSessionStorage() {
  if (typeof window === 'undefined') return;
  APP_WALLET_SESSION_KEYS.forEach(key => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
}

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
  const [walletError, setWalletError] = useState<string | null>(null);

  const loadWalletUser = useCallback(async (walletAddress: string) => {
    try {
      let userData = await getUserByWallet(walletAddress);
      if (!userData) userData = readLocalUser(walletAddress);
      if (!userData) userData = await createUser({ wallet_address: walletAddress, role: 'borrower' });
      return userData ?? writeLocalUser(createLocalUser(walletAddress));
    } catch (err) {
      console.error('Wallet profile error:', err);
      return readLocalUser(walletAddress) ?? writeLocalUser(createLocalUser(walletAddress));
    }
  }, []);

  const resetWalletState = useCallback(() => {
    clearWalletSessionStorage();
    setAddress(null);
    setUser(null);
    setIsConnecting(false);
    setWalletError(null);
  }, []);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: unknown) => {
        const acc = normalizeAccounts(accounts);
        if (acc.length === 0) {
          resetWalletState();
          return;
        }
        setAddress(currentAddress => {
          if (!currentAddress) return currentAddress;
          clearWalletSessionStorage();
          setWalletError(null);
          setUser(null);
          void loadWalletUser(acc[0]).then(setUser);
          return acc[0];
        });
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      };
    }
  }, [loadWalletUser, resetWalletState]);

  const connect = async () => {
    if (isConnecting) throw new Error('Wallet connection is already in progress.');
    setWalletError(null);
    if (typeof window.ethereum === 'undefined') {
      const message = 'No wallet found. Install MetaMask or open this in a Web3 browser.';
      setWalletError(message);
      throw new Error(message);
    }
    setIsConnecting(true);
    try {
      const accounts = normalizeAccounts(await window.ethereum.request({ method: 'eth_requestAccounts' }));
      if (!accounts[0]) throw new Error('No wallet account was selected.');
      clearWalletSessionStorage();
      setAddress(accounts[0]);
      setUser(await loadWalletUser(accounts[0]));
      return accounts[0];
    } catch (error) {
      setWalletError(getWalletErrorMessage(error));
      throw error;
    } finally { setIsConnecting(false); }
  };

  const disconnect = () => {
    resetWalletState();
  };

  const clearWalletError = () => setWalletError(null);

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

    if (nextUser.id.startsWith('local-')) writeLocalUser(nextUser);
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

      if (scoredUser.id.startsWith('local-')) writeLocalUser(scoredUser);
      setUser(scoredUser);
    }
  };

  return (
    <WalletContext.Provider value={{ address, user, isConnecting, isConnected: !!address && !!user, walletError, connect, disconnect, clearWalletError, updateUserProfile }}>
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
