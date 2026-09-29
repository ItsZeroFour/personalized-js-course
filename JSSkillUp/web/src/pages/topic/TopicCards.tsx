import { useState } from 'react';
import type { FlashcardWithState } from '@jsskillup/shared';
import { api } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { Markdown } from '@/components/ui/Markdown';
import { EmptyState, ErrorState, Loading } from '@/components/ui/States';
import { CardReviewer } from '@/components/cards/CardReviewer';
import { useTopic } from './TopicLayout';

function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function CardRow({ card }: { card: FlashcardWithState }) {
  const [open, setOpen] = useState(false);
  const due = card.state.dueDate <= todayString();

  return (
    <li className="rounded-lg border border-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <Markdown compact>{card.frontMd}</Markdown>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {due ? (
            <Badge tone="accent">к повторению</Badge>
          ) : (
            <span className="text-xs text-muted">{card.state.dueDate}</span>
          )}
          <span className="text-muted">{open ? '−' : '+'}</span>
        </div>
      </button>
      {open ? (
        <div className="border-t border-line px-4 py-3">
          <Markdown compact>{card.backMd}</Markdown>
          <p className="mt-3 text-xs text-muted">
            Повторений: {card.state.repetitions} · интервал {card.state.intervalDays} дн. · лёгкость{' '}
            {card.state.ease.toFixed(2)}
            {card.state.lapses > 0 ? ` · забывали ${card.state.lapses} раз` : ''}
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function TopicCards() {
  const { topic, setPercent } = useTopic();
  const { data, error, loading, reload } = useApi(api.topicCards, topic.slug);
  const [reviewing, setReviewing] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, FlashcardWithState | undefined>>({});

  if (loading) return <Loading label="Загружаем карточки" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  if (data.cards.length === 0) {
    return (
      <EmptyState
        title="Карточек по этой теме пока нет"
        description="Карточки добавляются в seed-файлы — см. раздел README «Как добавлять свой контент»."
        action={<ButtonLink to="/roadmap">К роадмапу</ButtonLink>}
      />
    );
  }

  const cards = data.cards.map((card) => overrides[card.id] ?? card);
  const due = cards.filter((card) => card.state.dueDate <= todayString());

  if (reviewing) {
    return (
      <div className="mx-auto max-w-2xl">
        <CardReviewer
          cards={due}
          onReviewed={(cardId, state, percent) => {
            const source = cards.find((card) => card.id === cardId);
            if (source) setOverrides((prev) => ({ ...prev, [cardId]: { ...source, state } }));
            setPercent(percent);
          }}
          onFinished={() => setReviewing(false)}
        />
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => setReviewing(false)}>
            Выйти из повторения
          </Button>
        </div>
      </div>
    );
  }

  const mature = cards.filter((card) => card.state.intervalDays >= 21).length;

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted">
            Всего: <span className="font-medium text-fg">{cards.length}</span>
          </span>
          <span className="text-muted">
            К повторению сегодня: <span className="font-medium text-fg">{due.length}</span>
          </span>
          <span className="text-muted">
            Усвоено (интервал ≥ 21 дн.): <span className="font-medium text-fg">{mature}</span>
          </span>
        </div>
        <Button disabled={due.length === 0} onClick={() => setReviewing(true)}>
          {due.length > 0 ? `Повторить ${due.length}` : 'На сегодня всё'}
        </Button>
      </Card>

      <Card>
        <CardHeader title="Все карточки темы" subtitle="Нажмите, чтобы раскрыть ответ" />
        <ul className="space-y-2">
          {cards.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
