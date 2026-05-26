'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type UserDetail = {
  id: string;
  name: string;
  mobileNumber: string;
  nidFrontUrl: string;
  nidBackUrl: string;
  createdAt: string;
};

type AssignmentLocation = {
  buildingName: string;
  unitNumber: string;
  roomNumber: string;
  bedNumber: string;
};

type DepositRow = {
  id: string;
  registeredUserId: string;
  clientName: string;
  mobileNumber: string;
  amount: number;
  createdAt: string;
  bedAssignmentStatus: 'assigned' | 'unassigned';
  assignmentLocations: AssignmentLocation[];
  userDetail: UserDetail | null;
};

type RegisteredUser = {
  id: string;
  name: string;
  mobileNumber?: string;
};

function normalizeRegisteredUsersList(raw: unknown): RegisteredUser[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u: Record<string, unknown>) => {
      const id = String(u.id ?? u._id ?? '').trim();
      const nameRaw = u.name ?? u.fullName ?? u.full_name;
      const name =
        typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : 'Unnamed client';
      const mobileRaw = u.mobileNumber ?? u.mobile_number ?? u.phone;
      const mobileNumber = typeof mobileRaw === 'string' ? mobileRaw.trim() : '';
      return { id, name, mobileNumber };
    })
    .filter((u) => u.id.length > 0);
}

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
  const [detailDeposit, setDetailDeposit] = useState<DepositRow | null>(null);
  const [editDeposit, setEditDeposit] = useState<DepositRow | null>(null);

  const [selectedRegisteredUserId, setSelectedRegisteredUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [editRegisteredUserId, setEditRegisteredUserId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchRegisteredUsers = async () => {
    try {
      const userRes = await api.get('/registered-users');
      const list = normalizeRegisteredUsersList(userRes?.data?.users ?? userRes?.data);
      setRegisteredUsers(list);
      return list;
    } catch {
      setRegisteredUsers([]);
      return [];
    }
  };

  const fetchData = async (searchText = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set('search', searchText.trim());
      const depRes = await api.get(`/deposits${params.toString() ? `?${params.toString()}` : ''}`);
      setDeposits(depRes.data.deposits || []);
      setTotalDeposit(Number(depRes.data.totalDeposit || 0));
    } catch {
      setDeposits([]);
      setTotalDeposit(0);
    }
    await fetchRegisteredUsers();
    setLoading(false);
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

  useEffect(() => {
    if (!addModal) return;
    setClientsLoading(true);
    fetchRegisteredUsers()
      .then((list) => {
        setSelectedRegisteredUserId((prev) => (prev && list.some((u) => u.id === prev) ? prev : ''));
      })
      .finally(() => setClientsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addModal]);

  useEffect(() => {
    if (!editDeposit) return;
    setClientsLoading(true);
    fetchRegisteredUsers()
      .then((list) => {
        setEditRegisteredUserId((prev) => (prev && list.some((u) => u.id === prev) ? prev : editDeposit.registeredUserId));
      })
      .finally(() => setClientsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDeposit]);

  const resetAddForm = () => {
    setSelectedRegisteredUserId('');
    setAmount('');
  };

  const resetEditForm = () => {
    setEditDeposit(null);
    setEditRegisteredUserId('');
    setEditAmount('');
  };

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
      resetAddForm();
      fetchData(search);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to add deposit'));
    } finally {
      setSaving(false);
    }
  };

  const openEditDeposit = (deposit: DepositRow) => {
    setEditDeposit(deposit);
    setEditRegisteredUserId(deposit.registeredUserId);
    setEditAmount(String(deposit.amount));
  };

  const handleEditDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeposit || !editRegisteredUserId || !editAmount) return;
    try {
      setEditSaving(true);
      await api.patch(`/deposits/${editDeposit.id}`, {
        registeredUserId: editRegisteredUserId,
        amount: Number(editAmount),
      });
      resetEditForm();
      fetchData(search);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to update deposit'));
    } finally {
      setEditSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
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
              className="rounded-lg bg-secondary px-4 py-2 font-medium text-secondary-foreground hover:bg-secondary/90"
            >
              + Add Deposit
            </button>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">Total deposit</p>
              <p className="text-2xl font-bold text-gray-900">৳{totalDeposit.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Search by client name</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type client name..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[32%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                    Client
                  </th>
                  <th className="w-[28%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                    Mobile
                  </th>
                  <th className="w-[18%] px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-600 uppercase">
                    Amount
                  </th>
                  <th className="w-[22%] px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : deposits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No deposits found.
                    </td>
                  </tr>
                ) : (
                  deposits.map((d) => (
                    <tr
                      key={d.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailDeposit(d)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailDeposit(d);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                    >
                      <td className="truncate px-4 py-3 text-sm font-medium text-gray-900">{d.clientName}</td>
                      <td className="truncate px-4 py-3 text-sm text-gray-700">{d.mobileNumber || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-700">
                        ৳{Number(d.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDeposit(d);
                          }}
                          className="text-sm font-medium text-secondary hover:text-secondary/80"
                        >
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

        {addModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <h4 className="mb-4 text-lg font-semibold text-gray-900">Add Deposit</h4>
              <form onSubmit={handleAddDeposit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Registered client</label>
                  <select
                    value={selectedRegisteredUserId}
                    onChange={(e) => setSelectedRegisteredUserId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                    disabled={clientsLoading}
                  >
                    <option value="">
                      {clientsLoading
                        ? 'Loading clients…'
                        : registeredUsers.length === 0
                          ? 'No registered clients — add one on Register User'
                          : 'Select client'}
                    </option>
                    {registeredUsers.map((u) => {
                      const label = [u.name, u.mobileNumber].filter(Boolean).join(' · ');
                      return (
                        <option key={u.id} value={u.id}>
                          {label || u.id}
                        </option>
                      );
                    })}
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
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModal(false);
                      resetAddForm();
                    }}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editDeposit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <h4 className="mb-4 text-lg font-semibold text-gray-900">Edit Deposit</h4>
              <form onSubmit={handleEditDeposit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Registered client</label>
                  <select
                    value={editRegisteredUserId}
                    onChange={(e) => setEditRegisteredUserId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                    disabled={clientsLoading}
                  >
                    <option value="">
                      {clientsLoading
                        ? 'Loading clients…'
                        : registeredUsers.length === 0
                          ? 'No registered clients — add one on Register User'
                          : 'Select client'}
                    </option>
                    {registeredUsers.map((u) => {
                      const label = [u.name, u.mobileNumber].filter(Boolean).join(' · ');
                      return (
                        <option key={u.id} value={u.id}>
                          {label || u.id}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Price</label>
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
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetEditForm}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
                  >
                    {editSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {detailDeposit && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => setDetailDeposit(null)}
          >
            <div
              className="max-h-[min(90vh,calc(100%-2rem))] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deposit-detail-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <h4 id="deposit-detail-title" className="text-lg font-semibold text-gray-900">
                  Client details
                </h4>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                    detailDeposit.bedAssignmentStatus === 'assigned'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {detailDeposit.bedAssignmentStatus === 'assigned' ? 'Assigned' : 'Unassigned'}
                </span>
              </div>
              <div className="mt-4 space-y-4 text-sm">
                  <div className="grid gap-1">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium text-gray-900">
                      {detailDeposit.userDetail?.name ?? detailDeposit.clientName}
                    </span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-gray-500">Mobile</span>
                    <span className="text-gray-900">
                      {detailDeposit.userDetail?.mobileNumber || detailDeposit.mobileNumber || '—'}
                    </span>
                  </div>
                  {detailDeposit.userDetail?.nidFrontUrl ? (
                    <div className="grid gap-1">
                      <span className="text-gray-500">NID (front)</span>
                      <a
                        href={detailDeposit.userDetail.nidFrontUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:no-underline"
                      >
                        Open image
                      </a>
                    </div>
                  ) : null}
                  {detailDeposit.userDetail?.nidBackUrl ? (
                    <div className="grid gap-1">
                      <span className="text-gray-500">NID (back)</span>
                      <a
                        href={detailDeposit.userDetail.nidBackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:no-underline"
                      >
                        Open image
                      </a>
                    </div>
                  ) : null}
                  {detailDeposit.userDetail?.createdAt ? (
                    <div className="grid gap-1">
                      <span className="text-gray-500">Registered on</span>
                      <span className="text-gray-900">{formatDate(detailDeposit.userDetail.createdAt)}</span>
                    </div>
                  ) : null}

                  <div className="border-t border-gray-200 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Deposit</p>
                    <div className="grid gap-2">
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Amount</span>
                        <span className="font-medium text-gray-900">৳{Number(detailDeposit.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Recorded</span>
                        <span className="text-gray-900">{formatDate(detailDeposit.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {detailDeposit.bedAssignmentStatus === 'assigned' &&
                  detailDeposit.assignmentLocations.length > 0 ? (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Bed assignment
                      </p>
                      <ul className="space-y-4">
                        {detailDeposit.assignmentLocations.map((loc, i) => (
                          <li
                            key={`${loc.buildingName}-${loc.bedNumber}-${i}`}
                            className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-gray-900"
                          >
                            <ul className="space-y-1">
                              <li>
                                <span className="text-gray-500">Building: </span>
                                {loc.buildingName || '—'}
                              </li>
                              <li>
                                <span className="text-gray-500">Unit: </span>
                                {loc.unitNumber || '—'}
                              </li>
                              <li>
                                <span className="text-gray-500">Room: </span>
                                {loc.roomNumber || '—'}
                              </li>
                              <li>
                                <span className="text-gray-500">Bed: </span>
                                {loc.bedNumber || '—'}
                              </li>
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailDeposit(null)}
                  className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
