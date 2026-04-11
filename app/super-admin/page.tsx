'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Building2,
  UserCircle,
  BedDouble,
  DoorOpen,
  ArrowRight,
  Banknote,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import api from '@/lib/api';
import {
  DashboardSpinner,
  PageHeader,
  Panel,
  QuickActionCard,
  StatCard,
} from '@/components/dashboard/DashboardUi';

type HostelRow = {
  id?: string;
  _id?: string;
  name: string;
  address?: string;
  city?: string;
  total_rooms?: number;
  total_beds?: number;
};

function formatMoney(n: number) {
  return `৳${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthYearLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<HostelRow[]>([]);
  const [stats, setStats] = useState({
    registeredUsers: 0,
    totalRooms: 0,
    totalBeds: 0,
    totalIncome: 0,
    totalInvestment: 0,
    profit: 0,
    analyticsMonth: 1,
    analyticsYear: new Date().getFullYear(),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hostelsRes, regRes, analyticsRes, investmentsRes] = await Promise.all([
          api.get('/hostels'),
          api.get('/registered-users'),
          api.get('/analytics'),
          api.get('/investments'),
        ]);
        if (cancelled) return;
        const hostelsList: HostelRow[] = hostelsRes.data.hostels || [];
        const registered = regRes.data.users || [];
        const investments = investmentsRes.data.investments || [];
        const totalInvestment = investments.reduce(
          (s: number, row: { amount?: number }) => s + Number(row.amount || 0),
          0,
        );
        const totalRooms = hostelsList.reduce((s, h) => s + Number(h.total_rooms ?? 0), 0);
        const totalBeds = hostelsList.reduce((s, h) => s + Number(h.total_beds ?? 0), 0);
        const a = analyticsRes.data || {};
        setHostels(hostelsList);
        setStats({
          registeredUsers: registered.length,
          totalRooms,
          totalBeds,
          totalIncome: Number(a.totalIncome ?? 0),
          totalInvestment,
          profit: Number(a.profit ?? 0),
          analyticsMonth: Number(a.month) || new Date().getMonth() + 1,
          analyticsYear: Number(a.year) || new Date().getFullYear(),
        });
      } catch {
        if (!cancelled) {
          const now = new Date();
          setHostels([]);
          setStats({
            registeredUsers: 0,
            totalRooms: 0,
            totalBeds: 0,
            totalIncome: 0,
            totalInvestment: 0,
            profit: 0,
            analyticsMonth: now.getMonth() + 1,
            analyticsYear: now.getFullYear(),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const periodLabel = monthYearLabel(stats.analyticsMonth, stats.analyticsYear);
  const { profit } = stats;
  const profitIcon = profit > 0 ? TrendingUp : profit < 0 ? TrendingDown : Minus;
  const profitIconClass =
    profit > 0
      ? 'bg-success/15 text-success'
      : profit < 0
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground';
  const profitLabel = profit > 0 ? 'Net profit' : profit < 0 ? 'Net loss' : 'Break-even';

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <PageHeader
        title="Dashboard"
      />

      {loading ? (
        <DashboardSpinner label="Loading dashboard…" />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active buildings"
              value={hostels.length}
              sublabel="Hostels in operation"
              icon={Building2}
              iconWrapperClassName="bg-brand-muted text-brand-foreground"
            />
            <StatCard
              label="Room & bed capacity"
              value={`${stats.totalRooms} / ${stats.totalBeds}`}
              sublabel="Rooms · Beds (all buildings)"
              icon={BedDouble}
            />
            <StatCard
              label="Registered users"
              value={stats.registeredUsers}
              sublabel="Clients on file for deposits & assignments"
              icon={UserCircle}
            />
            <StatCard
              label="Total income"
              value={formatMoney(stats.totalIncome)}
              sublabel={`Rent received · ${periodLabel}`}
              icon={Banknote}
              iconWrapperClassName="bg-primary/10 text-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total investment"
              value={formatMoney(stats.totalInvestment)}
              sublabel="All recorded investments to date"
              icon={TrendingUp}
              iconWrapperClassName="bg-brand-muted text-brand-foreground"
            />
            <StatCard
              label="Buildings with units"
              value={hostels.filter((h) => (h.total_rooms ?? 0) > 0).length}
              sublabel="Buildings reporting at least one room"
              icon={DoorOpen}
            />
            <StatCard
              label={profitLabel}
              value={formatMoney(Math.abs(profit))}
              sublabel={periodLabel}
              icon={profitIcon}
              iconWrapperClassName={profitIconClass}
            />
          </div>

          <Panel
            title="Buildings overview"
            action={
              <Link
                href="/super-admin/hostels"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Manage all
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          >
            {hostels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No buildings yet. Add your first property from{' '}
                <Link href="/super-admin/hostels" className="font-medium text-primary hover:underline">
                  Hostels
                </Link>
                .
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Rooms / Beds
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {hostels.map((h) => {
                      const id = String(h.id || h._id || '');
                      return (
                        <tr key={id} className="transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground">{h.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {[h.address, h.city].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">
                            {h.total_rooms ?? 0} rooms · {h.total_beds ?? 0} beds
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/super-admin/hostels/${id}`}
                              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                              Units & rooms
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div>
            <h2 className="mb-4 text-base font-semibold text-foreground">Quick actions</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <QuickActionCard
                href="/super-admin/hostels"
                title="Buildings & inventory"
                description="Add buildings, units, rooms, and beds."
                icon={Building2}
              />
              <QuickActionCard
                href="/super-admin/register-user"
                title="Register a client"
                description="Capture NID and contact details for deposits and bed assignment."
                icon={UserCircle}
              />
              <QuickActionCard
                href="/super-admin/analytics"
                title="Analytics"
                description="Review performance and occupancy insights."
                icon={TrendingUp}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
