'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Search,
  Plus,
  X,
  Loader2,
  Trash2,
  CreditCard,
  Wallet,
  Users,
  Package,
  CheckCircle,
  AlertCircle,
  Printer,
  Download,
  RefreshCw,
  ArrowLeft,
  Minus,
  Tag,
  Receipt,
  TrendingUp,
  User,
  Phone,
  Store,
  Sparkles,
  Scan,
  QrCode,
  Gift,
  BadgePercent,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  category_name: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number;
  profit: number;
  available: number;
}

export default function SalesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState(1);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [customerLoading, setCustomerLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
    fetchRecentSales();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsData, customersData] = await Promise.all([
        api.get('/inventory/products'),
        api.get('/customers'),
      ]);
      setProducts(productsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const data = await api.get('/sales');
      setRecentSales(data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerLoading(true);
    try {
      const response = await api.post('/customers', newCustomer);
      setCustomers([...customers, response]);
      setSelectedCustomer(response.id);
      setShowNewCustomerModal(false);
      setNewCustomer({ name: '', phone: '' });
      setSuccess('Customer created successfully!');
    } catch (error) {
      console.error('Error creating customer:', error);
      setError('Failed to create customer');
    } finally {
      setCustomerLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product, quantity: number) => {
    if (quantity <= 0) return;
    if (quantity > product.quantity) {
      setError(`Only ${product.quantity} items available in stock`);
      return;
    }

    const existingItem = cart.find((item) => item.product_id === product.id);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.quantity) {
        setError(`Only ${product.quantity} items available in stock`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                total_price: newQuantity * item.unit_price,
                profit: newQuantity * (item.unit_price - item.cost_price),
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku || '',
          quantity: quantity,
          unit_price: product.unit_price,
          total_price: quantity * product.unit_price,
          cost_price: product.cost_price || 0,
          profit: quantity * (product.unit_price - (product.cost_price || 0)),
          available: product.quantity,
        },
      ]);
    }
    setError(null);
  };

  const removeFromCart = (product_id: string) => {
    setCart(cart.filter((item) => item.product_id !== product_id));
  };

  const updateQuantity = (product_id: string, newQuantity: number) => {
    const item = cart.find((i) => i.product_id === product_id);
    if (!item) return;

    const product = products.find((p) => p.id === product_id);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(product_id);
      return;
    }

    if (newQuantity > product.quantity) {
      setError(`Only ${product.quantity} items available in stock`);
      return;
    }

    setCart(
      cart.map((i) =>
        i.product_id === product_id
          ? {
              ...i,
              quantity: newQuantity,
              total_price: newQuantity * i.unit_price,
              profit: newQuantity * (i.unit_price - i.cost_price),
            }
          : i
      )
    );
    setError(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const totalProfit = cart.reduce((sum, item) => sum + item.profit, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add some items first.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const saleData = {
        customer_id: selectedCustomer || null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        payment_method: paymentMethod,
        notes: notes,
      };

      const response = await api.post('/sales', saleData);
      setLastSale(response);
      setShowReceipt(true);
      setCart([]);
      setSelectedCustomer('');
      setNotes('');
      fetchData();
      fetchRecentSales();
      setSuccess('Sale completed successfully!');
    } catch (error: any) {
      console.error('Error processing sale:', error);
      setError(error.message || 'Failed to process sale');
    } finally {
      setProcessing(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200 dark:border-orange-800/30 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          </div>
          <p className="mt-5 text-[13px] text-gray-400 dark:text-gray-500 font-medium">Loading sales terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF] dark:bg-black p-4 md:p-6 lg:p-8">
      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-4">
              <BackButton label="Back to Dashboard" fallbackHref="/dashboard" />
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight flex items-center gap-2">
                  <Store className="h-6 w-6 text-orange-500" strokeWidth={1.75} />
                  Point of Sale
                  <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full ml-2">
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    Live
                  </span>
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                  Process sales, manage transactions, and track profits
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-3 slide-up">
            <AlertCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3 slide-up">
            <CheckCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Search & Selection */}
          <div className="lg:col-span-2">
            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" strokeWidth={2} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by name, SKU, or scan barcode..."
                className="input pl-11 h-12 bg-white dark:bg-black/50 border-gray-200 dark:border-white/10 focus:border-orange-500/60 rounded-2xl text-sm"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
                <button className="p-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400">
                  <Scan className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button className="p-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400">
                  <QrCode className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Product Grid */}
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'} gap-3 max-h-[520px] overflow-y-auto p-1 custom-scrollbar`}>
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-16 text-gray-400 dark:text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
                  <p className="text-sm font-medium">No products found</p>
                  <p className="text-xs">Try adjusting your search or add new products</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`group bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-4 hover:shadow-xl transition-all duration-300 ${
                      product.quantity > 0 
                        ? 'cursor-pointer hover:border-orange-500 hover:shadow-orange-500/10 hover:-translate-y-0.5' 
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (product.quantity > 0) {
                        setSelectedProduct(product);
                        setQuantityInput(1);
                        setShowProductModal(true);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        product.quantity > 0 ? 'bg-orange-500/10' : 'bg-gray-100 dark:bg-gray-800/30'
                      }`}>
                        <Package className={`h-5 w-5 ${
                          product.quantity > 0 ? 'text-orange-500' : 'text-gray-400'
                        }`} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black dark:text-white truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.sku && (
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-1.5 py-0.5 rounded">
                              {product.sku}
                            </span>
                          )}
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            product.quantity === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            product.quantity <= 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {product.quantity === 0 ? 'Out of Stock' : `${product.quantity} left`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                      <div>
                        <span className="text-lg font-bold text-black dark:text-white">
                          {formatCurrency(product.unit_price)}
                        </span>
                        {product.category_name && (
                          <p className="text-[10px] text-gray-400">{product.category_name}</p>
                        )}
                      </div>
                      <button
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          product.quantity > 0
                            ? 'bg-black dark:bg-white text-white dark:text-black hover:bg-orange-600 dark:hover:bg-orange-500 hover:scale-105'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={product.quantity === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product.quantity > 0) {
                            setSelectedProduct(product);
                            setQuantityInput(1);
                            setShowProductModal(true);
                          }
                        }}
                      >
                        {product.quantity > 0 ? 'Add +' : 'Out'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent Sales */}
            {recentSales.length > 0 && (
              <div className="mt-6 bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-4 slide-up">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-orange-500" strokeWidth={1.75} />
                    Recent Transactions
                  </h3>
                  <span className="text-xs text-gray-400">Last 5 sales</span>
                </div>
                <div className="space-y-2">
                  {recentSales.map((sale: any) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 rounded-xl transition-colors border border-transparent hover:border-orange-200/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Receipt className="h-4 w-4 text-orange-500" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-black dark:text-white">
                            Sale #{sale.sale_number}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(sale.sale_date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-black dark:text-white">
                          {formatCurrency(sale.total_amount)}
                        </p>
                        <p className="text-xs text-gray-400">{sale.item_count || 0} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Cart */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-4 sticky top-24 shadow-lg">
              {/* Cart Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
                  Cart
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-2 py-0.5 rounded-full">
                    {cart.length}
                  </span>
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Customer Select */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Customer (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="input flex-1 h-10 text-sm"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewCustomerModal(true)}
                    className="px-3 h-10 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex items-center gap-1 text-sm font-medium"
                  >
                    <User className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="max-h-[320px] overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" strokeWidth={1.5} />
                    <p className="text-sm font-medium">Cart is empty</p>
                    <p className="text-xs">Add products from the list</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product_id}
                      className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 slide-up"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-black dark:text-white">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)} each</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-orange-500 hover:text-white transition-colors flex items-center justify-center"
                          >
                            <Minus className="h-3 w-3" strokeWidth={2} />
                          </button>
                          <span className="text-sm font-medium w-6 text-center text-black dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-orange-500 hover:text-white transition-colors flex items-center justify-center"
                            disabled={item.quantity >= item.available}
                          >
                            <Plus className="h-3 w-3" strokeWidth={2} />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-black dark:text-white">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              {cart.length > 0 && (
                <>
                  <div className="border-t border-gray-200 dark:border-white/10 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span className="font-medium text-black dark:text-white">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Total Profit</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        {formatCurrency(totalProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-white/10">
                      <span className="text-black dark:text-white">Total</span>
                      <span className="text-black dark:text-white">{formatCurrency(subtotal)}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['cash', 'mobile_money', 'bank', 'credit'].map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`px-2 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                            paymentMethod === method
                              ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                              : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {method === 'mobile_money' ? 'Mobile' : method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input h-9 text-sm"
                      placeholder="Add a note..."
                    />
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={processing || cart.length === 0}
                    className="w-full mt-4 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" strokeWidth={1.75} />
                        Process Sale
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Quantity Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
                Add to Cart
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-lg font-semibold text-black dark:text-white">{selectedProduct.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Price: <span className="font-medium text-black dark:text-white">{formatCurrency(selectedProduct.unit_price)}</span></span>
                <span className="text-gray-500 dark:text-gray-400">Available: <span className="font-medium text-black dark:text-white">{selectedProduct.quantity}</span></span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))}
                className="w-12 h-12 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center justify-center text-2xl font-medium"
              >
                <Minus className="h-5 w-5" strokeWidth={2} />
              </button>
              <div className="flex-1">
                <input
                  type="number"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input w-full text-center text-2xl font-bold h-14"
                  min="1"
                  max={selectedProduct.quantity}
                />
              </div>
              <button
                onClick={() => setQuantityInput(Math.min(selectedProduct.quantity, quantityInput + 1))}
                className="w-12 h-12 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center justify-center text-2xl font-medium"
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProductModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addToCart(selectedProduct, quantityInput);
                  setShowProductModal(false);
                }}
                className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
                New Customer
              </h2>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="p-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="input"
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="input"
                  placeholder="+256 700 000 000"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customerLoading}
                  className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {customerLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Customer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-black rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 max-h-[90vh] overflow-y-auto slide-up">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
              </div>
              <h2 className="text-2xl font-bold text-black dark:text-white">Sale Complete! 🎉</h2>
              <p className="text-sm text-gray-400 mt-1">Sale #{lastSale.sale.sale_number}</p>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span className="text-black dark:text-white font-medium">{formatDate(lastSale.sale.sale_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Items</span>
                <span className="text-black dark:text-white font-medium">{lastSale.items?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Payment</span>
                <span className="text-black dark:text-white font-medium capitalize">{lastSale.sale.payment_method}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-white/10">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-lg font-bold text-black dark:text-white">{formatCurrency(lastSale.sale.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Profit</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(lastSale.total_profit || 0)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-gray-400 mb-2">Items Sold</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {lastSale.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-600 dark:text-gray-300">{item.product_name} × {item.quantity}</span>
                    <span className="text-black dark:text-white font-medium">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" strokeWidth={1.75} />
                Print
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
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