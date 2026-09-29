import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Difficulty, TaskFilterStatus, TaskKind, TaskListItem } from '@jsskillup/shared';
import { DIFFICULTIES, DIFFICULTY_LABELS, TASK_KINDS, TASK_KIND_LABELS } from '@jsskillup/shared';
import { api } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState, ErrorState, Loading } from '@/components/ui/States';
import { cn } from '@/lib/cn';

interface Filters {
  kind: TaskKind | '';
  difficulty: Difficulty | '';
  status: TaskFilterStatus;
  search: string;
}

const EMPTY_FILTERS: Filters = { kind: '', difficulty: '', status: 'all', search: '' };

const STATUS_LABELS: Record<TaskFilterStatus, string> = {
  all: 'Все',
  unsolved: 'Нерешённые',
  attempted: 'Начатые',
  solved: 'Решённые',
};

const DIFFICULTY_TONE: Record<Difficulty, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

function toQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  return params.toString();
}

function FilterGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-panel p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === option.value ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TaskRow({ task }: { task: TaskListItem }) {
  return (
    <li>
      <Link
        to={`/tasks/${task.slug}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 last:border-b-0 transition-colors hover:bg-panel-2"
      >
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
            task.solved
              ? 'border-success bg-success-soft text-success'
              : task.attempts > 0
                ? 'border-warning bg-warning-soft text-warning'
                : 'border-line text-muted',
          )}
          title={task.solved ? 'Решено' : task.attempts > 0 ? 'Есть попытки' : 'Не начата'}
        >
          {task.solved ? '✓' : task.attempts > 0 ? '·' : ''}
        </span>

        <div className="min-w-0 flex-1 basis-64">
          <p className="truncate text-sm font-medium text-fg">{task.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {task.topicTitle ?? 'Без темы'}
            {task.tags.length > 0 ? ` · ${task.tags.join(', ')}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={DIFFICULTY_TONE[task.difficulty]}>
            {DIFFICULTY_LABELS[task.difficulty]}
          </Badge>
          <Badge>{TASK_KIND_LABELS[task.kind]}</Badge>
          {task.source === 'ai' ? <Badge tone="warning">AI</Badge> : null}
        </div>

        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted">
          {task.attempts > 0 ? `${task.bestPassed}/${task.testCount} тестов` : `${task.testCount} тестов`}
        </span>
      </Link>
    </li>
  );
}

export function TasksPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const { data, error, loading, reload } = useApi(api.tasks, toQuery(filters));

  const update = (patch: Partial<Filters>): void => setFilters({ ...filters, ...patch });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Практические задачи</h1>
        <p className="mt-1 text-sm text-muted">
          JS/TS-задачи выполняются в изолированном Web Worker, React-задачи — в sandbox-iframe
          с живым превью. У каждого теста лимит времени: бесконечный цикл не повесит вкладку.
        </p>
      </header>

      {data ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-muted">
              Решено:{' '}
              <span className="font-medium text-fg">
                {data.facets.solved} из {data.facets.total}
              </span>
            </span>
            <span className="text-muted">
              Лёгких {data.facets.byDifficulty.easy} · средних {data.facets.byDifficulty.medium} ·
              сложных {data.facets.byDifficulty.hard}
            </span>
          </div>
          <div className="flex w-full max-w-xs items-center gap-3">
            <ProgressBar
              percent={data.facets.total === 0 ? 0 : (data.facets.solved / data.facets.total) * 100}
              size="sm"
              tone="success"
            />
            <span className="w-10 text-right text-sm font-medium tabular-nums text-fg">
              {data.facets.total === 0
                ? 0
                : Math.round((data.facets.solved / data.facets.total) * 100)}
              %
            </span>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <FilterGroup
          value={filters.status}
          onChange={(status) => update({ status })}
          options={(['all', 'unsolved', 'attempted', 'solved'] as const).map((value) => ({
            value,
            label: STATUS_LABELS[value],
          }))}
        />
        <FilterGroup
          value={filters.difficulty}
          onChange={(difficulty) => update({ difficulty })}
          options={[
            { value: '' as const, label: 'Любая' },
            ...DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] })),
          ]}
        />
        <FilterGroup
          value={filters.kind}
          onChange={(kind) => update({ kind })}
          options={[
            { value: '' as const, label: 'Все типы' },
            ...TASK_KINDS.map((value) => ({ value, label: TASK_KIND_LABELS[value] })),
          ]}
        />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
          placeholder="Поиск по названию"
          className="h-10 min-w-48 flex-1 rounded-lg border border-line bg-panel px-3 text-sm text-fg placeholder:text-muted"
        />
      </div>

      {loading ? <Loading label="Загружаем задачи" /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {data && !loading ? (
        data.tasks.length === 0 ? (
          <EmptyState
            title="Ничего не найдено"
            description="Попробуйте изменить фильтры или поисковый запрос."
          />
        ) : (
          <Card className="p-0">
            <ul>
              {data.tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          </Card>
        )
      ) : null}
    </div>
  );
}
