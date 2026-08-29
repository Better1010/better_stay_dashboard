'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { confirmAction, notifyError, notifySuccess } from '@/lib/notify';

const editBtnClass =
  'border-0 bg-transparent p-0 text-sm font-medium text-secondary shadow-none hover:text-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35 focus-visible:ring-offset-0';

type IncomeRow = {
  bedId: string;
  assignmentId?: string;
  registeredUserId?: string;
  hostelId?: string;
  unitId?: string;
  roomId?: string;
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
  totalDue: number;
  billingStartMonth: number;
  billingStartYear: number;
};

type UnitOption = {
  id: string;
  unitNumber: string;
};

type RoomOption = {
  id: string;
  roomNumber: string;
};

type BedOption = {
  id: string;
  bedNumber: string;
  basePrice?: number;
  isOccupied?: boolean;
  registeredUserId?: string | null;
  assigneeName?: string | null;
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message && typeof res.data.message === 'string') return res.data.message;
  }
  return fallback;
}

function mergeRooms(items: RoomOption[], current?: { id: string; roomNumber: string } | null) {
  if (!current?.id) return items;
  if (items.some((item) => item.id === current.id)) return items;
  return [{ id: current.id, roomNumber: current.roomNumber }, ...items];
}

function mergeBeds(items: BedOption[], current?: { id: string; bedNumber: string; basePrice?: number } | null) {
  if (!current?.id) return items;
  if (items.some((item) => item.id === current.id)) return items;
  return [{ id: current.id, bedNumber: current.bedNumber, basePrice: current.basePrice }, ...items];
}

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

const monthYearKey = (year: number, month: number) => year * 12 + month;

