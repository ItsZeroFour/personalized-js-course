import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StageWithTopics, TopicStatus } from '@jsskillup/shared';
import { TOPIC_STATUSES, TOPIC_STATUS_LABELS } from '@jsskillup/shared';
import { api } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, Loading } from '@/components/ui/States';
import { cn } from '@/lib/cn';

type Filter = TopicStatus | 'all';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Все' },
  ...TOPIC_STATUSES.map((status) => ({ value: status, label: TOPIC_STATUS_LABELS[status] })),
];

function StageBlock({ stage, filter }: { stage: StageWithTopics; filter: Filter }) {
  const [open, setOpen] = useState(true);
  const topics =
    filter === 'all' ? stage.topics : stage.topics.filter((t) => t.progress.status === filter);

  if (topics.length === 0) return null;

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="text-xl">{stage.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-fg">{stage.title}</h2>
            <span className="text-xs text-muted">{stage.topics.length} тем</span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted">{stage.description}</p>
        </div>
        <div className="hidden w-40 shrink-0 items-center gap-3 sm:flex">
          <ProgressBar percent={stage.percent} size="sm" />
          <span className="w-10 text-right text-sm font-medium tabular-nums text-fg">
            {stage.percent}%
          </span>
        </div>
        <span className={cn('text-muted transition-transform', open && 'rotate-90')}>›</span>
      </button>

      {open ? (
        <ul className="border-t border-line">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link
                to={`/topic/${topic.slug}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 last:border-b-0 transition-colors hover:bg-panel-2"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-fg">{topic.title}</span>
                    <StatusBadge status={topic.progress.status} />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">{topic.summary}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  <span title="Материалов теории">📖 {topic.counts.theory}</span>
                  <span title="Вопросов">❓ {topic.counts.questions}</span>
                  <span title="Задач">⌨️ {topic.counts.tasks}</span>
                  <span title="Карточек">🃏 {topic.counts.flashcards}</span>
                </div>

                <div className="flex w-36 shrink-0 items-center gap-2">
                  <ProgressBar percent={topic.percent} size="sm" />
                  <span className="w-9 text-right text-xs font-medium tabular-nums text-fg">
                    {topic.percent}%
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function RoadmapPage() {
  const { data, error, loading, reload } = useApi(api.roadmap);
  const [filter, setFilter] = useState<Filter>('all');

  if (loading) return <Loading label="Загружаем роадмап" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const totalTopics = data.stages.reduce((acc, stage) => acc + stage.topics.length, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Роадмап</h1>
          <p className="mt-1 text-sm text-muted">
            {data.stages.length} этапов, {totalTopics} тем. Порядок подобран под слабые места: сначала
            JS core и алгоритмы.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-panel p-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === item.value ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-4">
        {data.stages.map((stage) => (
          <StageBlock key={stage.id} stage={stage} filter={filter} />
        ))}
      </div>
    </div>
  );
}
