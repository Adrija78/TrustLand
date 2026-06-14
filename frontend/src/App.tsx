import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark, Wallet, User, Briefcase, Award, Plus,
  DollarSign, Check, X, TrendingUp, Users,
  Activity, Coins, Shield, LineChart, Menu,
  Loader2, Save, Target
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { getLoans, createLoan, repayLoan, getPool, depositToPool, getNftAchievements, getDashboardStats } from './lib/supabase';
import { calculateTrustScore, getScoreColor, getNextTierProgress } from './lib/trustScore';
import type { Loan, Pool, NftAchievement, UserType, UserRole } from './types';

// Trust Score Gauge Component
function TrustGauge({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = radius * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#d7dccf" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
        <motion.circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1 }} transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="text-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <p className="text-dark-400 text-sm">{score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Building'}</p>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, label, color = 'primary' }: { value: number; max: number; label?: string; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
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

// Layout with Sidebar
function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { address, disconnect } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const nav = [
    { path: '/dashboard', label: 'Dashboard', icon: Landmark },
    { path: '/loans', label: 'Loans', icon: DollarSign },
    { path: '/pool', label: 'Pool', icon: Coins },
    { path: '/nft', label: 'NFT Passport', icon: Award },
    { path: '/profile', label: 'Profile', icon: User },
  ];
  return (
    <div className="flex h-screen">
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dark-800 border border-dark-600">
        {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-dark-100/20" />}</AnimatePresence>
      <motion.aside initial={false} animate={{ x: open ? 0 : typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0 : -280 }} className="fixed lg:static inset-y-0 left-0 z-40 w-64 glass-card flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center"><Landmark className="w-4 h-4 text-white" /></div>
            <span className="text-lg font-bold gradient-text">TrustLend</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(n => (
            <Link key={n.path} to={n.path} onClick={() => setOpen(false)} className={`sidebar-item ${location.pathname === n.path ? 'active' : ''}`}>
              <n.icon className="w-5 h-5" /><span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-dark-700">
          <p className="text-xs text-dark-400 mb-1">Connected</p>
          <p className="font-mono text-sm text-primary-400 truncate">{address?.slice(0, 8)}...{address?.slice(-4)}</p>
          <button onClick={() => { disconnect(); navigate('/'); }} className="mt-2 w-full text-sm text-error-400 hover:bg-error-500/10 rounded py-1">Disconnect</button>
        </div>
      </motion.aside>
      <main className="flex-1 overflow-y-auto p-4 lg:p-8"><div className="max-w-6xl mx-auto">{children}</div></main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting } = useWallet();
  if (isConnecting) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!isConnected) return <Navigate to="/register" />;
  return <>{children}</>;
}

// Landing Page
function LandingPage() {
  const navigate = useNavigate();
  const { isConnected, connect, isConnecting } = useWallet();
  const [stats, setStats] = useState({ totalValueLocked: 100000, totalLoansIssued: 250000, activeBorrowers: 1250, repaymentRate: 97 });
  useEffect(() => { getDashboardStats().then(setStats).catch(() => {}); }, []);
  const features = [
    { icon: Shield, title: 'AI Credit Assessment', desc: 'AI analyzes your profile to generate a trust score.' },
    { icon: Users, title: 'Community Lending', desc: 'Access funds from a community-driven lending pool.' },
    { icon: LineChart, title: 'On-Chain Reputation', desc: 'Build your reputation on the blockchain.' },
    { icon: Award, title: 'NFT Credit Passport', desc: 'Earn NFT badges for successful repayments.' },
  ];
  const handleConnect = async () => {
    try {
      if (!isConnected) await connect();
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <div className="min-h-screen bg-dark-950 selection:bg-primary-500/30">
      <nav className="border-b border-dark-800 bg-dark-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center"><Landmark className="w-4 h-4 text-dark-950" /></div>
            <span className="text-xl font-bold text-white tracking-tight">TrustLend</span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={handleConnect} disabled={isConnecting} className="btn-primary">
              <Wallet className="w-4 h-4 mr-2 inline" />
              {isConnecting ? 'Connecting...' : isConnected ? 'Launch App' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Decentralized Credit for the<br /><span className="gradient-text">Future of Work</span>
            </h1>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto mb-10">
              Unlock loans based on your reputation, not just your collateral. Build trust, earn rewards, and grow your career.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleConnect} className="btn-primary text-lg !px-10 !py-4">Get Started</button>
              <a href="#features" className="px-10 py-4 rounded-xl border border-dark-700 text-white font-semibold hover:bg-dark-800 transition">Learn More</a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-dark-900">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            {[ 
              { label: 'Total Value Locked', value: `$${stats.totalValueLocked.toLocaleString()}`, icon: Shield },
              { label: 'Loans Issued', value: `$${stats.totalLoansIssued.toLocaleString()}`, icon: DollarSign },
              { label: 'Active Borrowers', value: stats.activeBorrowers.toLocaleString(), icon: Users },
              { label: 'Repayment Rate', value: `${stats.repaymentRate}%`, icon: TrendingUp }
            ].map((s, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-dark-800 border border-dark-700">
                <s.icon className="w-8 h-8 text-primary-500 mx-auto mb-4" />
                <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-dark-400 text-sm uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Why TrustLend?</h2>
            <p className="text-dark-400">Innovative features for a new era of decentralized finance.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div key={i} className="p-8 rounded-3xl bg-dark-900/50 border border-dark-800 hover:border-primary-500/50 transition">
                <f.icon className="w-12 h-12 text-primary-500 mb-6" />
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-dark-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 bg-primary-500">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-dark-950 mb-8">Ready to build your reputation?</h2>
          <button onClick={handleConnect} className="px-12 py-5 bg-dark-950 text-white rounded-2xl font-bold text-xl hover:bg-dark-900 transition shadow-2xl">Start Your Journey</button>
        </div>
      </section>

      <footer className="py-20 border-t border-dark-800">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Landmark className="w-6 h-6 text-primary-500" />
            <span className="text-xl font-bold text-white">TrustLend</span>
          </div>
          <p className="text-dark-500">&copy; 2026 TrustLend Finance. Built for the decentralized workforce.</p>
        </div>
      </footer>
    </div>
  );
}

// Register Page
function RegisterPage() {
  const navigate = useNavigate();
  const { connect, isConnected, user, updateUserProfile, isConnecting } = useWallet();
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
  useEffect(() => { if (isConnected && user) setStep('role'); }, [isConnected, user]);
  const handleRole = async (role: UserRole) => {
    if (role === 'lender') { updateUserProfile({ role }); setStep('done'); }
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
      setStep('done');
    } finally { setLoading(false); }
  };
  if (step === 'done') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-card p-8 text-center">
        <Check className="w-16 h-16 text-success-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-dark-100 mb-2">You're All Set!</h2>
        <p className="text-dark-400 mb-4">Trust Score: {user?.trust_score || 0}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">Go to Dashboard</button>
      </motion.div>
    </div>
  );
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 w-full max-w-md relative z-10">
        {step === 'wallet' && (
          <div className="text-center">
            <Wallet className="w-12 h-12 text-primary-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-dark-100 mb-4">Connect Your Wallet</h2>
            <button onClick={async () => { setLoading(true); try { await connect(); } finally { setLoading(false); } }} disabled={loading || isConnecting} className="btn-primary w-full">
              {loading || isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        )}
        {step === 'role' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-dark-100 mb-4">Choose Your Role</h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleRole('borrower')} className="glass p-4 hover:border-primary-500 border border-dark-600 transition"><Briefcase className="w-8 h-8 text-primary-400 mb-2 mx-auto" /><span className="text-dark-100 font-semibold">Borrower</span></button>
              <button onClick={() => handleRole('lender')} className="glass p-4 hover:border-accent-500 border border-dark-600 transition"><Coins className="w-8 h-8 text-accent-400 mb-2 mx-auto" /><span className="text-dark-100 font-semibold">Lender</span></button>
            </div>
          </div>
        )}
        {step === 'profile' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-dark-100 mb-4">Complete Your Profile</h2>
            <div className="grid grid-cols-3 gap-2">
              {(['student', 'freelancer', 'gig_worker'] as UserType[]).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, user_type: t }))} className={`p-2 rounded border-2 text-sm ${form.user_type === t ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600'}`}>{t.replace('_', ' ')}</button>
              ))}
            </div>
            <input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
            
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-dark-800/50 rounded-lg border border-dark-700">
                <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-2">Role Specific Factors</p>
                
                {form.user_type === 'student' && (
                  <div className="space-y-3">
                    <select value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} className="select-field">
                      <option value="">Education Level</option>
                      <option>High School</option><option>Some College</option><option>Associate</option><option>Bootcamp</option><option>Bachelor</option><option>Master</option><option>PhD</option>
                    </select>
                    <input placeholder="Certifications (comma-separated)" value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} className="input-field" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Hackathons" type="number" value={form.hackathons} onChange={e => setForm(f => ({ ...f, hackathons: e.target.value }))} className="input-field" />
                      <input placeholder="Internships" type="number" value={form.internships} onChange={e => setForm(f => ({ ...f, internships: e.target.value }))} className="input-field" />
                    </div>
                    <input placeholder="Skills (comma-separated)" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} className="input-field" />
                  </div>
                )}

                {form.user_type === 'freelancer' && (
                  <div className="space-y-3">
                    <input placeholder="Portfolio URL (https://...)" value={form.portfolio_url} onChange={e => setForm(f => ({ ...f, portfolio_url: e.target.value }))} className="input-field" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Client Rating (1-5)" type="number" step="0.1" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input-field" />
                      <input placeholder="Completed Projects" type="number" value={form.completed_tasks} onChange={e => setForm(f => ({ ...f, completed_tasks: e.target.value }))} className="input-field" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Monthly Income ($)" type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input-field" required />
                      <input placeholder="Years of Experience" type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} className="input-field" required />
                    </div>
                  </div>
                )}

                {form.user_type === 'gig_worker' && (
                  <div className="space-y-3">
                    <input placeholder="Occupation (e.g. Driver, Delivery)" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} className="input-field" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Customer Rating (1-5)" type="number" step="0.1" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input-field" />
                      <input placeholder="Completed Jobs" type="number" value={form.completed_tasks} onChange={e => setForm(f => ({ ...f, completed_tasks: e.target.value }))} className="input-field" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Monthly Income ($)" type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input-field" required />
                      <input placeholder="Years of Experience" type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} className="input-field" required />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-dark-400 text-center px-4">
              Your trust score is calculated based on income stability, work history, and role-specific signals. Repayment history has the highest impact on your score.
            </p>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Generate Trust Score'}</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// Dashboard Page
