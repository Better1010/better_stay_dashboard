'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function ResidentNoticesPage() {
  return (
    <DashboardLayout requiredRole={['resident']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Notice Board</h2>
        <p className="text-gray-600 mb-6">Announcements and notices from your hostel.</p>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No notices yet</h3>
                <p className="text-gray-500 text-sm mt-1">—</p>
                <p className="text-gray-600 mt-3">
                  Notices from your hostel admin will appear here. Connect backend to load real data.
                </p>
              </div>
              <span className="shrink-0 px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600">
                —
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/resident"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
