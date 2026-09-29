import { parentPort, workerData } from 'node:worker_threads';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { transform } from 'sucrase';
import type { RunnableTest, TestResult } from '@jsskillup/shared';
import {
  buildReactProgram,
  createReactHarness,
  instantiateReactProgram,
  reactTransformOptions,
} from '@jsskillup/shared/reactTesting.js';
import type { ReactModuleProgram } from '@jsskillup/shared/reactTesting.js';
import type { ReactWorkerInput, ReactWorkerMessage } from './reactRunner.js';

/**
 * Поток для прогона React-задачи в Node: happy-dom вместо браузерного DOM.
 * Отдельный поток нужен по двум причинам: happy-dom регистрирует свои глобальные
 * объекты (в том числе fetch), которые сломали бы сервер, а бесконечный цикл
 * в решении можно прервать только через `worker.terminate()`.
 */

const port = parentPort;
if (!port) throw new Error('reactWorker должен запускаться как worker thread');

const post = (message: ReactWorkerMessage): void => port.postMessage(message);

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

function formatLogArg(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

GlobalRegistrator.register({ url: 'http://localhost/' });

const forward = (...args: unknown[]): void => post({ type: 'log', text: args.map(formatLogArg).join(' ') });
Object.assign(console, { log: forward, info: forward, warn: forward, error: forward, debug: forward });

const React = await import('react');
const ReactDOMClient = await import('react-dom/client');
const ReactDOM = await import('react-dom');
const JsxRuntime = await import('react/jsx-runtime');

const input = workerData as ReactWorkerInput;
const tests: RunnableTest[] = input.tests;

const harness = createReactHarness({
  React,
  ReactDOMClient,
  window: globalThis.window as Window & typeof globalThis,
  modules: {
    react: React,
    'react-dom': ReactDOM,
    'react-dom/client': ReactDOMClient,
    'react/jsx-runtime': JsxRuntime,
  },
});

let program: ReactModuleProgram | null = null;
try {
  const compiled = transform(input.code, reactTransformOptions()).code;
  program = instantiateReactProgram(buildReactProgram(compiled, tests), harness);
} catch (error) {
  post({ type: 'compile-error', message: describeError(error) });
}

if (program) {
  for (const [index, testCase] of program.cases.entries()) {
    const test = tests[index];
    if (!test) continue;

    post({ type: 'test-start', index });
    const started = performance.now();
    let result: TestResult;

    try {
      await testCase.run();
      result = { name: test.name, visibility: test.visibility, passed: true, message: null, durationMs: 0 };
    } catch (error) {
      result = {
        name: test.name,
        visibility: test.visibility,
        passed: false,
        message: describeError(error),
        durationMs: 0,
      };
    }

    await harness.cleanup();
    post({ type: 'test-result', index, result: { ...result, durationMs: performance.now() - started } });
  }
  post({ type: 'done' });
}
