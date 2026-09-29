import { useState } from 'react';
import type { FlashcardWithState, ReviewGrade, Sm2State } from '@jsskillup/shared';
import { api, ApiRequestError } from '@/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { Markdown } from '@/components/ui/Markdown';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';

interface GradeOption {
  grade: ReviewGrade;
  label: string;
  hint: string;
  className: string;
}

/**
 * Четыре кнопки вместо шести оценок SM-2: промежуточные значения на практике
 * никто не различает, а 0 / 3 / 4 / 5 дают заметно разные интервалы.
 */
const GRADES: GradeOption[] = [
  {
    grade: 0,
    label: 'Не помню',
    hint: 'серия сбросится',
    className: 'border-danger text-danger hover:bg-danger-soft',
  },
  {
    grade: 3,
    label: 'Сложно',
    hint: 'интервал вырастет меньше',
    className: 'border-warning text-warning hover:bg-warning-soft',
  },
  {
    grade: 4,
    label: 'Норм',
    hint: 'обычный рост интервала',
    className: 'border-accent text-accent hover:bg-accent-soft',
  },
  {
    grade: 5,
    label: 'Легко',
    hint: 'интервал вырастет сильнее',
    className: 'border-success text-success hover:bg-success-soft',
  },
];

function formatInterval(days: number): string {
  if (days === 1) return 'завтра';
  if (days < 5) return `через ${days} дня`;
  if (days < 30) return `через ${days} дней`;
  const months = Math.round(days / 30);
  return months === 1 ? 'через месяц' : `через ${months} мес.`;
}

interface CardReviewerProps {
  cards: FlashcardWithState[];
  /** Вызывается после каждого повторения — чтобы обновить прогресс темы снаружи. */
  onReviewed?: (cardId: string, state: Sm2State, topicPercent: number) => void;
  onFinished?: () => void;
}

export function CardReviewer({ cards, onReviewed, onFinished }: CardReviewerProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInterval, setLastInterval] = useState<number | null>(null);

  const card = cards[index];

  if (!card) {
    return (
      <Card className="text-center">
        <p className="text-2xl">🎉</p>
        <p className="mt-2 text-sm font-semibold text-fg">Очередь на сегодня пуста</p>
        <p className="mt-1 text-sm text-muted">
          {lastInterval !== null
            ? `Последняя карточка вернётся ${formatInterval(lastInterval)}.`
            : 'Карточки вернутся по расписанию интервального повторения.'}
        </p>
        {onFinished ? (
          <Button className="mt-4" variant="secondary" onClick={onFinished}>
            Готово
          </Button>
        ) : null}
      </Card>
    );
  }

  const grade = async (value: ReviewGrade): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.reviewCard(card.id, { grade: value });
      setLastInterval(result.state.intervalDays);
      onReviewed?.(card.id, result.state, result.topicPercent);
      setRevealed(false);
      setIndex(index + 1);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Не удалось сохранить повторение');
    } finally {
      setSaving(false);
    }
  };

  const isNew = card.state.repetitions === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ProgressBar percent={(index / cards.length) * 100} size="sm" />
        <span className="shrink-0 text-sm tabular-nums text-muted">
          {index + 1} / {cards.length}
        </span>
      </div>

      <Card className="min-h-64 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {isNew ? <Badge tone="accent">Новая</Badge> : <Badge>Повторение {card.state.repetitions + 1}</Badge>}
          {card.state.lapses > 0 ? <Badge tone="warning">Забывали {card.state.lapses} раз</Badge> : null}
          {card.source === 'ai' ? <Badge tone="warning">AI</Badge> : null}
          <span className="ml-auto text-xs text-muted">
            интервал {card.state.intervalDays} дн., лёгкость {card.state.ease.toFixed(2)}
          </span>
        </div>

        <div className="py-2">
          <Markdown compact>{card.frontMd}</Markdown>
        </div>

        {revealed ? (
          <div className="border-t border-line pt-5">
            <Markdown compact>{card.backMd}</Markdown>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {revealed ? (
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-5 sm:grid-cols-4">
            {GRADES.map((option) => (
              <button
                key={option.grade}
                type="button"
                disabled={saving}
                onClick={() => void grade(option.grade)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border px-3 py-3 transition-colors disabled:opacity-50',
                  option.className,
                )}
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-[11px] text-muted">{option.hint}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="border-t border-line pt-5">
            <Button onClick={() => setRevealed(true)}>Показать ответ</Button>
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-muted">
        Алгоритм SM-2: успешный ответ растит интервал 1 → 6 дней → предыдущий × фактор лёгкости.
      </p>
    </div>
  );
}
