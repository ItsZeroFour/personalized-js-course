import { useEffect, useRef } from 'react';
import type { InterviewMoveKind, InterviewTurn } from '@jsskillup/shared';
import { Markdown } from '@/components/ui/Markdown';
import { Badge } from '@/components/ui/StatusBadge';
import { ScoreBadge } from '@/components/ai/AiPanels';
import { cn } from '@/lib/cn';

const KIND_LABELS: Record<InterviewMoveKind, string> = {
  question: 'вопрос',
  follow_up: 'уточнение',
  coding_task: 'задача',
  code_comment: 'про код',
  wrap_up: 'конец',
};

function InterviewerBubble({ turn, live }: { turn: InterviewTurn; live: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm">
        🎤
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-medium text-fg">Интервьюер</span>
          {turn.kind && turn.kind !== 'question' ? <Badge>{KIND_LABELS[turn.kind]}</Badge> : null}
        </div>
        <div className="rounded-xl rounded-tl-sm border border-line bg-panel px-4 py-3">
          <Markdown compact>{turn.content}</Markdown>
          {turn.codingTask ? (
            <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/30 p-3">
              <p className="text-sm font-semibold text-fg">⌨️ {turn.codingTask.title}</p>
              <div className="mt-1.5">
                <Markdown compact>{turn.codingTask.statementMd}</Markdown>
              </div>
              {live ? <p className="mt-2 text-xs text-muted">Решение пишите в редакторе справа.</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CandidateBubble({ turn }: { turn: InterviewTurn }) {
  return (
    <div className="flex flex-row-reverse gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-panel-2 text-sm">
        🙋
      </div>
      <div className="min-w-0 max-w-[85%] space-y-2">
        <p className="text-right text-xs font-medium text-fg">Вы</p>
        <div className="rounded-xl rounded-tr-sm bg-accent-soft/50 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-fg">{turn.content}</p>
          {turn.code ? (
            <div className="mt-2">
              <Markdown compact>{`\`\`\`ts\n${turn.code}\n\`\`\``}</Markdown>
            </div>
          ) : null}
        </div>
        {turn.assessment ? (
          <div className="flex items-start gap-2 rounded-lg border border-line bg-panel-2/50 px-3 py-2">
            <ScoreBadge score={turn.assessment.score} />
            <p className="text-xs leading-relaxed text-muted">{turn.assessment.note}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Transcript({
  turns,
  thinking = false,
  autoScroll = false,
  live = false,
  className,
}: {
  turns: readonly InterviewTurn[];
  /** Показать «интервьюер думает…» в конце. */
  thinking?: boolean;
  autoScroll?: boolean;
  /** Интервью идёт: показываются подсказки про редактор. */
  live?: boolean;
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const count = turns.length;

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [autoScroll, count, thinking]);

  return (
    <div className={cn('space-y-5', className)}>
      {turns.map((turn) =>
        turn.role === 'candidate' ? (
          <CandidateBubble key={turn.id} turn={turn} />
        ) : turn.role === 'interviewer' ? (
          <InterviewerBubble key={turn.id} turn={turn} live={live} />
        ) : (
          <p key={turn.id} className="text-center text-xs text-muted">
            {turn.content}
          </p>
        ),
      )}
      {thinking ? (
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          Интервьюер обдумывает ваш ответ…
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
