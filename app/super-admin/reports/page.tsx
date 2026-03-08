'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function SuperAdminReportsPage() {
  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Revenue Reports</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Date range</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
              </div>
              <div className="self-end">
                <button
                  type="button"
                  className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-900 transition font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Revenue (Period)</h3>
            <p className="text-3xl font-bold text-gray-900">$0</p>
            <p className="text-sm text-gray-500 mt-1">Revenue and occupancy reports will appear here.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Revenue by Hostel</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Hostel</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Collected</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Pending</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    No report data yet. Select a date range and apply.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
