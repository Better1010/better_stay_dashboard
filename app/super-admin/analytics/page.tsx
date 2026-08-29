'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { notifyError } from '@/lib/notify';

const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: '#f8fafc',
    color: '#111827',
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 28,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    display: 'flex',
    flexDirection: 'row',
    gap: 18,
    marginBottom: 18,
    padding: 16,
  },
  logoWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    display: 'flex',
    height: 56,
    justifyContent: 'center',
    padding: 8,
    width: 150,
  },
  logo: {
    objectFit: 'contain',
    width: 132,
  },
  eyebrow: {
    color: '#64748b',
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    color: '#475569',
    fontSize: 10,
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 10,
    width: '23.9%',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 8,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#111827',
    fontSize: 12,
    fontWeight: 700,
  },
  profitValue: {
    color: '#15803d',
  },
  lossValue: {
    color: '#b91c1c',
  },
  section: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
  },
  table: {
    borderTop: '1px solid #e5e7eb',
    borderLeft: '1px solid #e5e7eb',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    minHeight: 25,
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
  },
  tableCell: {
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    color: '#334155',
    fontSize: 7.5,
    padding: 5,
  },
  tableHeaderCell: {
    color: '#475569',
    fontSize: 7,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  numericCell: {
    textAlign: 'right',
  },
  emptyCell: {
    color: '#64748b',
    fontSize: 9,
    padding: 16,
    textAlign: 'center',
    width: '100%',
  },
  footer: {
    color: '#94a3b8',
    fontSize: 8,
    marginTop: 18,
    textAlign: 'center',
  },
});

