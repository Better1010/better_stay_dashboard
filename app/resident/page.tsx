'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BedDouble, Wallet, CreditCard, MessageSquare, Megaphone } from 'lucide-react';
import api from '@/lib/api';
import {
  DashboardSpinner,
  PageHeader,
  Panel,
  QuickActionCard,
} from '@/components/dashboard/DashboardUi';
import { cn } from '@/lib/utils';

export default function ResidentDashboard() {
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [rentStatus, setRentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [roomRes, paymentsRes] = await Promise.all([
          api.get('/rooms/my-room'),
          api.get('/payments'),
        ]);
        if (cancelled) return;
        setRoomInfo(roomRes.data.room);
        const payments = paymentsRes.data.payments || [];
        setRentStatus(payments[0] || null);
      } catch {
        if (!cancelled) {
          setRoomInfo(null);
          setRentStatus(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const paymentBadge =
    rentStatus?.status === 'approved'
      ? 'bg-success/15 text-success'
      : rentStatus?.status === 'pending'
        ? 'bg-brand-muted text-brand-foreground'
        : 'bg-destructive/10 text-destructive';

  return (
    <DashboardLayout requiredRole={['resident']}>
      <PageHeader
        title="Dashboard"
        description="Your room, rent status, and shortcuts to payments and notices."
      />

      {loading ? (
        <DashboardSpinner />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="My room">
              {roomInfo ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <BedDouble className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Room</p>
                      <p className="text-lg font-semibold text-foreground">{roomInfo.roomNumber}</p>
                    </div>
                  </div>
                  <dl className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Floor</dt>
                      <dd className="font-medium text-foreground">{roomInfo.floor}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Rent</dt>
                      <dd className="font-medium text-foreground">৳{roomInfo.rent}/month</dd>
                    </div>
                  </dl>
                  <Link
                    href="/resident/room"
                    className="inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    View full details →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No room assigned yet.</p>
              )}
            </Panel>

            <Panel title="Rent status">
              {rentStatus ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2 text-foreground">
                      <Wallet className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest</p>
                      <p className="text-lg font-semibold text-foreground">৳{rentStatus.amount}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    Status{' '}
                    <span
                      className={cn('ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', paymentBadge)}
                    >
                      {rentStatus.status}
                    </span>
                  </p>
                  <Link
                    href="/resident/rent"
                    className="inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    View rent details →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payment records yet.</p>
              )}
            </Panel>
          </div>

          <div>
            <h2 className="mb-4 text-base font-semibold text-foreground">Quick actions</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <QuickActionCard
                href="/resident/payments"
                title="Payments"
                description="View history and make a payment."
                icon={CreditCard}
              />
              <QuickActionCard
                href="/resident/complaints"
                title="Complaints"
                description="Report an issue to management."
                icon={MessageSquare}
              />
              <QuickActionCard
                href="/resident/notices"
                title="Notices"
                description="Read announcements from your hostel."
                icon={Megaphone}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
