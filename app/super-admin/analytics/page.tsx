'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function SuperAdminAnalyticsPage() {
  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Total Beds</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Occupied Beds</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Avg. Revenue / Hostel</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">$0</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy trend</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
              Chart placeholder – connect backend for occupancy over time
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue trend</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
              Chart placeholder – connect backend for revenue over time
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
