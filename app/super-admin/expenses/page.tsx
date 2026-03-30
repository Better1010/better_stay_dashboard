'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type Category = { id: string; name: string };
type Building = { id: string; name: string };
type Unit = { id: string; hostelId: string; hostelName?: string; unitNumber: string; floor: number };

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message && typeof res.data.message === 'string') return res.data.message;
  }
  return fallback;
}

type Expense = {
  id: string;
  unitId: string;
  hostelId: string;
  unitNumber: string;
  unitFloor: number;
  hostelName: string;
  expenseName: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  expenseDate: string;
  notes: string;
  createdAt: string;
};

export default function SuperAdminExpensesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [unitsForAdd, setUnitsForAdd] = useState<Unit[]>([]);
  const [unitsForFilter, setUnitsForFilter] = useState<Unit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryName, setCategoryName] = useState('');
  const [addBuildingId, setAddBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [filterUnitId, setFilterUnitId] = useState('');

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editBuildingId, setEditBuildingId] = useState('');
  const [editUnits, setEditUnits] = useState<Unit[]>([]);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editExpenseDate, setEditExpenseDate] = useState('');
  const [editUnitId, setEditUnitId] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openEditExpense = (exp: Expense) => {
    setEditExpense(exp);
    setEditBuildingId(exp.hostelId);
    setEditUnitId(exp.unitId);
    setEditExpenseName(exp.expenseName);
    setEditCategoryId(exp.categoryId);
    setEditAmount(String(exp.amount));
    setEditExpenseDate(exp.expenseDate ? exp.expenseDate.slice(0, 10) : '');
    if (exp.hostelId) {
      api.get(`/units?hostelId=${exp.hostelId}`).then((r) => setEditUnits(r.data?.units ?? [])).catch(() => setEditUnits([]));
    } else {
      setEditUnits([]);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpense) return;
    try {
      await api.patch(`/expenses/${editExpense.id}`, {
        expenseName: editExpenseName.trim(),
        categoryId: editCategoryId,
        amount: Number(editAmount),
        expenseDate: editExpenseDate,
        unitId: editUnitId,
      });
      setEditExpense(null);
      showToast('Expense updated successfully');
      loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to update expense'));
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      showToast('Expense deleted successfully');
      loadData();
    } catch (err: unknown) {
      setDeleteConfirm(null);
      showToast(getErrorMessage(err, 'Failed to delete expense'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/expense-categories'),
      api.get('/hostels'),
      api.get('/expenses'),
    ])
      .then(([catRes, hostelsRes, expRes]) => {
        setCategories(catRes.data.categories || []);
        setBuildings(hostelsRes.data?.hostels?.map((h: { id?: string; _id?: string; name: string }) => ({ id: h.id || h._id || '', name: h.name })) || []);
        setExpenses(expRes.data.expenses || []);
      })
      .catch(() => {
        setCategories([]);
        setBuildings([]);
        setExpenses([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/expense-categories'),
      api.get('/hostels'),
      api.get('/expenses'),
    ])
      .then(([catRes, hostelsRes, expRes]) => {
        if (cancelled) return;
        setCategories(catRes.data.categories || []);
        setBuildings(hostelsRes.data?.hostels?.map((h: { id?: string; _id?: string; name: string }) => ({ id: h.id || h._id || '', name: h.name })) || []);
        setExpenses(expRes.data.expenses || []);
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
          setBuildings([]);
          setExpenses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!addBuildingId) {
      setUnitsForAdd([]);
      setUnitId('');
      return;
    }
    api.get(`/units?hostelId=${addBuildingId}`).then((r) => {
      setUnitsForAdd(r.data?.units ?? []);
      setUnitId('');
    }).catch(() => setUnitsForAdd([]));
  }, [addBuildingId]);

  useEffect(() => {
    if (!filterBuildingId) {
      setUnitsForFilter([]);
      setFilterUnitId('');
      return;
    }
    api.get(`/units?hostelId=${filterBuildingId}`).then((r) => {
      setUnitsForFilter(r.data?.units ?? []);
      setFilterUnitId('');
    }).catch(() => setUnitsForFilter([]));
  }, [filterBuildingId]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    try {
      await api.post('/expense-categories', { name });
      setCategoryName('');
      loadData();
      showToast('Category added successfully');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to add category'));
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBuildingId || !unitId || !expenseName.trim() || !categoryId || !amount || !expenseDate) {
      alert('Please select Building, Unit, Category, Description, Amount and Date');
      return;
    }
    try {
      await api.post('/expenses', {
        unitId,
        expenseName: expenseName.trim(),
        categoryId,
        amount: Number(amount),
        expenseDate,
      });
      setExpenseName('');
      setAmount('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to add expense'));
    }
  };

  const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString() : '');

  const filteredExpenses = expenses.filter(
    (e) =>
      (!filterBuildingId || e.hostelId === filterBuildingId) &&
      (!filterUnitId || e.unitId === filterUnitId)
  );

  const pieColors = ['#60aa70', '#ec7362', '#111827', '#6B7280', '#9CA3AF', '#F59E0B', '#6366F1', '#10B981'];

  const expenseChartData = useMemo(() => {
    const totalsByCategory = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      const key = expense.categoryName || 'Uncategorized';
      acc[key] = (acc[key] ?? 0) + Number(expense.amount || 0);
      return acc;
    }, {});

    return Object.entries(totalsByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const totalChartAmount = expenseChartData.reduce((sum, item) => sum + item.value, 0);

  const getPiePath = (startAngle: number, endAngle: number, radius = 80, cx = 100, cy = 100) => {
    const startRadians = ((startAngle - 90) * Math.PI) / 180;
    const endRadians = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRadians);
    const y1 = cy + radius * Math.sin(startRadians);
    const x2 = cx + radius * Math.cos(endRadians);
    const y2 = cy + radius * Math.sin(endRadians);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="mx-auto w-full max-w-7xl px-1 sm:px-2">
        {toast && (
          <div
            role="alert"
            className={`fixed right-4 top-4 z-60 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === 'error' ? 'bg-secondary' : 'bg-primary'
            }`}
          >
            {toast.message}
          </div>
        )}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-primary/10 via-white to-secondary/10 p-5 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Expense</h2>
          <p className="mt-1 text-sm text-gray-600">Track, manage, and review expense activities by building and unit.</p>
        </div>

        {/* Add Expense Category */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Expense Category</h3>
          <form onSubmit={handleAddCategory} className="flex gap-3 flex-wrap items-end">
            <div className="min-w-[220px] flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category name</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                placeholder="e.g. Maintenance, Utilities"
              />
            </div>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition hover:bg-primary/90">
              Add Category
            </button>
          </form>
        </div>

        {/* Add Expense */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Expense</h3>
          <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
              <select
                value={addBuildingId}
                onChange={(e) => setAddBuildingId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                required
              >
                <option value="">Select building first</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                required
                disabled={!addBuildingId}
              >
                <option value="">Select unit</option>
                {unitsForAdd.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber} (Floor {u.floor})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                placeholder="e.g. Plumbing repair"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                required
              />
            </div>
            <div className="flex items-end md:col-span-2 lg:col-span-1">
              <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition hover:bg-primary/90 lg:w-auto">
                Add Expense
              </button>
            </div>
          </form>
        </div>

        {/* Expense list table */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Category Breakdown</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading chart...</div>
          ) : expenseChartData.length === 0 || totalChartAmount <= 0 ? (
            <div className="text-sm text-gray-500">No expense data available for chart.</div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
              <div className="flex justify-center">
                <svg width="220" height="220" viewBox="0 0 200 200" aria-label="Expense category pie chart" className="max-w-full">
                  {expenseChartData.map((item, idx) => {
                    const previousValue = expenseChartData
                      .slice(0, idx)
                      .reduce((sum, current) => sum + current.value, 0);
                    const startAngle = (previousValue / totalChartAmount) * 360;
                    const endAngle = ((previousValue + item.value) / totalChartAmount) * 360;
                    return (
                      <path
                        key={item.name}
                        d={getPiePath(startAngle, endAngle)}
                        fill={pieColors[idx % pieColors.length]}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                  <circle cx="100" cy="100" r="42" fill="#FFFFFF" />
                  <text x="100" y="96" textAnchor="middle" className="fill-gray-500 text-[10px]">
                    Total
                  </text>
                  <text x="100" y="112" textAnchor="middle" className="fill-primary text-[11px] font-semibold">
                    ${totalChartAmount.toFixed(2)}
                  </text>
                </svg>
              </div>
              <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3 sm:p-4">
                {expenseChartData.map((item, idx) => {
                  const percentage = totalChartAmount > 0 ? (item.value / totalChartAmount) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: pieColors[idx % pieColors.length] }}
                        />
                        <span className="text-sm text-gray-700 truncate">{item.name}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        ${item.value.toFixed(2)} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expense list table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-end gap-4 border-b border-gray-200 p-4 sm:p-5">
            <h3 className="mr-4 text-lg font-semibold text-gray-900">Expense list</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Building</label>
                <select
                  value={filterBuildingId}
                  onChange={(e) => setFilterBuildingId(e.target.value)}
                  className="block min-w-[140px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                >
                  <option value="">All buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                <select
                  value={filterUnitId}
                  onChange={(e) => setFilterUnitId(e.target.value)}
                  className="block min-w-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                  disabled={!filterBuildingId}
                >
                  <option value="">All units</option>
                  {unitsForFilter.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Building</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {expenses.length === 0
                        ? 'No expenses yet. Add a category and an expense above.'
                        : 'No expenses match the selected building/unit.'}
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{e.hostelName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {e.unitNumber} (Floor {e.unitFloor})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{e.expenseName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.categoryName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ${Number(e.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(e.expenseDate)}</td>
                      <td className="space-x-3 whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => openEditExpense(e)}
                          className="text-primary hover:text-primary/80"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(e)}
                          className="text-secondary hover:text-secondary/80"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Edit Expense Modal */}
        {editExpense && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Edit Expense</h4>
              <form onSubmit={handleEditExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Building</label>
                  <select
                    value={editBuildingId}
                    onChange={(ev) => {
                      const id = ev.target.value;
                      setEditBuildingId(id);
                      if (id) {
                        api.get(`/units?hostelId=${id}`).then((r) => setEditUnits(r.data?.units ?? [])).catch(() => setEditUnits([]));
                      } else setEditUnits([]);
                      setEditUnitId('');
                    }}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                    required
                  >
                    <option value="">Select building</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Unit</label>
                  <select
                    value={editUnitId}
                    onChange={(ev) => setEditUnitId(ev.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                    required
                    disabled={!editBuildingId}
                  >
                    <option value="">Select unit</option>
                    {editUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unitNumber} (Floor {u.floor})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Description</label>
                  <input
                    type="text"
                    value={editExpenseName}
                    onChange={(ev) => setEditExpenseName(ev.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(ev) => setEditCategoryId(ev.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editAmount}
                    onChange={(ev) => setEditAmount(ev.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Date</label>
                  <input
                    type="date"
                    value={editExpenseDate}
                    onChange={(ev) => setEditExpenseDate(ev.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditExpense(null)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Expense Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h4 className="text-lg font-semibold mb-2 text-gray-900">Delete Expense</h4>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete expense <strong>&quot;{deleteConfirm.expenseName}&quot;</strong>?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteExpense}
                  disabled={deleting}
                  className="rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/90 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
