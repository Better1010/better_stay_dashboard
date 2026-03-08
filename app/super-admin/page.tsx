'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalHostels: 0,
    totalAdmins: 0,
    totalResidents: 0,
    totalRevenue: 0,
  });
  const [hostels, setHostels] = useState<{ id?: string; _id?: string; name: string; address?: string; city?: string; total_rooms?: number; total_beds?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/hostels'), api.get('/users')])
      .then(([hostelsRes, usersRes]) => {
        if (cancelled) return;
        const hostelsList = hostelsRes.data.hostels || [];
        const users = usersRes.data.users || [];
        setHostels(hostelsList);
        setStats({
          totalHostels: hostelsList.length,
          totalAdmins: users.filter((u: { role?: string }) => u.role === 'hostel_admin').length,
          totalResidents: users.filter((u: { role?: string }) => u.role === 'resident').length,
          totalRevenue: 0,
        });
      })
      .catch((error) => {
        if (!cancelled) console.error('Error fetching stats:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Super Admin Dashboard</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Hostels</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalHostels}</p>
                </div>
                <span className="text-4xl">🏠</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Hostel Admins</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAdmins}</p>
                </div>
                <span className="text-4xl">👥</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Residents</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalResidents}</p>
                </div>
                <span className="text-4xl">👤</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">${stats.totalRevenue}</p>
                </div>
                <span className="text-4xl">💰</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Hostels (Buildings)</h3>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : hostels.length === 0 ? (
            <p className="text-gray-500 text-sm">No hostels yet. Add your first building from Buildings.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rooms / Beds</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hostels.map((h) => (
                    <tr key={h.id || h._id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{h.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{h.address}, {h.city}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{h.total_rooms ?? 0} rooms, {h.total_beds ?? 0} beds</td>
                      <td className="px-4 py-3 text-right text-sm">
                        <Link href={`/super-admin/hostels/${h.id || h._id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                          Manage units & rooms
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/super-admin/hostels"
              className="block p-4 border-2 border-gray-200 rounded-xl hover:border-yellow-400 hover:bg-gray-50 transition"
            >
              <h4 className="font-semibold text-gray-900">Manage Hostels</h4>
              <p className="text-sm text-gray-600 mt-1">View and manage all hostels</p>
            </Link>
            <Link
              href="/super-admin/admins"
              className="block p-4 border-2 border-gray-200 rounded-xl hover:border-yellow-400 hover:bg-gray-50 transition"
            >
              <h4 className="font-semibold text-gray-900">Manage Admins</h4>
              <p className="text-sm text-gray-600 mt-1">Create and manage hostel admins</p>
            </Link>
            <Link
              href="/super-admin/reports"
              className="block p-4 border-2 border-gray-200 rounded-xl hover:border-yellow-400 hover:bg-gray-50 transition"
            >
              <h4 className="font-semibold text-gray-900">View Reports</h4>
              <p className="text-sm text-gray-600 mt-1">Revenue and occupancy reports</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
