import { transform } from 'sucrase';
import { buildTestProgram, harness } from '@jsskillup/shared';
import type {
  RunResult,
  RunnableTest,
  TaskLanguage,
  TaskRuntime,
  TestCase,
  TestResult,
} from '@jsskillup/shared';

/**
 * Прогон решения через тесты на стороне Node. Используется валидатором seed-задач и,
 * начиная с фазы 4, проверкой задач, сгенерированных AI: задача сохраняется, только
 * если её эталонное решение проходит её же тесты.
 *
 * Код исполняется через `new Function` в текущем процессе — так же, как в браузерном
 * Web Worker. Изоляция через `node:vm` дала бы отдельный realm, из-за чего `instanceof`
 * для Date, Map и Error вёл бы себя иначе, чем в браузере, и «проверено в Node» перестало
 * бы означать «работает у пользователя». Запускать здесь недоверенный код нельзя.
 */

export interface RunOptions {
  language: TaskLanguage;
  /** Лимит на один тест. Асинхронный тест прерывается гонкой с таймером. */
  timeLimitMs: number;
}

export function transpile(code: string, language: TaskLanguage): string {
  if (language === 'js') return code;
  return transform(code, {
    transforms: language === 'tsx' ? ['typescript', 'jsx'] : ['typescript'],
    disableESTransforms: true,
    production: true,
  }).code;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

class TimeoutError extends Error {}

async function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(`Превышен лимит ${ms} мс`)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function runTests(
  userCode: string,
  tests: readonly RunnableTest[],
  options: RunOptions,
): Promise<RunResult> {
  const started = Date.now();
  const logs: string[] = [];

  let cases: TestCase[];
  try {
    const compiled = transpile(userCode, options.language);
    const program = buildTestProgram(compiled, tests);
    const factory = new Function('__harness', program) as (h: typeof harness) => TestCase[];
    cases = factory(harness);
  } catch (error) {
    return {
      status: 'error',
      passed: 0,
      total: tests.length,
      results: [],
      error: `Код не скомпилировался: ${describeError(error)}`,
      logs,
      durationMs: Date.now() - started,
    };
  }

  const results: TestResult[] = [];
  let timedOut = false;

  for (const [index, testCase] of cases.entries()) {
    const test = tests[index];
    if (!test) continue;

    const testStarted = Date.now();
    try {
      await withTimeout(testCase.run(), options.timeLimitMs);
      results.push({
        name: test.name,
        visibility: test.visibility,
        passed: true,
        message: null,
        durationMs: Date.now() - testStarted,
      });
    } catch (error) {
      if (error instanceof TimeoutError) timedOut = true;
      results.push({
        name: test.name,
        visibility: test.visibility,
        passed: false,
        message: describeError(error),
        durationMs: Date.now() - testStarted,
      });
    }
  }

  const passed = results.filter((result) => result.passed).length;

  return {
    status: timedOut ? 'timeout' : passed === tests.length ? 'passed' : 'failed',
    passed,
    total: tests.length,
    results,
    error: null,
    logs,
    durationMs: Date.now() - started,
  };
}

/**
 * Прогон по типу рантайма задачи: `preview` — React-модуль в потоке с happy-dom,
 * остальное — обычный прогон в текущем процессе.
 */
export async function runTaskTests(
  userCode: string,
  tests: readonly RunnableTest[],
  options: RunOptions & { runtime: TaskRuntime },
): Promise<RunResult> {
  if (options.runtime === 'preview') {
    const { runReactTests } = await import('./reactRunner.js');
    return runReactTests(userCode, tests, { timeLimitMs: options.timeLimitMs });
  }
  return runTests(userCode, tests, options);
}
