'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  RefreshCw,
  Clock,
  User,
  Calendar,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Loader2,
  Plus,
  X,
  Activity,
  Shield,
  Users,
  Package,
  DollarSign,
  CreditCard,
  HandCoins,
  Building2,
  Tag,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  PieChart,
  Receipt,
  History,
  FileBarChart,
  Calculator,
  Scale,
  ShoppingBag,
  Award,
  Target,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  PlusCircle,
  MinusCircle,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_username: string;
  admin_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

interface AuditSummary {
  total_logs: number;
  unique_users: number;
  creates: number;
  updates: number;
  deletes: number;
  logins: number;
  last_24h: number;
}

interface ProductSale {
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
  total_profit: number;
  unit_price: number;
  cost_price: number;
  profit_per_unit: number;
  profit_margin: number;
}

interface DailySale {
  date: string;
  sales_count: number;
  revenue: number;
  profit: number;
  items_sold: number;
  items: ProductSale[];
}

interface FinancialSummary {
  sales: {
    total_sales: number;
    total_revenue: number;
    total_profit: number;
    unique_customers: number;
    total_items_sold: number;
  };
  expenses: number;
  loans: {
    total_disbursed: number;
    total_repaid: number;
  };
  inventory_value: number;
  capital_balance: number;
  top_products: ProductSale[];
  daily_trend: DailySale[];
  net_profit: number;
  net_margin: number;
  low_performers: ProductSale[];
}

