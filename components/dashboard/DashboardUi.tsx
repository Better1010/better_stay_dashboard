'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary"
        aria-hidden
      />
      <p className="mt-4 text-sm font-medium">{label}</p>
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  className?: string;
  iconWrapperClassName?: string;
};

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  className,
  iconWrapperClassName,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-card-foreground tabular-nums sm:text-xl">
            {value}
          </p>
          {sublabel ? <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p> : null}
        </div>
        <div
          className={cn(
            'shrink-0 rounded-lg bg-muted p-2.5 text-foreground [&_svg]:opacity-90',
            iconWrapperClassName,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
    </div>
  );
}

type QuickActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function QuickActionCard({ href, title, description, icon: Icon }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary dark:bg-primary/15">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-card-foreground transition-colors group-hover:text-primary">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-1 border-b border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
