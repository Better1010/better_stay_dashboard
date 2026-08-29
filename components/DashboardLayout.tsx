'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { UserRole } from '@/lib/auth';
import { DashboardSpinner } from '@/components/dashboard/DashboardUi';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  hostel_admin: 'Hostel Admin',
  resident: 'Resident',
  staff: 'Staff',
};

export default function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (requiredRole && !requiredRole.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, loading, router, requiredRole]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <DashboardSpinner label="Signing you in…" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      <Sidebar role={user.role} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-10 shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Welcome back
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span
                className={cn(
                  'inline-flex items-center rounded-md border border-transparent bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground',
                )}
              >
                {roleLabels[user.role]}
              </span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Log out
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
