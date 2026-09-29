import { useState } from 'react';
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import type { TopicResponse, TopicWithProgress } from '@jsskillup/shared';
import { api } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, Loading } from '@/components/ui/States';
import { cn } from '@/lib/cn';

export interface TopicContext {
  topic: TopicWithProgress;
  stage: TopicResponse['stage'];
  prev: TopicResponse['prev'];
  next: TopicResponse['next'];
  /** Заменить тему целиком — после PATCH прогресса. */
  setTopic: (topic: TopicWithProgress) => void;
  /** Обновить только процент — после ответа на вопрос, чтения статьи или повторения карточки. */
  setPercent: (percent: number) => void;
}

export function useTopic(): TopicContext {
  return useOutletContext<TopicContext>();
}

const TABS = [
  { to: '.', label: 'Обзор', end: true },
  { to: 'theory', label: 'Теория' },
  { to: 'quiz', label: 'Квиз' },
  { to: 'cards', label: 'Карточки' },
];

export function TopicLayout() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, error, loading, reload } = useApi(api.topic, slug);
  const [override, setOverride] = useState<TopicWithProgress | null>(null);

  if (loading) return <Loading label="Загружаем тему" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const topic = override && override.id === data.topic.id ? override : data.topic;

  const context: TopicContext = {
    topic,
    stage: data.stage,
    prev: data.prev,
    next: data.next,
    setTopic: setOverride,
    setPercent: (percent) =>
      setOverride({
        ...topic,
        percent: topic.progress.manualPercent ?? percent,
        progress: { ...topic.progress, computedPercent: percent },
      }),
  };

  const counts = topic.counts;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link to="/roadmap" className="hover:text-fg">
          Роадмап
        </Link>
        <span>/</span>
        <span>
          {data.stage.icon} {data.stage.title}
        </span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{topic.title}</h1>
          <StatusBadge status={topic.progress.status} />
        </div>
        <p className="max-w-3xl text-sm text-muted">{topic.summary}</p>
        <div className="flex max-w-md items-center gap-3">
          <ProgressBar percent={topic.percent} size="sm" />
          <span className="w-10 text-right text-sm font-medium tabular-nums text-fg">
            {topic.percent}%
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1 border-b border-line">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-fg',
              )
            }
          >
            {tab.label}
            {tab.label === 'Квиз' && counts.questions > 0 ? (
              <span className="ml-1.5 text-xs text-muted">{counts.questions}</span>
            ) : null}
            {tab.label === 'Карточки' && counts.flashcards > 0 ? (
              <span className="ml-1.5 text-xs text-muted">{counts.flashcards}</span>
            ) : null}
          </NavLink>
        ))}
      </div>

      <Outlet context={context} />
    </div>
  );
}
