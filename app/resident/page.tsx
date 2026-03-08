'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

export default function ResidentDashboard() {
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [rentStatus, setRentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [roomRes, paymentsRes] = await Promise.all([
        api.get('/rooms/my-room'),
        api.get('/payments'),
      ]);

      setRoomInfo(roomRes.data.room);
      const payments = paymentsRes.data.payments || [];
      const latestPayment = payments[0];
      setRentStatus(latestPayment);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  return (
    <DashboardLayout requiredRole={['resident']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Resident Dashboard</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">My Room</h3>
              {roomInfo ? (
                <div>
                  <p className="text-gray-600">
                    <span className="font-semibold">Room:</span> {roomInfo.roomNumber}
                  </p>
                  <p className="text-gray-600 mt-2">
                    <span className="font-semibold">Floor:</span> {roomInfo.floor}
                  </p>
                  <p className="text-gray-600 mt-2">
                    <span className="font-semibold">Rent:</span> ${roomInfo.rent}/month
                  </p>
                  <Link
                    href="/resident/room"
                    className="mt-4 inline-block text-green-600 hover:text-green-700 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500">No room assigned yet</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Rent Status</h3>
              {rentStatus ? (
                <div>
                  <p className="text-gray-600">
                    <span className="font-semibold">Amount:</span> ${rentStatus.amount}
                  </p>
                  <p className="text-gray-600 mt-2">
                    <span className="font-semibold">Status:</span>{' '}
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        rentStatus.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : rentStatus.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {rentStatus.status}
                    </span>
                  </p>
                  <Link
                    href="/resident/rent"
                    className="mt-4 inline-block text-green-600 hover:text-green-700 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500">No payment records</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/resident/payments"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition"
            >
              <h4 className="font-semibold">Make Payment</h4>
              <p className="text-sm text-gray-600 mt-1">Pay your rent online</p>
            </Link>
            <Link
              href="/resident/complaints"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition"
            >
              <h4 className="font-semibold">Submit Complaint</h4>
              <p className="text-sm text-gray-600 mt-1">Report an issue</p>
            </Link>
            <Link
              href="/resident/notices"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition"
            >
              <h4 className="font-semibold">View Notices</h4>
              <p className="text-sm text-gray-600 mt-1">Check latest announcements</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