export default function AuditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'items' | 'activity'>('overview');
  const [logsPerPage] = useState(10);
  const [reportPeriod, setReportPeriod] = useState('today');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDayItems, setSelectedDayItems] = useState<ProductSale[]>([]);
  const [showDayDetails, setShowDayDetails] = useState(false);

  const entities = [
    { value: 'all', label: 'All Entities' },
    { value: 'customer', label: 'Customers', icon: Users },
    { value: 'loan', label: 'Loans', icon: HandCoins },
    { value: 'payment', label: 'Payments', icon: CreditCard },
    { value: 'expense', label: 'Expenses', icon: DollarSign },
    { value: 'product', label: 'Products', icon: Package },
    { value: 'sale', label: 'Sales', icon: Tag },
    { value: 'inventory_transaction', label: 'Inventory', icon: Building2 },
    { value: 'user', label: 'Users', icon: User },
    { value: 'settings', label: 'Settings', icon: Shield },
  ];

  const actions = [
    { value: 'all', label: 'All Actions' },
    { value: 'CREATE', label: 'Create', icon: Plus },
    { value: 'UPDATE', label: 'Update', icon: Edit },
    { value: 'DELETE', label: 'Delete', icon: Trash2 },
    { value: 'LOGIN', label: 'Login', icon: LogIn },
    { value: 'LOGOUT', label: 'Logout', icon: LogOut },
    { value: 'VIEW', label: 'View', icon: Eye },
    { value: 'EXPORT', label: 'Export', icon: Download },
    { value: 'PRINT', label: 'Print', icon: Printer },
  ];

  const actionColors: Record<string, string> = {
    CREATE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    UPDATE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DELETE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    LOGIN: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    LOGOUT: 'bg-gray-50 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
    VIEW: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    EXPORT: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PRINT: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  };

  const entityColors: Record<string, string> = {
    customer: 'text-blue-600 dark:text-blue-400',
    loan: 'text-emerald-600 dark:text-emerald-400',
    payment: 'text-purple-600 dark:text-purple-400',
    expense: 'text-red-600 dark:text-red-400',
    product: 'text-orange-600 dark:text-orange-400',
    sale: 'text-amber-600 dark:text-amber-400',
    inventory_transaction: 'text-cyan-600 dark:text-cyan-400',
    user: 'text-gray-600 dark:text-gray-400',
    settings: 'text-slate-600 dark:text-slate-400',
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAllData();
  }, [reportPeriod]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAuditLogs(),
        fetchSummary(),
        fetchFinancialSummary(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      let url = '/audit/logs?limit=100';
      if (entityFilter !== 'all') url += `&entity=${entityFilter}`;
      if (actionFilter !== 'all') url += `&action=${actionFilter}`;
      if (dateFilter) url += `&start_date=${dateFilter}`;
      
      const data = await api.get(url);
      setLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await api.get('/audit/summary');
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const data = await api.get(`/audit/financial-summary?period=${reportPeriod}`);
      
      // Calculate low performers (bottom 3 products by profit)
      const sortedProducts = [...(data.top_products || [])].sort((a, b) => a.total_profit - b.total_profit);
      data.low_performers = sortedProducts.slice(0, 3);
      
      setFinancialSummary(data);
    } catch (error) {
      console.error('Error fetching financial summary:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setEntityFilter('all');
    setActionFilter('all');
    setDateFilter('');
    setSearchTerm('');
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    try {
      const data = await api.get('/audit/report');
      const headers = ['Date', 'Actions', 'Creates', 'Updates', 'Deletes', 'Logins', 'Entities'];
      const rows = data.map((row: any) => [
        row.date,
        row.total_actions,
        row.creates,
        row.updates,
        row.deletes,
        row.logins,
        row.entities_affected?.join(', ') || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map((row: any) => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting audit report:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEntityIcon = (entity: string) => {
    const icons: Record<string, any> = {
      customer: Users,
      loan: HandCoins,
      payment: CreditCard,
      expense: DollarSign,
      product: Package,
      sale: Tag,
      inventory_transaction: Building2,
      user: User,
      settings: Shield,
    };
    const Icon = icons[entity] || FileText;
    return <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />;
  };

  const formatDetails = (details: any) => {
    if (!details) return <span className="text-xs text-gray-400">No details</span>;
    
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      
      if (parsed.items && Array.isArray(parsed.items)) {
        return (
          <div className="space-y-2">
            {parsed.items.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs border-b border-gray-100 dark:border-white/5 pb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.name || item.product_name || 'Item'}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {item.qty || item.quantity || 1} × {item.price || item.unit_price || 0}
                </span>
              </div>
            ))}
            {parsed.total && (
              <div className="flex items-center justify-between text-xs font-medium pt-1 border-t border-gray-200 dark:border-white/10">
                <span className="text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-black dark:text-white">{parsed.total}</span>
              </div>
            )}
          </div>
        );
      }
      
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        const entries = Object.entries(parsed);
        if (entries.length === 0) return <span className="text-xs text-gray-400">Empty</span>;
        
        return (
          <div className="space-y-1">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-500 dark:text-gray-400 capitalize">
                  {key.replace(/_/g, ' ')}:
                </span>
                <span className="text-gray-700 dark:text-gray-300">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      
      return <span className="text-xs text-gray-600 dark:text-gray-400">{String(parsed)}</span>;
    } catch {
      return <span className="text-xs text-gray-500">{String(details)}</span>;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const search = searchTerm.toLowerCase();
    return (
      log.admin_name?.toLowerCase().includes(search) ||
      log.admin_username?.toLowerCase().includes(search) ||
      log.entity?.toLowerCase().includes(search) ||
      log.action?.toLowerCase().includes(search) ||
      log.entity_id?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + logsPerPage);

  const openDayDetails = (day: DailySale) => {
    setSelectedDayItems(day.items || []);
    setSelectedDate(day.date);
    setShowDayDetails(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF] dark:bg-black p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-4">
              <BackButton label="Back to Dashboard" fallbackHref="/dashboard" />
              <div>
                <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
                  Sales & Inventory Audit
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Track items sold, profits, and inventory performance
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
            >
              <Printer className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Print Report</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              viewMode === 'overview'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-white/10'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" strokeWidth={1.75} />
            Overview
          </button>
          <button
            onClick={() => setViewMode('items')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              viewMode === 'items'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-white/10'
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" strokeWidth={1.75} />
            Items Sold
          </button>
          <button
            onClick={() => setViewMode('activity')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              viewMode === 'activity'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-white/10'
            }`}
          >
            <Activity className="h-4 w-4 inline mr-2" strokeWidth={1.75} />
            Activity Log
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['today', 'week', 'month', 'quarter', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setReportPeriod(period)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                reportPeriod === period
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-white/10'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Overview View */}
        {viewMode === 'overview' && financialSummary && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-black/50 rounded-2xl p-5 border border-gray-200 dark:border-white/10 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <Wallet className="h-5 w-5 text-emerald-500" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Revenue</p>
                    <p className="text-xl font-bold text-black dark:text-white mt-0.5">
                      {formatCurrency(financialSummary.sales.total_revenue)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-black/50 rounded-2xl p-5 border border-gray-200 dark:border-white/10 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <ShoppingBag className="h-5 w-5 text-blue-500" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Items Sold</p>
                    <p className="text-xl font-bold text-black dark:text-white mt-0.5">
                      {financialSummary.sales.total_items_sold || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-black/50 rounded-2xl p-5 border border-gray-200 dark:border-white/10 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10">
                    <TrendingUp className="h-5 w-5 text-purple-500" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Gross Profit</p>
                    <p className="text-xl font-bold text-black dark:text-white mt-0.5">
                      {formatCurrency(financialSummary.sales.total_profit)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-black/50 rounded-2xl p-5 border border-gray-200 dark:border-white/10 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10">
                    <Target className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Net Profit</p>
                    <p className={`text-xl font-bold mt-0.5 ${financialSummary.net_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(financialSummary.net_profit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top & Low Performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUpIcon className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {financialSummary.top_products?.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No sales data available</p>
                  ) : (
                    financialSummary.top_products?.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 rounded-lg transition-colors border border-transparent hover:border-emerald-200/50">
                        <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400' :
                          index === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-gray-50 text-gray-400 dark:bg-gray-800/20 dark:text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-black dark:text-white">{product.product_name}</p>
                          <p className="text-xs text-gray-400">{product.quantity_sold} units sold</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(product.total_profit)}
                          </p>
                          <p className="text-xs text-gray-400">Profit</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                  <TrendingDownIcon className="h-4 w-4 text-red-500" strokeWidth={1.75} />
                  Low Performers
                </h3>
                <div className="space-y-3">
                  {financialSummary.low_performers?.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">All products are performing well! 🎉</p>
                  ) : (
                    financialSummary.low_performers?.map((product, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 hover:bg-red-50/50 dark:hover:bg-red-900/10 rounded-lg transition-colors border border-transparent hover:border-red-200/50">
                        <span className="text-xs font-bold w-6 h-6 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-black dark:text-white">{product.product_name}</p>
                          <p className="text-xs text-gray-400">{product.quantity_sold || 0} units sold</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(product.total_profit || 0)}
                          </p>
                          <p className="text-xs text-gray-400">Profit</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Daily Sales Trend */}
            {financialSummary.daily_trend && financialSummary.daily_trend.length > 0 && (
              <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" strokeWidth={1.75} />
                  Daily Sales Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-white/10">
                        <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2 px-3">
                          Date
                        </th>
                        <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2 px-3">
                          Sales
                        </th>
                        <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2 px-3">
                          Items
                        </th>
                        <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2 px-3">
                          Revenue
                        </th>
                        <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2 px-3">
                          Profit
                        </th>
                        <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2 px-3">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                      {financialSummary.daily_trend.slice(0, 10).map((day) => (
                        <tr key={day.date} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                          <td className="py-2 px-3 text-sm font-medium text-black dark:text-white">
                            {formatDate(day.date)}
                          </td>
                          <td className="py-2 px-3 text-right text-sm text-black dark:text-white">
                            {day.sales_count}
                          </td>
                          <td className="py-2 px-3 text-right text-sm text-black dark:text-white">
                            {day.items_sold || 0}
                          </td>
                          <td className="py-2 px-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(day.revenue)}
                          </td>
                          <td className="py-2 px-3 text-right text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(day.profit)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => openDayDetails(day)}
                              className="px-3 py-1 text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-500/20 transition-colors"
                            >
                              View Items
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items Sold View */}
        {viewMode === 'items' && financialSummary && (
          <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
              All Items Sold
            </h2>
            
            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {financialSummary.top_products?.length === 0 ? (
                <p className="col-span-full text-center text-gray-400 dark:text-gray-500 py-8">No items sold in this period</p>
              ) : (
                financialSummary.top_products?.map((product, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 hover:shadow-lg transition-all border border-gray-200 dark:border-white/10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-black dark:text-white">{product.product_name}</p>
                        <p className="text-xs text-gray-400 mt-1">{product.quantity_sold} units sold</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        product.total_profit > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {product.total_profit > 0 ? '+' : ''}{formatCurrency(product.total_profit)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white dark:bg-black/50 rounded-lg p-2 text-center">
                        <p className="text-gray-400">Revenue</p>
                        <p className="font-semibold text-black dark:text-white">{formatCurrency(product.total_revenue)}</p>
                      </div>
                      <div className="bg-white dark:bg-black/50 rounded-lg p-2 text-center">
                        <p className="text-gray-400">Profit/Unit</p>
                        <p className={`font-semibold ${product.profit_per_unit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(product.profit_per_unit || 0)}
                        </p>
                      </div>
                    </div>
                    {product.profit_margin !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Margin</span>
                          <span className={`font-medium ${product.profit_margin > 20 ? 'text-emerald-600 dark:text-emerald-400' : product.profit_margin > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {product.profit_margin?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${product.profit_margin > 20 ? 'bg-emerald-500' : product.profit_margin > 10 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(Math.max(product.profit_margin || 0, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Activity Log View */}
        {viewMode === 'activity' && (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by user, entity, action..."
                    className="input pl-10 h-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={entityFilter}
                    onChange={(e) => setEntityFilter(e.target.value)}
                    className="input max-w-[140px] h-10"
                  >
                    {entities.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="input max-w-[140px] h-10"
                  >
                    {actions.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="input max-w-[160px] h-10"
                  />
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all h-10"
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors h-10"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/10">
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-3">
                        Time
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                        User
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-3">
                        Action
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                        Entity
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                        Details
                      </th>
                      <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-3">
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                          No activity logs found
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-600 dark:text-gray-300">{formatDateTime(log.created_at)}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-sm font-medium text-black dark:text-white">{log.admin_name || 'System'}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">@{log.admin_username}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${actionColors[log.action] || 'bg-gray-50 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                              {getEntityIcon(log.entity)}
                              <span className={`capitalize ${entityColors[log.entity] || 'text-gray-600 dark:text-gray-400'}`}>
                                {log.entity.replace('_', ' ')}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                              {formatDetails(log.details)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedLog(log);
                                setShowDetails(true);
                              }}
                              className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-white/10">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Showing {startIndex + 1} to {Math.min(startIndex + logsPerPage, filteredLogs.length)} of{' '}
                    {filteredLogs.length} logs
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        page = currentPage - 2 + i;
                        if (page > totalPages) page = totalPages - (4 - i);
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            page === currentPage
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Day Items Details Modal */}
      {showDayDetails && selectedDayItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDayDetails(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in border border-gray-200 dark:border-white/10 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
                Items Sold - {formatDate(selectedDate)}
              </h2>
              <button
                onClick={() => setShowDayDetails(false)}
                className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="space-y-3">
              {selectedDayItems.map((item, index) => (
                <div key={index} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.quantity_sold} units sold</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.total_profit)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white dark:bg-black/50 rounded-lg p-2 text-center">
                      <p className="text-gray-400">Unit Price</p>
                      <p className="font-medium text-black dark:text-white">{formatCurrency(item.unit_price || 0)}</p>
                    </div>
                    <div className="bg-white dark:bg-black/50 rounded-lg p-2 text-center">
                      <p className="text-gray-400">Cost Price</p>
                      <p className="font-medium text-black dark:text-white">{formatCurrency(item.cost_price || 0)}</p>
                    </div>
                    <div className="bg-white dark:bg-black/50 rounded-lg p-2 text-center">
                      <p className="text-gray-400">Profit/Unit</p>
                      <p className={`font-medium ${(item.profit_per_unit || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(item.profit_per_unit || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <span className="text-sm font-medium text-black dark:text-white">Total Profit for the Day</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedDayItems.reduce((sum, item) => sum + (item.total_profit || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDetails(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in border border-gray-200 dark:border-white/10 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
                Audit Details
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-400">Action</p>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full mt-1 ${actionColors[selectedLog.action] || 'bg-gray-50 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400'}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Entity</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getEntityIcon(selectedLog.entity)}
                    <span className="text-sm font-medium text-black dark:text-white capitalize">
                      {selectedLog.entity.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400">User</p>
                <p className="text-sm text-black dark:text-white mt-1">
                  {selectedLog.admin_name || 'System'}
                  <span className="text-gray-400 text-xs ml-2">@{selectedLog.admin_username}</span>
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400">Entity ID</p>
                <p className="text-sm text-black dark:text-white mt-1 font-mono">
                  {selectedLog.entity_id || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400">Date & Time</p>
                <p className="text-sm text-black dark:text-white mt-1">
                  {formatDateTime(selectedLog.created_at)}
                </p>
              </div>

              {selectedLog.ip_address && (
                <div>
                  <p className="text-xs font-medium text-gray-400">IP Address</p>
                  <p className="text-sm text-black dark:text-white mt-1">{selectedLog.ip_address}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-400">Details</p>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10">
                  {selectedLog.details ? (
                    <div className="space-y-1">
                      {formatDetails(selectedLog.details)}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No additional details</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setShowDetails(false)}
                className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}