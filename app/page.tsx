'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      const redirectPath = {
        super_admin: '/super-admin',
        hostel_admin: '/admin',
        resident: '/resident',
        staff: '/staff',
      }[user.role];
      if (redirectPath) router.push(redirectPath);
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="flex flex-col items-center text-muted-foreground">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-hidden
        />
        <p className="mt-4 text-sm font-medium">Loading…</p>
      </div>
    </div>
  );
}
