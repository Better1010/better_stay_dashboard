'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
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
  /** When set, the whole card is a link to this path. */
  href?: string;
};

const hiddenAmountLabels = new Set([
  'total income',
  'total investment',
  'net profit',
  'net loss',
  'break-even',
]);

function getHiddenAmountText(value: string | number) {
  if (typeof value === 'string' && value.trim().startsWith('৳')) {
    return '৳••••••';
  }

  return '••••••';
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  className,
  iconWrapperClassName,
  href,
}: StatCardProps) {
  const shouldHideAmount = hiddenAmountLabels.has(label.toLowerCase());
  const [amountVisible, setAmountVisible] = useState(!shouldHideAmount);
  const displayedValue = shouldHideAmount && !amountVisible ? getHiddenAmountText(value) : value;

  const toggleAmountVisibility = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAmountVisible((current) => !current);
  };

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-lg font-semibold tracking-tight text-card-foreground tabular-nums sm:text-xl">
              {displayedValue}
            </p>
            {shouldHideAmount ? (
              <button
                type="button"
                onClick={toggleAmountVisibility}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={amountVisible ? `Hide ${label}` : `Show ${label}`}
              >
                {amountVisible ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                )}
              </button>
            ) : null}
          </div>
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
    </>
  );

  const shellClass = cn(
    'rounded-xl border border-border bg-card p-5 shadow-sm transition-all',
    href
      ? 'cursor-pointer hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
      : 'hover:shadow-md',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cn(shellClass, 'block no-underline')}>
        {inner}
      </Link>
    );
  }

  return <div className={shellClass}>{inner}</div>;
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
