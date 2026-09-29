import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CodeReview, TaskAttempt } from '@jsskillup/shared';
import { api, type ApiRequestError } from '@/api/client';
import { toApiError } from '@/lib/useApi';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { AiUnavailable, CodeReviewPanel } from './AiPanels';

/**
 * AI-ревью последней сохранённой попытки. Ревьюится именно попытка, а не текст
 * в редакторе: так у модели есть результаты тестов, а ревью сохраняется в истории.
 * Родитель монтирует компонент с `key={attempt.id}`, поэтому новая попытка
 * сбрасывает локальное состояние.
 */
export function AiCodeReview({
  slug,
  attempt,
  aiConfigured,
  editedSinceRun,
  onReviewed,
}: {
  slug: string;
  attempt: TaskAttempt | null;
  aiConfigured: boolean;
  /** Код в редакторе отличается от последней запущенной версии. */
  editedSinceRun: boolean;
  onReviewed: (attemptId: number, review: CodeReview) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const review = attempt?.aiReview ?? null;

  const request = async (): Promise<void> => {
    if (!attempt) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.aiReview(slug, attempt.id);
      onReviewed(attempt.id, result.review);
    } catch (cause) {
      setError(toApiError(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="AI-ревью решения"
        subtitle="Корректность, сложность, читаемость и вопросы интервьюера"
      />

      {!aiConfigured ? (
        <AiUnavailable what="AI-ревью кода" />
      ) : review ? (
        <CodeReviewPanel review={review} />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!attempt || pending} onClick={() => void request()}>
              {pending ? 'AI читает код…' : 'AI-ревью моего решения'}
            </Button>
            {!attempt ? (
              <span className="text-xs text-muted">Сначала запустите тесты — ревьюится последняя попытка</span>
            ) : editedSinceRun ? (
              <span className="text-xs text-warning">
                Код изменён после запуска — ревью получит последнюю запущенную версию
              </span>
            ) : null}
          </div>
          {error ? (
            <ErrorState title="Ревью не получилось" error={error} onRetry={() => void request()} />
          ) : null}
        </div>
      )}
    </Card>
  );
}

/** «Сгенерировать похожую задачу»: после проверки тестами открывает новую задачу. */
export function GenerateSimilarTask({ slug, aiConfigured }: { slug: string; aiConfigured: boolean }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  if (!aiConfigured) return null;

  const generate = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      const result = await api.aiGenerateTask({ similarTo: slug });
      void navigate(`/tasks/${result.slug}`);
    } catch (cause) {
      setError(toApiError(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Ещё такая задача"
        subtitle="AI придумает похожую, а сервер проверит, что её эталон проходит все тесты"
      />
      <Button variant="secondary" disabled={pending} onClick={() => void generate()}>
        {pending ? 'Генерируем и проверяем… (до минуты)' : '✨ Сгенерировать похожую задачу'}
      </Button>
      {error ? (
        <div className="mt-3">
          <ErrorState title="Задача не сгенерирована" error={error} onRetry={() => void generate()} />
        </div>
      ) : null}
    </Card>
  );
}
