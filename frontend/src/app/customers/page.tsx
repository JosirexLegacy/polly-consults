'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  occupation?: string;
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: number;
  joinedDate: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    occupation: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/customers');
      setCustomers(data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        occupation: c.occupation,
        totalLoans: parseInt(c.total_loans || 0),
        activeLoans: parseInt(c.active_loans || 0),
        totalBorrowed: parseInt(c.total_borrowed || 0),
        joinedDate: c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      })));
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      setError(error.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        occupation: customer.occupation || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        occupation: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      occupation: '',
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      handleCloseModal();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      setError(error.message || 'Failed to save customer');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.del(`/customers/${id}`);
      setDeleteConfirm(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      setError(error.message || 'Failed to delete customer');
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

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading customers...</p>
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
                  Customers
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Manage your customer relationships
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add Customer
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customers..."
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
                    Contact
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden lg:table-cell">
                    Occupation
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Loans
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden sm:table-cell">
                    Total Borrowed
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      {searchTerm ? 'No customers found matching your search' : 'No customers yet. Add your first customer!'}
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-black dark:text-white">
                              {customer.name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Joined {formatDate(customer.joinedDate)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400" strokeWidth={1.5} />
                            {customer.phone}
                          </p>
                          {customer.email && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-gray-400" strokeWidth={1.5} />
                              {customer.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3 text-gray-400" strokeWidth={1.5} />
                            {customer.occupation || 'N/A'}
                          </p>
                          {customer.address && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-gray-400" strokeWidth={1.5} />
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-black dark:text-white">
                            {customer.activeLoans} active
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {customer.totalLoans} total
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <p className="text-sm font-medium text-black dark:text-white">
                          {formatCurrency(customer.totalBorrowed)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => router.push(`/customers/${customer.id}`)}
                            className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                            title="View customer"
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(customer)}
                            className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                            title="Edit customer"
                          >
                            <Edit className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(customer.id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete customer"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        </div>
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
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of{' '}
                {filteredCustomers.length} customers
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
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Enter full name"
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
                  placeholder="+256 700 000 000"
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
                  placeholder="customer@email.com"
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
                  placeholder="City, District"
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
                  placeholder="e.g., Business Owner"
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
                    editingCustomer ? 'Update' : 'Create'
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
              Delete Customer
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Are you sure you want to delete this customer? This action cannot be undone.
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