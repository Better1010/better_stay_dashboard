'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { uploadNidPicture } from '@/lib/supabase';

export default function RegisterUserPage() {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [nidFrontFile, setNidFrontFile] = useState<File | null>(null);
  const [nidBackFile, setNidBackFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nidFrontFile || !nidBackFile) {
      showToast('error', 'NID front and back pictures are required.');
      return;
    }
    try {
      setUploading(true);
      const prefix = `registered-user-${Date.now()}`;
      const [nidFrontUrl, nidBackUrl] = await Promise.all([
        uploadNidPicture(nidFrontFile, prefix),
        uploadNidPicture(nidBackFile, prefix),
      ]);
      await api.post('/registered-users', {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        nidFrontUrl,
        nidBackUrl,
      });
      setName('');
      setMobileNumber('');
      setNidFrontFile(null);
      setNidBackFile(null);
      showToast('success', 'User registered successfully.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to register user');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="max-w-xl">
        {toast ? (
          <div className="fixed top-4 right-4 z-9999">
            <div
              className={`rounded-xl border px-4 py-3 shadow-lg ${
                toast.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          </div>
        ) : null}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Register User</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900">User name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">Mobile number</label>
              <input
                type="text"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="e.g. 01XXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">NID picture (front) — required</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNidFrontFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">NID picture (back) — required</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNidBackFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-black text-yellow-400 rounded-lg disabled:opacity-50"
              >
                {uploading ? 'Saving...' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
