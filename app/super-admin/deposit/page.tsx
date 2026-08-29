'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { confirmAction, notifyError, notifySuccess } from '@/lib/notify';
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
  cleared: boolean;
  createdAt: string;
  roomId?: string;
  bedId?: string;
  roomNumber?: string;
  bedNumber?: string;
  bedAssignmentStatus: 'assigned' | 'unassigned';
  assignmentLocations: AssignmentLocation[];
  userDetail: UserDetail | null;
};

type RegisteredUser = {
  id: string;
  name: string;
  mobileNumber?: string;
  roomId?: string;
  activeBedId?: string | null;
};

type RoomOption = {
  id: string;
  roomNumber: string;
  label: string;
};

type BedOption = {
  id: string;
  bedNumber: string;
};

function asOptionalId(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

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
      const roomId = asOptionalId(u.roomId ?? u.room_id);
      const bedRaw = u.activeBedId ?? u.active_bed_id;
      const activeBedId = typeof bedRaw === 'string' && bedRaw.trim() ? bedRaw.trim() : null;
      return { id, name, mobileNumber, roomId, activeBedId };
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

const PAGE_SIZE = 10;

function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

function slicePage<T>(items: T[], page: number) {
  const totalPages = pageCount(items.length);
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function PaginationBar({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const totalPages = pageCount(total);
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * PAGE_SIZE + 1;
  const end = Math.min(current * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={
              p === current
                ? 'rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground'
                : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50'
            }
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= totalPages}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function DepositPage() {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [search, setSearch] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [clearedPage, setClearedPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [detailDeposit, setDetailDeposit] = useState<DepositRow | null>(null);
  const [editDeposit, setEditDeposit] = useState<DepositRow | null>(null);

  const [selectedRegisteredUserId, setSelectedRegisteredUserId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [editRegisteredUserId, setEditRegisteredUserId] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [editBedId, setEditBedId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [addBeds, setAddBeds] = useState<BedOption[]>([]);
  const [editBeds, setEditBeds] = useState<BedOption[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [addBedsLoading, setAddBedsLoading] = useState(false);
  const [editBedsLoading, setEditBedsLoading] = useState(false);

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

  const pendingDeposits = useMemo(() => deposits.filter((d) => !d.cleared), [deposits]);
  const clearedDeposits = useMemo(() => deposits.filter((d) => d.cleared), [deposits]);

  useEffect(() => {
    setPendingPage(1);
    setClearedPage(1);
  }, [search]);

  useEffect(() => {
    const maxPage = pageCount(pendingDeposits.length);
    if (pendingPage > maxPage) setPendingPage(maxPage);
  }, [pendingDeposits.length, pendingPage]);

  useEffect(() => {
    const maxPage = pageCount(clearedDeposits.length);
    if (clearedPage > maxPage) setClearedPage(maxPage);
  }, [clearedDeposits.length, clearedPage]);

  const pendingRows = slicePage(pendingDeposits, pendingPage);
  const clearedRows = slicePage(clearedDeposits, clearedPage);

  const applyClientLocation = (
    userId: string,
    users: RegisteredUser[],
    setRoomId: (id: string) => void,
    setBedId: (id: string) => void,
  ) => {
    const user = users.find((u) => u.id === userId);
    setRoomId(user?.roomId || '');
    setBedId(user?.activeBedId || '');
  };

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
        if (!editDeposit.roomId) {
          applyClientLocation(editDeposit.registeredUserId, list, setEditRoomId, setEditBedId);
        }
      })
      .finally(() => setClientsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDeposit]);

  useEffect(() => {
    if (!addModal && !editDeposit) {
      setRooms([]);
      return;
    }
    let cancelled = false;
    setRoomsLoading(true);
    Promise.all([api.get('/rooms'), api.get('/hostels')])
      .then(([roomsRes, hostelsRes]) => {
        if (cancelled) return;
        const hostelNameById = new Map<string, string>(
          ((hostelsRes.data.hostels || []) as Array<{ id?: string; _id?: string; name?: string }>).map((h) => [
            String(h.id || h._id || ''),
            h.name || '',
          ]),
        );
        const list: RoomOption[] = ((roomsRes.data.rooms || []) as Array<{
          id?: string;
          _id?: string;
          roomNumber?: string;
          hostelId?: string;
        }>).map((r) => {
          const id = String(r.id || r._id || '');
          const roomNumber = String(r.roomNumber || '');
          const hostelName = hostelNameById.get(String(r.hostelId || '')) || '';
          return {
            id,
            roomNumber,
            label: hostelName ? `${roomNumber} (${hostelName})` : roomNumber,
          };
        }).filter((r) => r.id);
        setRooms(list);
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addModal, editDeposit]);

  useEffect(() => {
    if (!addModal || !selectedRoomId) {
      setAddBeds([]);
      setAddBedsLoading(false);
      return;
    }
    let cancelled = false;
    setAddBedsLoading(true);
    api
      .get(`/rooms/${selectedRoomId}/beds`)
      .then((res) => {
        if (!cancelled) setAddBeds((res.data.beds || []) as BedOption[]);
      })
      .catch(() => {
        if (!cancelled) setAddBeds([]);
      })
      .finally(() => {
        if (!cancelled) setAddBedsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addModal, selectedRoomId]);

  useEffect(() => {
    if (!editDeposit || !editRoomId) {
      setEditBeds([]);
      setEditBedsLoading(false);
      return;
    }
    let cancelled = false;
    setEditBedsLoading(true);
    api
      .get(`/rooms/${editRoomId}/beds`)
      .then((res) => {
        if (!cancelled) setEditBeds((res.data.beds || []) as BedOption[]);
      })
      .catch(() => {
        if (!cancelled) setEditBeds([]);
      })
      .finally(() => {
        if (!cancelled) setEditBedsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editDeposit, editRoomId]);

  const resetAddForm = () => {
    setSelectedRegisteredUserId('');
    setSelectedRoomId('');
    setSelectedBedId('');
    setAmount('');
    setAddBeds([]);
  };

  const resetEditForm = () => {
    setEditDeposit(null);
    setEditRegisteredUserId('');
    setEditRoomId('');
    setEditBedId('');
    setEditAmount('');
    setEditBeds([]);
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegisteredUserId || !selectedRoomId || !selectedBedId || !amount) return;
    try {
      setSaving(true);
      await api.post('/deposits', {
        registeredUserId: selectedRegisteredUserId,
        roomId: selectedRoomId,
        bedId: selectedBedId,
        amount: Number(amount),
      });
      setAddModal(false);
      resetAddForm();
      fetchData(search);
      notifySuccess('Deposit added successfully.');
    } catch (err: unknown) {
      notifyError(getErrorMessage(err, 'Failed to add deposit'));
    } finally {
      setSaving(false);
    }
  };

  const openEditDeposit = (deposit: DepositRow) => {
    setEditDeposit(deposit);
    setEditRegisteredUserId(deposit.registeredUserId);
    setEditRoomId(deposit.roomId || '');
    setEditBedId(deposit.bedId || '');
    setEditAmount(String(deposit.amount));
  };

  const handleEditDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeposit || !editRegisteredUserId || !editRoomId || !editBedId || !editAmount) return;
    try {
      setEditSaving(true);
      await api.patch(`/deposits/${editDeposit.id}`, {
        registeredUserId: editRegisteredUserId,
        roomId: editRoomId,
        bedId: editBedId,
        amount: Number(editAmount),
      });
      resetEditForm();
      fetchData(search);
      notifySuccess('Deposit updated successfully.');
    } catch (err: unknown) {
      notifyError(getErrorMessage(err, 'Failed to update deposit'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleClearDeposit = async (deposit: DepositRow) => {
    if (deposit.cleared) return;
    const confirmed = await confirmAction({
      title: 'Mark this deposit as cleared?',
      message: `Clear the deposit for ${deposit.clientName}? This will remove it from the total deposit amount.`,
      confirmLabel: 'Mark cleared',
      danger: true,
    });
    if (!confirmed) return;
    try {
      setClearingId(deposit.id);
      await api.patch(`/deposits/${deposit.id}`, { cleared: true });
      setDeposits((prev) =>
        prev.map((d) => (d.id === deposit.id ? { ...d, cleared: true } : d)),
      );
      setTotalDeposit((prev) => Math.max(0, prev - Number(deposit.amount || 0)));
      if (detailDeposit?.id === deposit.id) {
        setDetailDeposit((prev) => (prev ? { ...prev, cleared: true } : prev));
      }
      fetchData(search);
      notifySuccess(`Deposit for ${deposit.clientName} marked as cleared.`);
    } catch (err: unknown) {
      notifyError(getErrorMessage(err, 'Failed to mark deposit as cleared'));
      fetchData(search);
    } finally {
      setClearingId(null);
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

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Pending clearance</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-[22%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Client
                    </th>
                    <th className="w-[18%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Mobile
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Room
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Bed
                    </th>
                    <th className="w-[14%] px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-600 uppercase">
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
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : pendingDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No pending deposits.
                      </td>
                    </tr>
                  ) : (
                    pendingRows.map((d) => (
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
                        <td className="truncate px-4 py-3 text-sm text-gray-700">{d.roomNumber || '—'}</td>
                        <td className="truncate px-4 py-3 text-sm text-gray-700">{d.bedNumber || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-700">
                          ৳{Number(d.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-3">
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
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearDeposit(d);
                              }}
                              disabled={clearingId === d.id}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            >
                              {clearingId === d.id ? 'Clearing…' : 'Clearance'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={pendingPage} total={pendingDeposits.length} onPageChange={setPendingPage} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Cleared clients</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-[22%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Client
                    </th>
                    <th className="w-[18%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Mobile
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Room
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      Bed
                    </th>
                    <th className="w-[14%] px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-600 uppercase">
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
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : clearedDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No cleared deposits.
                      </td>
                    </tr>
                  ) : (
                    clearedRows.map((d) => (
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
                        <td className="truncate px-4 py-3 text-sm text-gray-700">{d.roomNumber || '—'}</td>
                        <td className="truncate px-4 py-3 text-sm text-gray-700">{d.bedNumber || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-700">
                          ৳{Number(d.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-3">
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
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Cleared
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={clearedPage} total={clearedDeposits.length} onPageChange={setClearedPage} />
          </div>
        </section>

        {addModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <h4 className="mb-4 text-lg font-semibold text-gray-900">Add Deposit</h4>
              <form onSubmit={handleAddDeposit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Registered client</label>
                  <select
                    value={selectedRegisteredUserId}
                    onChange={(e) => {
                      const userId = e.target.value;
                      setSelectedRegisteredUserId(userId);
                      applyClientLocation(userId, registeredUsers, setSelectedRoomId, setSelectedBedId);
                    }}
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
                  <label className="block text-sm font-medium text-gray-900">Room</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => {
                      setSelectedRoomId(e.target.value);
                      setSelectedBedId('');
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
                    required
                    disabled={!selectedRegisteredUserId || roomsLoading}
                  >
                    <option value="">
                      {!selectedRegisteredUserId
                        ? 'Select client first'
                        : roomsLoading
                          ? 'Loading rooms…'
                          : rooms.length === 0
                            ? 'No rooms found'
                            : 'Select room'}
                    </option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.label || room.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Bed</label>
                  <select
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
                    required
                    disabled={!selectedRoomId || addBedsLoading}
                  >
                    <option value="">
                      {!selectedRoomId
                        ? 'Select room first'
                        : addBedsLoading
                          ? 'Loading beds…'
                          : addBeds.length === 0
                            ? 'No beds in this room'
                            : 'Select bed'}
                    </option>
                    {addBeds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        {bed.bedNumber}
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
                    onChange={(e) => {
                      const userId = e.target.value;
                      setEditRegisteredUserId(userId);
                      applyClientLocation(userId, registeredUsers, setEditRoomId, setEditBedId);
                    }}
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
                  <label className="block text-sm font-medium text-gray-900">Room</label>
                  <select
                    value={editRoomId}
                    onChange={(e) => {
                      setEditRoomId(e.target.value);
                      setEditBedId('');
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
                    required
                    disabled={!editRegisteredUserId || roomsLoading}
                  >
                    <option value="">
                      {!editRegisteredUserId
                        ? 'Select client first'
                        : roomsLoading
                          ? 'Loading rooms…'
                          : rooms.length === 0
                            ? 'No rooms found'
                            : 'Select room'}
                    </option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.label || room.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Bed</label>
                  <select
                    value={editBedId}
                    onChange={(e) => setEditBedId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
                    required
                    disabled={!editRoomId || editBedsLoading}
                  >
                    <option value="">
                      {!editRoomId
                        ? 'Select room first'
                        : editBedsLoading
                          ? 'Loading beds…'
                          : editBeds.length === 0
                            ? 'No beds in this room'
                            : 'Select bed'}
                    </option>
                    {editBeds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        {bed.bedNumber}
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
                        <span className="text-gray-500">Room</span>
                        <span className="text-gray-900">{detailDeposit.roomNumber || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Bed</span>
                        <span className="text-gray-900">{detailDeposit.bedNumber || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Amount</span>
                        <span className="font-medium text-gray-900">৳{Number(detailDeposit.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Recorded</span>
                        <span className="text-gray-900">{formatDate(detailDeposit.createdAt)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Clearance</span>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            detailDeposit.cleared
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700',
                          )}
                        >
                          {detailDeposit.cleared ? 'Cleared' : 'Pending'}
                        </span>
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
