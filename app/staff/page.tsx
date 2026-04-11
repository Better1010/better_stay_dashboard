'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ListTodo, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import {
  DashboardSpinner,
  PageHeader,
  Panel,
  StatCard,
} from '@/components/dashboard/DashboardUi';
import { cn } from '@/lib/utils';

export default function StaffDashboard() {
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/tasks');
        if (!cancelled) setAllTasks(res.data.tasks || []);
      } catch {
        if (!cancelled) setAllTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = allTasks.slice(0, 5);
  const pending = allTasks.filter((t) => t.status === 'pending').length;
  const inProgress = allTasks.filter((t) => t.status === 'in_progress').length;
  const completed = allTasks.filter((t) => t.status === 'completed').length;

  const statusStyles: Record<string, string> = {
    completed: 'bg-success/15 text-success',
    in_progress: 'bg-primary/10 text-primary',
    pending: 'bg-brand-muted text-brand-foreground',
  };

  return (
    <DashboardLayout requiredRole={['staff']}>
      <PageHeader
        title="Dashboard"
        description="Your task queue and recent assignments in one place."
      />

      {loading ? (
        <DashboardSpinner />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Pending" value={pending} icon={Clock} />
            <StatCard label="In progress" value={inProgress} icon={ListTodo} />
            <StatCard label="Completed" value={completed} icon={CheckCircle2} />
          </div>

          <Panel
            title="Recent tasks"
            action={
              <Link
                href="/staff/tasks"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          >
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((task) => (
                  <li
                    key={task._id || task.id}
                    className="rounded-lg border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{task.title}</h3>
                        {task.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {task.type}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                          statusStyles[task.status] || 'bg-muted text-muted-foreground',
                        )}
                      >
                        {String(task.status || '').replace('_', ' ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
}
