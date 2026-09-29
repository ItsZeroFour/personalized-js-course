import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, Loading } from '@/components/ui/States';
import { CardReviewer } from '@/components/cards/CardReviewer';

export function CardsPage() {
  const { data, error, loading, reload } = useApi(api.cardQueue);
  const [reviewing, setReviewing] = useState(false);

  if (loading) return <Loading label="Собираем очередь на сегодня" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  if (reviewing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <CardReviewer
          cards={data.due}
          onFinished={() => {
            setReviewing(false);
            reload();
          }}
        />
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setReviewing(false);
              reload();
            }}
          >
            Выйти из повторения
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Флеш-карточки</h1>
        <p className="mt-1 text-sm text-muted">
          Интервальное повторение по алгоритму SM-2: чем увереннее вспоминаете, тем реже карточка
          возвращается.
        </p>
      </header>

      {data.dueCount === 0 ? (
        <EmptyState
          title="На сегодня всё повторено"
          description={
            data.tomorrowCount > 0
              ? `Завтра вернётся ${data.tomorrowCount} карточек.`
              : 'Ближайшие карточки появятся по расписанию.'
          }
          action={<ButtonLink to="/roadmap">К роадмапу</ButtonLink>}
        />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-muted">
              К повторению: <span className="text-lg font-semibold text-fg">{data.dueCount}</span>
            </span>
            <span className="text-muted">
              Из них новых: <span className="font-medium text-fg">{data.newCount}</span>
            </span>
            <span className="text-muted">
              Завтра: <span className="font-medium text-fg">{data.tomorrowCount}</span>
            </span>
          </div>
          <Button onClick={() => setReviewing(true)}>
            Начать повторение ({data.due.length})
          </Button>
        </Card>
      )}

      {data.byTopic.length > 0 ? (
        <Card>
          <CardHeader title="Очередь по темам" subtitle="Что именно всплыло на повторение" />
          <ul className="space-y-2">
            {data.byTopic.map((row) => (
              <li key={row.topicId}>
                <Link
                  to={`/topic/${row.slug}/cards`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 transition-colors hover:bg-panel-2"
                >
                  <span className="text-sm font-medium text-fg">{row.title}</span>
                  <Badge tone="accent">{row.count}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
