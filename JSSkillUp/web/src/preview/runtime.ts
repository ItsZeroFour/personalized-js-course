import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as JsxRuntime from 'react/jsx-runtime';
import { transform } from 'sucrase';
import type { TestResult } from '@jsskillup/shared';
import {
  buildReactProgram,
  createReactHarness,
  instantiateReactProgram,
  pickComponent,
  reactTransformOptions,
} from '@jsskillup/shared/reactTesting';
import { PREVIEW_MARKER } from '@/sandbox/protocol';
import type {
  LogLevel,
  PreviewCommand,
  PreviewEvent,
  PreviewTheme,
  RunRequest,
  WorkerMessage,
} from '@/sandbox/protocol';

/**
 * Рантайм React-задач внутри sandbox-iframe (`preview.html`).
 *
 * Режим задаётся query-параметром:
 * - `?mode=preview` — рендерит default-экспорт модуля, перерисовывает по команде `render`;
 * - `?mode=test` — прогоняет тесты по команде `run` и отвечает теми же сообщениями,
 *   что и Web Worker, поэтому хост (`useRunner`) у них общий.
 *
 * Код пользователя транспилируется sucrase в CommonJS: `import` превращается в `require`,
 * который отдаёт React из этого же бандла, — сеть не нужна.
 */

const mode = new URLSearchParams(window.location.search).get('mode') === 'test' ? 'test' : 'preview';

/** id последней команды render — им помечаются логи и ошибки превью. */
let renderId = 0;

function post(payload: PreviewEvent | WorkerMessage): void {
  window.parent.postMessage({ marker: PREVIEW_MARKER, payload }, '*');
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

function formatLogArg(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Node) return value instanceof Element ? value.outerHTML.slice(0, 300) : '#node';
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

// --- console → страница ------------------------------------------------------------

const nativeConsole = { ...console };
for (const level of ['log', 'info', 'warn', 'error'] as const satisfies readonly LogLevel[]) {
  console[level] = (...args: unknown[]) => {
    nativeConsole[level](...args);
    const text = args.map(formatLogArg).join(' ');
    post(mode === 'test' ? { type: 'log', text } : { type: 'console', renderId, level, text });
  };
}

// --- Харнесс -----------------------------------------------------------------------

const harness = createReactHarness({
  React,
  ReactDOMClient,
  window,
  modules: {
    react: React,
    'react-dom': ReactDOM,
    'react-dom/client': ReactDOMClient,
    'react/jsx-runtime': JsxRuntime,
  },
});

function compile(code: string): string {
  return transform(code, reactTransformOptions()).code;
}

// --- Режим превью ------------------------------------------------------------------

const overlay = document.getElementById('__overlay');
const container = document.getElementById('root');

function showOverlay(title: string, message: string): void {
  if (!overlay) return;
  overlay.replaceChildren();
  const heading = document.createElement('strong');
  heading.textContent = title;
  overlay.append(heading, document.createTextNode(message));
  overlay.style.display = 'block';
}

function hideOverlay(): void {
  if (overlay) overlay.style.display = 'none';
}

function reportRuntimeError(error: unknown): void {
  const message = describeError(error);
  if (mode === 'test') {
    post({ type: 'log', text: `Ошибка: ${message}` });
    return;
  }
  showOverlay('Ошибка во время выполнения', message);
  post({ type: 'render-error', renderId, stage: 'runtime', message });
}

interface BoundaryState {
  error: Error | null;
}

/** Ловит ошибки рендера компонента пользователя, чтобы показать их поверх превью. */
class PreviewBoundary extends React.Component<{ children?: React.ReactNode }, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    reportRuntimeError(error);
  }

  override render(): React.ReactNode {
    return this.state.error ? null : this.props.children;
  }
}

let root: ReactDOMClient.Root | null = null;

function renderPreview(id: number, code: string, theme: PreviewTheme): void {
  renderId = id;
  document.documentElement.dataset['theme'] = theme;
  hideOverlay();
  root?.unmount();
  root = null;
  if (!container) return;

  let compiled: string;
  try {
    compiled = compile(code);
  } catch (error) {
    const message = describeError(error);
    showOverlay('Ошибка компиляции', message);
    post({ type: 'render-error', renderId, stage: 'compile', message });
    return;
  }

  let component: unknown;
  try {
    const program = instantiateReactProgram(buildReactProgram(compiled, []), harness);
    component = pickComponent(program.exports);
  } catch (error) {
    reportRuntimeError(error);
    return;
  }

  if (component === null) {
    const message = 'Модуль не экспортирует компонент. Добавьте `export default function App() { … }`.';
    showOverlay('Нечего показать', message);
    post({ type: 'render-error', renderId, stage: 'runtime', message });
    return;
  }

  root = ReactDOMClient.createRoot(container);
  root.render(React.createElement(PreviewBoundary, null, React.createElement(component as React.ElementType)));
  post({ type: 'rendered', renderId });
}

// --- Режим тестов ------------------------------------------------------------------

async function runTests(request: RunRequest): Promise<void> {
  let program: ReturnType<typeof instantiateReactProgram>;
  try {
    program = instantiateReactProgram(buildReactProgram(compile(request.code), request.tests), harness);
  } catch (error) {
    post({ type: 'compile-error', message: describeError(error) });
    return;
  }

  for (const [index, testCase] of program.cases.entries()) {
    const test = request.tests[index];
    if (!test) continue;

    post({ type: 'test-start', index });
    const started = performance.now();
    let passed = true;
    let message: string | null = null;

    try {
      await testCase.run();
    } catch (error) {
      passed = false;
      message = describeError(error);
    }
    await harness.cleanup();

    const result: TestResult = {
      name: test.name,
      visibility: test.visibility,
      passed,
      message,
      durationMs: performance.now() - started,
    };
    post({ type: 'test-result', index, result });
  }

  post({ type: 'done' });
}

// --- Связь со страницей ------------------------------------------------------------

if (mode === 'preview') {
  // В превью обновления идут от живого пользователя, а не из тестов — act здесь не нужен.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
}

window.addEventListener('error', (event) => reportRuntimeError(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => reportRuntimeError(event.reason));

window.addEventListener('message', (event: MessageEvent<PreviewCommand>) => {
  if (event.source !== window.parent) return;
  const command = event.data;

  if (command.type === 'render' && mode === 'preview') renderPreview(command.id, command.code, command.theme);
  if (command.type === 'run' && mode === 'test') void runTests(command);
});

post({ type: 'ready' });
