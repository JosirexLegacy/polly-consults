'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Search,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Payment {
  id: string;
  loan_id: string;
  customer_name: string;
  customer_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  remaining_balance_after: number;
  collector_notes?: string;
  status?: string;
}

interface Loan {
  id: string;
  customer_name: string;
  customer_id: string;
  remaining_balance: number;
  principal_amount: number;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    loan_id: '',
    amount_paid: '',
    payment_method: 'cash',
    collector_notes: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchPayments();
    fetchLoans();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/payments');
      setPayments(data);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      setError(error.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const data = await api.get('/loans');
      setLoans(data.filter((loan: any) => loan.remaining_balance > 0));
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setError(null);
    setFormData({
      loan_id: '',
      amount_paid: '',
      payment_method: 'cash',
      collector_notes: '',
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      loan_id: '',
      amount_paid: '',
      payment_method: 'cash',
      collector_notes: '',
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      const paymentData = {
        loan_id: formData.loan_id,
        amount_paid: parseFloat(formData.amount_paid),
        payment_method: formData.payment_method,
        collector_notes: formData.collector_notes || null,
      };

      await api.post('/payments', paymentData);
      handleCloseModal();
      fetchPayments();
      fetchLoans();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      setError(error.message || 'Failed to record payment');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.del(`/payments/${id}`);
      setDeleteConfirm(null);
      fetchPayments();
      fetchLoans();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      setError(error.message || 'Failed to delete payment');
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

  const getMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      cash: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      mobile_money: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      bank: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
    };
    return styles[method] || 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400';
  };

  const getStatusBadge = (payment: Payment) => {
    if (payment.remaining_balance_after === 0) {
      return {
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
        icon: <CheckCircle className="h-3 w-3" strokeWidth={2} />,
        label: 'Completed'
      };
    }
    return {
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
      icon: <Clock className="h-3 w-3" strokeWidth={2} />,
      label: 'Partial'
    };
  };

  const filteredPayments = payments.filter((payment) => {
    const search = searchTerm.toLowerCase();
    return (
      payment.customer_name?.toLowerCase().includes(search) ||
      payment.id.includes(search) ||
      payment.payment_method?.toLowerCase().includes(search)
    );
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  // Fixed: Calculate totals with proper number conversion
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  const completedPayments = payments.filter(p => p.remaining_balance_after === 0).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading payments...</p>
        </div>
      </div>
    );
  }

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
                  Payments
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Track all loan repayments
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Record Payment
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Payments</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">{payments.length}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Amount</p>
            <p className="text-lg font-semibold text-orange-500 mt-1">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Completed Loans</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{completedPayments}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Avg Payment</p>
            <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {payments.length > 0 ? formatCurrency(totalAmount / payments.length) : formatCurrency(0)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search payments..."
            className="input pl-10 h-10"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10">
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Customer
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden md:table-cell">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Method
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      {searchTerm ? 'No payments found matching your search' : 'No payments yet. Record your first payment!'}
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => {
                    const statusBadge = getStatusBadge(payment);
                    return (
                      <tr key={payment.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {payment.customer_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-black dark:text-white">
                                {payment.customer_name || 'Unknown Customer'}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Loan #{payment.loan_id?.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <p className="text-sm font-medium text-black dark:text-white">
                            {formatCurrency(payment.amount_paid)}
                          </p>
                          {payment.collector_notes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                              {payment.collector_notes}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getMethodBadge(payment.payment_method)} capitalize`}>
                            {payment.payment_method?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {formatDate(payment.payment_date)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={statusBadge.className}>
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => router.push(`/payments/${payment.id}`)}
                              className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                              title="View payment"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(payment.id)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete payment"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-white/10">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPayments.length)} of{' '}
                {filteredPayments.length} payments
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                ))}
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
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-black z-10">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Record Payment
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Loan *
                </label>
                <select
                  value={formData.loan_id}
                  onChange={(e) => setFormData({ ...formData, loan_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select a loan</option>
                  {loans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.customer_name} - Balance: {formatCurrency(loan.remaining_balance)}
                    </option>
                  ))}
                </select>
                {loans.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No active loans with remaining balance. Create a loan first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Amount Paid (UGX) *
                </label>
                <input
                  type="number"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                  className="input"
                  placeholder="Enter amount"
                  required
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="input"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.collector_notes}
                  onChange={(e) => setFormData({ ...formData, collector_notes: e.target.value })}
                  className="input resize-none"
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || loans.length === 0}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-black rounded-2xl shadow-2xl p-6 text-center animate-fade-in border border-gray-200 dark:border-white/10">
            <div className="w-14 h-14 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-7 w-7 text-red-600 dark:text-red-400" strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Delete Payment
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Are you sure you want to delete this payment? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}