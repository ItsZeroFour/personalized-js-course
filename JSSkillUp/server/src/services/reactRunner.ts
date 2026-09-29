import { Worker } from 'node:worker_threads';
import type { RunResult, RunnableTest, TestResult } from '@jsskillup/shared';

/**
 * Прогон React-задачи в Node — для валидатора seed и проверки задач от AI.
 * Логика таймаутов та же, что у браузерного `useRunner`: таймер взводится на каждый тест
 * по сообщению `test-start`, при превышении поток убивается.
 */

export interface ReactWorkerInput {
  code: string;
  tests: RunnableTest[];
}

export type ReactWorkerMessage =
  | { type: 'compile-error'; message: string }
  | { type: 'test-start'; index: number }
  | { type: 'test-result'; index: number; result: TestResult }
  | { type: 'log'; text: string }
  | { type: 'done' };

/** Запас на старт потока, загрузку happy-dom и React. */
const SETUP_GRACE_MS = 10_000;

export function runReactTests(
  code: string,
  tests: readonly RunnableTest[],
  options: { timeLimitMs: number },
): Promise<RunResult> {
  const startedAt = Date.now();
  const results: TestResult[] = [];
  const logs: string[] = [];
  const input: ReactWorkerInput = { code, tests: [...tests] };

  const worker = new Worker(new URL('./reactWorker.ts', import.meta.url), { workerData: input });

  return new Promise<RunResult>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const summarize = (status: RunResult['status'], error: string | null): RunResult => ({
      status,
      passed: results.filter((item) => item.passed).length,
      total: tests.length,
      results,
      error,
      logs,
      durationMs: Date.now() - startedAt,
    });

    const finish = (result: RunResult): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      void worker.terminate();
      resolve(result);
    };

    const arm = (ms: number, onTimeout: () => void): void => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(onTimeout, ms);
    };

    arm(SETUP_GRACE_MS + options.timeLimitMs, () =>
      finish(summarize('timeout', 'Код не завершился ещё до запуска тестов — вероятно, бесконечный цикл.')),
    );

    worker.on('message', (message: ReactWorkerMessage) => {
      switch (message.type) {
        case 'log':
          logs.push(message.text);
          break;
        case 'test-start':
          arm(options.timeLimitMs, () => {
            const test = tests[message.index];
            if (test) {
              results.push({
                name: test.name,
                visibility: test.visibility,
                passed: false,
                message: `Превышен лимит ${options.timeLimitMs} мс`,
                durationMs: options.timeLimitMs,
              });
            }
            finish(summarize('timeout', `Тест «${test?.name ?? message.index + 1}» завис.`));
          });
          break;
        case 'test-result':
          if (timer !== undefined) clearTimeout(timer);
          results.push(message.result);
          break;
        case 'compile-error':
          finish(summarize('error', `Код не скомпилировался: ${message.message}`));
          break;
        case 'done': {
          const allPassed = results.length === tests.length && results.every((item) => item.passed);
          finish(summarize(allPassed ? 'passed' : 'failed', null));
          break;
        }
      }
    });

    worker.on('error', (error) => finish(summarize('error', `Поток упал: ${error.message}`)));
    worker.on('exit', () => finish(summarize('error', 'Поток завершился раньше времени')));
  });
}