export default function SuperAdminAnalyticsPage() {
  const now = useMemo(() => new Date(), []);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = useMemo(() => Array.from({ length: 8 }, (_, i) => now.getFullYear() - 3 + i), [now]);

  type IncomeRow = {
    paymentId: string;
    bedId: string;
    bedNumber: string;
    roomNumber: string;
    unitNumber: string;
    buildingName: string;
    assigneeName: string;
    mobileNumber: string;
    amount: number;
    paidAt: string | null;
  };

  type ExpenseRow = {
    expenseId: string;
    expenseName: string;
    categoryName: string;
    amount: number;
    expenseDate: string;
    notes: string;
    unitId: string;
    unitNumber: string;
    unitFloor: number;
    buildingName: string;
  };

  type HostelOption = {
    id?: string;
    _id?: string;
    name: string;
  };

  type UnitOption = {
    id: string;
    unitNumber: string;
  };

  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);

  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [profit, setProfit] = useState(0);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');
  const formatCurrency = (amount: number) => `৳${Number(amount || 0).toFixed(2)}`;
  const formatPdfCurrency = (amount: number) => `BDT ${Number(amount || 0).toFixed(2)}`;

  const selectedMonthLabel = months.find((m) => m.value === month)?.label || String(month);
  const selectedBuildingLabel = selectedHostelId
    ? hostels.find((h) => String(h.id || h._id) === selectedHostelId)?.name || 'Selected building'
    : 'All buildings';
  const selectedUnitLabel = selectedUnitId
    ? units.find((u) => String(u.id) === selectedUnitId)?.unitNumber || 'Selected unit'
    : 'All units';

  const escapeHtml = (value: unknown) =>
    String(value ?? '—').replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[char];
    });

  const exportFileName = () =>
    `analytics-${selectedBuildingLabel}-${selectedUnitLabel}-${selectedMonthLabel}-${year}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const buildSummaryRows = () => [
    ['Building', selectedBuildingLabel],
    ['Unit', selectedUnitLabel],
    ['Month', selectedMonthLabel],
    ['Year', year],
    ['Total Income', formatCurrency(totalIncome)],
    ['Total Expense', formatCurrency(totalExpense)],
    ['Profit', formatCurrency(profit)],
  ];

  const buildPdfSummaryRows = () => [
    ['Building', selectedBuildingLabel],
    ['Unit', selectedUnitLabel],
    ['Month', selectedMonthLabel],
    ['Year', String(year)],
    ['Total Income', formatPdfCurrency(totalIncome)],
    ['Total Expense', formatPdfCurrency(totalExpense)],
    ['Profit', formatPdfCurrency(profit)],
  ];

  const buildIncomeTableRows = () =>
    incomeRows.length
      ? incomeRows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.buildingName || '—')}</td>
                <td>${escapeHtml(row.unitNumber || '—')}</td>
                <td>${escapeHtml(row.roomNumber || '—')}</td>
                <td>${escapeHtml(row.bedNumber || '—')}</td>
                <td>${escapeHtml(row.assigneeName || '—')}</td>
                <td>${escapeHtml(row.mobileNumber || '—')}</td>
                <td class="number">${escapeHtml(formatCurrency(Number(row.amount)))}</td>
                <td>${escapeHtml(formatDate(row.paidAt))}</td>
              </tr>
            `,
          )
          .join('')
      : '<tr><td colspan="8" class="empty">No paid income for this period.</td></tr>';

  const buildExpenseTableRows = () =>
    expenseRows.length
      ? expenseRows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.buildingName || '—')}</td>
                <td>${escapeHtml(row.unitNumber || '—')}</td>
                <td>${escapeHtml(row.expenseName || '—')}</td>
                <td>${escapeHtml(row.categoryName || '—')}</td>
                <td class="number">${escapeHtml(formatCurrency(Number(row.amount)))}</td>
                <td>${escapeHtml(row.expenseDate ? new Date(row.expenseDate).toLocaleDateString() : '—')}</td>
              </tr>
            `,
          )
          .join('')
      : '<tr><td colspan="6" class="empty">No expenses for this period.</td></tr>';

  const getLogoDataUrl = async () => {
    const response = await fetch('/images/LOGO.png');
    const logoBlob = await response.blob();

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(logoBlob);
    });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const AnalyticsReportPdf = ({ logoSrc }: { logoSrc: string }) => {
    const incomeWidths = ['13%', '9%', '8%', '8%', '14%', '14%', '12%', '22%'];
    const expenseWidths = ['18%', '10%', '24%', '18%', '14%', '16%'];

    return (
      <Document author="BetterStay" subject="Analytics report" title="BetterStay Analytics Report">
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.header}>
            <View style={pdfStyles.logoWrap}>
              <Image src={logoSrc} style={pdfStyles.logo} />
            </View>
            <View>
              <Text style={pdfStyles.eyebrow}>BetterStay Analytics</Text>
              <Text style={pdfStyles.title}>Income & Expense Report</Text>
              <Text style={pdfStyles.subtitle}>
                {selectedMonthLabel} {year} • {selectedBuildingLabel} • {selectedUnitLabel}
              </Text>
              <Text style={pdfStyles.subtitle}>Generated {new Date().toLocaleString()}</Text>
            </View>
          </View>

          <View style={pdfStyles.summaryGrid}>
            {buildPdfSummaryRows().map(([label, value]) => (
              <View key={label} style={pdfStyles.summaryCard}>
                <Text style={pdfStyles.summaryLabel}>{label}</Text>
                <Text
                  style={[
                    pdfStyles.summaryValue,
                    label === 'Profit' ? (profit >= 0 ? pdfStyles.profitValue : pdfStyles.lossValue) : {},
                  ]}
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Income Details</Text>
            <View style={pdfStyles.table}>
              <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]} fixed>
                {['Building', 'Unit', 'Room', 'Bed', 'Client', 'Mobile', 'Amount', 'Paid At'].map(
                  (heading, index) => (
                    <Text
                      key={heading}
                      style={[
                        pdfStyles.tableCell,
                        pdfStyles.tableHeaderCell,
                        index === 6 ? pdfStyles.numericCell : {},
                        { width: incomeWidths[index] },
                      ]}
                    >
                      {heading}
                    </Text>
                  ),
                )}
              </View>
              {incomeRows.length ? (
                incomeRows.map((row) => (
                  <View key={row.paymentId} style={pdfStyles.tableRow} wrap={false}>
                    {[
                      row.buildingName || '—',
                      row.unitNumber || '—',
                      row.roomNumber || '—',
                      row.bedNumber || '—',
                      row.assigneeName || '—',
                      row.mobileNumber || '—',
                      formatPdfCurrency(Number(row.amount)),
                      formatDate(row.paidAt),
                    ].map((value, index) => (
                      <Text
                        key={`${row.paymentId}-${index}`}
                        style={[
                          pdfStyles.tableCell,
                          index === 6 ? pdfStyles.numericCell : {},
                          { width: incomeWidths[index] },
                        ]}
                      >
                        {value}
                      </Text>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={pdfStyles.emptyCell}>No paid income for this period.</Text>
              )}
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Expense Details</Text>
            <View style={pdfStyles.table}>
              <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]} fixed>
                {['Building', 'Unit', 'Expense', 'Category', 'Amount', 'Date'].map((heading, index) => (
                  <Text
                    key={heading}
                    style={[
                      pdfStyles.tableCell,
                      pdfStyles.tableHeaderCell,
                      index === 4 ? pdfStyles.numericCell : {},
                      { width: expenseWidths[index] },
                    ]}
                  >
                    {heading}
                  </Text>
                ))}
              </View>
              {expenseRows.length ? (
                expenseRows.map((row) => (
                  <View key={row.expenseId} style={pdfStyles.tableRow} wrap={false}>
                    {[
                      row.buildingName || '—',
                      row.unitNumber || '—',
                      row.expenseName || '—',
                      row.categoryName || '—',
                      formatPdfCurrency(Number(row.amount)),
                      row.expenseDate ? new Date(row.expenseDate).toLocaleDateString() : '—',
                    ].map((value, index) => (
                      <Text
                        key={`${row.expenseId}-${index}`}
                        style={[
                          pdfStyles.tableCell,
                          index === 4 ? pdfStyles.numericCell : {},
                          { width: expenseWidths[index] },
                        ]}
                      >
                        {value}
                      </Text>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={pdfStyles.emptyCell}>No expenses for this period.</Text>
              )}
            </View>
          </View>

          <Text style={pdfStyles.footer}>BetterStay • Property Management Platform</Text>
        </Page>
      </Document>
    );
  };

  const generatePdf = async () => {
    setDownloadOpen(false);
    setGeneratingPdf(true);

    try {
      const logoSrc = await getLogoDataUrl();
      const blob = await pdf(<AnalyticsReportPdf logoSrc={logoSrc} />).toBlob();
      downloadBlob(blob, `${exportFileName()}.pdf`);
    } catch (error) {
      console.error('Error generating analytics PDF:', error);
      notifyError('Could not generate the PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const generateExcel = () => {
    setDownloadOpen(false);

    const summaryRows = buildSummaryRows()
      .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
      .join('');

    const workbook = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; margin-bottom: 24px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; }
            th { background: #f3f4f6; font-weight: bold; }
            .number { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Analytics Report</h1>
          <table>${summaryRows}</table>
          <h2>Income Details</h2>
          <table>
            <thead>
              <tr>
                <th>Building</th><th>Unit</th><th>Room</th><th>Bed</th>
                <th>Client</th><th>Mobile</th><th>Amount</th><th>Paid At</th>
              </tr>
            </thead>
            <tbody>${buildIncomeTableRows()}</tbody>
          </table>
          <h2>Expense Details</h2>
          <table>
            <thead>
              <tr>
                <th>Building</th><th>Unit</th><th>Expense</th><th>Category</th>
                <th>Amount</th><th>Date</th>
              </tr>
            </thead>
            <tbody>${buildExpenseTableRows()}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFileName()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchHostels = useCallback(async () => {
    try {
      const res = await api.get('/hostels');
      setHostels((res.data.hostels || []) as HostelOption[]);
    } catch {
      setHostels([]);
    }
  }, []);

  useEffect(() => {
    fetchHostels();
  }, [fetchHostels]);

  useEffect(() => {
    if (!selectedHostelId) {
      setUnits([]);
      setSelectedUnitId('');
      return;
    }
    api
      .get(`/units?hostelId=${selectedHostelId}`)
      .then((r) => setUnits((r.data.units || []) as UnitOption[]))
      .catch(() => setUnits([]));
  }, [selectedHostelId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedHostelId) params.set('hostelId', selectedHostelId);
      if (selectedUnitId) params.set('unitId', selectedUnitId);
      params.set('month', String(month));
      params.set('year', String(year));

      const res = await api.get(`/analytics?${params.toString()}`);
      setIncomeRows(res.data.incomeRows || []);
      setExpenseRows(res.data.expenseRows || []);
      setTotalIncome(Number(res.data.totalIncome || 0));
      setTotalExpense(Number(res.data.totalExpense || 0));
      setProfit(Number(res.data.profit || 0));
    } catch {
      setIncomeRows([]);
      setExpenseRows([]);
      setTotalIncome(0);
      setTotalExpense(0);
      setProfit(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHostelId, selectedUnitId, month, year]);

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDownloadOpen((current) => !current)}
                disabled={loading || generatingPdf}
                className="inline-flex h-full min-h-16 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-[#ff5757] text-secondary-foreground px-4 py-3 text-sm font-semibold shadow-sm transition-colors hover:bg-[#ff5757]/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden />
                {generatingPdf ? 'Generating...' : 'Download'}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
              {downloadOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={generatePdf}
                    disabled={generatingPdf}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FileText className="h-4 w-4" aria-hidden />
                    {generatingPdf ? 'Generating PDF...' : 'Generate PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={generateExcel}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="h-4 w-4" aria-hidden />
                    Generate Excel
                  </button>
                </div>
              ) : null}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-1">
              <p className="text-xs text-gray-500">Profit (Income - Expense)</p>
              <p className="text-2xl font-bold text-gray-900">৳{profit.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">Total income</p>
            <p className="text-xl font-bold text-gray-900">৳{totalIncome.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">Total expense</p>
            <p className="text-xl font-bold text-gray-900">৳{totalExpense.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 md:col-span-4 lg:col-span-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Building</label>
                <select
                  value={selectedHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                >
                  <option value="">All buildings</option>
                  {hostels.map((h) => (
                    <option key={h.id || h._id || h.name} value={h.id || h._id || ''}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Unit</label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  disabled={!selectedHostelId}
                >
                  <option value="">All units</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Income (Paid)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Building</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Room</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Bed</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Mobile</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Paid At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : incomeRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No paid income for this period.</td>
                    </tr>
                  ) : (
                    incomeRows.map((r) => (
                      <tr key={r.paymentId}>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.buildingName || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.unitNumber || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.roomNumber || '—'}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.bedNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.assigneeName || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.mobileNumber || '—'}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">৳{Number(r.amount).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{formatDate(r.paidAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Building</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Expense</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : expenseRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No expenses for this period.</td>
                    </tr>
                  ) : (
                    expenseRows.map((r) => (
                      <tr key={r.expenseId}>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.buildingName || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.unitNumber || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.expenseName || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.categoryName || '—'}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">৳{Number(r.amount).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Profit Summary</h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Profit</p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ৳{profit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
