import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark, Wallet, User, Briefcase, Award, Plus,
  DollarSign, Check, X, TrendingUp, Users,
  Activity, Coins, Shield, LineChart, Menu,
  Loader2, Save, Target, Lock, Unlock,
  Sparkles, ArrowRight, BadgeCheck, Fingerprint
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { getLoans, getPool, getNftAchievements, getDashboardStats } from './lib/supabase';
import { calculateTrustScore, getScoreColor, getNextTierProgress } from './lib/trustScore';
import { depositToContract, getChainSnapshot, requestLoanOnChain, repayLoanOnChain, getBorrowerLoansOnChain, type ChainSnapshot } from './lib/contract';
import type { Loan, Pool, NftAchievement, UserType, UserRole } from './types';

function formatUserType(type: UserType | string) {
  const labels: Record<string, string> = {
    student: 'Student',
    freelancer: 'Freelancer',
    gig_worker: 'Gig Worker',
  };
  return labels[type] ?? type;
}

function formatRiskCategory(risk?: string | null) {
  if (!risk) return 'Not yet rated';
  const labels: Record<string, string> = {
    low: 'Low risk',
    medium: 'Moderate risk',
    high: 'Higher risk',
  };
  return labels[risk] ?? risk;
}

function formatTierName(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// Trust Score Gauge Component
function TrustGauge({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = radius * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#dce4d8" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
        <motion.circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1 }} transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="text-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <p className="text-dark-400 text-sm">{score >= 80 ? 'Excellent standing' : score >= 60 ? 'Good standing' : score >= 40 ? 'Fair standing' : 'Building credit'}</p>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, label, color = 'primary' }: { value: number; max: number; label?: string; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colors: Record<string,string> = { primary: 'bg-primary-600', success: 'bg-success-500', accent: 'bg-accent-500' };
  return (
    <div className="w-full">
      {label && <div className="flex justify-between mb-1"><span className="text-sm text-dark-300">{label}</span><span className="text-sm text-dark-400">{pct.toFixed(0)}%</span></div>}
      <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
        <motion.div className={`h-full ${colors[color] || colors.primary}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, index = 0 }: { title: string; value: string | number; icon: typeof DollarSign; index?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="stat-card">
      <div className="flex justify-between">
        <div>
          <p className="text-dark-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-dark-100 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-400" />
        </div>
      </div>
    </motion.div>
  );
}

function TrustNetworkVisual({ compact = false }: { compact?: boolean }) {
  const nodes = [
    { x: '50%', y: '18%', icon: Fingerprint, label: 'Credit', delay: 0 },
    { x: '20%', y: '54%', icon: Wallet, label: 'Account', delay: 0.2 },
    { x: '80%', y: '54%', icon: Coins, label: 'Fund', delay: 0.4 },
    { x: '50%', y: '82%', icon: BadgeCheck, label: 'Record', delay: 0.6 },
  ];

  return (
    <div className={`trust-network ${compact ? 'trust-network-compact' : ''}`}>
      <div className="trust-network-grid" />
      <motion.div
        className="trust-network-core"
        animate={{ scale: [1, 1.05, 1], rotate: [0, 2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Landmark className="w-9 h-9 text-white" />
      </motion.div>
      <div className="trust-line trust-line-a" />
      <div className="trust-line trust-line-b" />
      <div className="trust-line trust-line-c" />
      <div className="trust-line trust-line-d" />
      {nodes.map(({ x, y, icon: Icon, label, delay }) => (
        <motion.div
          key={label}
          className="trust-node"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: [1, 1.08, 1] }}
          transition={{ delay, duration: 3.2, repeat: Infinity, repeatType: 'mirror' }}
        >
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </motion.div>
      ))}
      <motion.div
        className="trust-orbit"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

function formatEth(value: string) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

const LoanStatusCode = {
  Pending: 0,
  Funded: 1,
  Repaid: 2,
  Defaulted: 3,
  Rejected: 4,
} as const;

function getLoanStatusCode(status: Loan['status']) {
  if (typeof status === 'number') return status;
  const normalized = status.toLowerCase();
  if (normalized === 'pending') return LoanStatusCode.Pending;
  if (normalized === 'approved' || normalized === 'funded') return LoanStatusCode.Funded;
  if (normalized === 'repaid') return LoanStatusCode.Repaid;
  if (normalized === 'defaulted') return LoanStatusCode.Defaulted;
  if (normalized === 'rejected') return LoanStatusCode.Rejected;
  return LoanStatusCode.Rejected;
}

function getLoanStatusLabel(status: Loan['status']) {
  const labels: Record<number, string> = {
    [LoanStatusCode.Pending]: 'Under review',
    [LoanStatusCode.Funded]: 'Active',
    [LoanStatusCode.Repaid]: 'Paid off',
    [LoanStatusCode.Defaulted]: 'Overdue',
    [LoanStatusCode.Rejected]: 'Not approved',
  };
  return labels[getLoanStatusCode(status)] ?? 'Unknown';
}

function getLoanStatusBadgeClass(status: Loan['status']) {
  const code = getLoanStatusCode(status);
  if (code === LoanStatusCode.Funded || code === LoanStatusCode.Repaid) return 'badge-success';
  if (code === LoanStatusCode.Pending) return 'badge-warning';
  if (code === LoanStatusCode.Defaulted) return 'badge-error';
  return 'badge-primary';
}

function OnChainStatus({ snapshot }: { snapshot: ChainSnapshot | null }) {
  if (!snapshot) return null;
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-black uppercase text-primary-500">Account status</p>
          <h3 className="font-semibold text-dark-100 mt-1">{snapshot.message}</h3>
        </div>
        <span className={snapshot.enabled && snapshot.isSepolia ? 'badge-success' : 'badge-warning'}>
          {snapshot.enabled && snapshot.isSepolia ? 'Connected' : 'Setup needed'}
        </span>
      </div>
      {snapshot.enabled && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 text-sm">
          <div><p className="text-dark-400">Community fund</p><p className="font-bold text-dark-100">${formatEth(snapshot.totalLiquidityEth)}</p></div>
          <div><p className="text-dark-400">Your contribution</p><p className="font-bold text-dark-100">${formatEth(snapshot.lenderBalanceEth)}</p></div>
          <div><p className="text-dark-400">Achievements</p><p className="font-bold text-dark-100">{snapshot.reputationBadges}</p></div>
        </div>
      )}
    </div>
  );
}

// Layout with Sidebar
function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { address, disconnect } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const handleDisconnect = () => {
    disconnect();
    navigate('/register', { replace: true });
  };
  const nav = [
    { path: '/dashboard', label: 'Dashboard', icon: Landmark },
    { path: '/loans', label: 'Loans', icon: DollarSign },
    { path: '/pool', label: 'Lending Fund', icon: Coins },
    { path: '/nft', label: 'Credit Record', icon: Award },
    { path: '/profile', label: 'Profile', icon: User },
  ];
  return (
    <div className="app-shell flex h-screen">
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dark-800 border border-dark-600 text-white">
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-dark-100/20" />}</AnimatePresence>
      <motion.aside initial={false} animate={{ x: open ? 0 : typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0 : -280 }} className="fixed lg:static inset-y-0 left-0 z-40 w-64 app-sidebar flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <div className="brand-mark"><Landmark className="w-4 h-4 text-white" /></div>
            <span className="text-lg font-black text-white tracking-tight">TrustLend</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(n => (
            <Link key={n.path} to={n.path} onClick={() => setOpen(false)} className={`sidebar-item ${location.pathname === n.path ? 'active' : ''}`}>
              <n.icon className="w-5 h-5" /><span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-dark-300 mb-1">Signed in</p>
          <p className="font-mono text-sm text-primary-300 truncate">{address?.slice(0, 8)}...{address?.slice(-4)}</p>
          <button onClick={handleDisconnect} className="mt-2 w-full text-sm text-error-400 hover:bg-error-500/10 rounded py-1">Sign out</button>
        </div>
      </motion.aside>
      <main className="flex-1 overflow-y-auto p-4 lg:p-8"><div className="max-w-[1400px] mx-auto relative z-10">{children}</div></main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting, user } = useWallet();
  if (isConnecting) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!isConnected) return <Navigate to="/register" replace />;
  if (!hasCompletedOnboarding(user)) return <Navigate to="/register" replace />;
  return <>{children}</>;
}

const protectedAppPaths = ['/dashboard', '/loans', '/pool', '/nft', '/profile'];

function AuthRouteReset() {
  const { isConnected, isConnecting } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnecting || isConnected) return;
    if (protectedAppPaths.some(path => location.pathname.startsWith(path))) {
      navigate('/register', { replace: true });
    }
  }, [isConnected, isConnecting, location.pathname, navigate]);

  return null;
}

function hasCompletedOnboarding(user: { role?: UserRole; user_type?: UserType | null; name?: string | null; trust_score?: number } | null) {
  if (!user) return false;
  if (user.role === 'lender') return true;
  return Boolean(user.user_type || user.name || (user.trust_score ?? 0) > 0);
}

// Landing Page
function LandingPage() {
  const navigate = useNavigate();
  const { isConnected, connect, isConnecting, walletError, clearWalletError } = useWallet();
  const [stats, setStats] = useState({ totalValueLocked: 100000, totalLoansIssued: 250000, activeBorrowers: 1250, repaymentRate: 97 });
  useEffect(() => { getDashboardStats().then(setStats).catch(() => {}); }, []);
  const features = [
    { icon: Shield, title: 'Fair credit review', desc: 'We look at your education, work history, and income — not just a credit bureau score.' },
    { icon: Users, title: 'Community-backed loans', desc: 'Borrow from a shared fund supported by people who believe in fair access to credit.' },
    { icon: LineChart, title: 'Build your record', desc: 'Every on-time repayment strengthens your borrowing profile for future loans.' },
    { icon: Award, title: 'Credit record you keep', desc: 'Earn achievements as you repay — a portable record of your reliability.' },
  ];
  const handleConnect = async () => {
    clearWalletError();
    try {
      if (!isConnected) await connect();
      navigate(isConnected ? '/dashboard' : '/register');
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <div className="landing-shell min-h-screen selection:bg-primary-500/30">
      <nav className="border-b border-white/10 bg-dark-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="brand-mark"><Landmark className="w-4 h-4 text-white" /></div>
            <span className="text-xl font-bold text-white tracking-tight">TrustLend</span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={handleConnect} disabled={isConnecting} className="btn-primary">
              <Wallet className="w-4 h-4 mr-2 inline" />
              {isConnecting ? 'Signing in...' : isConnected ? 'Go to dashboard' : 'Get started'}
            </button>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-visual pointer-events-none">
          <TrustNetworkVisual />
        </div>
        <div className="landing-copy">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-300/30 bg-primary-300/10 px-4 py-2 text-sm font-bold text-primary-100 mb-6">
              <Sparkles className="w-4 h-4" />
              Fair loans for students, freelancers, and gig workers
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
              Borrow with confidence. Build credit by repaying on time.
            </h1>
            <p className="text-lg md:text-xl text-dark-300 max-w-2xl mb-10">
              Apply for small loans in minutes, repay on a schedule that works for you, and grow a borrowing profile that reflects your real work history.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleConnect} className="btn-primary text-lg !px-10 !py-4 inline-flex items-center justify-center gap-2">
                {isConnecting ? 'Signing in...' : isConnected ? 'Open dashboard' : 'Get started'}
                <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#features" className="btn-ghost">See how it works</a>
            </div>
            {walletError && <p className="mt-4 text-sm text-accent-200">{walletError}</p>}
          </motion.div>
        </div>
      </section>

      <section className="py-20 border-y border-white/10 bg-white/[0.03]">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-5">
            {[ 
              { label: 'Community funds', value: `$${stats.totalValueLocked.toLocaleString()}`, icon: Shield },
              { label: 'Loans issued', value: `$${stats.totalLoansIssued.toLocaleString()}`, icon: DollarSign },
              { label: 'Active borrowers', value: stats.activeBorrowers.toLocaleString(), icon: Users },
              { label: 'On-time repayment rate', value: `${stats.repaymentRate}%`, icon: TrendingUp }
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="metric-tile text-center p-6">
                <s.icon className="w-8 h-8 text-primary-300 mx-auto mb-4" />
                <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-dark-400 text-sm uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Why TrustLend?</h2>
            <p className="text-dark-400">Simple, fair lending designed for people building their careers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="feature-panel p-8">
                <f.icon className="w-12 h-12 text-primary-500 mb-6" />
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-dark-400">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 bg-accent-300">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-dark-950 mb-8">Ready to take your next step?</h2>
          <button onClick={handleConnect} className="px-12 py-5 bg-dark-950 text-white rounded-2xl font-bold text-xl hover:bg-dark-900 transition shadow-2xl">Create your account</button>
        </div>
      </section>

      <footer className="py-20 border-t border-dark-800">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Landmark className="w-6 h-6 text-primary-500" />
            <span className="text-xl font-bold text-white">TrustLend</span>
          </div>
          <p className="text-dark-500">&copy; 2026 TrustLend Finance. Fair lending for the modern workforce.</p>
        </div>
      </footer>
    </div>
  );
}

// Register Page
function RegisterPage() {
  const navigate = useNavigate();
  const { connect, isConnected, user, updateUserProfile, isConnecting, walletError, clearWalletError } = useWallet();
  const [step, setStep] = useState<'wallet' | 'role' | 'profile' | 'done'>('wallet');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    user_type: 'student' as UserType, 
    education: '', 
    certifications: '', 
    monthly_income: '', 
    experience_years: '',
    portfolio_url: '',
    rating: '',
    completed_tasks: '',
    hackathons: '',
    internships: '',
    skills: '',
    occupation: ''
  });
  useEffect(() => {
    if (!isConnected) {
      queueMicrotask(() => setStep('wallet'));
      return;
    }
    if (!user) return;
    if (hasCompletedOnboarding(user)) {
      navigate('/dashboard', { replace: true });
      return;
    }
    queueMicrotask(() => setStep('role'));
  }, [isConnected, navigate, user]);
  const handleRole = async (role: UserRole) => {
    if (role === 'lender') {
      await updateUserProfile({ role });
      navigate('/dashboard', { replace: true });
    }
    else setStep('profile');
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserProfile({
        name: form.name,
        user_type: form.user_type,
        education: form.education || null,
        certifications: form.certifications ? form.certifications.split(',').map(c => c.trim()).filter(Boolean) : null,
        monthly_income: parseFloat(form.monthly_income) || null,
        experience_years: parseInt(form.experience_years) || null,
        portfolio_url: form.portfolio_url || null,
        rating: parseFloat(form.rating) || null,
        completed_tasks: parseInt(form.completed_tasks) || null,
        hackathons: parseInt(form.hackathons) || null,
        internships: parseInt(form.internships) || null,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
        occupation: form.occupation || null,
      });
      navigate('/dashboard', { replace: true });
    } finally { setLoading(false); }
  };
  const currentStep = isConnected && user ? step : 'wallet';
  if (currentStep === 'done') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-card p-8 text-center">
        <Check className="w-16 h-16 text-success-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-dark-100 mb-2">You're all set!</h2>
        <p className="text-dark-400 mb-4">Your borrowing score: {user?.trust_score || 0}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">Go to dashboard</button>
      </motion.div>
    </div>
  );
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 w-full max-w-md relative z-10">
        {currentStep === 'wallet' && (
          <div className="text-center">
            <Wallet className="w-12 h-12 text-primary-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-dark-100 mb-2">Sign in to get started</h2>
            <p className="text-sm text-dark-400 mb-4">Use your account app to sign in securely. It only takes a moment.</p>
            <button onClick={async () => { clearWalletError(); setLoading(true); try { await connect(); } catch { /* WalletContext shows the message. */ } finally { setLoading(false); } }} disabled={loading || isConnecting} className="btn-primary w-full">
              {loading || isConnecting ? 'Signing in...' : 'Continue'}
            </button>
            {walletError && <p className="mt-3 text-sm text-error-500">{walletError}</p>}
            <p className="mt-3 text-xs text-dark-400">If you sign out, return here to sign in again when you're ready.</p>
          </div>
        )}
        {currentStep === 'role' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-dark-100 mb-2">How will you use TrustLend?</h2>
            <p className="text-sm text-dark-400 mb-4">Choose the option that fits you best. You can update this later.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleRole('borrower')} className="glass p-4 hover:border-primary-500 border border-dark-600 transition">
                <Briefcase className="w-8 h-8 text-primary-400 mb-2 mx-auto" />
                <span className="text-dark-100 font-semibold block">Borrower</span>
                <span className="text-dark-400 text-xs mt-1 block">Apply for loans</span>
              </button>
              <button onClick={() => handleRole('lender')} className="glass p-4 hover:border-accent-500 border border-dark-600 transition">
                <Coins className="w-8 h-8 text-accent-400 mb-2 mx-auto" />
                <span className="text-dark-100 font-semibold block">Lender</span>
                <span className="text-dark-400 text-xs mt-1 block">Support borrowers</span>
              </button>
            </div>
          </div>
        )}
        {currentStep === 'profile' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-dark-100 mb-2">Tell us about yourself</h2>
            <p className="text-sm text-dark-400 mb-4">This helps us understand your situation and offer fair loan terms.</p>
            <div className="grid grid-cols-3 gap-2">
              {(['student', 'freelancer', 'gig_worker'] as UserType[]).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, user_type: t }))} className={`p-2 rounded border-2 text-sm ${form.user_type === t ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600'}`}>{formatUserType(t)}</button>
              ))}
            </div>
            <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
            
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-dark-800/50 rounded-lg border border-dark-700">
                <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-2">About you</p>
                
                {form.user_type === 'student' && (
                  <div className="space-y-3">
                    <select value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} className="select-field">
                      <option value="">Education level</option>
                      <option>High School</option><option>Some College</option><option>Associate</option><option>Bootcamp</option><option>Bachelor</option><option>Master</option><option>PhD</option>
                    </select>
                    <input placeholder="Certifications (separate with commas)" value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} className="input-field" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Hackathons attended" type="number" value={form.hackathons} onChange={e => setForm(f => ({ ...f, hackathons: e.target.value }))} className="input-field" />
                      <input placeholder="Internships completed" type="number" value={form.internships} onChange={e => setForm(f => ({ ...f, internships: e.target.value }))} className="input-field" />
                    </div>
                    <input placeholder="Skills (separate with commas)" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} className="input-field" />
                  </div>
                )}

                {form.user_type === 'freelancer' && (
                  <div className="space-y-3">
                    <input placeholder="Portfolio or work samples link" value={form.portfolio_url} onChange={e => setForm(f => ({ ...f, portfolio_url: e.target.value }))} className="input-field" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Average client rating (1–5)" type="number" step="0.1" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input-field" />
                      <input placeholder="Completed projects" type="number" value={form.completed_tasks} onChange={e => setForm(f => ({ ...f, completed_tasks: e.target.value }))} className="input-field" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Monthly income ($)" type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input-field" required />
                      <input placeholder="Years of experience" type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} className="input-field" required />
                    </div>
                  </div>
                )}

                {form.user_type === 'gig_worker' && (
                  <div className="space-y-3">
                    <input placeholder="Job type (e.g. driver, delivery)" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} className="input-field" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Average customer rating (1–5)" type="number" step="0.1" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input-field" />
                      <input placeholder="Completed jobs" type="number" value={form.completed_tasks} onChange={e => setForm(f => ({ ...f, completed_tasks: e.target.value }))} className="input-field" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Monthly income ($)" type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input-field" required />
                      <input placeholder="Years of experience" type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} className="input-field" required />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-dark-400 text-center px-4">
              Your borrowing score reflects your income, work history, and background. Repaying loans on time has the biggest positive impact.
            </p>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving your profile...' : 'Create my profile'}</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// Dashboard Page
