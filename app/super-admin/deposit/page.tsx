'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

type DepositRow = {
  id: string;
  registeredUserId: string;
  clientName: string;
  mobileNumber: string;
  amount: number;
  createdAt: string;
};

type RegisteredUser = {
  id: string;
  name: string;
  mobileNumber?: string;
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message && typeof res.data.message === 'string') return res.data.message;
  }
  return fallback;
}

export default function DepositPage() {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [selectedRegisteredUserId, setSelectedRegisteredUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async (searchText = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set('search', searchText.trim());
      const [depRes, userRes] = await Promise.all([
        api.get(`/deposits${params.toString() ? `?${params.toString()}` : ''}`),
        api.get('/registered-users'),
      ]);
      setDeposits(depRes.data.deposits || []);
      setTotalDeposit(Number(depRes.data.totalDeposit || 0));
      setRegisteredUsers(userRes.data.users || []);
    } catch {
      setDeposits([]);
      setTotalDeposit(0);
      setRegisteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      fetchData(search);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegisteredUserId || !amount) return;
    try {
      setSaving(true);
      await api.post('/deposits', {
        registeredUserId: selectedRegisteredUserId,
        amount: Number(amount),
      });
      setAddModal(false);
      setSelectedRegisteredUserId('');
      setAmount('');
      fetchData(search);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to add deposit'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Deposit</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAddModal(true)}
              className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-900 font-medium"
            >
              + Add Deposit
            </button>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Total deposit</p>
              <p className="text-2xl font-bold text-gray-900">৳{totalDeposit.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search by client name</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type client name..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-2/5 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="w-2/5 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mobile</th>
                  <th className="w-1/5 px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No deposits found.</td>
                  </tr>
                ) : (
                  deposits.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium truncate">{d.clientName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 truncate">{d.mobileNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 font-medium whitespace-nowrap">৳{Number(d.amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {addModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Add Deposit</h4>
              <form onSubmit={handleAddDeposit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Registered client</label>
                  <select
                    value={selectedRegisteredUserId}
                    onChange={(e) => setSelectedRegisteredUserId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  >
                    <option value="">Select client</option>
                    {registeredUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.mobileNumber ? `(${u.mobileNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Price</label>
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
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModal(false);
                      setSelectedRegisteredUserId('');
                      setAmount('');
                    }}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-black text-yellow-400 rounded-lg disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Add'}
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
