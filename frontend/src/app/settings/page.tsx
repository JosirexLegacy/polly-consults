'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Building2,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Percent,
  Bell,
  Shield,
  Save,
  Loader2,
  ArrowLeft,
  Wallet,
  TrendingUp,
  History,
  Plus,
  Minus,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface SettingsData {
  business_name: string;
  business_logo_url: string;
  currency: string;
  default_interest_rate: number;
  default_interest_type: string;
  low_capital_threshold: number;
  phone: string;
  email: string;
  address: string;
}

interface CapitalTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  source: string;
  reason: string;
  balance_after: number;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsData>({
    business_name: 'Polly Consults',
    business_logo_url: '',
    currency: 'UGX',
    default_interest_rate: 10,
    default_interest_type: 'flat',
    low_capital_threshold: 1000000,
    phone: '+256 700 000 000',
    email: 'info@pollyconsults.com',
    address: 'Kampala, Uganda',
  });
  const [capital, setCapital] = useState(0);
  const [capitalTransactions, setCapitalTransactions] = useState<CapitalTransaction[]>([]);
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [capitalForm, setCapitalForm] = useState({
    amount: '',
    type: 'credit',
    reason: '',
  });
  const [capitalLoading, setCapitalLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchSettings();
    fetchCapitalData();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/settings');
      if (data) {
        setSettings({
          business_name: data.business_name || 'Polly Consults',
          business_logo_url: data.business_logo_url || '',
          currency: data.currency || 'UGX',
          default_interest_rate: data.default_interest_rate || 10,
          default_interest_type: data.default_interest_type || 'flat',
          low_capital_threshold: data.low_capital_threshold || 1000000,
          phone: data.phone || '+256 700 000 000',
          email: data.email || 'info@pollyconsults.com',
          address: data.address || 'Kampala, Uganda',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCapitalData = async () => {
    try {
      const data = await api.get('/reports/dashboard');
      setCapital(data.totalCapital || 0);
      
      try {
        const transactions = await api.get('/capital/transactions');
        setCapitalTransactions(transactions.slice(0, 10));
      } catch (error) {
        console.log('Capital transactions not available');
        setCapitalTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching capital data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('/settings', settings);
      setSuccess('Settings updated successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCapitalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCapitalLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const amount = parseFloat(capitalForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      await api.post('/capital/update', {
        amount: amount,
        type: capitalForm.type,
        reason: capitalForm.reason || (capitalForm.type === 'credit' ? 'Capital injection' : 'Capital withdrawal'),
      });

      setShowCapitalModal(false);
      setCapitalForm({ amount: '', type: 'credit', reason: '' });
      fetchCapitalData();
      setSuccess(`Capital ${capitalForm.type === 'credit' ? 'added' : 'withdrawn'} successfully!`);
    } catch (error: any) {
      setError(error.message || 'Failed to update capital');
    } finally {
      setCapitalLoading(false);
    }
  };

  const handleChange = (field: keyof SettingsData, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF] dark:bg-black p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <BackButton label="Back to Dashboard" fallbackHref="/dashboard" />
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Configure your business settings and manage capital
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">
            {success}
          </div>
        )}

        {/* Capital Management Section */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                <Wallet className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-white">Capital Management</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">View and manage your business capital</p>
              </div>
            </div>
            <button
              onClick={() => setShowCapitalModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Update Capital
            </button>
          </div>

          {/* Current Capital */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-xl p-6 border border-orange-200/20 dark:border-orange-800/20 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Capital</p>
                <p className={`text-3xl font-bold mt-1 ${capital < 0 ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>
                  {formatCurrency(capital)}
                </p>
                {capital < 0 && (
                  <p className="text-xs text-red-500 mt-1">⚠️ Capital is negative. Please add funds.</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-orange-500/10">
                <TrendingUp className={`h-6 w-6 ${capital < 0 ? 'text-red-500' : 'text-orange-500'}`} strokeWidth={1.75} />
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <History className="h-4 w-4" strokeWidth={1.5} />
                Recent Transactions
              </h3>
            </div>
            {capitalTransactions.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {capitalTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors border border-gray-100 dark:border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${tx.type === 'credit' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {tx.type === 'credit' ? (
                          <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-red-600 dark:text-red-400" strokeWidth={2} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-black dark:text-white">{tx.reason}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-400">Balance: {formatCurrency(tx.balance_after)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Info */}
          <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                <Building2 className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-black dark:text-white">Business Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings.business_name}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                  className="input"
                  placeholder="Enter business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="input"
                >
                  <option value="UGX">UGX - Ugandan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="input"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="input"
                  placeholder="Enter email address"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="input"
                  placeholder="Enter business address"
                />
              </div>
            </div>
          </div>

          {/* Loan Settings */}
          <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                <Percent className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-black dark:text-white">Loan Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Default Interest Rate (%)
                </label>
                <input
                  type="number"
                  value={settings.default_interest_rate || 0}
                  onChange={(e) => handleChange('default_interest_rate', parseFloat(e.target.value) || 0)}
                  className="input"
                  placeholder="Enter default rate"
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Interest Type
                </label>
                <select
                  value={settings.default_interest_type}
                  onChange={(e) => handleChange('default_interest_type', e.target.value)}
                  className="input"
                >
                  <option value="flat">Flat</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Low Capital Threshold (UGX)
                </label>
                <input
                  type="number"
                  value={settings.low_capital_threshold || 0}
                  onChange={(e) => handleChange('low_capital_threshold', parseInt(e.target.value) || 0)}
                  className="input"
                  placeholder="Enter threshold amount"
                  min="0"
                />
                <p className="text-xs text-gray-400 mt-1">
                  You'll be alerted when capital falls below this amount
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" strokeWidth={1.75} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Update Capital Modal */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCapitalModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Update Capital
              </h2>
              <button
                onClick={() => setShowCapitalModal(false)}
                className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleCapitalUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Amount (UGX) *
                </label>
                <input
                  type="number"
                  value={capitalForm.amount}
                  onChange={(e) => setCapitalForm({ ...capitalForm, amount: e.target.value })}
                  className="input"
                  placeholder="Enter amount"
                  required
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Transaction Type *
                </label>
                <select
                  value={capitalForm.type}
                  onChange={(e) => setCapitalForm({ ...capitalForm, type: e.target.value })}
                  className="input"
                >
                  <option value="credit">Add Capital (Credit)</option>
                  <option value="debit">Withdraw Capital (Debit)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Reason *
                </label>
                <input
                  type="text"
                  value={capitalForm.reason}
                  onChange={(e) => setCapitalForm({ ...capitalForm, reason: e.target.value })}
                  className="input"
                  placeholder="e.g., Initial capital injection"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={capitalLoading}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {capitalLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Update Capital'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}