function DashboardPage() {
  const { user } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [pool, setPool] = useState<Pool | null>(null);
  const [nfts, setNfts] = useState<NftAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    Promise.all([getLoans(user.id), getPool(), getNftAchievements(user.id)]).then(([l, p, n]) => { setLoans(l || []); setPool(p); setNfts(n || []); }).finally(() => setLoading(false));
  }, [user]);
  if (loading) return <SidebarLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></SidebarLayout>;
  const active = loans.filter(l => l.status === 'approved');
  const pending = loans.filter(l => l.status === 'pending');
  const chartData = [{ m: 'Jan', s: 45 }, { m: 'Feb', s: 52 }, { m: 'Mar', s: 58 }, { m: 'Apr', s: 65 }, { m: 'May', s: 72 }, { m: 'Jun', s: user?.trust_score || 75 }];
  const pieData = [{ name: 'Repaid', v: loans.filter(l => l.status === 'repaid').length, c: '#2f7246' }, { name: 'Active', v: active.length, c: '#366b49' }, { name: 'Pending', v: pending.length, c: '#9b6d1f' }];
  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex md:items-center justify-between gap-4 flex-col md:flex-row">
          <div><h1 className="text-2xl font-bold text-dark-100">Welcome, {user?.name || 'Borrower'}</h1><p className="text-dark-400">Your financial overview</p></div>
          <div className="flex items-center gap-4"><TrustGauge score={user?.trust_score || 0} size={100} /><Link to="/loans" className="btn-primary text-sm">Request Loan</Link></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Trust Score" value={user?.trust_score || 0} icon={Target} index={0} />
          <StatCard title="Total Borrowed" value={`$${loans.reduce((s, l) => s + Number(l.amount), 0).toLocaleString()}`} icon={DollarSign} index={1} />
          <StatCard title="Active Loans" value={active.length} icon={Landmark} index={2} />
          <StatCard title="NFT Badges" value={nfts.length} icon={Award} index={3} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary-400" />Trust Score Progress</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <XAxis dataKey="m" stroke="#64748b" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #d7dccf', borderRadius: 8, color: '#182117' }} />
                  <Area type="monotone" dataKey="s" stroke="#366b49" fill="#366b49" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="font-semibold text-dark-100 mb-4">Loan Distribution</h3>
            <div className="h-48">
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
            <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2"><Coins className="w-4 h-4 text-primary-400" />Lending Pool</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-dark-400 text-sm">Liquidity</p><p className="text-xl font-bold text-dark-100">${Number(pool.total_liquidity).toLocaleString()}</p></div>
              <div><p className="text-dark-400 text-sm">Available</p><p className="text-xl font-bold text-success-400">${Number(pool.available_funds).toLocaleString()}</p></div>
              <div><p className="text-dark-400 text-sm">Rate</p><p className="text-xl font-bold text-accent-400">{pool.interest_rate}%</p></div>
            </div>
            <Link to="/pool" className="btn-secondary text-sm mt-4 inline-flex">View Pool</Link>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

