'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeLoans: number;
  totalCustomers: number;
  averageLoan: number;
  repaymentRate: number;
  monthlyData: { month: string; revenue: number; expenses: number; profit: number }[];
  topCustomers: { name: string; total: number; loans: number }[];
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
}

export class ReportPDF {
  private doc: jsPDF;
  private companyInfo: CompanyInfo;

  constructor(companyInfo: CompanyInfo = {
    name: 'LoanSavvy Management System',
    address: 'Kampala, Uganda',
    phone: '+256 700 000 000',
    email: 'info@loansavvy.com',
  }) {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.companyInfo = companyInfo;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private addHeader(title: string) {
    const doc = this.doc;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LoanSavvy', 20, 18);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Loan & Savings Management System', 20, 30);

    doc.setFontSize(8);
    doc.text(this.companyInfo.name, pageWidth - 20, 12, { align: 'right' });
    doc.text(this.companyInfo.address, pageWidth - 20, 18, { align: 'right' });
    doc.text(`Tel: ${this.companyInfo.phone} | Email: ${this.companyInfo.email}`, pageWidth - 20, 24, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, pageWidth - 20, 35);

    doc.setTextColor(37, 99, 235);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, 48);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Generated: ${dateStr}`, 20, 56);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 60, pageWidth - 20, 60);

    return 65;
  }

  private addFooter() {
    const doc = this.doc;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(200, 200, 200);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `© ${new Date().getFullYear()} ${this.companyInfo.name}. All rights reserved.`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    doc.text(
      `Page ${doc.getCurrentPageInfo().pageNumber}`,
      pageWidth - 20,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  public generateFinancialReport(data: ReportData): jsPDF {
    const doc = this.doc;
    let y = this.addHeader('Financial Performance Report');

    const summaryData = [
      ['Total Revenue', this.formatCurrency(data.totalRevenue), '↑ 12.5%'],
      ['Total Expenses', this.formatCurrency(data.totalExpenses), '↓ 3.2%'],
      ['Net Profit', this.formatCurrency(data.netProfit), '↑ 18.3%'],
      ['Repayment Rate', `${data.repaymentRate}%`, '↑ 2.1%'],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value', 'Change']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' },
        2: { cellWidth: 50, halign: 'center' },
      },
      margin: { left: 20, right: 20 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    const metricsData = [
      ['Active Loans', data.activeLoans.toString()],
      ['Total Customers', data.totalCustomers.toString()],
      ['Average Loan', this.formatCurrency(data.averageLoan)],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: metricsData,
      theme: 'striped',
      headStyles: {
        fillColor: [55, 65, 81],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    if (data.monthlyData && data.monthlyData.length > 0) {
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Performance', 20, y);
      y += 8;

      const monthlyRows = data.monthlyData.map((m) => [
        m.month,
        this.formatCurrency(m.revenue),
        this.formatCurrency(m.expenses),
        this.formatCurrency(m.profit),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Month', 'Revenue', 'Expenses', 'Profit']],
        body: monthlyRows,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
        margin: { left: 20, right: 20 },
      });
    }

    this.addFooter();
    return doc;
  }

  public generateLoanReport(loan: any, payments: any[]): jsPDF {
    const doc = this.doc;
    const pageWidth = doc.internal.pageSize.getWidth();

    let y = this.addHeader(`Loan Report - #${loan.id?.slice(0, 8) || 'Unknown'}`);

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${loan.customer_name || 'Unknown'}`, 20, y);
    doc.text(`Phone: ${loan.customer_phone || 'N/A'}`, pageWidth / 2 + 10, y);
    y += 6;
    doc.text(`Loan Date: ${new Date(loan.loan_date).toLocaleDateString()}`, 20, y);
    doc.text(`Due Date: ${new Date(loan.due_date).toLocaleDateString()}`, pageWidth / 2 + 10, y);
    y += 6;
    doc.text(`Status: ${loan.status?.toUpperCase() || 'Unknown'}`, 20, y);
    doc.text(`Frequency: ${loan.repayment_frequency || 'N/A'}`, pageWidth / 2 + 10, y);

    y += 10;

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Loan Summary', 20, y);
    y += 6;

    const summaryData = [
      ['Principal', this.formatCurrency(loan.principal_amount)],
      ['Interest Rate', `${loan.interest_rate}% (${loan.interest_type})`],
      ['Total Payable', this.formatCurrency(loan.total_payable)],
      ['Amount Paid', this.formatCurrency(loan.amount_paid)],
      ['Remaining Balance', this.formatCurrency(loan.remaining_balance)],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    if (payments && payments.length > 0) {
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment History', 20, y);
      y += 6;

      const paymentRows = payments.map((p) => [
        new Date(p.payment_date).toLocaleDateString(),
        this.formatCurrency(p.amount_paid),
        p.payment_method?.replace('_', ' ') || 'N/A',
        this.formatCurrency(p.remaining_balance_after),
        p.collector_notes || '-',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Amount', 'Method', 'Balance After', 'Notes']],
        body: paymentRows,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          1: { halign: 'right' },
          3: { halign: 'right' },
        },
        margin: { left: 20, right: 20 },
      });
    } else {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text('No payments recorded yet.', 20, y + 10);
    }

    this.addFooter();
    return doc;
  }

  public save(filename: string) {
    this.doc.save(filename);
  }
}