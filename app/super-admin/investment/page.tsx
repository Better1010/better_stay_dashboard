'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

const editActionButtonClass =
  'rounded-md bg-blue-600 px-2.5 py-1 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';

type InvestmentRow = {
  id: string;
  name: string;
  description: string;
  date: string;
  amount: number;
  createdAt: string;
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

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message && typeof res.data.message === 'string') return res.data.message;
  }
  return fallback;
}

export default function InvestmentPage() {
  const now = useMemo(() => new Date(), []);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editRow, setEditRow] = useState<InvestmentRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const years = useMemo(() => {
    const start = now.getFullYear() - 3;
    return Array.from({ length: 8 }, (_, i) => start + i);
  }, [now]);

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/investments');
      setInvestments(res.data.investments || []);
    } catch {
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const filteredInvestments = useMemo(() => {
    return investments.filter((row) => {
      if (!row.date) return false;
      const investmentDate = new Date(row.date);
      return investmentDate.getMonth() + 1 === month && investmentDate.getFullYear() === year;
    });
  }, [investments, month, year]);

  const totalInvestment = useMemo(() => {
    return filteredInvestments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }, [filteredInvestments]);

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date || !amount) return;
    try {
      setSaving(true);
      await api.post('/investments', {
        name: name.trim(),
        description: description.trim(),
        date,
        amount: Number(amount),
      });
      setName('');
      setDescription('');
      setDate(new Date().toISOString().slice(0, 10));
      setAmount('');
      fetchInvestments();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to add investment'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: InvestmentRow) => {
    setEditRow(row);
    setEditName(row.name);
    setEditDescription(row.description || '');
    setEditDate(row.date ? String(row.date).slice(0, 10) : '');
    setEditAmount(String(row.amount ?? ''));
  };

  const handleEditInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow || !editName.trim() || !editDate || !editAmount) return;
    try {
      setEditSaving(true);
      await api.patch(`/investments/${editRow.id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        date: editDate,
        amount: Number(editAmount),
      });
      setEditRow(null);
      fetchInvestments();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to update investment'));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Investment</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-end">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Total investment</p>
              <p className="text-2xl font-bold text-gray-900">৳{totalInvestment.toFixed(2)}</p>
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

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Investment</h3>
          <form onSubmit={handleAddInvestment} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900">Investment name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">Amount</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            </div>
            <div className="md:col-span-2 lg:col-span-5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-900 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredInvestments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No investments found for the selected month and year.
                    </td>
                  </tr>
                ) : (
                  filteredInvestments.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 font-medium">৳{Number(row.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button type="button" onClick={() => openEdit(row)} className={editActionButtonClass}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editRow && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit investment</h3>
              <form onSubmit={handleEditInvestment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Investment name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Amount</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditRow(null)}
                    disabled={editSaving}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-900 disabled:opacity-50"
                  >
                    {editSaving ? 'Saving...' : 'Save'}
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