// Loans Page
function LoansPage() {
  const { user } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', purpose: '', duration: '6' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!user) return; getLoans(user.id).then(d => setLoans(d || [])).finally(() => setLoading(false)); }, [user]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await createLoan({ borrower_id: user.id, amount: parseFloat(form.amount), purpose: form.purpose, duration_months: parseInt(form.duration), interest_rate: user.suggested_interest_rate || 5, risk_level: user.risk_category || 'medium' });
      const d = await getLoans(user.id);
      setLoans(d || []);
      setShowForm(false);
      setForm({ amount: '', purpose: '', duration: '6' });
    } finally { setSaving(false); }
  };
  const handleRepay = async (loan: Loan, amt: number) => {
    if (!user) return;
    await repayLoan(loan.id, amt);
    setLoans((await getLoans(user.id)) || []);
  };
  if (loading) return <SidebarLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></SidebarLayout>;
  const active = loans.filter(l => l.status === 'approved');
  const pending = loans.filter(l => l.status === 'pending');
  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div><h1 className="text-2xl font-bold text-dark-100">Loans</h1><p className="text-dark-400">Manage your loans</p></div>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Request Loan</button>
        </div>
        <div className="grid grid-cols-3 gap-4">{[ { l: 'Pending', v: pending.length, c: 'warning' }, { l: 'Active', v: active.length, c: 'success' }, { l: 'Completed', v: loans.filter(l => l.status === 'repaid').length, c: 'primary' } ].map(s => (
          <div key={s.l} className="glass-card p-4"><span className={`text-${s.c}-400`}>{s.l}</span><p className="text-2xl font-bold text-dark-100">{s.v}</p></div>
        ))}</div>
        <AnimatePresence>{showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-dark-100/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.form initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-dark-100">Request Loan</h2>
              <input placeholder="Amount ($)" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field" required />
              <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} className="select-field" required>
                <option value="">Purpose</option><option>Education</option><option>Equipment</option><option>Working Capital</option><option>Emergency</option><option>Other</option>
              </select>
              <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="select-field">
                <option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option>
              </select>
              <p className="text-sm text-dark-400">Max loan: ${user?.max_loan_amount?.toLocaleString() || '1,000'} @ {user?.suggested_interest_rate || 5}%</p>
              <div className="flex gap-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting...' : 'Submit'}</button></div>
            </motion.form>
          </motion.div>
        )}</AnimatePresence>
        {active.length > 0 && (
          <div className="glass-card p-4">
            <h3 className="font-semibold text-dark-100 mb-4">Active Loans</h3>
            <div className="space-y-3">{active.map(l => (
              <div key={l.id} className="glass p-3">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-dark-100">${Number(l.amount).toLocaleString()}</span>
                  <span className="badge-success">{l.status}</span>
                </div>
                <ProgressBar value={Number(l.amount_repaid) || 0} max={Number(l.amount)} color="success" />
                <div className="mt-2 flex justify-between text-xs text-dark-400"><span>{l.purpose}</span><button onClick={() => handleRepay(l, Number(l.amount) - (Number(l.amount_repaid) || 0))} className="text-primary-400 hover:underline">Repay</button></div>
              </div>
            ))}</div>
          </div>
        )}
        {loans.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Landmark className="w-12 h-12 text-dark-500 mx-auto mb-2" />
            <p className="text-dark-400">No loans yet. Request your first one!</p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

// Pool Page
function PoolPage() {
  const { user } = useWallet();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getPool().then(p => setPool(p)).finally(() => setLoading(false)); }, []);
  const handleDeposit = async () => {
    if (!user || !pool) return;
    setSaving(true);
    try { await depositToPool(pool.id, user.id, parseFloat(amount)); const p = await getPool(); setPool(p); setShowDeposit(false); setAmount(''); } finally { setSaving(false); }
  };
  if (loading) return <SidebarLayout><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mt-32" /></SidebarLayout>;
  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div><h1 className="text-2xl font-bold text-dark-100">Lending Pool</h1><p className="text-dark-400">Community liquidity</p></div>
          <button onClick={() => setShowDeposit(true)} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Deposit</button>
        </div>
        {pool && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Liquidity" value={`$${Number(pool.total_liquidity).toLocaleString()}`} icon={Coins} />
            <StatCard title="Available" value={`$${Number(pool.available_funds).toLocaleString()}`} icon={DollarSign} />
            <StatCard title="Interest" value={`${pool.interest_rate}%`} icon={TrendingUp} />
            <StatCard title="Utilization" value={`${((pool.total_loaned / pool.total_liquidity) * 100).toFixed(0)}%`} icon={Activity} />
          </div>
        )}
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-semibold text-dark-100">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-3">{['Deposit funds to start earning', 'Earn interest from borrowers', 'Withdraw anytime'].map((t, i) => <div key={i} className="glass p-3"><p className="text-sm text-dark-300">{t}</p></div>)}</div>
        </div>
        <AnimatePresence>{showDeposit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-dark-100/20 z-50 flex items-center justify-center p-4" onClick={() => setShowDeposit(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-dark-100">Deposit to Pool</h2>
              <input placeholder="Amount ($)" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" />
              <div className="grid grid-cols-4 gap-2">{[100, 500, 1000, 5000].map(v => <button key={v} onClick={() => setAmount(v.toString())} className="glass py-2 text-sm hover:bg-dark-700">${v}</button>)}</div>
              <div className="flex gap-2"><button onClick={() => setShowDeposit(false)} className="btn-secondary flex-1">Cancel</button><button onClick={handleDeposit} disabled={saving || !amount} className="btn-primary flex-1">{saving ? 'Processing...' : 'Deposit'}</button></div>
            </motion.div>
          </motion.div>
        )}</AnimatePresence>
      </div>
    </SidebarLayout>
  );
}

