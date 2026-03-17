'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

type ClientHistoryEntry = {
  id: string;
  assigneeName: string;
  mobileNumber: string | null;
  nidPictureFrontUrl: string | null;
  nidPictureBackUrl: string | null;
  buildingName: string;
  unitNumber: string;
  roomNumber: string;
  bedNumber: string;
  assignedAt: string;
  unassignedAt: string;
  monthsStayed: number;
  totalPayment: number;
  createdAt: string;
};

export default function ClientHistoryPage() {
  const [list, setList] = useState<ClientHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/client-history')
      .then((res) => {
        if (!cancelled) setList(res.data?.history ?? []);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const formatDate = (d: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <DashboardLayout requiredRole={['super_admin']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Client history</h2>
        <p className="text-gray-600 mb-4">
          Unassigned clients and the building, unit, room and bed they stayed in. Months stayed and total payment columns are for future use.
        </p>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assignee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Building</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bed</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned at</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unassigned at</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Months stayed</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total payment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">NID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                      No client history yet. Unassigned clients will appear here.
                    </td>
                  </tr>
                ) : (
                  list.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.assigneeName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.mobileNumber || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.buildingName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.unitNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.roomNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.bedNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(row.assignedAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(row.unassignedAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">{row.monthsStayed}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {row.totalPayment != null ? `$${Number(row.totalPayment).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="flex gap-1">
                          {row.nidPictureFrontUrl ? (
                            <a href={row.nidPictureFrontUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                              Front
                            </a>
                          ) : null}
                          {row.nidPictureBackUrl ? (
                            <a href={row.nidPictureBackUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                              Back
                            </a>
                          ) : null}
                          {!row.nidPictureFrontUrl && !row.nidPictureBackUrl ? '—' : null}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
