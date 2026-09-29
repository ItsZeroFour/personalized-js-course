import type { ReactNode } from 'react';
import type { CodeReview, OpenAnswerGrade } from '@jsskillup/shared';
import { Markdown } from '@/components/ui/Markdown';
import { Badge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/cn';

/** Подсказка вместо AI-кнопок, когда ключ не настроен. */
export function AiUnavailable({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-panel-2/40 p-4 text-sm text-muted">
      <p className="font-medium text-fg">{what} требует ключа Groq</p>
      <p className="mt-1">
        Добавьте <code className="rounded bg-panel px-1 py-0.5 font-mono text-xs">GROQ_API_KEY</code>{' '}
        в файл <code className="rounded bg-panel px-1 py-0.5 font-mono text-xs">.env</code> в корне
        проекта и перезапустите сервер. Ключ бесплатно берётся на console.groq.com.
      </p>
    </div>
  );
}

function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 7) return 'success';
  if (score >= 4) return 'warning';
  return 'danger';
}

export function ScoreBadge({ score, max = 10 }: { score: number; max?: number }) {
  const tone = scoreTone(score);
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 rounded-md px-2.5 py-1 text-sm font-semibold',
        tone === 'success' && 'bg-success-soft text-success',
        tone === 'warning' && 'bg-warning-soft text-warning',
        tone === 'danger' && 'bg-danger-soft text-danger',
      )}
    >
      <span className="text-lg tabular-nums">{Math.round(score * 10) / 10}</span>
      <span className="text-xs opacity-70">/ {max}</span>
    </span>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'warning' | 'danger' | 'muted' }) {
  if (items.length === 0) return null;

  const marker = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    muted: 'text-accent',
  }[tone];

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-fg">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-muted">
            <span className={marker}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-fg">{title}</p>
      {children}
    </div>
  );
}

export function OpenAnswerGradePanel({ grade }: { grade: OpenAnswerGrade }) {
  return (
    <div className="space-y-4 rounded-lg border border-accent/30 bg-accent-soft/30 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">Оценка AI</Badge>
        <ScoreBadge score={grade.score} />
        <p className="min-w-48 flex-1 text-sm text-fg">{grade.summary}</p>
      </div>

      <List title="Что прозвучало" items={grade.covered} tone="success" />
      <List title="Чего не хватило" items={grade.missed} tone="warning" />
      <List title="Ошибки в ответе" items={grade.mistakes} tone="danger" />

      {grade.strongCandidateAnswerMd ? (
        <Section title="Как ответил бы сильный кандидат">
          <div className="rounded-lg border border-line bg-panel p-4">
            <Markdown compact>{grade.strongCandidateAnswerMd}</Markdown>
          </div>
        </Section>
      ) : null}

      {grade.referenceAnswerMd ? (
        <Section title="Эталонный ответ">
          <div className="rounded-lg border border-line bg-panel p-4">
            <Markdown compact>{grade.referenceAnswerMd}</Markdown>
          </div>
        </Section>
      ) : null}

      <List title="Что спросят дальше" items={grade.followUpQuestions} tone="muted" />
    </div>
  );
}

export function CodeReviewPanel({ review }: { review: CodeReview }) {
  return (
    <div className="space-y-4 rounded-lg border border-accent/30 bg-accent-soft/30 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Корректность
            </span>
            <ScoreBadge score={review.correctness.score} />
          </div>
          <p className="mt-2 text-sm text-fg/80">{review.correctness.comment}</p>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Сложность</span>
          <p className="mt-1 font-mono text-sm text-fg">
            {review.complexity.time} · {review.complexity.space}
          </p>
          <p className="mt-2 text-sm text-fg/80">{review.complexity.comment}</p>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Читаемость
            </span>
            <ScoreBadge score={review.readability.score} />
          </div>
          <p className="mt-2 text-sm text-fg/80">{review.readability.comment}</p>
        </div>
      </div>

      <List title="Что улучшить" items={review.improvements} tone="warning" />

      {review.rewrittenCode ? (
        <Section title="Как это можно написать">
          <Markdown compact>{`\`\`\`ts\n${review.rewrittenCode}\n\`\`\``}</Markdown>
        </Section>
      ) : null}

      <List title="Что спросит интервьюер дальше" items={review.interviewerFollowUps} tone="muted" />
    </div>
  );
}