// NFT Page
function NftPage() {
  const { user } = useWallet();
  const [nfts, setNfts] = useState<NftAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; getNftAchievements(user.id).then(n => setNfts(n || [])).finally(() => setLoading(false)); }, [user]);
  const tiers = { bronze: { color: '#cd7f32', loans: 1 }, silver: { color: '#c0c0c0', loans: 3 }, gold: { color: '#ffd700', loans: 5 }, platinum: { color: '#e5e4e2', loans: 10 } };
  const progress = getNextTierProgress(user?.successful_loans || 0);
  if (loading) return <SidebarLayout><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mt-32" /></SidebarLayout>;
  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-dark-100">NFT Credit Passport</h1><p className="text-dark-400">Your on-chain reputation</p></div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-primary-700 flex items-center justify-center text-2xl font-bold text-dark-100">{user?.reputation_level || 1}</div>
            <div><p className="text-dark-400 text-sm">Reputation Points</p><p className="text-3xl font-bold text-dark-100">{(user?.successful_loans || 0) * 100}</p></div>
          </div>
          <ProgressBar value={progress.current} max={progress.target} label="Next Tier" color="accent" />
        </div>
        <div className="glass-card p-6">
          <h3 className="font-semibold text-dark-100 mb-4">Badges Earned</h3>
          {nfts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{nfts.map((n, i) => (
              <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass p-4 text-center border-2" style={{ borderColor: tiers[n.tier]?.color || '#fff' }}>
                <Award className="w-8 h-8 mx-auto mb-2" style={{ color: tiers[n.tier]?.color || '#fff' }} />
                <p className="text-dark-100 font-semibold">{n.name}</p>
                <p className="text-dark-400 text-sm capitalize">{n.tier}</p>
              </motion.div>
            ))}</div>
          ) : <div className="text-center py-8"><Lock className="w-10 h-10 text-dark-500 mx-auto mb-2" /><p className="text-dark-400">Complete loans to earn badges</p></div>}
        </div>
        <div className="glass-card p-6">
          <h3 className="font-semibold text-dark-100 mb-4">All Tiers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{(Object.entries(tiers) as [keyof typeof tiers, typeof tiers.bronze][]).map(([t, c]) => {
            const earned = nfts.some(n => n.tier === t);
            return <div key={t} className={`glass p-3 ${earned ? 'border-2' : 'opacity-50'}`} style={earned ? { borderColor: c.color } : {}}>
              <div className="flex items-center gap-2">{earned ? <Unlock className="w-4 h-4 text-success-400" /> : <Lock className="w-4 h-4 text-dark-500" />}<span className="text-dark-100 text-sm capitalize">{t}</span></div>
              <p className="text-dark-400 text-xs">{c.loans}+ loans</p>
            </div>;
          })}</div>
        </div>
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
  const [preview, setPreview] = useState(calculateTrustScore({}));
  useEffect(() => {
    setPreview(calculateTrustScore({ 
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
    }));
  }, [form]);
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
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-dark-100">Profile</h1><p className="text-dark-400">Update your trust score</p></div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-primary-400" />Trust Score</h3>
            <TrustGauge score={user?.trust_score || 0} size={140} />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-dark-400">Risk</span><span className={`${user?.risk_category === 'low' ? 'text-success-400' : 'text-warning-400'}`}>{user?.risk_category || 'Unrated'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-dark-400">Max Loan</span><span className="text-dark-100">${user?.max_loan_amount?.toLocaleString() || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-dark-400">Rate</span><span className="text-dark-100">{user?.suggested_interest_rate || 0}%</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-dark-700">
              <p className="text-sm text-dark-400">Preview: <span className="font-bold" style={{ color: getScoreColor(preview.score) }}>{preview.score}</span></p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="lg:col-span-2 glass-card p-6 space-y-4">
            <h3 className="font-semibold text-dark-100 mb-2 flex items-center gap-2"><User className="w-4 h-4 text-primary-400" />Personal Info</h3>
            <input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
            
            <div className="p-3 bg-dark-800/50 rounded-lg border border-dark-700">
              <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-2">Select Your Role</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['student', 'freelancer', 'gig_worker'] as UserType[]).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, user_type: t }))} className={`p-2 rounded border-2 text-sm ${form.user_type === t ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600'}`}>{t.replace('_', ' ')}</button>
                ))}
              </div>

              <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-3">
                {form.user_type.replace('_', ' ')} Details
              </p>
              
              {form.user_type === 'student' && (
                <div className="space-y-3">
                  <select value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} className="select-field">
                    <option value="">Education Level</option>
                    <option>High School</option><option>Some College</option><option>Associate</option><option>Bootcamp</option><option>Bachelor</option><option>Master</option><option>PhD</option>
                  </select>
                  <input placeholder="Certifications (comma-separated)" value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} className="input-field" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Hackathons" type="number" value={form.hackathons} onChange={e => setForm(f => ({ ...f, hackathons: e.target.value }))} className="input-field" />
                    <input placeholder="Internships" type="number" value={form.internships} onChange={e => setForm(f => ({ ...f, internships: e.target.value }))} className="input-field" />
                  </div>
                  <input placeholder="Skills (comma-separated)" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} className="input-field" />
                </div>
              )}

              {form.user_type === 'freelancer' && (
                <div className="space-y-3">
                  <input placeholder="Portfolio URL" value={form.portfolio_url} onChange={e => setForm(f => ({ ...f, portfolio_url: e.target.value }))} className="input-field" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Client Rating (1-5)" type="number" step="0.1" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input-field" />
                    <input placeholder="Completed Projects" type="number" value={form.completed_tasks} onChange={e => setForm(f => ({ ...f, completed_tasks: e.target.value }))} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Monthly Income ($)" type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input-field" />
                    <input placeholder="Years of Experience" type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} className="input-field" />
                  </div>
                </div>
              )}

              {form.user_type === 'gig_worker' && (
                <div className="space-y-3">
                  <input placeholder="Occupation" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} className="input-field" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Customer Rating (1-5)" type="number" step="0.1" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input-field" />
                    <input placeholder="Completed Jobs" type="number" value={form.completed_tasks} onChange={e => setForm(f => ({ ...f, completed_tasks: e.target.value }))} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Monthly Income ($)" type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input-field" />
                    <input placeholder="Years of Experience" type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} className="input-field" />
                  </div>
                </div>
              )}
            </div>
            
            <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}</button>
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

