'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function SuperAdminHostelsPage() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
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
      await api.post('/hostels', { name, address, city, phone, email });
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
                        <Link
                          href={`/super-admin/hostels/${h.id || h._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Manage units & rooms
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <h4 className="text-lg font-semibold mb-4">Add Building</h4>
              <form onSubmit={handleAddBuilding} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Building name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required />
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
