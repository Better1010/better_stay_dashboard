'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function HostelAdminDashboard() {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalResidents: 0,
    pendingComplaints: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [roomsRes, usersRes, complaintsRes, paymentsRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/users'),
        api.get('/complaints'),
        api.get('/payments'),
      ]);

      const rooms = roomsRes.data.rooms || [];
      const users = usersRes.data.users || [];
      const complaints = complaintsRes.data.complaints || [];
      const payments = paymentsRes.data.payments || [];

      setStats({
        totalRooms: rooms.length,
        totalResidents: users.filter((u: any) => u.role === 'resident').length,
        pendingComplaints: complaints.filter((c: any) => c.status === 'pending').length,
        pendingPayments: payments.filter((p: any) => p.status === 'pending').length,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  return (
    <DashboardLayout requiredRole={['hostel_admin']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Hostel Admin Dashboard</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Rooms</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRooms}</p>
                </div>
                <div className="text-4xl">🛏️</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Residents</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalResidents}</p>
                </div>
                <div className="text-4xl">👤</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Complaints</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingComplaints}</p>
                </div>
                <div className="text-4xl">📝</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Payments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingPayments}</p>
                </div>
                <div className="text-4xl">💳</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/rooms"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition"
            >
              <h4 className="font-semibold">Manage Rooms</h4>
              <p className="text-sm text-gray-600 mt-1">View and manage rooms & beds</p>
            </a>
            <a
              href="/admin/residents"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition"
            >
              <h4 className="font-semibold">Manage Residents</h4>
              <p className="text-sm text-gray-600 mt-1">Approve and manage residents</p>
            </a>
            <a
              href="/admin/complaints"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition"
            >
              <h4 className="font-semibold">Handle Complaints</h4>
              <p className="text-sm text-gray-600 mt-1">Review and resolve complaints</p>
            </a>
            <a
              href="/admin/payments"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition"
            >
              <h4 className="font-semibold">Payment Management</h4>
              <p className="text-sm text-gray-600 mt-1">Approve rent payments</p>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
