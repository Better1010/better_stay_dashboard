'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function ResidentPaymentsPage() {
  return (
    <DashboardLayout requiredRole={['resident']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Payment History</h2>

        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-600">View and make rent payments.</p>
          <button
            type="button"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            + New payment
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Transaction ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No payments yet. Use &quot;New payment&quot; to pay rent (backend required).
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
