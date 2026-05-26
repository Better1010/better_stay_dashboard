'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type IncomeRow = {
  bedId: string;
  bedNumber: string;
  basePrice: number;
  roomNumber: string;
  unitNumber: string;
  buildingName: string;
  assigneeName: string;
  mobileNumber: string;
  status: 'paid' | 'unpaid';
  paidAmount: number;
  paymentId?: string | null;
};

type PaymentMonthSummary = {
  month: number;
  amount: number;
};

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

export default function SuperAdminIncomePage() {
  const now = useMemo(() => new Date(), []);
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<IncomeRow | null>(null);
  const [payMonth, setPayMonth] = useState(now.getMonth() + 1);
  const [payYear, setPayYear] = useState(now.getFullYear());
  const [payAmount, setPayAmount] = useState(0);
  const [paying, setPaying] = useState(false);
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [paymentMonths, setPaymentMonths] = useState<PaymentMonthSummary[]>([]);
  const [loadingPaidMonths, setLoadingPaidMonths] = useState(false);

  const years = useMemo(() => {
    const start = now.getFullYear() - 3;
    return Array.from({ length: 8 }, (_, i) => start + i);
  }, [now]);

  const fetchIncome = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedHostelId) params.set('hostelId', selectedHostelId);
      if (selectedUnitId) params.set('unitId', selectedUnitId);
      params.set('month', String(month));
      params.set('year', String(year));
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/income?${params.toString()}`);
      setRows(res.data.rows || []);
      setTotalIncome(Number(res.data.totalIncome || 0));
    } catch {
      setRows([]);
      setTotalIncome(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/hostels').then((r) => setHostels(r.data.hostels || [])).catch(() => setHostels([]));
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

  useEffect(() => {
    fetchIncome();
  }, [selectedHostelId, selectedUnitId, month, year, search]);

  const fetchPaidMonths = async (bedId: string, y: number) => {
    try {
      setLoadingPaidMonths(true);
      const res = await api.get(`/income/paid-months?bedId=${bedId}&year=${y}`);
      setPaidMonths(res.data.months || []);
      setPaymentMonths(res.data.payments || []);
    } catch {
      setPaidMonths([]);
      setPaymentMonths([]);
    } finally {
      setLoadingPaidMonths(false);
    }
  };

  const openPayModal = (row: IncomeRow) => {
    setPayModal(row);
    setPayMonth(month);
    setPayYear(year);
    setPayAmount(0);
    fetchPaidMonths(row.bedId, year);
  };

  useEffect(() => {
    if (!payModal) return;
    if (payModal.status === 'paid') return;
    fetchPaidMonths(payModal.bedId, payYear);
  }, [payYear, payModal]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    if (isSelectedMonthPaid) {
      alert('This month is already paid for this bed. Choose another month.');
      return;
    }
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (payAmount > remainingDueBeforePayment) {
      alert(`Entered amount is greater than remaining due of ৳${remainingDueBeforePayment.toFixed(2)}.`);
      return;
    }
    try {
      setPaying(true);
      await api.post('/income/pay', {
        bedId: payModal.bedId,
        month: payMonth,
        year: payYear,
        amount: payAmount,
      });
      setPayModal(null);
      fetchIncome();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const handleDeletePayment = async (row: IncomeRow) => {
    if (!row.paymentId) return;
    if (!confirm(`Delete payment for ${months.find((m) => m.value === month)?.label} ${year} - Bed ${row.bedNumber}?`)) return;
    try {
      await api.delete(`/income-payments/${row.paymentId}`);
      fetchIncome();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete payment');
    }
  };

  const isSelectedMonthPaid = useMemo(() => {
    return paidMonths.includes(payMonth);
  }, [paidMonths, payMonth]);

  const selectedPaidAmount = useMemo(() => {
    return Number(paymentMonths.find((entry) => entry.month === payMonth)?.amount || 0);
  }, [paymentMonths, payMonth]);

  const remainingDueBeforePayment = useMemo(() => {
    return Math.max(Number(payModal?.basePrice || 0) - selectedPaidAmount, 0);
  }, [payModal, selectedPaidAmount]);

  const remainingDue = useMemo(() => {
    return Math.max(remainingDueBeforePayment - Number(payAmount || 0), 0);
  }, [remainingDueBeforePayment, payAmount]);

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Income</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-end">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Total paid</p>
              <p className="text-2xl font-bold text-gray-900">৳{totalIncome.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
                  className="rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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

        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bed / client / mobile"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Building</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mobile</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No assigned clients found for selected filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.bedId}>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.buildingName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.unitNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.roomNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.bedNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.assigneeName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.mobileNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">৳{Number(row.basePrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        {row.status === 'paid' ? (
                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Paid</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openPayModal(row)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            Payment
                          </button>
                          {row.paymentId ? (
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(row)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {payModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-3 text-gray-900">
                Payment - Bed {payModal.bedNumber}
              </h4>
              <form onSubmit={handlePay} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select
                      value={payMonth}
                      onChange={(e) => setPayMonth(Number(e.target.value))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    >
                      {months.map((m) => (
                        <option
                          key={m.value}
                          value={m.value}
                          disabled={paidMonths.includes(m.value) && m.value !== payMonth}
                        >
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {loadingPaidMonths ? (
                      <p className="mt-1 text-xs text-gray-500">Checking paid months…</p>
                    ) : isSelectedMonthPaid ? (
                      <p className="mt-1 text-xs text-red-600">This month is already paid for this bed. Pick another month.</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select
                      value={payYear}
                      onChange={(e) => setPayYear(Number(e.target.value))}
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Status</p>
                  {isSelectedMonthPaid ? (
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Paid</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Unpaid</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bed amount</label>
                  <input
                    type="number"
                    value={Number(payModal.basePrice || 0)}
                    className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-900"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter amount</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    max={remainingDueBeforePayment}
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="Enter paid amount"
                    required
                    disabled={isSelectedMonthPaid}
                  />
                  {selectedPaidAmount > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Already paid for this month: ৳{selectedPaidAmount.toFixed(2)}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                  >
                    Due: ৳{remainingDue.toFixed(2)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayModal(null)}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paying || isSelectedMonthPaid}
                    className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
                  >
                    {paying ? 'Saving...' : isSelectedMonthPaid ? 'Paid' : 'Pay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
