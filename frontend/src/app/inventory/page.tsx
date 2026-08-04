'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Filter,
  RefreshCw,
  Tag,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  min_quantity: number;
  max_quantity: number;
  location: string;
  supplier: string;
  notes: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({
    transaction_type: 'stock_in',
    quantity: '',
    notes: '',
  });
  const [stockLoading, setStockLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    unit_price: '',
    cost_price: '',
    quantity: '',
    min_quantity: '',
    max_quantity: '',
    location: '',
    supplier: '',
    notes: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchProducts();
    fetchCategories();
  }, [showArchived]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = showArchived ? '/inventory/products?include_archived=true' : '/inventory/products';
      const data = await api.get(url);
      setProducts(data);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError(error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get('/inventory/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku || '',
        name: product.name,
        description: product.description || '',
        category_id: product.category_id || '',
        unit_price: product.unit_price.toString(),
        cost_price: product.cost_price.toString(),
        quantity: product.quantity.toString(),
        min_quantity: product.min_quantity.toString(),
        max_quantity: product.max_quantity?.toString() || '',
        location: product.location || '',
        supplier: product.supplier || '',
        notes: product.notes || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: '',
        name: '',
        description: '',
        category_id: '',
        unit_price: '',
        cost_price: '',
        quantity: '',
        min_quantity: '',
        max_quantity: '',
        location: '',
        supplier: '',
        notes: '',
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      unit_price: '',
      cost_price: '',
      quantity: '',
      min_quantity: '',
      max_quantity: '',
      location: '',
      supplier: '',
      notes: '',
    });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryLoading(true);
    setError(null);
    try {
      await api.post('/inventory/categories', categoryForm);
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      fetchCategories();
      setSuccess('Category created successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to create category');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      const productData = {
        sku: formData.sku || null,
        name: formData.name,
        description: formData.description || null,
        category_id: formData.category_id || null,
        unit_price: parseFloat(formData.unit_price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        quantity: parseInt(formData.quantity) || 0,
        min_quantity: parseInt(formData.min_quantity) || 0,
        max_quantity: parseInt(formData.max_quantity) || null,
        location: formData.location || null,
        supplier: formData.supplier || null,
        notes: formData.notes || null,
      };

      if (editingProduct) {
        await api.put(`/inventory/products/${editingProduct.id}`, productData);
        setSuccess('Product updated successfully!');
      } else {
        await api.post('/inventory/products', productData);
        setSuccess('Product created successfully!');
      }
      handleCloseModal();
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      setError(error.message || 'Failed to save product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.del(`/inventory/products/${id}`);
      setDeleteConfirm(null);
      fetchProducts();
      setSuccess('Product deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      setError(error.message || 'Failed to delete product');
    }
  };

  const handleArchive = async (id: string) => {
    setError(null);
    try {
      await api.patch(`/inventory/products/${id}/archive`);
      setDeleteConfirm(null);
      fetchProducts();
      setSuccess('Product archived successfully!');
    } catch (error: any) {
      console.error('Error archiving product:', error);
      setError(error.message || 'Failed to archive product');
    }
  };

  const handleRestore = async (id: string) => {
    setError(null);
    try {
      await api.patch(`/inventory/products/${id}/restore`);
      fetchProducts();
      setSuccess('Product restored successfully!');
    } catch (error: any) {
      console.error('Error restoring product:', error);
      setError(error.message || 'Failed to restore product');
    }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockLoading(true);
    setError(null);
    try {
      await api.post('/inventory/transactions', {
        product_id: selectedProduct?.id,
        transaction_type: stockForm.transaction_type,
        quantity: parseInt(stockForm.quantity),
        notes: stockForm.notes || null,
      });
      
      setShowStockModal(false);
      setStockForm({ transaction_type: 'stock_in', quantity: '', notes: '' });
      fetchProducts();
      setSuccess('Stock updated successfully!');
    } catch (error: any) {
      console.error('Error updating stock:', error);
      setError(error.message || 'Failed to update stock');
    } finally {
      setStockLoading(false);
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

  const isLowStock = (product: Product) => {
    return product.quantity <= product.min_quantity && product.quantity > 0;
  };

  const isOutOfStock = (product: Product) => {
    return product.quantity === 0;
  };

  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.sku?.toLowerCase().includes(search) ||
      product.category_name?.toLowerCase().includes(search)
    );
  });

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading inventory...</p>
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
                  Inventory
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Manage your products and stock levels
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                showArchived
                  ? 'bg-amber-500 text-white'
                  : 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              }`}
            >
              <Archive className="h-4 w-4" strokeWidth={1.75} />
              {showArchived ? 'Showing Archived' : 'Show Archived'}
            </button>
            <button
              onClick={fetchProducts}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Refresh
            </button>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Tag className="h-4 w-4" strokeWidth={1.75} />
              Categories
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add Product
            </button>
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

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Products</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">{products.length}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Low Stock</p>
            <p className="text-lg font-semibold text-amber-500 mt-1">
              {products.filter(p => isLowStock(p)).length}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Out of Stock</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400 mt-1">
              {products.filter(p => isOutOfStock(p)).length}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Value</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">
              {formatCurrency(products.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0))}
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
            placeholder="Search products..."
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
                    Product
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Stock
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 hidden sm:table-cell">
                    Price
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      {searchTerm ? 'No products found matching your search' : 'No products yet. Add your first product!'}
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            !product.is_active ? 'bg-gray-100 dark:bg-gray-800' : 'bg-orange-500/10'
                          }`}>
                            <Package className={`h-4 w-4 ${
                              !product.is_active ? 'text-gray-400' : 'text-orange-500'
                            }`} strokeWidth={1.75} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${
                              !product.is_active ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-black dark:text-white'
                            }`}>
                              {product.name}
                            </p>
                            {product.sku && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                SKU: {product.sku}
                              </p>
                            )}
                            {!product.is_active && (
                              <span className="text-xs font-medium text-amber-500">Archived</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {product.category_name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            isOutOfStock(product) ? 'text-red-600 dark:text-red-400' :
                            isLowStock(product) ? 'text-amber-600 dark:text-amber-400' :
                            'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {product.quantity}
                          </span>
                          {isLowStock(product) && (
                            <AlertCircle className="h-4 w-4 text-amber-500" strokeWidth={1.75} />
                          )}
                          {isOutOfStock(product) && (
                            <AlertCircle className="h-4 w-4 text-red-500" strokeWidth={1.75} />
                          )}
                        </div>
                        {isLowStock(product) && (
                          <p className="text-xs text-amber-500 mt-0.5">
                            Min: {product.min_quantity}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <p className={`text-sm font-medium ${
                          !product.is_active ? 'text-gray-400 dark:text-gray-500' : 'text-black dark:text-white'
                        }`}>
                          {formatCurrency(product.unit_price)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {product.is_active ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowStockModal(true);
                                }}
                                className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                                title="Update stock"
                              >
                                <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                              </button>
                              <button
                                onClick={() => handleOpenModal(product)}
                                className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                                title="Edit product"
                              >
                                <Edit className="h-4 w-4" strokeWidth={1.75} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(product.id)}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                title="Archive/Delete product"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestore(product.id)}
                              className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                              title="Restore product"
                            >
                              <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                          )}
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
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProducts.length)} of{' '}
                {filteredProducts.length} products
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

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative w-full max-w-lg bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-black z-10">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="input"
                    placeholder="Enter SKU"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input resize-none"
                  placeholder="Enter product description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input"
                    placeholder="e.g., Warehouse A"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Unit Price (UGX)
                  </label>
                  <input
                    type="number"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Cost Price (UGX)
                  </label>
                  <input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Max Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.max_quantity}
                    onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                    className="input"
                    placeholder="Optional"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="input"
                  placeholder="Enter supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes
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
                      {editingProduct ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingProduct ? 'Update Product' : 'Create Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Stock Modal */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStockModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Update Stock - {selectedProduct.name}
              </h2>
              <button
                onClick={() => setShowStockModal(false)}
                className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock: <span className="font-bold text-black dark:text-white">{selectedProduct.quantity}</span></p>
            </div>

            <form onSubmit={handleStockUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Transaction Type *
                </label>
                <select
                  value={stockForm.transaction_type}
                  onChange={(e) => setStockForm({ ...stockForm, transaction_type: e.target.value })}
                  className="input"
                >
                  <option value="stock_in">Stock In (Add)</option>
                  <option value="stock_out">Stock Out (Remove)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  className="input"
                  placeholder="Enter quantity"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={stockForm.notes}
                  onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                  className="input resize-none"
                  placeholder="Reason for stock update..."
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockLoading}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {stockLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Update Stock'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-2xl animate-fade-in border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Manage Categories
              </h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Existing Categories */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Existing Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span key={cat.id} className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-sm">
                    {cat.name}
                  </span>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No categories yet. Create one below.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input"
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="input resize-none"
                  placeholder="Category description..."
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categoryLoading}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {categoryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete/Archive Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-black rounded-2xl shadow-2xl p-6 text-center animate-fade-in border border-gray-200 dark:border-white/10">
            <div className="w-14 h-14 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-7 w-7 text-red-600 dark:text-red-400" strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Archive or Delete Product?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Products with sales or transaction history can only be archived.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Archiving hides the product. Deleting is permanent.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                Archive
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