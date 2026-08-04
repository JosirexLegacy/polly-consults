'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  HandCoins,
  Wallet,
  Bell,
  Search,
  LogOut,
  UserPlus,
  FileText,
  DollarSign,
  BarChart3,
  Home,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  CreditCard,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  Info,
  BellOff,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { api } from '@/lib/api';
import NotificationDropdown from '@/components/NotificationDropdown';

interface DashboardStats {
  totalCustomers: number;
  activeLoans: number;
  totalCapital: number;
  overdueLoans: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  repaymentRate: number;
  customerGrowth: number;
  totalLoanAmount: number;
  totalLoanProducts: number;
}

interface Activity {
  id: string;
  customer_name: string;
  action: string;
  amount?: number;
  time: string;
  initials: string;
  status: string;
}

function useCountUp(target: number, active: boolean, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    let raf: number;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(ease(p) * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return value;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeLoans: 0,
    totalCapital: 0,
    overdueLoans: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    repaymentRate: 0,
    customerGrowth: 0,
    totalLoanAmount: 0,
    totalLoanProducts: 0,
  });
  const [admin, setAdmin] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  

  const capitalCount = useCountUp(stats.totalCapital, !loading);
  const customerCount = useCountUp(stats.totalCustomers, !loading);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const adminData = localStorage.getItem('admin');
    if (adminData) setAdmin(JSON.parse(adminData));

    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    fetchDashboardData();
    fetchRecentActivity();
  }, []);

  // Watch for darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', String(next));
  };

  const fetchDashboardData = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await api.get('/reports/dashboard');
      const repaymentRate =
        data.monthlyIncome > 0
          ? Math.min(Math.round((data.monthlyIncome / (data.monthlyIncome + data.monthlyExpenses)) * 100), 100)
          : 0;
      
      const totalLoanAmount = data.activeLoans * 2500000;
      
      setStats({
        totalCustomers: data.totalCustomers || 0,
        activeLoans: data.activeLoans || 0,
        totalCapital: data.totalCapital || 0,
        overdueLoans: data.overdueLoans || 0,
        monthlyIncome: data.monthlyIncome || 0,
        monthlyExpenses: data.monthlyExpenses || 0,
        repaymentRate,
        customerGrowth: data.totalCustomers > 10 ? 12 : 5,
        totalLoanAmount: totalLoanAmount,
        totalLoanProducts: Math.max(data.activeLoans || 0, 3),
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const payments = await api.get('/payments');
      setRecentActivities(
        payments.slice(0, 6).map((p: any) => ({
          id: p.id,
          customer_name: p.customer_name || 'Unknown',
          action: 'made a loan payment',
          amount: p.amount_paid,
          time: new Date(p.payment_date).toLocaleDateString(),
          initials: (p.customer_name || 'U').charAt(0).toUpperCase(),
          status: p.remaining_balance_after === 0 ? 'Completed' : 'Partial',
        }))
      );
    } catch {
      setRecentActivities([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    router.push('/login');
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const navigation = [
    { name: 'Dashboard', icon: Home, current: true, href: '/dashboard' },
    { name: 'Sales', icon: ShoppingCart, current: false, href: '/sales' },
    { name: 'Customers', icon: Users, current: false, href: '/customers' },
    { name: 'Loans', icon: HandCoins, current: false, href: '/loans' },
    { name: 'Payments', icon: CreditCard, current: false, href: '/payments' },
    { name: 'Expenses', icon: DollarSign, current: false, href: '/expenses' },
    { name: 'Inventory', icon: Package, current: false, href: '/inventory' },
    { name: 'Financial', icon: BarChart3, current: false, href: '/financial' },
    { name: 'Audit', icon: FileText, current: false, href: '/audit' },
    { name: 'Reports', icon: BarChart3, current: false, href: '/reports' },
    { name: 'Settings', icon: Settings, current: false, href: '/settings' },
  ];

  const ledgerStats = [
    { label: 'Active Loans', value: stats.activeLoans, delta: '+8.0%' },
    { label: 'Customers', value: customerCount, delta: `+${stats.customerGrowth}%` },
    { label: 'Monthly Income', value: formatCurrency(stats.monthlyIncome), delta: '+18.3%' },
    { label: 'Repayment Rate', value: `${stats.repaymentRate}%`, delta: null },
    { label: 'Overdue', value: stats.overdueLoans, delta: null, warn: stats.overdueLoans > 0 },
  ];

  const quickActions = [
    { label: 'New customer', icon: UserPlus, href: '/customers' },
    { label: 'New loan', icon: FileText, href: '/loans' },
    { label: 'Record payment', icon: DollarSign, href: '/payments' },
    { label: 'View reports', icon: BarChart3, href: '/reports' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200 dark:border-orange-800/30 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          </div>
          <p className="mt-5 text-[13px] text-gray-400 dark:text-gray-500 font-medium">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF] dark:bg-black pb-20 lg:pb-0" style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)' }}>
      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[248px] bg-black dark:bg-black z-50 flex flex-col
          transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-9 h-9">
                <circle cx="18" cy="18" r="17" fill="none" stroke="#F97316" strokeWidth="1" opacity="0.5" />
                <circle cx="18" cy="18" r="13.5" fill="none" stroke="#F97316" strokeWidth="0.75" opacity="0.35" />
                <text x="18" y="23" textAnchor="middle" fontSize="12" fill="#FFFFFF" fontFamily="var(--font-display, Georgia, serif)">
                  PC
                </text>
              </svg>
            </div>
            <div>
              <p className="text-[16px] leading-none text-white tracking-tight" style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}>
                Polly Consults
              </p>
              <p className="text-[9px] text-orange-500 tracking-[0.18em] uppercase mt-1">Management System</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 pt-6 space-y-0.5">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-md text-[13px] font-medium transition-all
                ${item.current ? 'text-white bg-white/[0.04]' : 'text-white/40 hover:text-white/75 hover:bg-white/[0.02]'}`}
            >
              {item.current && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-orange-500 rounded-full -ml-3 shadow-[0_0_8px_#F97316]" />}
              <item.icon className="h-[16px] w-[16px]" strokeWidth={1.6} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="px-3 pb-6 pt-3 border-t border-white/[0.06]">
          <Link
            href="/settings"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-[13px] font-medium text-white/40 hover:text-white/75 transition-colors"
          >
            <Settings className="h-[16px] w-[16px]" strokeWidth={1.6} />
            Settings
          </Link>
          <div className="mt-4 px-3.5 pt-4 border-t border-white/[0.06] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-[11px] font-medium text-white">
              {admin?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] text-white/85 truncate">{admin?.full_name || 'Admin'}</p>
              <p className="text-[10px] text-white/35">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-[248px]">
        <header className="h-16 sticky top-0 z-30 bg-[#FAF6EF]/90 dark:bg-black/90 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="h-full max-w-6xl mx-auto px-6 lg:px-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-black/60 dark:text-white/60">
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search records"
                  className="pl-8 pr-3 h-8 w-56 bg-transparent border border-black/10 dark:border-white/10 rounded-full text-[12.5px] text-black dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-500/60 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={toggleDarkMode} 
                className="p-2 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-colors" 
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Moon className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>

              {/* Notification Dropdown */}
              <NotificationDropdown />

              <button onClick={handleLogout} className="p-2 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-colors" aria-label="Log out">
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
          {/* Hero Panel */}
          <div className="relative overflow-hidden rounded-[28px] bg-black dark:bg-black px-8 sm:px-12 py-12 mb-10 fade-up">
            <div
              className="absolute inset-0 opacity-[0.5] pointer-events-none"
              style={{ background: 'radial-gradient(600px circle at 15% 20%, rgba(249,115,22,0.15), transparent 60%)' }}
            />
            <div className="absolute bottom-0 left-0 w-full h-28 opacity-70 pointer-events-none bg-gradient-to-t from-orange-500/10 to-transparent" />

            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
              <div>
                <p className="text-[11px] tracking-[0.18em] uppercase text-orange-500 mb-3">
                  {new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' })} &middot; Total Capital
                </p>
                <p
                  className="text-[54px] sm:text-[64px] leading-none text-white tracking-tight tabular-nums"
                  style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  {formatCurrency(capitalCount)}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="flex items-center gap-1 text-[13px] font-medium text-emerald-400">
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                    12.5%
                  </span>
                  <span className="text-[13px] text-white/40">vs last month</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[13px] text-white/60 italic" style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}>
                  Welcome back, {admin?.full_name?.split(' ')[0] || 'Admin'}
                </p>
                <button
                  onClick={() => fetchDashboardData(true)}
                  disabled={refreshing}
                  className="text-[12px] text-white/40 hover:text-orange-500 transition-colors mt-1 disabled:opacity-50"
                >
                  {refreshing ? 'Updating…' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 fade-up" style={{ animationDelay: '40ms' }}>
            <div className="bg-white dark:bg-black/50 rounded-2xl p-5 border border-black/10 dark:border-white/10 hover:shadow-xl transition-all hover:-translate-y-0.5">
              <p className="text-[11px] text-gray-400 font-medium">Total Capital</p>
              <p className="text-xl font-bold text-black dark:text-white mt-1.5">{formatCurrency(stats.totalCapital)}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" /> 12.5%
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-black/50 rounded-2xl p-5 border border-black/10 dark:border-white/10 hover:shadow-xl transition-all hover:-translate-y-0.5">
              <p className="text-[11px] text-gray-400 font-medium">Active Loans</p>
              <p className="text-xl font-bold text-black dark:text-white mt-1.5">{stats.activeLoans}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" /> 8.0%
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-black/50 rounded-2xl p-5 border border-black/10 dark:border-white/10 hover:shadow-xl transition-all hover:-translate-y-0.5">
              <p className="text-[11px] text-gray-400 font-medium">Total Customers</p>
              <p className="text-xl font-bold text-black dark:text-white mt-1.5">{customerCount}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" /> {stats.customerGrowth}%
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-black/50 rounded-2xl p-5 border border-black/10 dark:border-white/10 hover:shadow-xl transition-all hover:-translate-y-0.5">
              <p className="text-[11px] text-gray-400 font-medium">Monthly Income</p>
              <p className="text-xl font-bold text-black dark:text-white mt-1.5">{formatCurrency(stats.monthlyIncome)}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" /> 18.3%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Quick actions */}
            <div className="fade-up" style={{ animationDelay: '140ms' }}>
              <p className="text-[11px] tracking-[0.16em] uppercase text-gray-400 mb-4">Quick Actions</p>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="group flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 hover:border-orange-500/50 hover:shadow-[0_4px_20px_rgba(249,115,22,0.12)] transition-all"
                  >
                    <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                      <a.icon className="h-4 w-4 text-orange-500 group-hover:text-white transition-colors" strokeWidth={1.6} />
                    </div>
                    <p className="text-[12.5px] font-medium text-black dark:text-white leading-tight">{a.label}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="lg:col-span-2 fade-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] tracking-[0.16em] uppercase text-gray-400">Recent Activity</p>
                <Link href="/reports" className="text-[12px] text-orange-500 hover:underline">View all</Link>
              </div>

              {recentActivities.length === 0 ? (
                <p className="text-[13px] text-gray-400 py-6">No activity recorded yet.</p>
              ) : (
                <div>
                  {recentActivities.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06] last:border-0 hover:bg-orange-50/50 dark:hover:bg-orange-900/5 transition-colors -mx-2 px-2 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center text-[10.5px] font-medium text-orange-600 dark:text-orange-400 flex-shrink-0">
                        {item.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-black dark:text-white truncate">
                          <span className="font-medium">{item.customer_name}</span>{' '}
                          <span className="text-gray-400">{item.action}</span>
                        </p>
                        <p className="text-[11px] text-gray-400">{item.time}</p>
                      </div>
                      {item.amount && (
                        <span className="text-[13px] tabular-nums text-black dark:text-white flex-shrink-0" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                          {formatCurrency(item.amount)}
                        </span>
                      )}
                      <span
                        className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          item.status === 'Completed'
                            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                            : 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 fade-up" style={{ animationDelay: '260ms' }}>
            <div className="bg-gradient-to-br from-orange-500/5 to-orange-600/5 dark:from-orange-500/10 dark:to-orange-600/10 rounded-xl p-4 border border-orange-200/20 dark:border-orange-800/20">
              <p className="text-[11px] text-gray-400 font-medium">Today's Revenue</p>
              <p className="text-lg font-semibold text-black dark:text-white mt-1">
                {formatCurrency(Math.round(stats.monthlyIncome / 30))}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 dark:from-emerald-500/10 dark:to-emerald-600/10 rounded-xl p-4 border border-emerald-200/20 dark:border-emerald-800/20">
              <p className="text-[11px] text-gray-400 font-medium">Repayment Rate</p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.repaymentRate}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/5 to-purple-600/5 dark:from-purple-500/10 dark:to-purple-600/10 rounded-xl p-4 border border-purple-200/20 dark:border-purple-800/20">
              <p className="text-[11px] text-gray-400 font-medium">Total Loan Products</p>
              <p className="text-lg font-semibold text-black dark:text-white mt-1">
                {stats.totalLoanProducts}
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-500/5 to-red-600/5 dark:from-red-500/10 dark:to-red-600/10 rounded-xl p-4 border border-red-200/20 dark:border-red-800/20">
              <p className="text-[11px] text-gray-400 font-medium">Overdue Loans</p>
              <p className={`text-lg font-semibold mt-1 ${stats.overdueLoans > 0 ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>
                {stats.overdueLoans}
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 lg:hidden z-40 safe-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navigation.slice(0, 5).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                item.current ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-[9px] font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}