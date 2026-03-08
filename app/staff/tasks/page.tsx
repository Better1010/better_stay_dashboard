'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.tasks || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      fetchTasks();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
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
        <h2 className="text-3xl font-bold text-gray-900 mb-6">My Tasks</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task._id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {task.type} • {task.priority} priority
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(task.status)}`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-700 mb-4">{task.description}</p>
                <div className="flex gap-2">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(task._id, 'in_progress')}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Start Task
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusChange(task._id, 'completed')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">No tasks assigned</div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