function DashboardPage() {
  const { address, user } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [pool, setPool] = useState<Pool | null>(null);
  const [nfts, setNfts] = useState<NftAchievement[]>([]);
  const [chain, setChain] = useState<ChainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    Promise.all([getLoans(user.id), getPool(), getNftAchievements(user.id), getChainSnapshot(address)])
      .then(([l, p, n, c]) => { setLoans(l || []); setPool(p); setNfts(n || []); setChain(c); })
      .finally(() => setLoading(false));
  }, [address, user]);
  if (loading) return <SidebarLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></SidebarLayout>;
  const active = loans.filter(l => getLoanStatusCode(l.status) === LoanStatusCode.Funded);
  const pending = loans.filter(l => getLoanStatusCode(l.status) === LoanStatusCode.Pending);
  const completed = loans.filter(l => getLoanStatusCode(l.status) === LoanStatusCode.Repaid);
  const chartData = [{ m: 'Jan', s: 45 }, { m: 'Feb', s: 52 }, { m: 'Mar', s: 58 }, { m: 'Apr', s: 65 }, { m: 'May', s: 72 }, { m: 'Jun', s: user?.trust_score || 75 }];
  const pieData = [{ name: 'Paid off', v: completed.length, c: '#10b981' }, { name: 'Active', v: active.length, c: '#14b8a6' }, { name: 'Under review', v: pending.length, c: '#f0b429' }];
  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="dashboard-hero">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-300/30 bg-primary-300/10 px-3 py-1 text-xs font-bold text-primary-100 mb-4">
              <BadgeCheck className="w-4 h-4" />
              Your credit profile is active
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white">Welcome, {user?.name || 'there'}</h1>
            <p className="text-dark-300 mt-2 max-w-2xl">See your borrowing score, active loans, and repayment history — all in one place.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/loans" className="btn-primary text-sm inline-flex items-center gap-2">Apply for a loan <ArrowRight className="w-4 h-4" /></Link>
              <Link to="/nft" className="btn-ghost !py-3 !text-sm">View credit record</Link>
            </div>
          </div>
          <div className="dashboard-orbit">
            <TrustNetworkVisual compact />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Borrowing score" value={user?.trust_score || 0} icon={Target} index={0} />
          <StatCard title="Total borrowed" value={`$${loans.reduce((s, l) => s + Number(l.amount || l.principal || 0), 0).toLocaleString()}`} icon={DollarSign} index={1} />
          <StatCard title="Active loans" value={active.length} icon={Landmark} index={2} />
          <StatCard title="Achievements" value={nfts.length} icon={Award} index={3} />
        </div>
        <OnChainStatus snapshot={chain} />
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary-400" />Borrowing score over time</h3>
            <div className="h-48 min-w-0 min-h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <XAxis dataKey="m" stroke="#61705d" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#61705d" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#f8faf7', border: '1px solid #dce4d8', borderRadius: 8, color: '#111a17' }} />
                  <Area type="monotone" dataKey="s" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.14} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="font-semibold text-dark-100 mb-4">Your loans at a glance</h3>
            <div className="h-48 min-w-0 min-h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="v">{pieData.map((e, i) => <Cell key={i} fill={e.c} />)}</Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4">{pieData.map(e => <span key={e.name} className="flex items-center gap-1 text-xs text-dark-400"><span className="w-2 h-2 rounded-full" style={{ background: e.c }} />{e.name}</span>)}</div>
          </div>
        </div>
        {pool && (
          <div className="glass-card p-4">
            <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2"><Coins className="w-4 h-4 text-primary-400" />Community lending fund</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-dark-400 text-sm">Total available</p><p className="text-xl font-bold text-dark-100">${Number(pool.total_liquidity).toLocaleString()}</p></div>
              <div><p className="text-dark-400 text-sm">Ready to lend</p><p className="text-xl font-bold text-success-400">${Number(pool.available_funds).toLocaleString()}</p></div>
              <div><p className="text-dark-400 text-sm">Interest rate</p><p className="text-xl font-bold text-accent-400">{pool.interest_rate}%</p></div>
            </div>
            <Link to="/pool" className="btn-secondary text-sm mt-4 inline-flex">View lending fund</Link>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

// Loans Page
function LoansPage() {
  const { user, address } = useWallet();
  console.log("LoansPage address =", address);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', purpose: '', duration: '6' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
  if (!address) return;
  console.log("Wallet address:", address);
  getBorrowerLoansOnChain(address)
    .then((d) => {
      console.log("FIRST LOAN =", d[0]);
      console.log("SECOND LOAN =", d[1]);
      console.table(d);
      
      setLoans(d);
    })
    .catch((err) => {
      console.error("LOAN ERROR:", err);
    })
    .finally(() => setLoading(false));

}, [address]);
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setSaving(true);

  try {

    await requestLoanOnChain(
      form.amount,
      (user?.suggested_interest_rate || 5) * 100,
      parseInt(form.duration) * 30,
      form.purpose
    );

    alert("Your loan application was submitted! We'll review it shortly.");

    setShowForm(false);

    setForm({
      amount: '',
      purpose: '',
      duration: '6'
    });

  } catch (error) {

    alert(
      error instanceof Error
        ? error.message
        : "We couldn't submit your loan application. Please try again."
    );

  } finally {

    setSaving(false);

  }
};
const handleRepay = async (loan: Loan) => {
  try {
    console.log("Loan:", loan);
    console.log("Repay Amount:", loan.remainingDue ?? loan.repaymentDue ?? loan.principal);
    await repayLoanOnChain(Number(loan.id));

    alert("Payment received — thank you! Your repayment history has been updated.");
    if (address) {
      setLoans(await getBorrowerLoansOnChain(address));
    }

  } catch (error) {
    console.error(error);

    alert(
      error instanceof Error
        ? error.message
        : "We couldn't process your payment. Please try again."
    );

  }
};
  if (loading) return <SidebarLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></SidebarLayout>;
  const active = loans.filter(l => getLoanStatusCode(l.status) === LoanStatusCode.Funded);
  const pending = loans.filter(l => getLoanStatusCode(l.status) === LoanStatusCode.Pending);
  const completed = loans.filter(l => getLoanStatusCode(l.status) === LoanStatusCode.Repaid);
  const loanStats = [
    { l: 'Under review', v: pending.length, className: 'text-warning-400', icon: Activity },
    { l: 'Active', v: active.length, className: 'text-success-400', icon: Coins },
    { l: 'Paid off', v: completed.length, className: 'text-primary-400', icon: BadgeCheck },
  ];
  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="section-heading flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-black uppercase text-primary-300 tracking-wider">Your loans</p>
            <h1 className="text-3xl font-black text-white">My loans</h1>
            <p className="text-dark-300">Apply for a loan, track your balance, and make payments — all in one place.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Apply for a loan</button>
        </div>
        <div className="grid grid-cols-3 gap-4">{loanStats.map((s, index) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="metric-tile p-4">
            <div className="flex items-center justify-between gap-2">
              <span className={s.className}>{s.l}</span>
              <s.icon className={`w-5 h-5 ${s.className}`} />
            </div>
            <p className="text-3xl font-black text-white mt-2">{s.v}</p>
          </motion.div>
        ))}</div>
        <AnimatePresence>{showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-dark-100/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.form initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-dark-100">Apply for a loan</h2>
              <input placeholder="Loan amount ($)" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field" required />
              <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} className="select-field" required>
                <option value="">What is this loan for?</option><option>Education</option><option>Equipment</option><option>Working capital</option><option>Emergency</option><option>Other</option>
              </select>
              <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="select-field">
                <option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option>
              </select>
              <p className="text-sm text-dark-400">You can borrow up to ${user?.max_loan_amount?.toLocaleString() || '1,000'} at {user?.suggested_interest_rate || 5}% interest.</p>
              <div className="flex gap-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting...' : 'Submit application'}</button></div>
            </motion.form>
          </motion.div>
        )}</AnimatePresence>
        {loans.length > 0 && (
          <div className="glass-card p-4">
            <h3 className="font-semibold text-dark-100 mb-4">Your loan history</h3>
            <div className="grid gap-3">{loans.map((l, index) => (
              <motion.div key={l.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="loan-card">
                <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                  <div>
                    <p className="text-xs uppercase font-black text-primary-300 tracking-wider">Loan #{l.id}</p>
                    <span className="text-2xl font-black text-white">${Number(l.principal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <span className={getLoanStatusBadgeClass(l.status)}>
                    {getLoanStatusLabel(l.status)}
                  </span>
                </div>
                <ProgressBar value={Number(l.amount_repaid || l.amountRepaid) || 0} max={Number(l.repaymentDue || l.amount || l.principal)} color="success"/>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-dark-300">
                  <span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent-400" />{l.purpose}</span>
                  <span>
                    Remaining: ${Number(l.remainingDue ?? l.repaymentDue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {getLoanStatusCode(l.status) === LoanStatusCode.Funded && Number(l.remainingDue ?? l.repaymentDue ?? 0) > 0 && (
                  <button
                    onClick={() => handleRepay(l)}
                    className="repay-button"
                  >
                    Make a payment <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                </div>
              </motion.div>
            ))}</div>
          </div>
        )}
        {loans.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Landmark className="w-12 h-12 text-dark-500 mx-auto mb-2" />
            <p className="text-dark-400">You don't have any loans yet. Apply for your first one to get started.</p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

// Pool Page
function PoolPage() {
  const { address, user } = useWallet();
  const [pool, setPool] = useState<Pool | null>(null);
  const [chain, setChain] = useState<ChainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [txMessage, setTxMessage] = useState('');
  useEffect(() => {
    Promise.all([getPool(), getChainSnapshot(address)])
      .then(([p, c]) => { setPool(p); setChain(c); })
      .finally(() => setLoading(false));
  }, [address]);
  const handleDeposit = async () => {
    if (!user || !pool || !amount) return;
    setSaving(true);
    setTxMessage('');
  try {
      console.log("Calling depositToContract...");
      const hash = await depositToContract(amount);
      console.log("Transaction hash:", hash);

      setTxMessage(
        `Your deposit was confirmed. Reference: ${hash.slice(0, 10)}...${hash.slice(-6)}`
      );

      const [p, c] = await Promise.all([
        getPool(),
        getChainSnapshot(address)
      ]);

      setPool(p);
      setChain(c);
      setShowDeposit(false);
      setAmount('');
  }
  catch (error) {
      setTxMessage(error instanceof Error ? error.message : 'We couldn\'t complete your deposit. Please try again.');
    } finally { setSaving(false); }
  };
  const utilization = pool && Number(pool.total_liquidity) > 0
    ? (Number(pool.total_loaned) / Number(pool.total_liquidity)) * 100
    : 0;
  if (loading) return <SidebarLayout><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mt-32" /></SidebarLayout>;
  return (
    <SidebarLayout>
      <div className="space-y-8">
        <section className="pool-hero">
          <div className="relative z-10 max-w-2xl">
            <div className="page-eyebrow"><Coins className="w-4 h-4" /> Community lending fund</div>
            <h1 className="page-title">Help others borrow. Earn as they repay.</h1>
            <p className="page-subtitle">Add funds to the community lending pool and earn interest when borrowers make their payments on time.</p>
            <div className="flex flex-wrap gap-3 mt-7">
              <button onClick={() => setShowDeposit(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add funds
              </button>
              <span className={chain?.enabled && chain.isSepolia ? 'chain-pill chain-pill-live' : 'chain-pill'}>
                <span className="chain-dot" />
                {chain?.enabled && chain.isSepolia ? 'Ready' : 'Check connection'}
              </span>
            </div>
          </div>
          <div className="liquidity-visual" aria-hidden="true">
            <motion.div
              className="liquidity-ring"
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            />
            <div className="liquidity-core">
              <Coins className="w-7 h-7 text-primary-200" />
              <span>{formatEth(chain?.totalLiquidityEth || '0')}</span>
              <small>Total fund</small>
            </div>
            <div className="liquidity-chip liquidity-chip-top">Lenders</div>
            <div className="liquidity-chip liquidity-chip-bottom">Borrowers</div>
          </div>
        </section>

        {pool && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard title="Total in fund" value={`$${Number(pool.total_liquidity).toLocaleString()}`} icon={Coins} />
            <StatCard title="Available to lend" value={`$${Number(pool.available_funds).toLocaleString()}`} icon={DollarSign} index={1} />
            <StatCard title="Interest rate" value={`${pool.interest_rate}%`} icon={TrendingUp} index={2} />
            <StatCard title="Funds in use" value={`${utilization.toFixed(0)}%`} icon={Activity} index={3} />
          </div>
        )}

        <div className="grid xl:grid-cols-[1.35fr_0.65fr] gap-6 items-start">
          <OnChainStatus snapshot={chain} />
          <section className="flow-panel">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-black uppercase text-primary-600">How it works</p>
                <h2 className="text-lg font-bold text-dark-100">Where your money goes</h2>
              </div>
              <Activity className="w-6 h-6 text-primary-500" />
            </div>
            <div className="pool-steps">
              {[
                { icon: Wallet, title: 'Add funds', text: 'Contribute to the lending pool' },
                { icon: Landmark, title: 'Fund loans', text: 'Help qualified borrowers' },
                { icon: TrendingUp, title: 'Earn interest', text: 'Get paid as loans are repaid' },
              ].map((step, i) => (
                <motion.div key={step.title} className="pool-step" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}>
                  <div className="pool-step-icon"><step.icon className="w-4 h-4" /></div>
                  <div><p className="font-bold text-dark-100">{step.title}</p><p className="text-xs text-dark-400">{step.text}</p></div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
        {txMessage && <div className="glass p-3 text-sm text-dark-300 border-primary-300">{txMessage}</div>}
        <AnimatePresence>{showDeposit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-dark-100/20 z-50 flex items-center justify-center p-4" onClick={() => setShowDeposit(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-dark-100">Add funds to the pool</h2>
              <input placeholder="Deposit amount" type="number" step="0.001" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" />
              <div className="grid grid-cols-4 gap-2">{[0.01, 0.05, 0.1, 1].map(v => <button key={v} onClick={() => setAmount(v.toString())} className="glass py-2 text-sm hover:bg-dark-700">{v}</button>)}</div>
              <p className="text-xs text-dark-400">Your funds will be added to the community lending pool and used to support approved borrowers.</p>
              <div className="flex gap-2"><button onClick={() => setShowDeposit(false)} className="btn-secondary flex-1">Cancel</button><button onClick={handleDeposit} disabled={saving || !amount} className="btn-primary flex-1">{saving ? 'Processing...' : 'Confirm deposit'}</button></div>
            </motion.div>
          </motion.div>
        )}</AnimatePresence>
      </div>
    </SidebarLayout>
  );
}

// NFT Page
function NftPage() {
  const { address, user } = useWallet();
  const [nfts, setNfts] = useState<NftAchievement[]>([]);
  const [chain, setChain] = useState<ChainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    Promise.all([getNftAchievements(user.id), getChainSnapshot(address)])
      .then(([n, c]) => { setNfts(n || []); setChain(c); })
      .finally(() => setLoading(false));
  }, [address, user]);
  const tiers = { bronze: { color: '#cd7f32', loans: 1 }, silver: { color: '#c0c0c0', loans: 3 }, gold: { color: '#ffd700', loans: 5 }, platinum: { color: '#e5e4e2', loans: 10 } };
  const progress = getNextTierProgress(user?.successful_loans || 0);
  const passportId = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not signed in';
  if (loading) return <SidebarLayout><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mt-32" /></SidebarLayout>;
  return (
    <SidebarLayout>
      <div className="space-y-8">
        <section className="passport-hero">
          <div className="relative z-10 max-w-xl">
            <div className="page-eyebrow"><Fingerprint className="w-4 h-4" /> Your credit record</div>
            <h1 className="page-title">A record of reliability you can take anywhere.</h1>
            <p className="page-subtitle">Every on-time repayment adds to your credit record — proof that you follow through on your commitments.</p>
            <div className="grid grid-cols-3 gap-3 mt-7">
              <div className="passport-stat"><span>{(user?.successful_loans || 0) * 100}</span><small>Points</small></div>
              <div className="passport-stat"><span>{nfts.length}</span><small>Achievements</small></div>
              <div className="passport-stat"><span>Level {user?.reputation_level || 1}</span><small>Standing</small></div>
            </div>
          </div>
          <motion.div className="credit-passport" initial={{ opacity: 0, rotateY: -12, y: 16 }} animate={{ opacity: 1, rotateY: 0, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="passport-shine" />
            <div className="flex items-start justify-between relative z-10">
              <div className="passport-emblem"><Landmark className="w-6 h-6" /></div>
              <BadgeCheck className="w-7 h-7 text-accent-300" />
            </div>
            <div className="relative z-10 mt-auto">
              <p className="text-xs uppercase font-black text-primary-200">TrustLend Credit Record</p>
              <p className="text-2xl font-black text-white mt-1">{user?.name || 'TrustLend member'}</p>
              <div className="flex items-end justify-between gap-4 mt-5">
                <div><small className="text-dark-400">Member ID</small><p className="font-mono text-sm text-white">{passportId}</p></div>
                <div className="passport-chip"><Fingerprint className="w-5 h-5" /></div>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="grid xl:grid-cols-[0.72fr_1.28fr] gap-6 items-start">
          <section className="glass-card p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div><p className="text-xs font-black uppercase text-primary-600">Next level</p><h2 className="text-xl font-bold text-dark-100">Your progress</h2></div>
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-black">{user?.reputation_level || 1}</div>
            </div>
            <ProgressBar value={progress.current} max={progress.target} label="On-time repayments" color="accent" />
            <p className="mt-4 text-sm text-dark-400">Repay your active loans on schedule to unlock the next level and earn new achievements.</p>
          </section>
          <OnChainStatus snapshot={chain} />
        </div>

        <section>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div><p className="text-xs font-black uppercase text-primary-400">Your collection</p><h2 className="text-2xl font-bold text-white">Achievements</h2></div>
            <span className="text-sm text-dark-400">{nfts.length} earned</span>
          </div>
          {nfts.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{nfts.map((n, i) => (
              <motion.div key={n.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="achievement-badge" style={{ '--badge-color': tiers[n.tier]?.color || '#fff' } as React.CSSProperties}>
                <div className="achievement-icon"><Award className="w-8 h-8" /></div>
                <p className="text-white font-bold mt-5">{n.name}</p>
                <p className="text-dark-400 text-xs uppercase font-black mt-1">{formatTierName(n.tier)} level</p>
              </motion.div>
            ))}</div>
          ) : <div className="empty-passport"><Lock className="w-10 h-10" /><div><p className="text-white font-bold">Your first achievement is waiting</p><p className="text-dark-400 text-sm">Make a payment on an active loan to earn your first achievement.</p></div></div>}
        </section>

        <section className="tier-track">
          <div><p className="text-xs font-black uppercase text-primary-600">Membership levels</p><h2 className="text-xl font-bold text-dark-100">Your path forward</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">{(Object.entries(tiers) as [keyof typeof tiers, typeof tiers.bronze][]).map(([t, c]) => {
            const earned = nfts.some(n => n.tier === t);
            return <div key={t} className={`tier-step ${earned ? 'tier-step-earned' : ''}`} style={{ '--tier-color': c.color } as React.CSSProperties}>
              <div className="flex items-center gap-2">{earned ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}<span className="font-bold">{formatTierName(t)}</span></div>
              <p className="text-dark-400 text-xs mt-1">{c.loans}+ loans repaid on time</p>
            </div>;
          })}</div>
        </section>
      </div>
    </SidebarLayout>
  );
}

// Profile Page
function ProfilePage() {
  const { user, updateUserProfile } = useWallet();
  const [form, setForm] = useState({ 
    name: user?.name || '', 
    education: user?.education || '', 
    certifications: (user?.certifications || []).join(', '), 
    monthly_income: user?.monthly_income?.toString() || '', 
    experience_years: user?.experience_years?.toString() || '',
    portfolio_url: user?.portfolio_url || '',
    rating: user?.rating?.toString() || '',
    completed_tasks: user?.completed_tasks?.toString() || '',
    hackathons: user?.hackathons?.toString() || '',
    internships: user?.internships?.toString() || '',
    skills: (user?.skills || []).join(', '),
    occupation: user?.occupation || '',
    user_type: user?.user_type || 'student' as UserType
  });
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => calculateTrustScore({
      user_type: form.user_type,
      education: form.education || undefined, 
      certifications: form.certifications ? form.certifications.split(',').map(c => c.trim()).filter(Boolean) : undefined,
      monthly_income: parseFloat(form.monthly_income) || undefined, 
      experience_years: parseInt(form.experience_years) || undefined,
      portfolio_url: form.portfolio_url || undefined,
      rating: parseFloat(form.rating) || undefined,
      completed_tasks: parseInt(form.completed_tasks) || undefined,
      hackathons: parseInt(form.hackathons) || undefined,
      internships: parseInt(form.internships) || undefined,
      skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      occupation: form.occupation || undefined,
    }), [form]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        name: form.name,
        education: form.education || null,
        certifications: form.certifications ? form.certifications.split(',').map(c => c.trim()).filter(Boolean) : null,
        monthly_income: parseFloat(form.monthly_income) || null,
        experience_years: parseInt(form.experience_years) || null,
        portfolio_url: form.portfolio_url || null,
        rating: parseFloat(form.rating) || null,
        completed_tasks: parseInt(form.completed_tasks) || null,
        hackathons: parseInt(form.hackathons) || null,
        internships: parseInt(form.internships) || null,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
        occupation: form.occupation || null,
        user_type: form.user_type,
      });
    } finally { setSaving(false); }
  };
  return (
    <SidebarLayout>
      <div className="space-y-8">
        <section className="profile-hero">
          <div className="profile-avatar">
            <User className="w-9 h-9" />
            <motion.span animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="page-eyebrow"><BadgeCheck className="w-4 h-4" /> Your profile</div>
            <h1 className="text-3xl md:text-4xl font-black text-white truncate">{form.name || 'Complete your profile'}</h1>
            <p className="text-dark-400 mt-1">{formatUserType(form.user_type)} · Level {user?.reputation_level || 1}</p>
          </div>
          <div className="profile-score-preview">
            <small>Estimated score</small>
            <strong style={{ color: getScoreColor(preview.score) }}>{preview.score}</strong>
            <span>Borrowing score</span>
          </div>
        </section>

        <div className="grid xl:grid-cols-[360px_1fr] gap-6 items-start">
          <div className="glass-card p-6 xl:sticky xl:top-0">
            <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-primary-500" />Borrowing overview</h3>
            <TrustGauge score={user?.trust_score || 0} size={140} />
            <div className="profile-facts">
              <div><span>Borrowing profile</span><strong className={`${user?.risk_category === 'low' ? 'text-success-600' : 'text-warning-600'}`}>{formatRiskCategory(user?.risk_category)}</strong></div>
              <div><span>Maximum loan</span><strong>${user?.max_loan_amount?.toLocaleString() || 0}</strong></div>
              <div><span>Your interest rate</span><strong>{user?.suggested_interest_rate || 0}%</strong></div>
            </div>
            <div className="score-tip">
              <Sparkles className="w-5 h-5 text-accent-500 shrink-0" />
              <p>Adding details about your work and education can help you qualify for better loan terms.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="glass-card p-5 md:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-black uppercase text-primary-600">Your details</p><h2 className="text-xl font-bold text-dark-100">Update your profile</h2></div>
              <Fingerprint className="w-7 h-7 text-primary-500" />
            </div>
            <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
            
            <div className="profile-form-section">
              <p className="text-xs text-primary-700 font-bold uppercase mb-3">I am a</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['student', 'freelancer', 'gig_worker'] as UserType[]).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, user_type: t }))} className={`role-option ${form.user_type === t ? 'role-option-active' : ''}`}>{formatUserType(t)}</button>
                ))}
              </div>

              <p className="text-xs text-primary-700 font-bold uppercase mb-3">
                {formatUserType(form.user_type)} details
              </p>
              
              {form.user_type === 'student' && (
                <div className="space-y-3">
                  <select value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} className="select-field">
                    <option value="">Education level</option>
                    <option>High School</option><option>Some College</option><option>Associate</option><option>Bootcamp</option><option>Bachelor</option><option>Master</option><option>PhD</option>
                  </select>
                  <input placeholder="Certifications (separate with commas)" value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} className="input-field" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Hackathons attended" type="number" value={form.hackathons} onChange={e => setForm(f => ({ ...f, hackathons: e.target.value }))} className="input-field" />
                    <input placeholder="Internships completed" type="number" value={form.internships} onChange={e => setForm(f => ({ ...f, internships: e.target.value }))} className="input-field" />
                  </div>
                  <input placeholder="Skills (separate with commas)" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} className="input-field" />
                </div>
              )}

              {form.user_type === 'freelancer' && (
                <div className="space-y-3">
                  <input placeholder="Portfolio or work samples link" value={form.portfolio_url} onChange={e => setForm(f => ({ ...f, portfolio_url: e.target.value }))} className="input-field" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Average client rating (1–5)" type="number" step="0.1" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input-field" />
                    <input placeholder="Completed projects" type="number" value={form.completed_tasks} onChange={e => setForm(f => ({ ...f, completed_tasks: e.target.value }))} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Monthly income ($)" type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input-field" />
                    <input placeholder="Years of experience" type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} className="input-field" />
                  </div>
                </div>
              )}

              {form.user_type === 'gig_worker' && (
                <div className="space-y-3">
                  <input placeholder="Job type" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} className="input-field" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Average customer rating (1–5)" type="number" step="0.1" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input-field" />
                    <input placeholder="Completed jobs" type="number" value={form.completed_tasks} onChange={e => setForm(f => ({ ...f, completed_tasks: e.target.value }))} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Monthly income ($)" type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input-field" />
                    <input placeholder="Years of experience" type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} className="input-field" />
                  </div>
                </div>
              )}
            </div>
            
            <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving changes...' : 'Save changes'}</button>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <AuthRouteReset />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/loans" element={<ProtectedRoute><LoansPage /></ProtectedRoute>} />
          <Route path="/pool" element={<ProtectedRoute><PoolPage /></ProtectedRoute>} />
          <Route path="/nft" element={<ProtectedRoute><NftPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
