/// <reference lib="webworker" />
import { transform } from 'sucrase';
import { buildTestProgram, harness } from '@jsskillup/shared';
import type { TaskLanguage, TestCase } from '@jsskillup/shared';
import type { RunRequest, WorkerMessage } from './protocol';

/**
 * Песочница для решений пользователя.
 *
 * Изоляция обеспечивается самим воркером: у него нет доступа к DOM, к состоянию
 * приложения и к localStorage. Бесконечный цикл здесь не вешает вкладку — страница
 * просто убивает воркер через `terminate()`, поэтому лимит времени сторожит хост,
 * а не этот код.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

function post(message: WorkerMessage): void {
  scope.postMessage(message);
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

function transpile(code: string, language: TaskLanguage): string {
  if (language === 'js') return code;
  return transform(code, {
    transforms: language === 'tsx' ? ['typescript', 'jsx'] : ['typescript'],
    disableESTransforms: true,
    production: true,
  }).code;
}

function formatLogArg(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

// console пользователя перехватывается, чтобы вывод попал в панель результатов.
// DedicatedWorkerGlobalScope в типах не объявляет console, поэтому доступ через globalThis.
const globals = globalThis as unknown as { console: Console };
const nativeConsole = globals.console;
const forward = (...args: unknown[]): void =>
  post({ type: 'log', text: args.map(formatLogArg).join(' ') });

globals.console = {
  ...nativeConsole,
  log: forward,
  info: forward,
  warn: forward,
  error: forward,
  debug: forward,
};

scope.addEventListener('message', (event: MessageEvent<RunRequest>) => {
  const request = event.data;
  if (request.type !== 'run') return;

  void runAll(request);
});

async function runAll(request: RunRequest): Promise<void> {
  let cases: TestCase[];

  try {
    const compiled = transpile(request.code, request.language);
    const program = buildTestProgram(compiled, request.tests);
    const factory = new Function('__harness', program) as (h: typeof harness) => TestCase[];
    cases = factory(harness);
  } catch (error) {
    post({ type: 'compile-error', message: describeError(error) });
    return;
  }

  for (const [index, testCase] of cases.entries()) {
    const test = request.tests[index];
    if (!test) continue;

    post({ type: 'test-start', index });
    const started = performance.now();

    try {
      await testCase.run();
      post({
        type: 'test-result',
        index,
        result: {
          name: test.name,
          visibility: test.visibility,
          passed: true,
          message: null,
          durationMs: performance.now() - started,
        },
      });
    } catch (error) {
      post({
        type: 'test-result',
        index,
        result: {
          name: test.name,
          visibility: test.visibility,
          passed: false,
          message: describeError(error),
          durationMs: performance.now() - started,
        },
      });
    }
  }

  post({ type: 'done' });
}
