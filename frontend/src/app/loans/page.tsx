'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  HandCoins,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Loan {
  id: string;
  customer_name: string;
  customer_id: string;
  principal_amount: number;
  interest_rate: number;
  interest_type: string;
  total_payable: number;
  amount_paid: number;
  remaining_balance: number;
  loan_date: string;
  due_date: string;
  status: string;
  repayment_frequency: string;
  notes?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function LoansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    principal_amount: '',
    interest_rate: '10',
    interest_type: 'flat',
    total_payable: '',
    loan_date: new Date().toISOString().split('T')[0],
    due_date: '',
    repayment_frequency: 'monthly',
    notes: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchLoans();
    fetchCustomers();
  }, []);

  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/loans');
      setLoans(data);
    } catch (error: any) {
      console.error('Error fetching loans:', error);
      setError(error.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleOpenModal = (loan?: Loan) => {
    if (loan) {
      setEditingLoan(loan);
      setFormData({
        customer_id: loan.customer_id,
        principal_amount: loan.principal_amount.toString(),
        interest_rate: loan.interest_rate.toString(),
        interest_type: loan.interest_type,
        total_payable: loan.total_payable.toString(),
        loan_date: loan.loan_date,
        due_date: loan.due_date,
        repayment_frequency: loan.repayment_frequency,
        notes: loan.notes || '',
      });
    } else {
      setEditingLoan(null);
      setFormData({
        customer_id: '',
        principal_amount: '',
        interest_rate: '10',
        interest_type: 'flat',
        total_payable: '',
        loan_date: new Date().toISOString().split('T')[0],
        due_date: '',
        repayment_frequency: 'monthly',
        notes: '',
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLoan(null);
    setFormData({
      customer_id: '',
      principal_amount: '',
      interest_rate: '10',
      interest_type: 'flat',
      total_payable: '',
      loan_date: new Date().toISOString().split('T')[0],
      due_date: '',
      repayment_frequency: 'monthly',
      notes: '',
    });
  };

  const calculateTotalPayable = (principal: string, rate: string, type: string) => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(rate) || 0;
    if (type === 'flat') {
      return p + (p * r / 100);
    }
    return p + (p * r / 100);
  };

  const handleFormChange = (field: string, value: string) => {
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
    setFormLoading(true);
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

      if (editingLoan) {
        await api.put(`/loans/${editingLoan.id}`, loanData);
      } else {
        await api.post('/loans', loanData);
      }
      handleCloseModal();
      fetchLoans();
    } catch (error: any) {
      console.error('Error saving loan:', error);
      setError(error.message || 'Failed to save loan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.del(`/loans/${id}`);
      setDeleteConfirm(null);
      fetchLoans();
    } catch (error: any) {
      console.error('Error deleting loan:', error);
      setError(error.message || 'Failed to delete loan');
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
    };
    const icons: Record<string, any> = {
      active: <Clock className="h-3 w-3" strokeWidth={2} />,
      completed: <CheckCircle className="h-3 w-3" strokeWidth={2} />,
      overdue: <AlertCircle className="h-3 w-3" strokeWidth={2} />,
      cancelled: <AlertCircle className="h-3 w-3" strokeWidth={2} />,
    };
    return {
      className: `${styles[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400'} flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full`,
      icon: icons[status] || null,
    };
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch = loan.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      loan.id.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLoans = filteredLoans.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading loans...</p>
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
                  Loans
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Manage all loans and repayments
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            New Loan
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search loans..."
              className="input pl-10 h-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'active', 'completed', 'overdue', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-white/10'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Loans</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">{loans.length}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Active</p>
            <p className="text-lg font-semibold text-orange-500 mt-1">
              {loans.filter((l) => l.status === 'active').length}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Completed</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {loans.filter((l) => l.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Overdue</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400 mt-1">
              {loans.filter((l) => l.status === 'overdue').length}
            </p>
          </div>
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
                    Loan Details
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden sm:table-cell">
                    Balance
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {paginatedLoans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      {searchTerm ? 'No loans found matching your search' : 'No loans yet. Create your first loan!'}
                    </td>
                  </tr>
                ) : (
                  paginatedLoans.map((loan) => {
                    const statusBadge = getStatusBadge(loan.status);
                    return (
                      <tr key={loan.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {loan.customer_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-black dark:text-white">
                                {loan.customer_name || 'Unknown Customer'}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {formatDate(loan.loan_date)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-black dark:text-white">
                              {formatCurrency(loan.principal_amount)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {loan.repayment_frequency} · {loan.interest_rate}% {loan.interest_type}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={statusBadge.className}>
                            {statusBadge.icon}
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <div>
                            <p className="text-sm font-medium text-black dark:text-white">
                              {formatCurrency(loan.remaining_balance)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Due {formatDate(loan.due_date)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => router.push(`/loans/${loan.id}`)}
                              className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                              title="View loan"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                            <button 
                              onClick={() => handleOpenModal(loan)}
                              className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                              title="Edit loan"
                            >
                              <Edit className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(loan.id)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete loan"
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
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLoans.length)} of{' '}
                {filteredLoans.length} loans
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative w-full max-w-lg bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-black z-10">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                {editingLoan ? 'Edit Loan' : 'Create New Loan'}
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
                  Customer *
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => handleFormChange('customer_id', e.target.value)}
                  className="input"
                  required
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
                    onChange={(e) => handleFormChange('principal_amount', e.target.value)}
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
                    onChange={(e) => handleFormChange('interest_rate', e.target.value)}
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
                    onChange={(e) => handleFormChange('interest_type', e.target.value)}
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
                    onChange={(e) => handleFormChange('repayment_frequency', e.target.value)}
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
                    onChange={(e) => handleFormChange('loan_date', e.target.value)}
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
                    onChange={(e) => handleFormChange('due_date', e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Total Payable
                </label>
                <input
                  type="text"
                  value={formatCurrency(parseFloat(formData.total_payable) || 0)}
                  className="input bg-gray-50 dark:bg-white/5 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">Auto-calculated from principal and interest</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
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
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editingLoan ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingLoan ? 'Update Loan' : 'Create Loan'
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
              Delete Loan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Are you sure you want to delete this loan? This action cannot be undone.
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