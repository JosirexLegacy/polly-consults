'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  Building2,
  Fuel,
  Truck,
  Home,
  PenTool,
  Users as UsersIcon,
  Coffee,
  X,
  Loader2,
  Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Expense {
  id: string;
  category: string;
  category_id: number;
  description: string;
  amount: number;
  date: string;
  payment_method?: string;
  notes?: string;
}

interface Category {
  id: number;
  name: string;
}

const categoryIcons: Record<string, any> = {
  Fuel: Fuel,
  Transport: Truck,
  Rent: Home,
  Stationery: PenTool,
  Salary: UsersIcon,
  Office: Building2,
  Other: Coffee,
};

const categoryColors: Record<string, string> = {
  Fuel: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10',
  Transport: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10',
  Rent: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10',
  Stationery: 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-500/10',
  Salary: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10',
  Office: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10',
  Other: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10',
};

export default function ExpensesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchExpenses();
    fetchCategories();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/expenses');
      setExpenses(data);
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      setError(error.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get('/expenses/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category_id: expense.category_id.toString(),
        description: expense.description,
        amount: expense.amount.toString(),
        date: expense.date,
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        category_id: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData({
      category_id: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      const expenseData = {
        category_id: parseInt(formData.category_id),
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes || null,
      };

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, expenseData);
      } else {
        await api.post('/expenses', expenseData);
      }
      handleCloseModal();
      fetchExpenses();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      setError(error.message || 'Failed to save expense');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.del(`/expenses/${id}`);
      setDeleteConfirm(null);
      fetchExpenses();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      setError(error.message || 'Failed to delete expense');
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount (UGX)', 'Notes'];
    const rows = expenses.map(expense => [
      formatDate(expense.date),
      getCategoryName(expense.category_id),
      expense.description,
      expense.amount,
      expense.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const getCategoryName = (categoryId: number) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Other';
  };

  const getCategoryIcon = (categoryName: string) => {
    return categoryIcons[categoryName] || Tag;
  };

  const getCategoryColor = (categoryName: string) => {
    return categoryColors[categoryName] || 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10';
  };

  const categoryNames = ['all', ...new Set(expenses.map(e => getCategoryName(e.category_id)))];

  const filteredExpenses = expenses.filter((expense) => {
    const categoryName = getCategoryName(expense.category_id);
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || categoryName === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const thisMonthTotal = filteredExpenses.filter(e => {
    const now = new Date();
    const expenseDate = new Date(e.date);
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + Number(e.amount), 0);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading expenses...</p>
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
                  Expenses
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Track and manage business expenses
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export CSV
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add Expense
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Expenses</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">This Month</p>
            <p className="text-lg font-semibold text-orange-500 mt-1">
              {formatCurrency(thisMonthTotal)}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Categories</p>
            <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {categories.length}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Transactions</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {expenses.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="input pl-10 h-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categoryNames.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                  categoryFilter === category
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-200 dark:border-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10">
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Category
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden md:table-cell">
                    Description
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      {searchTerm ? 'No expenses found matching your search' : 'No expenses yet. Add your first expense!'}
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((expense) => {
                    const categoryName = getCategoryName(expense.category_id);
                    const Icon = getCategoryIcon(categoryName);
                    return (
                      <tr key={expense.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getCategoryColor(categoryName)}`}>
                              <Icon className="h-4 w-4" strokeWidth={1.75} />
                            </div>
                            <span className="text-sm font-medium text-black dark:text-white capitalize">
                              {categoryName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {expense.description}
                          </p>
                          {expense.notes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {expense.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-black dark:text-white">
                            {formatCurrency(expense.amount)}
                          </p>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {formatDate(expense.date)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => handleOpenModal(expense)}
                              className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                            >
                              <Edit className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(expense.id)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400"
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
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredExpenses.length)} of{' '}
                {filteredExpenses.length} expenses
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
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-black z-10">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
                  Category *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  placeholder="What was this expense for?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Amount (UGX) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input"
                  placeholder="0"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                      Saving...
                    </>
                  ) : (
                    editingExpense ? 'Update' : 'Create'
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
              Delete Expense
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Are you sure you want to delete this expense? This action cannot be undone.
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