import type { ReactNode } from 'react';
import type { ApiRequestError } from '@/api/client';
import { Button } from './Button';

export function Loading({ label = 'Загрузка' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = 'Не удалось загрузить данные',
}: {
  error: ApiRequestError;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft p-5">
      <p className="text-sm font-semibold text-danger">{title}</p>
      <p className="mt-1 text-sm text-fg/80">{error.message}</p>
      {error.code === 'RATE_LIMIT' && error.retryAfterSec !== null ? (
        <p className="mt-1 text-sm text-fg/80">
          Лимит Groq исчерпан, повторить можно через {error.retryAfterSec} с.
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Повторить
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel/50 p-10 text-center">
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
