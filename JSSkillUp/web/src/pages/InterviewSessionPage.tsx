import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { InterviewSessionWithTurns, InterviewTurn } from '@jsskillup/shared';
import { INTERVIEW_FORMAT_LABELS } from '@jsskillup/shared';
import { api, type ApiRequestError } from '@/api/client';
import { toApiError, useApi } from '@/lib/useApi';
import { useNow } from '@/lib/useNow';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { ErrorState, Loading } from '@/components/ui/States';
import { Transcript } from '@/components/interview/Transcript';
import { ReportView } from '@/components/interview/ReportView';
import { LiveCodingPanel } from '@/components/interview/LiveCodingPanel';
import { cn } from '@/lib/cn';

// --- Черновики в localStorage: обновление страницы не должно терять ответ и код ---

const answerKey = (sessionId: string): string => `jsskillup:interview-answer:${sessionId}`;
const codeKey = (sessionId: string, taskTurnId: number): string =>
  `jsskillup:interview-code:${sessionId}:${taskTurnId}`;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Приватный режим — черновик просто не сохранится.
  }
}

// --- Таймер ---

function formatClock(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function Timer({ startedAt, plannedMinutes }: { startedAt: string; plannedMinutes: number }) {
  const now = useNow(1000);
  const elapsed = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const remaining = plannedMinutes * 60 - elapsed;
  const overtime = remaining < 0;

  return (
    <div
      className={cn(
        'flex items-baseline gap-2 rounded-lg border px-3 py-1.5 font-mono tabular-nums',
        overtime
          ? 'border-danger/40 bg-danger-soft text-danger'
          : remaining < 5 * 60
            ? 'border-warning/40 bg-warning-soft text-warning'
            : 'border-line bg-panel text-fg',
      )}
      title={`Прошло ${formatClock(elapsed)} из ${plannedMinutes}:00`}
    >
      <span className="text-lg font-semibold">
        {overtime ? `+${formatClock(remaining)}` : formatClock(remaining)}
      </span>
      <span className="text-xs opacity-70">{overtime ? 'сверх времени' : 'осталось'}</span>
    </div>
  );
}

// --- Сессия ---

/** Последняя задача для live-coding и код, который кандидат отправлял после неё. */
function findCodingState(turns: readonly InterviewTurn[]): {
  taskTurn: InterviewTurn | null;
  lastSentCode: string | null;
} {
  let taskIndex = -1;
  turns.forEach((turn, index) => {
    if (turn.role === 'interviewer' && turn.codingTask) taskIndex = index;
  });
  if (taskIndex === -1) return { taskTurn: null, lastSentCode: null };

  const sent = turns.slice(taskIndex + 1).filter((turn) => turn.role === 'candidate' && turn.code);
  return { taskTurn: turns[taskIndex] ?? null, lastSentCode: sent.at(-1)?.code ?? null };
}

type Action = 'answer' | 'finish' | 'abort' | 'delete';

const ACTION_ERROR_TITLES: Record<Action, string> = {
  answer: 'Интервьюер не ответил',
  finish: 'Не удалось составить отчёт',
  abort: 'Не удалось прервать интервью',
  delete: 'Не удалось удалить интервью',
};

function ActiveSession({
  session,
  onUpdate,
}: {
  session: InterviewSessionWithTurns;
  onUpdate: (session: InterviewSessionWithTurns) => void;
}) {
  const [answer, setAnswer] = useState(() => readStorage(answerKey(session.id)) ?? '');
  const [codeDrafts, setCodeDrafts] = useState<Record<number, string>>({});
  const [attachCode, setAttachCode] = useState(true);
  const [pending, setPending] = useState<Action | null>(null);
  const [failure, setFailure] = useState<{ action: Action; error: ApiRequestError } | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);

  const { taskTurn, lastSentCode } = findCodingState(session.turns);
  const codingTask = taskTurn?.codingTask ?? null;
  const code =
    taskTurn === null
      ? ''
      : (codeDrafts[taskTurn.id] ??
        readStorage(codeKey(session.id, taskTurn.id)) ??
        lastSentCode ??
        codingTask?.starterCode ??
        '');

  const lastInterviewerTurn = session.turns.findLast((turn) => turn.role === 'interviewer');
  const wrappedUp = lastInterviewerTurn?.kind === 'wrap_up';
  const now = useNow(15_000);
  const elapsedMinutes = (now - Date.parse(session.startedAt)) / 60_000;

  const run = async (action: Action, request: () => Promise<void>): Promise<void> => {
    setPending(action);
    setFailure(null);
    try {
      await request();
    } catch (cause) {
      setFailure({ action, error: toApiError(cause) });
    } finally {
      setPending(null);
    }
  };

  const updateAnswer = (value: string): void => {
    setAnswer(value);
    writeStorage(answerKey(session.id), value);
  };

  const updateCode = (value: string): void => {
    if (!taskTurn) return;
    setCodeDrafts({ ...codeDrafts, [taskTurn.id]: value });
    writeStorage(codeKey(session.id, taskTurn.id), value);
  };

  const send = (): Promise<void> =>
    run('answer', async () => {
      const content = answer.trim();
      if (!content) return;
      const result = await api.answerInterview(session.id, {
        content,
        code: codingTask && attachCode ? code : null,
      });
      updateAnswer('');
      writeStorage(answerKey(session.id), null);
      onUpdate(result.session);
    });

  const finish = (): Promise<void> =>
    run('finish', async () => {
      const result = await api.finishInterview(session.id);
      writeStorage(answerKey(session.id), null);
      onUpdate(result.session);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

  const abort = (): Promise<void> =>
    run('abort', async () => {
      const result = await api.abortInterview(session.id);
      onUpdate(result.session);
    });

  // Пока интервьюер думает, ответ кандидата уже показан в ленте.
  const optimisticTurns: InterviewTurn[] =
    pending === 'answer'
      ? [
          ...session.turns,
          {
            id: -1,
            sessionId: session.id,
            role: 'candidate',
            content: answer.trim(),
            code: codingTask && attachCode ? code : null,
            topicId: null,
            kind: null,
            codingTask: null,
            assessment: null,
            createdAt: new Date().toISOString(),
          },
        ]
      : session.turns;

  const busy = pending !== null;

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Timer startedAt={session.startedAt} plannedMinutes={session.plannedMinutes} />
      <Button
        variant={wrappedUp || elapsedMinutes >= session.plannedMinutes ? 'primary' : 'secondary'}
        disabled={busy || session.answerCount === 0}
        onClick={() => void finish()}
        title={session.answerCount === 0 ? 'Сначала ответьте хотя бы на один вопрос' : undefined}
      >
        {pending === 'finish' ? 'Составляем отчёт…' : 'Завершить и получить отчёт'}
      </Button>
      {confirmAbort ? (
        <>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void abort()}>
            Да, прервать
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmAbort(false)}>
            Отмена
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmAbort(true)}>
          Прервать без отчёта
        </Button>
      )}
    </div>
  );

  const answerBox = wrappedUp ? (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/40">
      <p className="text-sm text-fg">Интервьюер завершил интервью. Осталось получить отчёт.</p>
      <Button disabled={busy} onClick={() => void finish()}>
        {pending === 'finish' ? 'Составляем отчёт…' : 'Получить отчёт'}
      </Button>
    </Card>
  ) : (
    <Card className="space-y-3 p-4">
      <textarea
        value={answer}
        disabled={busy}
        onChange={(event) => updateAnswer(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void send();
          }
        }}
        rows={6}
        placeholder="Отвечайте так, как ответили бы вслух: своими словами, с примерами и оговорками"
        className="w-full resize-y rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-fg disabled:opacity-70"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy || answer.trim() === ''} onClick={() => void send()}>
          {pending === 'answer' ? 'Отправлено…' : 'Ответить'}
        </Button>
        {codingTask ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={attachCode}
              onChange={(event) => setAttachCode(event.target.checked)}
              className="accent-accent"
            />
            приложить код из редактора
          </label>
        ) : null}
        <span className="text-xs text-muted">Ctrl/Cmd + Enter — отправить</span>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {INTERVIEW_FORMAT_LABELS[session.format]}
        </h1>
        {controls}
      </div>

      {!wrappedUp && elapsedMinutes >= session.plannedMinutes ? (
        <p className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-2 text-sm text-warning">
          Запланированное время вышло. Можно ответить ещё на пару вопросов или завершить интервью и получить отчёт.
        </p>
      ) : null}

      {failure ? (
        <ErrorState
          title={ACTION_ERROR_TITLES[failure.action]}
          error={failure.error}
          onRetry={() =>
            void (failure.action === 'answer' ? send() : failure.action === 'finish' ? finish() : abort())
          }
        />
      ) : null}

      <div className={cn('grid gap-5', codingTask && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
        <div className={cn('space-y-5', !codingTask && 'mx-auto w-full max-w-3xl')}>
          <Transcript turns={optimisticTurns} thinking={pending === 'answer'} autoScroll live />
          {answerBox}
        </div>

        {codingTask ? (
          <div className="xl:sticky xl:top-6 xl:self-start">
            <LiveCodingPanel task={codingTask} code={code} onChange={updateCode} readOnly={busy} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ClosedSession({ session }: { session: InterviewSessionWithTurns }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const remove = async (): Promise<void> => {
    setDeleting(true);
    try {
      await api.deleteInterview(session.id);
      void navigate('/interview');
    } catch (cause) {
      setError(toApiError(cause));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {INTERVIEW_FORMAT_LABELS[session.format]}
          </h1>
          {session.status === 'aborted' ? <Badge>прервано</Badge> : <Badge tone="success">завершено</Badge>}
          <span className="text-sm text-muted">
            {new Date(session.startedAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex gap-2">
          {confirmDelete ? (
            <>
              <Button variant="danger" size="sm" disabled={deleting} onClick={() => void remove()}>
                Удалить навсегда
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Отмена
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              Удалить
            </Button>
          )}
          <Button size="sm" onClick={() => void navigate('/interview')}>
            Новое интервью
          </Button>
        </div>
      </div>

      {error ? <ErrorState title="Не удалось удалить" error={error} /> : null}

      {session.report ? (
        <ReportView report={session.report} />
      ) : (
        <Card>
          <p className="text-sm text-muted">
            Интервью прервано без отчёта{session.answerCount === 0 ? ' — ответов не было' : ''}.
          </p>
        </Card>
      )}

      {session.turns.length > 0 ? (
        <Card>
          <CardHeader
            title="Транскрипт"
            subtitle={session.report ? 'Под каждым ответом — оценка интервьюера, скрытая во время интервью' : undefined}
          />
          <Transcript turns={session.turns} />
        </Card>
      ) : null}
    </div>
  );
}

function SessionView({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi(api.interview, id);
  // Ответы start/answer/finish возвращают сессию целиком — перезапрашивать не нужно.
  const [override, setOverride] = useState<InterviewSessionWithTurns | null>(null);

  if (loading && !data) return <Loading label="Загружаем интервью" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const session = override ?? data.session;

  return (
    <div className="space-y-4">
      <nav className="text-sm text-muted">
        <Link to="/interview" className="hover:text-fg">
          ← Все интервью
        </Link>
      </nav>
      {session.status === 'active' ? (
        <ActiveSession session={session} onUpdate={setOverride} />
      ) : (
        <ClosedSession session={session} />
      )}
    </div>
  );
}

export function InterviewSessionPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <SessionView key={id} id={id} />;
}
