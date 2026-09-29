import { Link } from 'react-router-dom';
import type { DashboardResponse } from '@jsskillup/shared';
import { api } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressBar, ProgressRing } from '@/components/ui/ProgressBar';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { ErrorState, Loading } from '@/components/ui/States';
import { cn } from '@/lib/cn';

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function heatClass(score: number): string {
  if (score === 0) return 'bg-panel-2';
  if (score <= 2) return 'bg-accent/30';
  if (score <= 5) return 'bg-accent/55';
  if (score <= 10) return 'bg-accent/80';
  return 'bg-accent';
}

function StreakCard({ streak }: { streak: DashboardResponse['streak'] }) {
  return (
    <Card>
      <CardHeader
        title="Серия дней"
        subtitle={
          streak.activeToday
            ? 'Сегодня уже занимались — серия продолжается'
            : 'Сегодня активности ещё не было'
        }
      />
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums text-fg">{streak.current}</span>
        <span className="text-sm text-muted">
          {plural(streak.current, 'день подряд', 'дня подряд', 'дней подряд')}
        </span>
        <span className="ml-auto text-xs text-muted">Рекорд: {streak.longest}</span>
      </div>

      <div
        className="mt-5 grid grid-flow-col grid-rows-7 gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.ceil(streak.history.length / 7)}, minmax(0, 1fr))` }}
      >
        {streak.history.map((day) => (
          <div
            key={day.day}
            title={`${day.day}: ${day.score} ${plural(day.score, 'действие', 'действия', 'действий')}`}
            className={cn('aspect-square rounded-[3px]', heatClass(day.score))}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Последние 12 недель</p>
    </Card>
  );
}

function OverallCard({ overall }: { overall: DashboardResponse['overall'] }) {
  return (
    <Card className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <ProgressRing percent={overall.percent} label="роадмапа" />
      <div className="grid w-full grid-cols-2 gap-4">
        <Stat value={overall.topicsTotal} label="тем всего" />
        <Stat value={overall.topicsLearned} label="изучено" tone="success" />
        <Stat value={overall.topicsInProgress} label="в процессе" tone="accent" />
        <Stat value={overall.topicsToReview} label="повторить" tone="warning" />
      </div>
    </Card>
  );
}

function Stat({
  value,
  label,
  tone = 'default',
}: {
  value: number;
  label: string;
  tone?: 'default' | 'accent' | 'success' | 'warning';
}) {
  const toneClass = {
    default: 'text-fg',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
  }[tone];
  return (
    <div>
      <p className={cn('text-2xl font-semibold tabular-nums', toneClass)}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data, error, loading, reload } = useApi(api.dashboard);

  if (loading) return <Loading label="Считаем прогресс" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Дашборд</h1>
        <p className="mt-1 text-sm text-muted">
          Общий прогресс, серия дней и то, чем стоит заняться прямо сейчас.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <OverallCard overall={data.overall} />
        <StreakCard streak={data.streak} />
      </div>

      <Card>
        <CardHeader title="Что делать сегодня" subtitle="Рекомендации из текущего состояния прогресса" />
        {data.recommendations.length === 0 ? (
          <p className="text-sm text-muted">Роадмап полностью пройден. Запусти mock interview.</p>
        ) : (
          <ul className="space-y-3">
            {data.recommendations.map((recommendation) => (
              <li
                key={recommendation.title}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel-2/60 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{recommendation.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{recommendation.reason}</p>
                </div>
                <ButtonLink to={recommendation.href} size="sm" variant="secondary">
                  {recommendation.actionLabel}
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4 text-xs text-muted">
          <Badge>Карточек к повторению: {data.today.dueCards}</Badge>
          <Badge>Неотвеченных вопросов: {data.today.unansweredQuestions}</Badge>
          <Badge>Нерешённых задач: {data.today.unsolvedTasks}</Badge>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Прогресс по этапам"
            action={
              <Link to="/roadmap" className="text-sm font-medium text-accent hover:underline">
                Роадмап
              </Link>
            }
          />
          <ul className="space-y-4">
            {data.stages.map((stage) => (
              <li key={stage.id}>
                <div className="mb-1.5 flex items-center gap-2 text-sm">
                  <span>{stage.icon}</span>
                  <span className="font-medium text-fg">{stage.title}</span>
                  <span className="ml-auto tabular-nums text-muted">
                    {stage.topicsLearned}/{stage.topicsTotal}
                  </span>
                  <span className="w-10 text-right tabular-nums font-medium text-fg">
                    {stage.percent}%
                  </span>
                </div>
                <ProgressBar percent={stage.percent} size="sm" />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Слабые темы"
            subtitle="По результатам квизов, задач и mock interview"
          />
          {data.weakTopics.length === 0 ? (
            <p className="text-sm text-muted">
              Пока данных нет. Слабые темы появятся, когда наберётся статистика по ответам.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.weakTopics.map((topic) => (
                <li key={topic.topicId}>
                  <Link
                    to={`/topic/${topic.slug}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 transition-colors hover:bg-panel-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{topic.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{topic.reason}</p>
                    </div>
                    <Badge tone="warning">{topic.stageTitle}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
