import type { TopicStatus } from '@jsskillup/shared';
import { TOPIC_STATUS_LABELS } from '@jsskillup/shared';
import { cn } from '@/lib/cn';

const STATUS_CLASS: Record<TopicStatus, string> = {
  not_started: 'bg-panel-2 text-muted',
  in_progress: 'bg-accent-soft text-accent',
  learned: 'bg-success-soft text-success',
  review: 'bg-warning-soft text-warning',
};

export function StatusBadge({ status, className }: { status: TopicStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASS[status],
        className,
      )}
    >
      {TOPIC_STATUS_LABELS[status]}
    </span>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const toneClass = {
    neutral: 'bg-panel-2 text-muted',
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
