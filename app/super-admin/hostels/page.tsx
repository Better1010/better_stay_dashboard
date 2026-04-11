'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message && typeof res.data.message === 'string') return res.data.message;
  }
  return fallback;
}

export default function SuperAdminHostelsPage() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const fetchHostels = () => {
    api.get('/hostels').then((res) => setHostels(res.data.hostels || [])).catch(() => setHostels([]));
  };

  useEffect(() => {
    setLoading(true);
    api
      .get('/hostels')
      .then((res) => setHostels(res.data.hostels || []))
      .catch(() => setHostels([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hostels', {
        name: name.trim().toUpperCase(),
        address: address.trim().toUpperCase(),
        city: city.trim().toUpperCase(),
        phone: phone.trim(),
        email: email.trim(),
      });
      setShowAddModal(false);
      setName('');
      setAddress('');
      setCity('');
      setPhone('');
      setEmail('');
      fetchHostels();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add building');
    }
  };

  const handleDeleteBuilding = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/hostels/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchHostels();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete building'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Buildings</h2>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-900 transition font-medium"
          >
            + Add Building
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">City</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rooms / Beds</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : hostels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No buildings yet. Add your first building (hostel) from Supabase or seed data.
                    </td>
                  </tr>
                ) : (
                  hostels.map((h: any) => (
                    <tr key={h.id || h._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{h.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.city}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {h.total_rooms ?? 0} rooms, {h.total_beds ?? 0} beds
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <Link
                            href={`/super-admin/hostels/${h.id || h._id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Manage units & rooms
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({ id: String(h.id || h._id), name: String(h.name || 'Building') })
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-2 text-gray-900">Delete building</h4>
              <p className="text-sm text-gray-600 mb-4">
                Delete <strong>&quot;{deleteConfirm.name}&quot;</strong>? This permanently removes all units, rooms,
                beds, and related records for this building. This cannot be undone.
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
                  onClick={handleDeleteBuilding}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete building'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Add Building</h4>
              <form onSubmit={handleAddBuilding} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Building name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 uppercase text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value.toUpperCase())}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 uppercase text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value.toUpperCase())}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 uppercase text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Phone</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400" required />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-black text-yellow-400 rounded-lg">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
