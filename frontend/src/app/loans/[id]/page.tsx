'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Calendar,
  HandCoins,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  FileText,
  Plus,
  ChevronRight,
  Printer,
  Download,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';
// @ts-ignore
import { ReportPDF } from '@/components/ReportPDF';

interface LoanDetail {
  id: string;
  customer_name: string;
  customer_id: string;
  customer_phone: string;
  principal_amount: number;
  interest_rate: number;
  interest_type: string;
  total_payable: number;
  amount_paid: number;
  remaining_balance: number;
  loan_date: string;
  due_date: string;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  repayment_frequency: 'weekly' | 'biweekly' | 'monthly';
  notes?: string;
  payments: {
    id: string;
    amount_paid: number;
    payment_date: string;
    payment_method: string;
    remaining_balance_after: number;
    collector_notes?: string;
  }[];
}

export default function LoanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchLoanDetail();
  }, []);

  const fetchLoanDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/loans/${params.id}`);
      let paymentsData = [];
      try {
        paymentsData = await api.get(`/payments?loan_id=${params.id}`);
      } catch (paymentError: any) {
        console.log('Payments not available:', paymentError.message);
        paymentsData = [];
      }
      setLoan({
        ...data,
        payments: paymentsData,
        customer_id: data.customer_id || data.customerid || '',
      });
    } catch (error: any) {
      console.error('Error fetching loan:', error);
      setError(error.message || 'Failed to load loan details');
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

  const getMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      cash: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      mobile_money: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      bank: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
    };
    return styles[method] || 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!loan) return;
    try {
      const report = new ReportPDF({
        name: 'Polly Consults',
        address: 'Kampala, Uganda',
        phone: '+256 700 000 000',
        email: 'info@pollyconsults.com',
      });
      const doc = report.generateLoanReport(loan, loan.payments);
      report.save(`loan-${loan.id.slice(0, 8)}-report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!loan) return;
    const headers = ['Date', 'Amount', 'Method', 'Balance After', 'Notes'];
    const rows = loan.payments.map(p => [
      formatDate(p.payment_date),
      formatCurrency(p.amount_paid),
      p.payment_method,
      formatCurrency(p.remaining_balance_after),
      p.collector_notes || ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-${loan.id}-payments.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progress = loan ? (loan.amount_paid / loan.total_payable) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-orange-200 dark:border-orange-800 border-t-orange-500 dark:border-t-orange-400 animate-spin" />
          <p className="mt-5 text-[13px] text-gray-500 dark:text-gray-400">Loading loan details...</p>
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EF] dark:bg-black">
        <div className="text-center">
          <p className="text-gray-400">{error || 'Loan not found'}</p>
          <button
            onClick={() => router.push('/loans')}
            className="mt-4 text-orange-500 hover:underline"
          >
            Back to loans
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(loan.status);

  return (
    <div className="min-h-screen bg-[#FAF6EF] dark:bg-black p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <BackButton label="Back to Loans" fallbackHref="/loans" />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all shadow-lg shadow-orange-500/20"
            >
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              Export PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
            >
              <Printer className="h-4 w-4" strokeWidth={1.75} />
              Print
            </button>
          </div>
        </div>

        {/* Loan Header */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-black dark:text-white">
                  Loan #{loan.id.slice(0, 8)}
                </h1>
                <span className={statusBadge.className}>
                  {statusBadge.icon}
                  {loan.status}
                </span>
              </div>
              <button
                onClick={() => router.push(`/customers/${loan.customer_id}`)}
                className="text-sm text-orange-500 hover:underline mt-1 flex items-center gap-1"
              >
                <User className="h-3 w-3" strokeWidth={1.5} />
                {loan.customer_name} · {loan.customer_phone}
              </button>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Loan Date: {formatDate(loan.loan_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Due Date: {formatDate(loan.due_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {loan.repayment_frequency}
                </span>
              </div>
            </div>
            <button 
              onClick={() => router.push(`/payments?loan_id=${loan.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-all"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Record Payment
            </button>
          </div>
        </div>

        {/* Loan Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Principal</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">
              {formatCurrency(loan.principal_amount)}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Interest Rate</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">
              {loan.interest_rate}% ({loan.interest_type})
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Payable</p>
            <p className="text-lg font-semibold text-black dark:text-white mt-1">
              {formatCurrency(loan.total_payable)}
            </p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Remaining Balance</p>
            <p className={`text-lg font-semibold mt-1 ${loan.remaining_balance > 0 ? 'text-orange-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(loan.remaining_balance)}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 p-6 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-300">Repayment Progress</span>
            <span className="font-medium text-black dark:text-white">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-2">
            <span>Paid: {formatCurrency(loan.amount_paid)}</span>
            <span>Remaining: {formatCurrency(loan.remaining_balance)}</span>
          </div>
          {loan.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">Notes:</span> {loan.notes}
              </p>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4" strokeWidth={1.5} />
              Payment History ({loan.payments.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            {loan.payments.length === 0 ? (
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
                  {loan.payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-black dark:text-white">
                        {formatCurrency(payment.amount_paid)}
                      </td>
                      <td className="px-6 py-3 hidden sm:table-cell">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getMethodBadge(payment.payment_method)} capitalize`}>
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
    </div>
  );
}