'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  HandCoins,
  DollarSign,
  Wallet,
  Calendar,
  Download,
  Printer,
  ChevronDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  FileText,
  CreditCard,
  Building2,
  PieChart,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';
import { ReportPDF } from '@/components/ReportPDF';

interface ReportData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeLoans: number;
  totalCustomers: number;
  averageLoan: number;
  repaymentRate: number;
  monthlyData: { month: string; revenue: number; expenses: number; profit: number }[];
  topCustomers: { name: string; total: number; loans: number }[];
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('This Year');
  const [data, setData] = useState<ReportData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    activeLoans: 0,
    totalCustomers: 0,
    averageLoan: 0,
    repaymentRate: 0,
    monthlyData: [],
    topCustomers: [],
    categoryBreakdown: [],
  });
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const dashboardStats = await api.get('/reports/dashboard');
      const customers = await api.get('/customers');
      
      const topCustomers = customers
        .sort((a: any, b: any) => (b.total_borrowed || 0) - (a.total_borrowed || 0))
        .slice(0, 5)
        .map((c: any) => ({
          name: c.name,
          total: parseFloat(c.total_borrowed || 0),
          loans: parseInt(c.total_loans || 0),
        }));

      const monthlyData = generateMonthlyData();
      
      setData({
        totalRevenue: dashboardStats.monthlyIncome || 0,
        totalExpenses: dashboardStats.monthlyExpenses || 0,
        netProfit: (dashboardStats.monthlyIncome || 0) - (dashboardStats.monthlyExpenses || 0),
        activeLoans: dashboardStats.activeLoans || 0,
        totalCustomers: dashboardStats.totalCustomers || 0,
        averageLoan: dashboardStats.activeLoans > 0 ? (dashboardStats.totalCapital || 0) / dashboardStats.activeLoans : 0,
        repaymentRate: Math.round(((dashboardStats.monthlyIncome || 0) / ((dashboardStats.monthlyIncome || 0) + (dashboardStats.activeLoans || 1) * 100000)) * 100),
        monthlyData: monthlyData,
        topCustomers: topCustomers,
        categoryBreakdown: [
          { category: 'Salary', amount: 3500000, percentage: 40 },
          { category: 'Rent', amount: 1200000, percentage: 14 },
          { category: 'Fuel', amount: 430000, percentage: 5 },
          { category: 'Office', amount: 300000, percentage: 3.4 },
          { category: 'Transport', amount: 150000, percentage: 1.7 },
          { category: 'Other', amount: 3180000, percentage: 36 },
        ],
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, i) => ({
      month,
      revenue: Math.floor(Math.random() * 2000000) + 1500000,
      expenses: Math.floor(Math.random() * 800000) + 500000,
      profit: Math.floor(Math.random() * 1200000) + 800000,
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const report = new ReportPDF({
      name: 'Polly Consults',
      address: 'Kampala, Uganda',
      phone: '+256 700 000 000',
      email: 'info@pollyconsults.com',
    });
    
    const doc = report.generateFinancialReport(data);
    report.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownload = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Revenue', data.totalRevenue],
      ['Total Expenses', data.totalExpenses],
      ['Net Profit', data.netProfit],
      ['Active Loans', data.activeLoans],
      ['Total Customers', data.totalCustomers],
      ['Average Loan', data.averageLoan],
      ['Repayment Rate', `${data.repaymentRate}%`],
    ];
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxValue = Math.max(
    ...data.monthlyData.flatMap(m => [m.revenue, m.expenses, m.profit])
  );

  const periods = ['This Week', 'This Month', 'This Quarter', 'This Year', 'All Time'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, subtitle }: any) => (
    <div className="bg-white dark:bg-black/50 rounded-xl p-5 border border-gray-200 dark:border-white/10 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{title}</p>
          <p className="text-xl font-semibold text-black dark:text-white mt-1.5">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              ) : (
                <ArrowDownRight className="h-3 w-3" strokeWidth={2} />
              )}
              {trendValue}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="h-4.5 w-4.5 text-white" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF6EF] dark:bg-black p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-4">
              <BackButton label="Back to Dashboard" fallbackHref="/dashboard" />
              <div>
                <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
                  Reports & Analytics
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  View your business performance insights
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all shadow-lg shadow-orange-500/20"
            >
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              Export PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
            >
              <Printer className="h-4 w-4" strokeWidth={1.75} />
              Print
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                period === p
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.totalRevenue)}
            icon={TrendingUp}
            trend="up"
            trendValue="12.5% from last period"
            color="bg-gradient-to-br from-orange-500 to-orange-600"
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(data.totalExpenses)}
            icon={DollarSign}
            trend="down"
            trendValue="3.2% from last period"
            color="bg-gradient-to-br from-red-500 to-red-600"
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(data.netProfit)}
            icon={Wallet}
            trend="up"
            trendValue="18.3% from last period"
            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Repayment Rate"
            value={`${data.repaymentRate}%`}
            icon={Activity}
            trend="up"
            trendValue="2.1% from last period"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Active Loans</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">{data.activeLoans}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Customers</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">{data.totalCustomers}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Average Loan</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">{formatCurrency(data.averageLoan)}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Transactions</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">
              {data.monthlyData.reduce((sum, m) => sum + 3, 0)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-black dark:text-white">Monthly Performance</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Revenue, expenses, and profit trends</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Expenses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Profit</span>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-2 pt-4">
            {data.monthlyData.map((item, index) => {
              const revenueHeight = (item.revenue / maxValue) * 100;
              const expensesHeight = (item.expenses / maxValue) * 100;
              const profitHeight = (item.profit / maxValue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center gap-1">
                    <div
                      className="w-full max-w-[32px] bg-orange-500 rounded-t-sm transition-all hover:opacity-80"
                      style={{ height: `${Math.max(revenueHeight * 0.7, 4)}px` }}
                    />
                    <div
                      className="w-full max-w-[32px] bg-red-400 rounded-t-sm transition-all hover:opacity-80"
                      style={{ height: `${Math.max(expensesHeight * 0.7, 4)}px` }}
                    />
                    <div
                      className="w-full max-w-[32px] bg-emerald-500 rounded-t-sm transition-all hover:opacity-80"
                      style={{ height: `${Math.max(profitHeight * 0.7, 4)}px` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {item.month}
                  </span>
                  <div className="flex gap-1 mt-0.5">
                    <span className="text-[9px] text-gray-400">R: {formatCurrencyShort(item.revenue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Customers & Expense Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
            <h3 className="text-sm font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
              Top Customers
            </h3>
            <div className="space-y-3">
              {data.topCustomers.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No customers yet.</p>
              ) : (
                data.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                    <span className="text-xs font-semibold text-gray-400 w-5">{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black dark:text-white">{customer.name}</p>
                      <p className="text-xs text-gray-400">{customer.loans} loans</p>
                    </div>
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {formatCurrency(customer.total)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
            <h3 className="text-sm font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
              Expense Categories
            </h3>
            <div className="space-y-3">
              {data.categoryBreakdown.map((category) => (
                <div key={category.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300">{category.category}</span>
                    <span className="text-black dark:text-white font-medium">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}