'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { uploadNidPicture } from '@/lib/supabase';

const editBtnClass =
  'border-0 bg-transparent p-0 text-sm font-medium text-secondary shadow-none hover:text-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35 focus-visible:ring-offset-0';

type RegisteredUserRow = {
  id: string;
  name: string;
  mobileNumber?: string;
  nidFrontUrl?: string | null;
  nidBackUrl?: string | null;
  createdAt?: string;
};

function formatWhen(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function RegisterUserPage() {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [nidFrontFile, setNidFrontFile] = useState<File | null>(null);
  const [nidBackFile, setNidBackFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [users, setUsers] = useState<RegisteredUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editUser, setEditUser] = useState<RegisteredUserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editNidFrontFile, setEditNidFrontFile] = useState<File | null>(null);
  const [editNidBackFile, setEditNidBackFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/registered-users');
      setUsers(res.data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to register user');
    } finally {
      setUploading(false);
    }
  };

  const openEditUser = (u: RegisteredUserRow) => {
    setEditUser(u);
    setEditName(u.name);
    setEditMobile(u.mobileNumber || '');
    setEditNidFrontFile(null);
    setEditNidBackFile(null);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editName.trim()) return;
    try {
      setEditSaving(true);
      const prefix = `registered-user-${editUser.id}-${Date.now()}`;
      let nidFrontUrl: string | undefined;
      let nidBackUrl: string | undefined;
      if (editNidFrontFile) nidFrontUrl = await uploadNidPicture(editNidFrontFile, `${prefix}-front`);
      if (editNidBackFile) nidBackUrl = await uploadNidPicture(editNidBackFile, `${prefix}-back`);
      const body: Record<string, string> = {
        name: editName.trim(),
        mobileNumber: editMobile.trim(),
      };
      if (nidFrontUrl) body.nidFrontUrl = nidFrontUrl;
      if (nidBackUrl) body.nidBackUrl = nidBackUrl;
      await api.patch(`/registered-users/${editUser.id}`, body);
      setEditUser(null);
      showToast('success', 'User updated successfully.');
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div className="space-y-10">
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
        <div className="max-w-xl">
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
                className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
              >
                {uploading ? 'Saving...' : 'Register'}
              </button>
            </div>
          </form>
          </div>
        </div>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Registered users</h3>
            <button
              type="button"
              onClick={() => fetchUsers()}
              disabled={usersLoading}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 self-start sm:self-auto"
            >
              Refresh list
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      NID (front)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      NID (back)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                        Loading users…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                        No registered users yet. Add someone using the form above.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{u.mobileNumber || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          {u.nidFrontUrl ? (
                            <a
                              href={u.nidFrontUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {u.nidBackUrl ? (
                            <a
                              href={u.nidBackUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatWhen(u.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button type="button" onClick={() => openEditUser(u)} className={editBtnClass}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit registered user</h3>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">User name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Mobile number</label>
                  <input
                    type="text"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="e.g. 01XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Replace NID front (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditNidFrontFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {editUser.nidFrontUrl ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Current:{' '}
                      <a href={editUser.nidFrontUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600">
                        View
                      </a>
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Replace NID back (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditNidBackFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {editUser.nidBackUrl ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Current:{' '}
                      <a href={editUser.nidBackUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600">
                        View
                      </a>
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    disabled={editSaving}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
                  >
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
