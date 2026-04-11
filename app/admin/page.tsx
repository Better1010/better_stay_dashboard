'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useCallback, useEffect, useState } from 'react';
import { BedDouble, Users, MessageSquare, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import {
  DashboardSpinner,
  PageHeader,
  QuickActionCard,
  StatCard,
} from '@/components/dashboard/DashboardUi';

export default function HostelAdminDashboard() {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalResidents: 0,
    pendingComplaints: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
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
        totalResidents: users.filter((u: { role?: string }) => u.role === 'resident').length,
        pendingComplaints: complaints.filter((c: { status?: string }) => c.status === 'pending').length,
        pendingPayments: payments.filter((p: { status?: string }) => p.status === 'pending').length,
      });
    } catch {
      setStats({
        totalRooms: 0,
        totalResidents: 0,
        pendingComplaints: 0,
        pendingPayments: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <DashboardLayout requiredRole={['hostel_admin']}>
      <PageHeader
        title="Dashboard"
        description="Monitor rooms, residents, complaints, and payments for your property."
      />

      {loading ? (
        <DashboardSpinner />
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total rooms" value={stats.totalRooms} icon={BedDouble} />
            <StatCard label="Residents" value={stats.totalResidents} icon={Users} />
            <StatCard
              label="Pending complaints"
              value={stats.pendingComplaints}
              icon={MessageSquare}
              iconWrapperClassName={stats.pendingComplaints > 0 ? 'bg-destructive/10 text-destructive' : undefined}
            />
            <StatCard
              label="Pending payments"
              value={stats.pendingPayments}
              icon={CreditCard}
              iconWrapperClassName={stats.pendingPayments > 0 ? 'bg-brand-muted text-brand-foreground' : undefined}
            />
          </div>

          <div>
            <h2 className="mb-4 text-base font-semibold text-foreground">Quick actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <QuickActionCard
                href="/admin/rooms"
                title="Rooms & beds"
                description="View and manage inventory."
                icon={BedDouble}
              />
              <QuickActionCard
                href="/admin/residents"
                title="Residents"
                description="Approve and manage resident accounts."
                icon={Users}
              />
              <QuickActionCard
                href="/admin/complaints"
                title="Complaints"
                description="Review and resolve open tickets."
                icon={MessageSquare}
              />
              <QuickActionCard
                href="/admin/payments"
                title="Payments"
                description="Approve rent and invoices."
                icon={CreditCard}
              />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Need another section? Use the sidebar — all tools stay one click away.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
