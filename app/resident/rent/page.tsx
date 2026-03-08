'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function ResidentRentPage() {
  return (
    <DashboardLayout requiredRole={['resident']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Rent Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current month</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount due</span>
                <span className="font-semibold text-gray-900">$—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-700">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due date</span>
                <span className="text-gray-900">—</span>
              </div>
            </div>
            <Link
              href="/resident/payments"
              className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Pay now
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Paid this month</span>
                <span className="font-semibold text-green-600">$0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending</span>
                <span className="font-semibold text-gray-900">$0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent rent</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Month</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No rent records yet. Connect backend to show data.
                  </td>
                </tr>
              </tbody>
            </table>
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
