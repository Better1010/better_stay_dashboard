'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/complaints');
      setComplaints(res.data.complaints || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setLoading(false);
    }
  };

  const handleStatusChange = async (complaintId: string, status: string) => {
    try {
      await api.patch(`/complaints/${complaintId}/status`, { status });
      fetchComplaints();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <DashboardLayout requiredRole={['hostel_admin']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Complaints Management</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <div key={complaint._id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{complaint.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      By: {complaint.residentId?.name || 'Unknown'} • {complaint.category}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(complaint.status)}`}
                  >
                    {complaint.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-700 mb-4">{complaint.description}</p>
                <div className="flex gap-2">
                  {complaint.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(complaint._id, 'in_progress')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Mark In Progress
                      </button>
                      <button
                        onClick={() => handleStatusChange(complaint._id, 'resolved')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {complaint.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusChange(complaint._id, 'resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
            {complaints.length === 0 && (
              <div className="text-center py-12 text-gray-500">No complaints found</div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
