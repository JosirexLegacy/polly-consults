'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  HandCoins,
  Edit,
  Trash2,
  Plus,
  ChevronRight,
  Loader2,
  CreditCard,
  X,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  occupation?: string;
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: number;
  totalPaid: number;
  joinedDate: string;
  loans: {
    id: string;
    principal_amount: number;
    total_payable: number;
    amount_paid: number;
    remaining_balance: number;
    status: string;
    loan_date: string;
    due_date: string;
    repayment_frequency: string;
  }[];
  payments: {
    id: string;
    amount_paid: number;
    payment_date: string;
    payment_method: string;
    remaining_balance_after: number;
    collector_notes?: string;
  }[];
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    occupation: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchCustomerDetail();
  }, []);

  const fetchCustomerDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/customers/${params.id}`);
      
      const loansData = await api.get(`/loans?customer_id=${params.id}`);
      const paymentsData = await api.get(`/payments?customer_id=${params.id}`);
      
      setCustomer({
        ...data,
        loans: loansData,
        payments: paymentsData,
        totalLoans: loansData.length,
        activeLoans: loansData.filter((l: any) => l.status === 'active').length,
        totalBorrowed: loansData.reduce((sum: number, l: any) => sum + l.principal_amount, 0),
        totalPaid: paymentsData.reduce((sum: number, p: any) => sum + p.amount_paid, 0),
        joinedDate: data.created_at || new Date().toISOString(),
      });
      
      setFormData({
        name: data.name,
        phone: data.phone,
        email: data.email || '',
        address: data.address || '',
        occupation: data.occupation || '',
      });
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      setError(error.message || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(true);
    setError(null);
    try {
      await api.put(`/customers/${customer?.id}`, formData);
      setShowEditModal(false);
      fetchCustomerDetail();
    } catch (error: any) {
      setError(error.message || 'Failed to update customer');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/customers/${customer?.id}`);
      router.push('/customers');
    } catch (error: any) {
      setError(error.message || 'Failed to delete customer');
      setShowDeleteConfirm(false);
      setDeleting(false);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return styles[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <p className="text-gray-400">{error || 'Customer not found'}</p>
          <button
            onClick={() => router.push('/customers')}
            className="mt-4 text-orange-500 hover:underline"
          >
            Back to customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF] dark:bg-black p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <BackButton label="Back to Customers" fallbackHref="/customers" />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Edit className="h-4 w-4" strokeWidth={1.75} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Delete
            </button>
            <Link
              href={`/loans/new?customer_id=${customer.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              New Loan
            </Link>
          </div>
        </div>

        {/* Customer Header */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-medium flex-shrink-0">
                {customer.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-black dark:text-white">
                  {customer.name}
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                  Customer since {formatDate(customer.joinedDate)}
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {customer.email}
                    </span>
                  )}
                  {customer.occupation && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {customer.occupation}
                    </span>
                  )}
                  {customer.address && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {customer.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Loans</p>
            <p className="text-xl font-semibold text-black dark:text-white mt-1">{customer.totalLoans}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Active Loans</p>
            <p className="text-xl font-semibold text-orange-500 mt-1">{customer.activeLoans}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Borrowed</p>
            <p className="text-xl font-semibold text-black dark:text-white mt-1">
              {formatCurrency(customer.totalBorrowed)}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Paid</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(customer.totalPaid)}
            </p>
          </div>
        </div>

        {/* Loan History */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
              <HandCoins className="h-4 w-4" strokeWidth={1.5} />
              Loan History ({customer.loans.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            {customer.loans.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                No loans yet. Create a loan for this customer.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10">
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3">
                      Loan ID
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Balance
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      Date
                    </th>
                    <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {customer.loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-black dark:text-white">
                          #{loan.id.slice(0, 8)}
                        </p>
                      </td>
                      <td className="px-6 py-3 hidden sm:table-cell">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {formatCurrency(loan.principal_amount)}
                        </p>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell">
                        <p className="text-sm font-medium text-black dark:text-white">
                          {formatCurrency(loan.remaining_balance)}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(loan.status)} capitalize`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell">
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                          {formatDate(loan.loan_date)}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => router.push(`/loans/${loan.id}`)}
                          className="text-sm font-medium text-orange-500 hover:underline flex items-center gap-1 ml-auto"
                        >
                          View <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4" strokeWidth={1.5} />
              Payment History ({customer.payments.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            {customer.payments.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                No payments recorded yet.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10">
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Method
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Balance After
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {customer.payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-black dark:text-white">
                        {formatCurrency(payment.amount_paid)}
                      </td>
                      <td className="px-6 py-3 hidden sm:table-cell">
                        <span className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium px-2.5 py-1 rounded-full capitalize">
                          {payment.payment_method?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-sm text-gray-600 dark:text-gray-300">
                        {formatCurrency(payment.remaining_balance_after)}
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell text-sm text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                        {payment.collector_notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-black z-10">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Edit Customer
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Occupation
                </label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {editing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-black rounded-2xl shadow-2xl p-6 text-center animate-fade-in border border-gray-200 dark:border-white/10">
            <div className="w-14 h-14 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-7 w-7 text-red-600 dark:text-red-400" strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Delete Customer
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Are you sure you want to delete {customer.name}? This action cannot be undone.
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}