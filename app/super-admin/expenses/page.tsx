'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

type Category = { id: string; name: string };
type Unit = { id: string; hostelName: string; unitNumber: string; floor: number };

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
  const [units, setUnits] = useState<Unit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryName, setCategoryName] = useState('');
  const [unitId, setUnitId] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editExpenseDate, setEditExpenseDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editUnitId, setEditUnitId] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openEditExpense = (exp: Expense) => {
    setEditExpense(exp);
    setEditExpenseName(exp.expenseName);
    setEditCategoryId(exp.categoryId);
    setEditAmount(String(exp.amount));
    setEditExpenseDate(exp.expenseDate ? exp.expenseDate.slice(0, 10) : '');
    setEditNotes(exp.notes || '');
    setEditUnitId(exp.unitId);
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
        notes: editNotes.trim() || undefined,
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
      api.get('/units'),
      api.get('/expenses'),
    ])
      .then(([catRes, unitsRes, expRes]) => {
        setCategories(catRes.data.categories || []);
        setUnits(unitsRes.data.units || []);
        setExpenses(expRes.data.expenses || []);
      })
      .catch(() => {
        setCategories([]);
        setUnits([]);
        setExpenses([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/expense-categories'),
      api.get('/units'),
      api.get('/expenses'),
    ])
      .then(([catRes, unitsRes, expRes]) => {
        if (cancelled) return;
        setCategories(catRes.data.categories || []);
        setUnits(unitsRes.data.units || []);
        setExpenses(expRes.data.expenses || []);
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
          setUnits([]);
          setExpenses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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
    if (!unitId || !expenseName.trim() || !categoryId || !amount || !expenseDate) {
      alert('Please fill Unit, Expense name, Category, Amount and Date');
      return;
    }
    try {
      await api.post('/expenses', {
        unitId,
        expenseName: expenseName.trim(),
        categoryId,
        amount: Number(amount),
        expenseDate,
        notes: notes.trim() || undefined,
      });
      setExpenseName('');
      setAmount('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to add expense'));
    }
  };

  const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString() : '');

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div>
        {toast && (
          <div
            role="alert"
            className={`fixed top-4 right-4 z-60 px-4 py-3 rounded-lg text-white text-sm font-medium shadow-lg ${
              toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'
            }`}
          >
            {toast.message}
          </div>
        )}
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Expense</h2>

        {/* Add Expense Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Expense Category</h3>
          <form onSubmit={handleAddCategory} className="flex gap-3 flex-wrap items-end">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category name</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="e.g. Maintenance, Utilities"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-900 font-medium">
              Add Category
            </button>
          </form>
        </div>

        {/* Add Expense (under selected unit) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Expense</h3>
          <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                required
              >
                <option value="">Select unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.hostelName} – {u.unitNumber} (Floor {u.floor})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense name</label>
              <input
                type="text"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="e.g. Plumbing repair"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-900 font-medium">
                Add Expense
              </button>
            </div>
          </form>
        </div>

        {/* Expense list table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 p-4 border-b border-gray-200">Expense list</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expense name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
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
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No expenses yet. Add a category and an expense above.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {e.hostelName} – {e.unitNumber} (Floor {e.unitFloor})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{e.expenseName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.categoryName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ${Number(e.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(e.expenseDate)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{e.notes || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          type="button"
                          onClick={() => openEditExpense(e)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(e)}
                          className="text-red-600 hover:text-red-800"
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
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Edit Expense</h4>
              <form onSubmit={handleEditExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Unit</label>
                  <select
                    value={editUnitId}
                    onChange={(ev) => setEditUnitId(ev.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  >
                    <option value="">Select unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.hostelName} – {u.unitNumber} (Floor {u.floor})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Expense name</label>
                  <input
                    type="text"
                    value={editExpenseName}
                    onChange={(ev) => setEditExpenseName(ev.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(ev) => setEditCategoryId(ev.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Date</label>
                  <input
                    type="date"
                    value={editExpenseDate}
                    onChange={(ev) => setEditExpenseDate(ev.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(ev) => setEditNotes(ev.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="Optional"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditExpense(null)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-black text-yellow-400 rounded-lg">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Expense Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
