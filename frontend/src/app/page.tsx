'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  HandCoins, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  Bell,
  Search,
  Menu,
  LogOut,
  User as UserIcon,
  Settings,
  LayoutDashboard,
  UserPlus,
  FileText,
  DollarSign,
  Calendar,
  Clock
} from 'lucide-react';

interface DashboardStats {
  totalCustomers: number;
  activeLoans: number;
  totalCapital: number;
  totalIncome: number;
  totalExpenses: number;
  overdueLoans: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeLoans: 0,
    totalCapital: 0,
    totalIncome: 0,
    totalExpenses: 0,
    overdueLoans: 0,
  });
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Get admin info
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      setAdmin(JSON.parse(adminData));
    }

    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // In production, replace with actual API calls
      // For now, we'll use mock data
      setTimeout(() => {
        setStats({
          totalCustomers: 156,
          activeLoans: 42,
          totalCapital: 12500000,
          totalIncome: 2340000,
          totalExpenses: 876000,
          overdueLoans: 5,
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    router.push('/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    trend, 
    trendValue 
  }: any) => (
    <div className="glass rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-2 gradient-text">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs">
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="spinner mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Top Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">LSM</span>
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">
                Loan & Savings Manager
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all w-48 lg:w-64"
                />
              </div>
              <button className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105 text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">
            Welcome back, {admin?.full_name || 'Admin'} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your business today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Capital"
            value={formatCurrency(stats.totalCapital)}
            icon={Wallet}
            color="from-blue-500 to-blue-600"
            trend="up"
            trendValue="+12% this month"
          />
          <StatCard
            title="Active Loans"
            value={stats.activeLoans}
            icon={HandCoins}
            color="from-green-500 to-green-600"
            trend="up"
            trendValue="+3 new this week"
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            color="from-purple-500 to-purple-600"
            trend="up"
            trendValue="+8 this month"
          />
          <StatCard
            title="Income"
            value={formatCurrency(stats.totalIncome)}
            icon={TrendingUp}
            color="from-emerald-500 to-emerald-600"
            trend="up"
            trendValue="+5.2% this month"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button className="glass rounded-xl p-4 hover:shadow-xl transition-all flex items-center gap-3 hover:scale-105">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-medium">New Customer</p>
              <p className="text-xs text-gray-400">Add to system</p>
            </div>
          </button>
          <button className="glass rounded-xl p-4 hover:shadow-xl transition-all flex items-center gap-3 hover:scale-105">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <p className="font-medium">New Loan</p>
              <p className="text-xs text-gray-400">Create loan</p>
            </div>
          </button>
          <button className="glass rounded-xl p-4 hover:shadow-xl transition-all flex items-center gap-3 hover:scale-105">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-left">
              <p className="font-medium">New Payment</p>
              <p className="text-xs text-gray-400">Record payment</p>
            </div>
          </button>
          <button className="glass rounded-xl p-4 hover:shadow-xl transition-all flex items-center gap-3 hover:scale-105">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <p className="font-medium">View Reports</p>
              <p className="text-xs text-gray-400">Analytics</p>
            </div>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                  JD
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">John Doe made a loan payment</p>
                  <p className="text-xs text-gray-400">UGX 500,000 • 2 hours ago</p>
                </div>
                <span className="text-xs text-green-500 font-medium">Completed</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}