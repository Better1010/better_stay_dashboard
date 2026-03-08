'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/lib/auth';

interface SidebarProps {
  role: UserRole;
}

const roleConfig = {
  super_admin: {
    color: 'bg-black text-yellow-400',
    hoverColor: 'hover:bg-gray-900 hover:text-yellow-300',
    activeColor: 'bg-gray-900 text-yellow-300',
    items: [
      { name: 'Dashboard', path: '/super-admin', icon: '📊' },
      { name: 'Hostels', path: '/super-admin/hostels', icon: '🏠' },
      { name: 'Hostel Admins', path: '/super-admin/admins', icon: '👥' },
      { name: 'Revenue Reports', path: '/super-admin/reports', icon: '💰' },
      { name: 'Analytics', path: '/super-admin/analytics', icon: '📈' },
      { name: 'Settings', path: '/super-admin/settings', icon: '⚙️' },
    ],
  },
  hostel_admin: {
    color: 'bg-blue-600 text-white',
    hoverColor: 'hover:bg-blue-700 hover:text-white',
    activeColor: 'bg-blue-700 text-white',
    items: [
      { name: 'Dashboard', path: '/admin', icon: '📊' },
      { name: 'Rooms & Beds', path: '/admin/rooms', icon: '🛏️' },
      { name: 'Residents', path: '/admin/residents', icon: '👤' },
      { name: 'Bookings', path: '/admin/bookings', icon: '📅' },
      { name: 'Rent & Invoices', path: '/admin/payments', icon: '💳' },
      { name: 'Complaints', path: '/admin/complaints', icon: '📝' },
      { name: 'Notices', path: '/admin/notices', icon: '📢' },
      { name: 'Staff', path: '/admin/staff', icon: '👷' },
    ],
  },
  resident: {
    color: 'bg-green-600 text-white',
    hoverColor: 'hover:bg-green-700 hover:text-white',
    activeColor: 'bg-green-700 text-white',
    items: [
      { name: 'Dashboard', path: '/resident', icon: '🏠' },
      { name: 'My Room', path: '/resident/room', icon: '🛏️' },
      { name: 'Rent Status', path: '/resident/rent', icon: '💳' },
      { name: 'Payment History', path: '/resident/payments', icon: '📊' },
      { name: 'Complaints', path: '/resident/complaints', icon: '📝' },
      { name: 'Notices', path: '/resident/notices', icon: '📢' },
      { name: 'Profile', path: '/resident/profile', icon: '👤' },
    ],
  },
  staff: {
    color: 'bg-orange-600 text-white',
    hoverColor: 'hover:bg-orange-700 hover:text-white',
    activeColor: 'bg-orange-700 text-white',
    items: [
      { name: 'Dashboard', path: '/staff', icon: '📊' },
      { name: 'My Tasks', path: '/staff/tasks', icon: '✅' },
      { name: 'Task History', path: '/staff/history', icon: '📋' },
      { name: 'Attendance', path: '/staff/attendance', icon: '📅' },
      { name: 'Profile', path: '/staff/profile', icon: '👤' },
    ],
  },
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const config = roleConfig[role];

  return (
    <div className={`${config.color} w-64 min-h-screen p-4`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">BetterStay</h2>
        <p className="text-sm opacity-80 mt-1">
          {role === 'super_admin' && 'Super Admin'}
          {role === 'hostel_admin' && 'Hostel Admin'}
          {role === 'resident' && 'Resident'}
          {role === 'staff' && 'Staff'}
        </p>
      </div>
      <nav className="space-y-2">
        {config.items.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                isActive ? config.activeColor : config.hoverColor
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
