import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TopicStatus, TopicWithProgress, UpdateProgressRequest } from '@jsskillup/shared';
import { TOPIC_STATUSES, TOPIC_STATUS_LABELS } from '@jsskillup/shared';
import { api, ApiRequestError } from '@/api/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useTopic } from './TopicLayout';

function StatusPicker({
  value,
  onChange,
  disabled,
}: {
  value: TopicStatus;
  onChange: (status: TopicStatus) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-panel-2 p-1">
      {TOPIC_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          disabled={disabled}
          onClick={() => onChange(status)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50',
            value === status ? 'bg-panel text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {TOPIC_STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}

/**
 * Панель монтируется с `key={topic.id}`, поэтому локальный черновик заметок
 * пересоздаётся при переходе на другую тему — синхронизация через эффект не нужна.
 */
function ProgressPanel({
  topic,
  onUpdated,
}: {
  topic: TopicWithProgress;
  onUpdated: (topic: TopicWithProgress) => void;
}) {
  const [notes, setNotes] = useState(topic.progress.notes);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const patch = async (body: UpdateProgressRequest): Promise<void> => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await api.updateProgress(topic.id, body);
      onUpdated(result.topic);
      setSavedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    } catch (cause) {
      setSaveError(cause instanceof ApiRequestError ? cause.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const manual = topic.progress.manualPercent;

  return (
    <Card>
      <CardHeader
        title="Мой прогресс"
        subtitle="Сохраняется сразу в локальную базу"
        action={
          savedAt && !saving ? (
            <span className="text-xs text-muted">Сохранено в {savedAt}</span>
          ) : null
        }
      />

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-fg">Статус</p>
          <StatusPicker
            value={topic.progress.status}
            disabled={saving}
            onChange={(status) => void patch({ status })}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-fg">Процент</p>
            <span className="text-xs text-muted">
              {manual === null
                ? `рассчитан автоматически: ${topic.progress.computedPercent}%`
                : `проставлен вручную: ${manual}%`}
            </span>
          </div>
          <ProgressBar percent={topic.percent} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[0, 25, 50, 75, 100].map((value) => (
              <Button
                key={value}
                size="sm"
                variant={manual === value ? 'primary' : 'secondary'}
                disabled={saving}
                onClick={() => void patch({ manualPercent: value })}
              >
                {value}%
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              disabled={saving || manual === null}
              onClick={() => void patch({ manualPercent: null })}
            >
              Считать автоматически
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-fg">Заметки</p>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
            placeholder="Что было непонятно, какие формулировки запомнить, ссылки на разборы"
            className="w-full resize-y rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-fg placeholder:text-muted"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button
              size="sm"
              disabled={saving || notes === topic.progress.notes}
              onClick={() => void patch({ notes })}
            >
              Сохранить заметки
            </Button>
            {notes !== topic.progress.notes ? (
              <span className="text-xs text-warning">Есть несохранённые изменения</span>
            ) : null}
          </div>
        </div>

        {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
      </div>
    </Card>
  );
}

function ContentStat({ icon, label, value, to }: { icon: string; label: string; value: number; to?: string }) {
  const body = (
    <>
      <span className="text-lg">{icon}</span>
      <span className="text-2xl font-semibold tabular-nums text-fg">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </>
  );
  const className =
    'flex flex-col items-center gap-0.5 rounded-lg border border-line bg-panel-2/50 px-3 py-4 text-center';

  return to && value > 0 ? (
    <Link to={to} className={cn(className, 'transition-colors hover:bg-panel-2')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function TopicOverview() {
  const { topic, prev, next, setTopic } = useTopic();

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Card>
          <CardHeader title="Подтемы" subtitle="Что нужно понимать по этой теме" />
          <ol className="space-y-2">
            {topic.subtopics.map((subtopic, index) => (
              <li key={subtopic.id} className="flex gap-3 rounded-lg bg-panel-2/60 px-4 py-2.5">
                <span className="w-5 shrink-0 text-sm tabular-nums text-muted">{index + 1}.</span>
                <span className="text-sm text-fg">{subtopic.title}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardHeader
            title="Материалы"
            subtitle={`Ориентировочно ${topic.estimatedMinutes} мин на проработку`}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ContentStat icon="📖" label="теория" value={topic.counts.theory} to="theory" />
            <ContentStat icon="❓" label="вопросов" value={topic.counts.questions} to="quiz" />
            <ContentStat icon="🃏" label="карточек" value={topic.counts.flashcards} to="cards" />
            <ContentStat icon="⌨️" label="задач" value={topic.counts.tasks} />
          </div>
          {topic.counts.theory === 0 && topic.counts.questions === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Материалов по этой теме пока нет. Можно вести заметки, отмечать прогресс вручную
              и сгенерировать вопросы через AI на вкладке «Квиз».
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {topic.counts.theory > 0 ? (
                <ButtonLink to="theory" size="sm">
                  Читать теорию
                </ButtonLink>
              ) : null}
              {topic.counts.questions > 0 ? (
                <ButtonLink to="quiz" size="sm" variant="secondary">
                  Пройти квиз
                </ButtonLink>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-5">
        <ProgressPanel key={topic.id} topic={topic} onUpdated={setTopic} />

        <Card>
          <CardHeader title="Навигация" />
          <div className="space-y-2">
            {prev ? (
              <Link
                to={`/topic/${prev.slug}`}
                className="block rounded-lg border border-line px-4 py-3 text-sm transition-colors hover:bg-panel-2"
              >
                <span className="text-xs text-muted">← Предыдущая</span>
                <p className="mt-0.5 font-medium text-fg">{prev.title}</p>
              </Link>
            ) : null}
            {next ? (
              <Link
                to={`/topic/${next.slug}`}
                className="block rounded-lg border border-line px-4 py-3 text-right text-sm transition-colors hover:bg-panel-2"
              >
                <span className="text-xs text-muted">Следующая →</span>
                <p className="mt-0.5 font-medium text-fg">{next.title}</p>
              </Link>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
