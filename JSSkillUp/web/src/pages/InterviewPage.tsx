import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { InterviewFormat, InterviewSession } from '@jsskillup/shared';
import {
  INTERVIEW_DEFAULT_MINUTES,
  INTERVIEW_FORMATS,
  INTERVIEW_FORMAT_DESCRIPTIONS,
  INTERVIEW_FORMAT_LABELS,
} from '@jsskillup/shared';
import { api, type ApiRequestError } from '@/api/client';
import { toApiError, useApi } from '@/lib/useApi';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { ErrorState, Loading } from '@/components/ui/States';
import { AiUnavailable, ScoreBadge } from '@/components/ai/AiPanels';
import { cn } from '@/lib/cn';

const FORMAT_ICONS: Record<InterviewFormat, string> = {
  js_theory: '🟨',
  react_theory: '⚛️',
  live_coding: '⌨️',
  mixed_tech: '🧩',
  behavioral: '🗣️',
};

const DURATIONS = [15, 30, 45, 60] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StartForm({ onStarted }: { onStarted: (id: string) => void }) {
  const [format, setFormat] = useState<InterviewFormat>('mixed_tech');
  // null — длительность по умолчанию для формата; меняется, только если выбрать вручную.
  const [minutes, setMinutes] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const plannedMinutes = minutes ?? INTERVIEW_DEFAULT_MINUTES[format];

  const start = async (): Promise<void> => {
    setStarting(true);
    setError(null);
    try {
      const { session } = await api.startInterview({ format, plannedMinutes });
      onStarted(session.id);
    } catch (cause) {
      setError(toApiError(cause));
      setStarting(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Новое интервью"
        subtitle="AI-интервьюер уровня Middle задаёт вопрос, копает глубже, если ответ поверхностный, и в конце пишет отчёт"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {INTERVIEW_FORMATS.map((item) => (
          <button
            key={item}
            type="button"
            disabled={starting}
            onClick={() => setFormat(item)}
            className={cn(
              'rounded-xl border p-4 text-left transition-colors disabled:opacity-60',
              format === item ? 'border-accent bg-accent-soft/60' : 'border-line hover:bg-panel-2',
            )}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
              <span className="text-base">{FORMAT_ICONS[item]}</span>
              {INTERVIEW_FORMAT_LABELS[item]}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{INTERVIEW_FORMAT_DESCRIPTIONS[item]}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Длительность</span>
          <div className="flex gap-1 rounded-lg border border-line bg-panel p-1">
            {DURATIONS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={starting}
                onClick={() => setMinutes(value)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium tabular-nums transition-colors',
                  plannedMinutes === value ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg',
                )}
              >
                {value} мин
              </button>
            ))}
          </div>
        </div>

        <Button disabled={starting} onClick={() => void start()}>
          {starting ? 'Интервьюер готовится…' : 'Начать интервью'}
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted">
        Отвечайте так, как ответили бы вслух: своими словами, с примерами. Подсмотреть ответ
        нельзя — оценки по каждому ответу появятся только в отчёте.
      </p>

      {error ? (
        <div className="mt-4">
          <ErrorState title="Интервью не началось" error={error} onRetry={() => void start()} />
        </div>
      ) : null}
    </Card>
  );
}

function HistoryRow({ session }: { session: InterviewSession }) {
  return (
    <li>
      <Link
        to={`/interview/${session.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 transition-colors last:border-b-0 hover:bg-panel-2"
      >
        <span className="text-base">{FORMAT_ICONS[session.format]}</span>
        <span className="min-w-48 flex-1 text-sm font-medium text-fg">
          {INTERVIEW_FORMAT_LABELS[session.format]}
        </span>
        <span className="text-xs text-muted">{formatDate(session.startedAt)}</span>
        <span className="w-24 text-xs text-muted">ответов: {session.answerCount}</span>
        <span className="flex w-28 justify-end">
          {session.status === 'active' ? (
            <Badge tone="accent">идёт</Badge>
          ) : session.status === 'aborted' ? (
            <Badge>прервано</Badge>
          ) : session.report ? (
            <ScoreBadge score={session.report.overallScore} />
          ) : (
            <Badge>завершено</Badge>
          )}
        </span>
      </Link>
    </li>
  );
}

export function InterviewPage() {
  const navigate = useNavigate();
  const ai = useApi(api.aiStatus);
  const history = useApi(api.interviews);

  const active = history.data?.sessions.find((session) => session.status === 'active');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Mock interview</h1>
        <p className="mt-1 text-sm text-muted">
          Симулятор собеседования: follow-up вопросы, live-coding, таймер и отчёт. Слабые темы из
          отчёта автоматически помечаются в роадмапе статусом «повторить».
        </p>
      </header>

      {active ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/40 bg-accent-soft/30">
          <p className="text-sm text-fg">
            Есть незавершённое интервью: <b>{INTERVIEW_FORMAT_LABELS[active.format]}</b>, начато{' '}
            {formatDate(active.startedAt)}.
          </p>
          <Button size="sm" onClick={() => void navigate(`/interview/${active.id}`)}>
            Продолжить →
          </Button>
        </Card>
      ) : null}

      {ai.loading ? (
        <Loading label="Проверяем AI" />
      ) : ai.data?.configured ? (
        <StartForm onStarted={(id) => void navigate(`/interview/${id}`)} />
      ) : (
        <AiUnavailable what="Mock interview" />
      )}

      <Card className="p-0">
        <div className="px-5 pt-5">
          <CardHeader title="История" subtitle="Транскрипты и отчёты всех интервью" />
        </div>
        {history.loading && !history.data ? (
          <div className="px-5">
            <Loading label="Загружаем историю" />
          </div>
        ) : history.error ? (
          <div className="px-5 pb-5">
            <ErrorState error={history.error} onRetry={history.reload} />
          </div>
        ) : history.data && history.data.sessions.length > 0 ? (
          <ul className="border-t border-line">
            {history.data.sessions.map((session) => (
              <HistoryRow key={session.id} session={session} />
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-muted">Интервью ещё не было.</p>
        )}
      </Card>
    </div>
  );
}
