'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function ResidentRoomPage() {
  return (
    <DashboardLayout requiredRole={['resident']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">My Room</h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Room number</p>
                  <p className="text-lg font-semibold text-gray-900">—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Floor</p>
                  <p className="text-lg font-semibold text-gray-900">—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Bed</p>
                  <p className="text-lg font-semibold text-gray-900">—</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Monthly rent</p>
                  <p className="text-lg font-semibold text-gray-900">$—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Hostel</p>
                  <p className="text-lg font-semibold text-gray-900">—</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-sm text-gray-600">—</p>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm">
                Room and bed details will appear here once assigned. Contact your hostel admin if you have not been assigned yet.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Link
            href="/resident/rent"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Rent status →
          </Link>
          <Link
            href="/resident"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
