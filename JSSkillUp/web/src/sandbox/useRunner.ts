import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunResult, RunnableTest, TaskLanguage, TestResult } from '@jsskillup/shared';
import { createChannel, type SandboxKind } from './channels';
import type { RunRequest, SandboxChannel, WorkerMessage } from './protocol';

export interface RunParams {
  code: string;
  language: TaskLanguage;
  tests: RunnableTest[];
  /** Лимит на один тест. По его истечении воркер убивается. */
  timeLimitMs: number;
}

/** Запас на старт песочницы: воркеру — загрузить транспилятор, iframe — ещё и React. */
const SETUP_GRACE_MS: Record<SandboxKind, number> = { worker: 3000, iframe: 10_000 };

/**
 * Запускает решение в песочнице (Web Worker или sandbox-iframe для React) и следит за временем.
 *
 * Лимит сторожит именно хост: внутри воркера бесконечный цикл ничего не прервёт,
 * а `dispose()` канала убивает воркер или удаляет iframe. Таймер взводится на каждый тест
 * отдельно — по сообщению `test-start`, поэтому в отчёте видно, какой именно тест завис.
 */
export function useRunner(kind: SandboxKind = 'worker'): {
  run: (params: RunParams) => Promise<RunResult>;
  cancel: () => void;
  running: boolean;
} {
  const channelRef = useRef<SandboxChannel | null>(null);
  const [running, setRunning] = useState(false);

  const terminate = useCallback(() => {
    channelRef.current?.dispose();
    channelRef.current = null;
  }, []);

  useEffect(() => terminate, [terminate]);

  const run = useCallback(
    (params: RunParams): Promise<RunResult> => {
      terminate();
      setRunning(true);

      const channel = createChannel(kind);
      channelRef.current = channel;

      const startedAt = performance.now();
      const results: TestResult[] = [];
      const logs: string[] = [];
      let currentIndex: number | null = null;
      let timer: ReturnType<typeof setTimeout> | undefined;

      return new Promise<RunResult>((resolve) => {
        const finish = (result: RunResult): void => {
          if (timer !== undefined) clearTimeout(timer);
          terminate();
          setRunning(false);
          resolve(result);
        };

        const summarize = (status: RunResult['status'], error: string | null): RunResult => ({
          status,
          passed: results.filter((item) => item.passed).length,
          total: params.tests.length,
          results,
          error,
          logs,
          durationMs: performance.now() - startedAt,
        });

        const armTimeout = (index: number): void => {
          if (timer !== undefined) clearTimeout(timer);
          timer = setTimeout(() => {
            const test = params.tests[index];
            if (test) {
              results.push({
                name: test.name,
                visibility: test.visibility,
                passed: false,
                message: `Превышен лимит ${params.timeLimitMs} мс — возможно, бесконечный цикл`,
                durationMs: params.timeLimitMs,
              });
            }
            finish(
              summarize(
                'timeout',
                `Тест «${test?.name ?? index + 1}» не уложился в ${params.timeLimitMs} мс. ` +
                  'Выполнение остановлено.',
              ),
            );
          }, params.timeLimitMs);
        };

        channel.onMessage((message: WorkerMessage) => {
          switch (message.type) {
            case 'log':
              logs.push(message.text);
              break;

            case 'test-start':
              currentIndex = message.index;
              armTimeout(message.index);
              break;

            case 'test-result':
              if (timer !== undefined) clearTimeout(timer);
              currentIndex = null;
              results.push(message.result);
              break;

            case 'compile-error':
              finish(summarize('error', message.message));
              break;

            case 'done':
              finish(
                summarize(
                  results.every((item) => item.passed) && results.length === params.tests.length
                    ? 'passed'
                    : 'failed',
                  null,
                ),
              );
              break;
          }
        });

        channel.onError((text) => {
          const where = currentIndex === null ? '' : ` (тест ${currentIndex + 1})`;
          finish(summarize('error', `Ошибка в песочнице${where}: ${text}`));
        });

        const request: RunRequest = {
          type: 'run',
          code: params.code,
          language: params.language,
          tests: params.tests,
        };
        channel.send(request);

        // Код верхнего уровня (вне тестов) выполняется до первого test-start —
        // без этого таймера `while (true) {}` на верхнем уровне вешал бы прогон навсегда.
        // Запас сверху — на загрузку воркера и транспилятора при первом запуске.
        timer = setTimeout(() => {
          finish(
            summarize(
              'timeout',
              'Код не завершился за отведённое время ещё до запуска тестов — ' +
                'вероятно, бесконечный цикл на верхнем уровне. Выполнение остановлено.',
            ),
          );
        }, params.timeLimitMs + SETUP_GRACE_MS[kind]);
      });
    },
    [terminate, kind],
  );

  const cancel = useCallback(() => {
    terminate();
    setRunning(false);
  }, [terminate]);

  return { run, cancel, running };
}
