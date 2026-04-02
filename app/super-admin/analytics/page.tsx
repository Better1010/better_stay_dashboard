'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

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

  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [profit, setProfit] = useState(0);

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');

  const fetchHostels = async () => {
    try {
      const res = await api.get('/hostels');
      setHostels(res.data.hostels || []);
    } catch {
      setHostels([]);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    if (!selectedHostelId) {
      setUnits([]);
      setSelectedUnitId('');
      return;
    }
    api
      .get(`/units?hostelId=${selectedHostelId}`)
      .then((r) => setUnits(r.data.units || []))
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
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-1">
            <p className="text-xs text-gray-500">Profit (Income - Expense)</p>
            <p className="text-2xl font-bold text-gray-900">৳{profit.toFixed(2)}</p>
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
                  {hostels.map((h: any) => (
                    <option key={h.id || h._id} value={h.id || h._id}>
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
                  {units.map((u: any) => (
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
