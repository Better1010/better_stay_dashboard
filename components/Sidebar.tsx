'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Building2,
  IdCard,
  Receipt,
  Banknote,
  Landmark,
  TrendingUp,
  BarChart3,
  BedDouble,
  Users,
  Calendar,
  CreditCard,
  MessageSquare,
  Megaphone,
  UserCog,
  Home,
  Wallet,
  History,
  User,
  ListTodo,
} from 'lucide-react';
import { UserRole } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: UserRole;
}

type NavItem = { name: string; path: string; icon: LucideIcon };

const dashboardPathByRole: Record<UserRole, string> = {
  super_admin: '/super-admin',
  hostel_admin: '/admin',
  resident: '/resident',
  staff: '/staff',
};

function isNavActive(pathname: string, itemPath: string, role: UserRole): boolean {
  if (pathname === itemPath) return true;
  if (itemPath === dashboardPathByRole[role]) return false;
  return pathname.startsWith(itemPath + '/');
}

const roleConfig: Record<
  UserRole,
  {
    label: string;
    items: NavItem[];
  }
> = {
  super_admin: {
    label: '',
    items: [
      { name: 'Dashboard', path: '/super-admin', icon: LayoutDashboard },
      { name: 'Hostels', path: '/super-admin/hostels', icon: Building2 },
      { name: 'Register User', path: '/super-admin/register-user', icon: IdCard },
      { name: 'Expense', path: '/super-admin/expenses', icon: Receipt },
      { name: 'Income', path: '/super-admin/income', icon: Banknote },
      { name: 'Deposit', path: '/super-admin/deposit', icon: Landmark },
      { name: 'Investment', path: '/super-admin/investment', icon: TrendingUp },
      { name: 'Analytics', path: '/super-admin/analytics', icon: BarChart3 },
    ],
  },
  hostel_admin: {
    label: 'Hostel Admin',
    items: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { name: 'Rooms & Beds', path: '/admin/rooms', icon: BedDouble },
      { name: 'Residents', path: '/admin/residents', icon: Users },
      { name: 'Bookings', path: '/admin/bookings', icon: Calendar },
      { name: 'Rent & Invoices', path: '/admin/payments', icon: CreditCard },
      { name: 'Complaints', path: '/admin/complaints', icon: MessageSquare },
      { name: 'Notices', path: '/admin/notices', icon: Megaphone },
      { name: 'Staff', path: '/admin/staff', icon: UserCog },
    ],
  },
  resident: {
    label: 'Resident',
    items: [
      { name: 'Dashboard', path: '/resident', icon: Home },
      { name: 'My Room', path: '/resident/room', icon: BedDouble },
      { name: 'Rent Status', path: '/resident/rent', icon: Wallet },
      { name: 'Payment History', path: '/resident/payments', icon: History },
      { name: 'Complaints', path: '/resident/complaints', icon: MessageSquare },
      { name: 'Notices', path: '/resident/notices', icon: Megaphone },
      { name: 'Profile', path: '/resident/profile', icon: User },
    ],
  },
  staff: {
    label: 'Staff',
    items: [
      { name: 'Dashboard', path: '/staff', icon: LayoutDashboard },
      { name: 'My Tasks', path: '/staff/tasks', icon: ListTodo },
      { name: 'Task History', path: '/staff/history', icon: History },
      { name: 'Attendance', path: '/staff/attendance', icon: Calendar },
      { name: 'Profile', path: '/staff/profile', icon: User },
    ],
  },
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const config = roleConfig[role];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border">
        <Link
          href={dashboardPathByRole[role]}
          className="block bg-white px-4 py-5 transition-opacity hover:opacity-95"
        >
          <Image
            src="/images/LOGO.png"
            alt="BetterStay"
            width={220}
            height={56}
            className="h-10 w-auto max-w-full object-contain object-left"
            priority
          />
        </Link>
        <p className="border-t border-sidebar-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
          {config.label}
        </p>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
        {config.items.map((item) => {
          const active = isNavActive(pathname, item.path, role);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
