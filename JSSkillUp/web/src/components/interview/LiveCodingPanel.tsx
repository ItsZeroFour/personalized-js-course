import { useState } from 'react';
import type { CodingTask, RunResult } from '@jsskillup/shared';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRunner } from '@/sandbox/useRunner';

/** Лимит для «Запустить»: автотестов нет, выполняется только код и console.log. */
const RUN_LIMIT_MS = 3000;

/**
 * Редактор для live-coding внутри интервью. Автотестов у задачи от интервьюера нет —
 * проверяет сам интервьюер, а здесь можно прогнать код в той же песочнице и посмотреть вывод.
 */
export function LiveCodingPanel({
  task,
  code,
  onChange,
  readOnly = false,
}: {
  task: CodingTask;
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}) {
  const runner = useRunner();
  const [result, setResult] = useState<RunResult | null>(null);

  const run = async (): Promise<void> => {
    setResult(await runner.run({ code, language: 'ts', tests: [], timeLimitMs: RUN_LIMIT_MS }));
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-fg">⌨️ {task.title}</p>
        <div className="flex items-center gap-2">
          {runner.running ? (
            <Button size="sm" variant="secondary" onClick={runner.cancel}>
              Остановить
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" disabled={runner.running} onClick={() => void run()}>
            {runner.running ? 'Выполняется…' : '▶ Запустить'}
          </Button>
        </div>
      </div>

      <CodeEditor
        value={code}
        onChange={onChange}
        language="ts"
        height={420}
        readOnly={readOnly}
        onRun={() => void run()}
      />

      {result ? (
        <div className="space-y-2">
          {result.error ? (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-danger/40 bg-danger-soft p-3 font-mono text-xs text-danger">
              {result.error}
            </pre>
          ) : null}
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-code-bg p-3 font-mono text-xs text-fg">
            {result.logs.length > 0 ? result.logs.join('\n') : '(console.log ничего не вывел)'}
          </pre>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Ctrl/Cmd + Enter — запустить. Для проверки добавьте вызовы с console.log. Код уходит
          интервьюеру вместе с ответом.
        </p>
      )}
    </Card>
  );
}
