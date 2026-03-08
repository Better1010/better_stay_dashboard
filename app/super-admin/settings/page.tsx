'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function SuperAdminSettingsPage() {
  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Settings</h2>

        <div className="space-y-6 max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Maintenance mode</label>
                <input type="checkbox" className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Allow resident sign-up</label>
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Default config</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input
                  type="text"
                  defaultValue="Taka"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date format</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save changes</h3>
            <button
              type="button"
              className="px-4 py-2 bg-black text-yellow-400 rounded-lg hover:bg-gray-900 transition font-medium"
            >
              Save settings
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
