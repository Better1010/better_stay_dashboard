'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const roleColors = {
    super_admin: 'bg-black text-yellow-400',
    hostel_admin: 'bg-blue-600 text-white',
    resident: 'bg-green-600 text-white',
    staff: 'bg-orange-600 text-white',
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col">
        <header className={`${roleColors[user.role]} px-6 py-4 flex justify-between items-center`}>
          <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm opacity-90">{user.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 bg-opacity-20 rounded hover:bg-opacity-30 transition"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
