'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Calendar,
  HandCoins,
  DollarSign,
  Percent,
  Clock,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

// Wrap the main component with Suspense
export default function NewLoanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NewLoanContent />
    </Suspense>
  );
}

function NewLoanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    principal_amount: '',
    interest_rate: '10',
    interest_type: 'flat',
    total_payable: '',
    loan_date: new Date().toISOString().split('T')[0],
    due_date: '',
    repayment_frequency: 'monthly',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const calculateTotalPayable = (principal: string, rate: string, type: string) => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(rate) || 0;
    if (type === 'flat') {
      return p + (p * r / 100);
    }
    return p + (p * r / 100);
  };

  const handleChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    if (field === 'principal_amount' || field === 'interest_rate' || field === 'interest_type') {
      const total = calculateTotalPayable(
        field === 'principal_amount' ? value : formData.principal_amount,
        field === 'interest_rate' ? value : formData.interest_rate,
        field === 'interest_type' ? value : formData.interest_type
      );
      newFormData.total_payable = total.toString();
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loanData = {
        customer_id: formData.customer_id,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate: parseFloat(formData.interest_rate),
        interest_type: formData.interest_type,
        total_payable: parseFloat(formData.total_payable),
        loan_date: formData.loan_date,
        due_date: formData.due_date,
        repayment_frequency: formData.repayment_frequency,
        notes: formData.notes || null,
      };

      await api.post('/loans', loanData);
      router.push('/loans');
    } catch (error: any) {
      console.error('Error creating loan:', error);
      setError(error.message || 'Failed to create loan');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] dark:bg-black p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <BackButton label="Back to Loans" fallbackHref="/loans" />
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
              Create New Loan
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Enter loan details for the customer
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Customer *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => handleChange('customer_id', e.target.value)}
                className="input"
                required
                disabled={!!customerId}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Principal Amount (UGX) *
                </label>
                <input
                  type="number"
                  value={formData.principal_amount}
                  onChange={(e) => handleChange('principal_amount', e.target.value)}
                  className="input"
                  placeholder="0"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Interest Rate (%) *
                </label>
                <input
                  type="number"
                  value={formData.interest_rate}
                  onChange={(e) => handleChange('interest_rate', e.target.value)}
                  className="input"
                  placeholder="10"
                  required
                  min="0"
                  step="0.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Interest Type
                </label>
                <select
                  value={formData.interest_type}
                  onChange={(e) => handleChange('interest_type', e.target.value)}
                  className="input"
                >
                  <option value="flat">Flat</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Repayment Frequency
                </label>
                <select
                  value={formData.repayment_frequency}
                  onChange={(e) => handleChange('repayment_frequency', e.target.value)}
                  className="input"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Loan Date *
                </label>
                <input
                  type="date"
                  value={formData.loan_date}
                  onChange={(e) => handleChange('loan_date', e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Total Payable
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatCurrency(parseFloat(formData.total_payable) || 0)}
                  className="input bg-gray-50 dark:bg-white/5 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">
                  Auto-calculated from principal and interest
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="input resize-none"
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={1.75} />
                    Create Loan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}