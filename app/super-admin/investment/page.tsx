'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

type InvestmentRow = {
  id: string;
  name: string;
  description: string;
  date: string;
  amount: number;
  createdAt: string;
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message && typeof res.data.message === 'string') return res.data.message;
  }
  return fallback;
}

export default function InvestmentPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);

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

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Investment</h2>

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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : investments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No investments yet.</td>
                  </tr>
                ) : (
                  investments.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 font-medium">৳{Number(row.amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
