import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CodeReview, RunResult, RunnableTest, Task, TaskAttempt, TaskTest } from '@jsskillup/shared';
import { DIFFICULTY_LABELS, TASK_KIND_LABELS } from '@jsskillup/shared';
import { api, ApiRequestError } from '@/api/client';
import { useApi } from '@/lib/useApi';
import { useRunner } from '@/sandbox/useRunner';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/StatusBadge';
import { Markdown } from '@/components/ui/Markdown';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { ErrorState, Loading } from '@/components/ui/States';
import { AiCodeReview, GenerateSimilarTask } from '@/components/ai/TaskAi';
import { LivePreview } from '@/components/preview/LivePreview';
import { cn } from '@/lib/cn';

const draftKey = (slug: string): string => `jsskillup:task-draft:${slug}`;

function readDraft(slug: string, fallback: string): string {
  try {
    return localStorage.getItem(draftKey(slug)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveDraft(slug: string, code: string): void {
  try {
    localStorage.setItem(draftKey(slug), code);
  } catch {
    // Приватный режим или переполненное хранилище — черновик просто не сохранится.
  }
}

function toRunnableTests(tests: TaskTest[]): RunnableTest[] {
  return tests.map((test) => ({ name: test.name, code: test.code, visibility: test.visibility }));
}

function TestList({ tests, result }: { tests: TaskTest[]; result: RunResult | null }) {
  const byName = new Map(result?.results.map((item) => [item.name, item]) ?? []);

  return (
    <ul className="space-y-1.5">
      {tests.map((test, index) => {
        const outcome = byName.get(test.name);
        const isHidden = test.visibility === 'hidden';
        const label = isHidden && outcome === undefined ? `Скрытый тест ${index + 1}` : test.name;

        return (
          <li
            key={test.id}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-sm',
              outcome === undefined && 'border-line text-muted',
              outcome?.passed === true && 'border-success/40 bg-success-soft',
              outcome?.passed === false && 'border-danger/40 bg-danger-soft',
            )}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-4 shrink-0 text-center">
                {outcome === undefined ? '·' : outcome.passed ? '✓' : '✕'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(outcome === undefined ? 'text-muted' : 'text-fg')}>
                    {label}
                  </span>
                  {isHidden ? <Badge>скрытый</Badge> : null}
                  {outcome ? (
                    <span className="ml-auto text-xs tabular-nums text-muted">
                      {Math.round(outcome.durationMs)} мс
                    </span>
                  ) : null}
                </div>
                {outcome?.message ? (
                  <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-danger">
                    {outcome.message}
                  </pre>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Hints({ slug, hintCount }: { slug: string; hintCount: number }) {
  const [opened, setOpened] = useState<Array<{ level: number; bodyMd: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextLevel = opened.length + 1;

  const openNext = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.taskHint(slug, nextLevel);
      setOpened([...opened, { level: result.hint.level, bodyMd: result.hint.bodyMd }]);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Не удалось загрузить подсказку');
    } finally {
      setLoading(false);
    }
  };

  if (hintCount === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Подсказки"
        subtitle={`Открыто ${opened.length} из ${hintCount} — открывайте по одной`}
      />
      <div className="space-y-3">
        {opened.map((hint) => (
          <div key={hint.level} className="rounded-lg border border-line bg-panel-2/50 p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">
              Подсказка {hint.level}
            </p>
            <Markdown compact>{hint.bodyMd}</Markdown>
          </div>
        ))}

        {nextLevel <= hintCount ? (
          <Button variant="secondary" size="sm" disabled={loading} onClick={() => void openNext()}>
            Открыть подсказку {nextLevel}
          </Button>
        ) : (
          <p className="text-sm text-muted">Подсказки закончились.</p>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Card>
  );
}

function Solution({ slug, language }: { slug: string; language: Task['language'] }) {
  const [solution, setSolution] = useState<{ code: string; notesMd: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.taskSolution(slug);
      setSolution({ code: result.solutionCode, notesMd: result.solutionNotesMd });
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Не удалось загрузить решение');
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Решение" subtitle="Открывается только вручную" />

      {solution === null ? (
        <div className="space-y-3">
          {confirming ? (
            <>
              <p className="text-sm text-warning">
                Точно открыть? Гораздо полезнее сначала пройти все подсказки.
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={loading} onClick={() => void load()}>
                  Да, показать
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Отмена
                </Button>
              </div>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
              Показать решение
            </Button>
          )}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      ) : (
        <div className="space-y-4">
          <CodeEditor
            value={solution.code}
            onChange={() => undefined}
            language={language}
            height={320}
            readOnly
          />
          {solution.notesMd ? <Markdown compact>{solution.notesMd}</Markdown> : null}
        </div>
      )}
    </Card>
  );
}

function AttemptHistory({ attempts }: { attempts: TaskAttempt[] }) {
  if (attempts.length === 0) return null;

  return (
    <Card>
      <CardHeader title="История попыток" subtitle={`Всего попыток: ${attempts.length}`} />
      <ul className="space-y-1.5">
        {attempts.slice(0, 10).map((attempt) => {
          const solved = attempt.total > 0 && attempt.passed === attempt.total;
          return (
            <li
              key={attempt.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm"
            >
              <span className={cn('font-medium', solved ? 'text-success' : 'text-muted')}>
                {solved ? '✓ решено' : `${attempt.passed}/${attempt.total}`}
              </span>
              <span className="text-xs text-muted">
                {new Date(attempt.createdAt).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · '}
                {Math.round(attempt.durationMs)} мс
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function TaskPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  // key сбрасывает редактор, результаты и историю при переходе на другую задачу —
  // например, после генерации похожей.
  return <TaskView key={slug} slug={slug} />;
}

function TaskView({ slug }: { slug: string }) {
  const { data, error, loading, reload } = useApi(api.task, slug);
  const ai = useApi(api.aiStatus);
  const aiConfigured = ai.data?.configured ?? false;
  // React-задачи исполняются в sandbox-iframe с настоящим DOM, остальные — в Web Worker.
  // TaskView пересоздаётся на каждую задачу (key), поэтому тип песочницы не меняется на лету.
  const runner = useRunner(data?.task.runtime === 'preview' ? 'iframe' : 'worker');

  const [code, setCode] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [attempts, setAttempts] = useState<TaskAttempt[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) return <Loading label="Загружаем задачу" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { task } = data;
  const isReact = task.runtime === 'preview';
  const currentCode = code ?? readDraft(task.slug, task.starterCode);
  const history = attempts ?? data.attempts;
  const solved = history.some((attempt) => attempt.total > 0 && attempt.passed === attempt.total);

  const latestAttempt = history[0] ?? null;

  const attachReview = (attemptId: number, review: CodeReview): void => {
    setAttempts(history.map((attempt) => (attempt.id === attemptId ? { ...attempt, aiReview: review } : attempt)));
  };

  const updateCode = (next: string): void => {
    setCode(next);
    saveDraft(task.slug, next);
  };

  const run = async (): Promise<void> => {
    setSaveError(null);

    const runResult = await runner.run({
      code: currentCode,
      language: task.language,
      tests: toRunnableTests(task.tests),
      timeLimitMs: task.timeLimitMs,
    });
    setResult(runResult);

    try {
      const saved = await api.submitAttempt(task.slug, {
        code: currentCode,
        status: runResult.status,
        passed: runResult.passed,
        total: runResult.total,
        results: runResult.results,
        durationMs: runResult.durationMs,
      });
      setAttempts([saved.attempt, ...history]);
    } catch (cause) {
      setSaveError(
        cause instanceof ApiRequestError ? cause.message : 'Попытка не сохранилась в базу',
      );
    }
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link to="/tasks" className="hover:text-fg">
          Задачи
        </Link>
        {data.topic ? (
          <>
            <span>/</span>
            <Link to={`/topic/${data.topic.slug}`} className="hover:text-fg">
              {data.topic.title}
            </Link>
          </>
        ) : null}
      </nav>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{task.title}</h1>
        <Badge tone={task.difficulty === 'easy' ? 'success' : task.difficulty === 'medium' ? 'warning' : 'danger'}>
          {DIFFICULTY_LABELS[task.difficulty]}
        </Badge>
        <Badge>{TASK_KIND_LABELS[task.kind]}</Badge>
        {task.source === 'ai' ? <Badge tone="warning">AI</Badge> : null}
        {solved ? <Badge tone="success">✓ решено</Badge> : null}
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-5">
          <Card>
            <Markdown>{task.statementMd}</Markdown>
          </Card>

          <Hints slug={task.slug} hintCount={task.hintCount} />
          <Solution slug={task.slug} language={task.language} />
          <AttemptHistory attempts={history} />
          <GenerateSimilarTask slug={task.slug} aiConfigured={aiConfigured} />
        </div>

        <div className="space-y-4">
          <CodeEditor
            value={currentCode}
            onChange={updateCode}
            language={task.language}
            height={isReact ? 420 : 460}
            onRun={() => void run()}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={runner.running} onClick={() => void run()}>
              {runner.running ? 'Выполняется…' : 'Запустить тесты'}
            </Button>
            {runner.running ? (
              <Button variant="secondary" onClick={runner.cancel}>
                Остановить
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              disabled={runner.running}
              onClick={() => updateCode(task.starterCode)}
            >
              Сбросить к заготовке
            </Button>
            <span className="text-xs text-muted">Ctrl/Cmd + Enter — запуск</span>
          </div>

          {isReact ? <LivePreview code={currentCode} height={300} /> : null}

          <Card>
            <CardHeader
              title="Тесты"
              subtitle={`Лимит на тест: ${task.timeLimitMs} мс`}
              action={
                result ? (
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      result.status === 'passed' ? 'text-success' : 'text-danger',
                    )}
                  >
                    {result.passed}/{result.total}
                  </span>
                ) : null
              }
            />

            {result?.error ? (
              <pre className="mb-4 overflow-x-auto whitespace-pre-wrap rounded-lg border border-danger/40 bg-danger-soft p-3 font-mono text-xs text-danger">
                {result.error}
              </pre>
            ) : null}

            <TestList tests={task.tests} result={result} />

            {result && result.logs.length > 0 ? (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  console.log
                </p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-code-bg p-3 font-mono text-xs text-fg">
                  {result.logs.join('\n')}
                </pre>
              </div>
            ) : null}

            {saveError ? <p className="mt-3 text-sm text-warning">{saveError}</p> : null}
          </Card>

          <AiCodeReview
            key={latestAttempt?.id ?? 'none'}
            slug={task.slug}
            attempt={latestAttempt}
            aiConfigured={aiConfigured}
            editedSinceRun={latestAttempt !== null && latestAttempt.code !== currentCode}
            onReviewed={attachReview}
          />
        </div>
      </div>
    </div>
  );
}