const isMonthPayable = (
  month: number,
  year: number,
  billingStart: { month: number; year: number },
  endYear: number,
  endMonth: number
) => {
  const key = monthYearKey(year, month);
  return key >= monthYearKey(billingStart.year, billingStart.month) && key <= monthYearKey(endYear, endMonth);
};

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
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<IncomeRow | null>(null);
  const [payMonth, setPayMonth] = useState(now.getMonth() + 1);
  const [payYear, setPayYear] = useState(now.getFullYear());
  const [payAmount, setPayAmount] = useState(0);
  const [paying, setPaying] = useState(false);
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [paymentMonths, setPaymentMonths] = useState<PaymentMonthSummary[]>([]);
  const [loadingPaidMonths, setLoadingPaidMonths] = useState(false);
  const [billingStartMonth, setBillingStartMonth] = useState(1);
  const [billingStartYear, setBillingStartYear] = useState(now.getFullYear());
  const [payableEndMonth, setPayableEndMonth] = useState(now.getMonth() + 1);
  const [payableEndYear, setPayableEndYear] = useState(now.getFullYear());
  const [editRow, setEditRow] = useState<IncomeRow | null>(null);
  const [editHostelId, setEditHostelId] = useState('');
  const [editUnitId, setEditUnitId] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [editBedId, setEditBedId] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editStatus, setEditStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [editUnits, setEditUnits] = useState<UnitOption[]>([]);
  const [editRooms, setEditRooms] = useState<RoomOption[]>([]);
  const [editBeds, setEditBeds] = useState<BedOption[]>([]);
  const [editOptionsLoading, setEditOptionsLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

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
      setTotalDue(Number(res.data.totalDue || 0));
    } catch {
      setRows([]);
      setTotalIncome(0);
      setTotalDue(0);
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
      setBillingStartMonth(Number(res.data.billingStartMonth || 1));
      setBillingStartYear(Number(res.data.billingStartYear || now.getFullYear()));
      setPayableEndMonth(Number(res.data.currentMonth || now.getMonth() + 1));
      setPayableEndYear(Number(res.data.currentYear || now.getFullYear()));
    } catch {
      setPaidMonths([]);
      setPaymentMonths([]);
    } finally {
      setLoadingPaidMonths(false);
    }
  };

  const openPayModal = (row: IncomeRow) => {
    const billingStart = {
      month: row.billingStartMonth || 1,
      year: row.billingStartYear || now.getFullYear(),
    };
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;
    let defaultYear = endYear;
    let defaultMonth = endMonth;
    if (isMonthPayable(month, year, billingStart, endYear, endMonth)) {
      defaultYear = year;
      defaultMonth = month;
    } else if (!isMonthPayable(defaultMonth, defaultYear, billingStart, endYear, endMonth)) {
      defaultYear = billingStart.year;
      defaultMonth = billingStart.month;
    }
    setPayModal(row);
    setPayMonth(defaultMonth);
    setPayYear(defaultYear);
    setPayAmount(0);
    setBillingStartMonth(billingStart.month);
    setBillingStartYear(billingStart.year);
    setPayableEndMonth(endMonth);
    setPayableEndYear(endYear);
    fetchPaidMonths(row.bedId, defaultYear);
  };

  useEffect(() => {
    if (!payModal) return;
    fetchPaidMonths(payModal.bedId, payYear);
  }, [payYear, payModal]);

  useEffect(() => {
    if (!payModal) return;
    const billingStart = { month: billingStartMonth, year: billingStartYear };
    if (isMonthPayable(payMonth, payYear, billingStart, payableEndYear, payableEndMonth)) return;
    const firstPayable = months.find((entry) =>
      isMonthPayable(entry.value, payYear, billingStart, payableEndYear, payableEndMonth)
    );
    if (firstPayable) {
      setPayMonth(firstPayable.value);
    }
  }, [payYear, payModal, billingStartMonth, billingStartYear, payableEndMonth, payableEndYear, payMonth]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    if (!isSelectedMonthPayable) {
      notifyError('Payment is not available for this month.');
      return;
    }
    const remainingTotalDue = Number(payModal.totalDue || 0);
    if (remainingTotalDue <= 0) {
      notifyError('No due amount remaining for this bed.');
      return;
    }
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      notifyError('Please enter a valid payment amount.');
      return;
    }
    if (payAmount > remainingTotalDue) {
      notifyError(`Entered amount is greater than total due of ৳${remainingTotalDue.toFixed(2)}.`);
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
      notifyError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const handleDeletePayment = async (row: IncomeRow) => {
    if (!row.paymentId) return;
    const confirmed = await confirmAction({
      title: 'Delete this payment?',
      message: `Delete payment for ${months.find((m) => m.value === month)?.label} ${year} - Bed ${row.bedNumber}?`,
      confirmLabel: 'Delete payment',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/income-payments/${row.paymentId}`);
      fetchIncome();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to delete payment');
    }
  };

  const resetEditForm = () => {
    setEditRow(null);
    setEditHostelId('');
    setEditUnitId('');
    setEditRoomId('');
    setEditBedId('');
    setEditClientName('');
    setEditMobile('');
    setEditAmount('');
    setEditStatus('unpaid');
    setEditUnits([]);
    setEditRooms([]);
    setEditBeds([]);
    setEditSaving(false);
    setEditOptionsLoading(false);
  };

  const openEditRow = (row: IncomeRow) => {
    setEditRow(row);
    setEditHostelId(row.hostelId || '');
    setEditUnitId(row.unitId || '');
    setEditRoomId(row.roomId || '');
    setEditBedId(row.bedId || '');
    setEditClientName(row.assigneeName || '');
    setEditMobile(row.mobileNumber || '');
    setEditAmount(String(row.basePrice ?? ''));
    setEditStatus(row.status === 'paid' ? 'paid' : 'unpaid');
  };

  useEffect(() => {
    if (!editRow) return;
    if (!editHostelId) {
      setEditUnits([]);
      setEditUnitId('');
      setEditRooms([]);
      setEditRoomId('');
      setEditBeds([]);
      setEditBedId('');
      return;
    }
    let cancelled = false;
    setEditOptionsLoading(true);
    api
      .get(`/units?hostelId=${editHostelId}`)
      .then((res) => {
        if (cancelled) return;
        const nextUnits = (res.data.units || []) as UnitOption[];
        setEditUnits(nextUnits);
        if (editUnitId && !nextUnits.some((unit) => unit.id === editUnitId)) {
          setEditUnitId('');
          setEditRoomId('');
          setEditBedId('');
          setEditRooms([]);
          setEditBeds([]);
        }
      })
      .catch(() => {
        if (!cancelled) setEditUnits([]);
      })
      .finally(() => {
        if (!cancelled) setEditOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editRow, editHostelId]);

  useEffect(() => {
    if (!editRow || !editHostelId || !editUnitId) {
      if (editRow && (!editHostelId || !editUnitId)) {
        setEditRooms([]);
        setEditBeds([]);
      }
      return;
    }
    let cancelled = false;
    api
      .get(`/rooms?hostelId=${editHostelId}&unitId=${editUnitId}`)
      .then((res) => {
        if (cancelled) return;
        const nextRooms = mergeRooms((res.data.rooms || []) as RoomOption[], {
          id: editRow.unitId === editUnitId ? editRow.roomId || '' : '',
          roomNumber: editRow.roomNumber || '',
        });
        setEditRooms(nextRooms);
        if (editRoomId && !nextRooms.some((room) => room.id === editRoomId)) {
          setEditRoomId('');
          setEditBedId('');
          setEditBeds([]);
        }
      })
      .catch(() => {
        if (!cancelled) setEditRooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editRow, editHostelId, editUnitId]);

  useEffect(() => {
    if (!editRow || !editRoomId) {
      if (editRow && !editRoomId) setEditBeds([]);
      return;
    }
    let cancelled = false;
    api
      .get(`/rooms/${editRoomId}/beds`)
      .then((res) => {
        if (cancelled) return;
        const nextBeds = mergeBeds((res.data.beds || []) as BedOption[], {
          id: editRow.roomId === editRoomId ? editRow.bedId || '' : '',
          bedNumber: editRow.bedNumber || '',
          basePrice: editRow.basePrice,
        });
        setEditBeds(nextBeds);
        if (editBedId && !nextBeds.some((bed) => bed.id === editBedId)) {
          setEditBedId('');
        }
      })
      .catch(() => {
        if (!cancelled) setEditBeds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editRow, editRoomId]);

  const handleEditRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    if (!editClientName.trim()) {
      notifyError('Client name is required.');
      return;
    }
    if (!editHostelId || !editUnitId || !editRoomId || !editBedId) {
      notifyError('Please select building, unit, room and bed.');
      return;
    }
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      notifyError('Please enter a valid amount.');
      return;
    }
    try {
      setEditSaving(true);
      await api.patch(`/income/${editRow.bedId}`, {
        nextBedId: editBedId,
        assigneeName: editClientName.trim(),
        mobileNumber: editMobile.trim(),
        basePrice: amount,
        status: editStatus,
        originalStatus: editRow.status,
        month,
        year,
      });
      resetEditForm();
      fetchIncome();
      notifySuccess('Income row updated successfully.');
    } catch (err: unknown) {
      notifyError(getErrorMessage(err, 'Failed to update income row'));
    } finally {
      setEditSaving(false);
    }
  };

  const billingStart = useMemo(
    () => ({ month: billingStartMonth, year: billingStartYear }),
    [billingStartMonth, billingStartYear]
  );

  const payYears = useMemo(() => {
    const start = billingStartYear;
    const end = payableEndYear;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [billingStartYear, payableEndYear]);

  const isSelectedMonthPaid = useMemo(() => {
    return paidMonths.includes(payMonth);
  }, [paidMonths, payMonth]);

  const isSelectedMonthPayable = useMemo(() => {
    return isMonthPayable(payMonth, payYear, billingStart, payableEndYear, payableEndMonth);
  }, [payMonth, payYear, billingStart, payableEndYear, payableEndMonth]);

  const isMonthOptionDisabled = (monthValue: number) => {
    return !isMonthPayable(monthValue, payYear, billingStart, payableEndYear, payableEndMonth);
  };

  const remainingTotalDue = useMemo(() => {
    return Math.max(Number(payModal?.totalDue || 0), 0);
  }, [payModal]);

  const selectedPaidAmount = useMemo(() => {
    return Number(paymentMonths.find((entry) => entry.month === payMonth)?.amount || 0);
  }, [paymentMonths, payMonth]);

  const remainingDueBeforePayment = useMemo(() => {
    return Math.max(Number(payModal?.basePrice || 0) - selectedPaidAmount, 0);
  }, [payModal, selectedPaidAmount]);

  const totalDueAfterPayment = useMemo(() => {
    return Math.max(remainingTotalDue - Number(payAmount || 0), 0);
  }, [remainingTotalDue, payAmount]);

  const isAllDueCleared = remainingTotalDue <= 0;

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Income</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-end">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Total paid ({months.find((m) => m.value === month)?.label} {year})</p>
              <p className="text-2xl font-bold text-gray-900">৳{totalIncome.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Total due (till now)</p>
              <p className="text-2xl font-bold text-red-600">৳{totalDue.toFixed(2)}</p>
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
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
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                        ৳{Number(row.totalDue || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.status === 'paid' ? (
                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                            {Number(row.totalDue || 0) <= 0 ? 'All paid' : 'Paid'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button type="button" onClick={() => openEditRow(row)} className={editBtnClass}>
                            Edit
                          </button>
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
                          disabled={isMonthOptionDisabled(m.value)}
                        >
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {loadingPaidMonths ? (
                      <p className="mt-1 text-xs text-gray-500">Checking paid months…</p>
                    ) : isSelectedMonthPaid && remainingTotalDue > 0 ? (
                      <p className="mt-1 text-xs text-amber-600">
                        This month is fully paid. Your payment will clear other due months first.
                      </p>
                    ) : !isSelectedMonthPayable ? (
                      <p className="mt-1 text-xs text-red-600">Payment is not available before registration or for future months.</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select
                      value={payYear}
                      onChange={(e) => setPayYear(Number(e.target.value))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    >
                      {payYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Status</p>
                  {isAllDueCleared || totalDueAfterPayment <= 0 ? (
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">All paid</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Due</span>
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
                    max={remainingTotalDue}
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="Enter paid amount"
                    required
                    disabled={!isSelectedMonthPayable || isAllDueCleared}
                  />
                  {selectedPaidAmount > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Already paid for this month: ৳{selectedPaidAmount.toFixed(2)}
                      {remainingDueBeforePayment > 0}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2">
                  <div
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600"
                  >
                    Total due: ৳{totalDueAfterPayment.toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayModal(null)}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paying || !isSelectedMonthPayable || isAllDueCleared}
                    className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
                  >
                    {paying ? 'Saving...' : isAllDueCleared ? 'All paid' : 'Pay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <h4 className="mb-4 text-lg font-semibold text-gray-900">Edit income row</h4>
              <form onSubmit={handleEditRow} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Building</label>
                    <select
                      value={editHostelId}
                      onChange={(e) => {
                        setEditHostelId(e.target.value);
                        setEditUnitId('');
                        setEditRoomId('');
                        setEditBedId('');
                        setEditRooms([]);
                        setEditBeds([]);
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      required
                    >
                      <option value="">Select building</option>
                      {hostels.map((h: any) => (
                        <option key={h.id || h._id} value={h.id || h._id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Unit</label>
                    <select
                      value={editUnitId}
                      onChange={(e) => {
                        setEditUnitId(e.target.value);
                        setEditRoomId('');
                        setEditBedId('');
                        setEditBeds([]);
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                      disabled={!editHostelId}
                      required
                    >
                      <option value="">
                        {editHostelId && editUnits.length === 0 ? 'No units found' : 'Select unit'}
                      </option>
                      {editUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unitNumber}
                        </option>
                      ))}
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
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                      disabled={!editUnitId}
                      required
                    >
                      <option value="">
                        {editUnitId && editRooms.length === 0 ? 'No rooms found' : 'Select room'}
                      </option>
                      {editRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.roomNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Bed</label>
                    <select
                      value={editBedId}
                      onChange={(e) => {
                        const nextBedId = e.target.value;
                        setEditBedId(nextBedId);
                        const selected = editBeds.find((bed) => bed.id === nextBedId);
                        if (selected && nextBedId !== editRow.bedId && selected.basePrice != null) {
                          setEditAmount(String(selected.basePrice));
                        }
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:bg-gray-100"
                      disabled={!editRoomId}
                      required
                    >
                      <option value="">
                        {editRoomId && editBeds.length === 0 ? 'No beds found' : 'Select bed'}
                      </option>
                      {editBeds.map((bed) => {
                        const occupied = Boolean(bed.isOccupied || bed.registeredUserId || bed.assigneeName);
                        const isCurrent = bed.id === editRow.bedId;
                        return (
                          <option key={bed.id} value={bed.id} disabled={occupied && !isCurrent}>
                            {bed.bedNumber}
                            {occupied && !isCurrent ? ' (occupied)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Client</label>
                    <input
                      type="text"
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Mobile</label>
                    <input
                      type="text"
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      placeholder="e.g. 01XXXXXXXXX"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Due</label>
                    <input
                      type="text"
                      value={`৳${Number(editRow.totalDue || 0).toFixed(2)}`}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-900"
                      readOnly
                      disabled
                    />
                    <p className="mt-1 text-xs text-gray-500">Due is recalculated from amount and payments after save.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-900">
                      Status ({months.find((m) => m.value === month)?.label} {year})
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'paid' | 'unpaid')}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      required
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Paid records a full month payment for the selected month. Unpaid removes that month’s payment.
                    </p>
                  </div>
                </div>
                {editOptionsLoading ? (
                  <p className="text-sm text-gray-500">Loading assignment options…</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={resetEditForm} className="px-4 py-2 text-gray-600">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving || editOptionsLoading}
                    className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
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
