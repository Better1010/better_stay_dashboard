'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

export default function StaffDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      const allTasks = res.data.tasks || [];
      setTasks(allTasks.slice(0, 5)); // Show latest 5
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout requiredRole={['staff']}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Staff Dashboard</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Pending Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {tasks.filter((t) => t.status === 'pending').length}
                    </p>
                  </div>
                  <div className="text-4xl">⏳</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">In Progress</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {tasks.filter((t) => t.status === 'in_progress').length}
                    </p>
                  </div>
                  <div className="text-4xl">🔄</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Completed</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {tasks.filter((t) => t.status === 'completed').length}
                    </p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Recent Tasks</h3>
                <Link
                  href="/staff/tasks"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  View All →
                </Link>
              </div>
              {tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task._id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{task.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {task.type}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {task.priority}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No tasks assigned</p>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
