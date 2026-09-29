import { cn } from '@/lib/cn';

interface ProgressBarProps {
  percent: number;
  className?: string;
  tone?: 'accent' | 'success' | 'warning';
  size?: 'sm' | 'md';
}

const TONE_CLASS: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
};

export function ProgressBar({ percent, className, tone = 'accent', size = 'md' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-panel-2',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', TONE_CLASS[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface ProgressRingProps {
  percent: number;
  size?: number;
  label?: string;
}

export function ProgressRing({ percent, size = 132, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-panel-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-accent transition-[stroke-dashoffset] duration-700"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-semibold tabular-nums text-fg">{clamped}%</span>
        {label ? <span className="text-xs text-muted">{label}</span> : null}
      </div>
    </div>
  );
}
