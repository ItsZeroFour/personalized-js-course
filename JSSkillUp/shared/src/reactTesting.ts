/// <reference lib="dom" />
import { deepEqual, expect, renderTestCases, sleep } from './testing.js';
import type { RunnableTest } from './testing.js';

/**
 * Рантайм React-задач: мини-версия Testing Library и сборка программы из TSX-модуля.
 *
 * Один и тот же код работает в двух средах:
 * - в браузере — внутри sandbox-iframe (`web/src/preview`), с настоящим DOM;
 * - в Node — в worker_threads с happy-dom (`server/src/services/reactRunner.ts`),
 *   чтобы валидатор и AI-генерация проверяли эталоны так же, как это увидит пользователь.
 *
 * Поэтому React, ReactDOM и window не импортируются, а передаются снаружи.
 * Файл подключает lib DOM только для себя и не реэкспортируется из `index.ts`:
 * импортируйте его как `@jsskillup/shared/reactTesting.js`.
 *
 * Отличие от RTL: `render`, `fireEvent.*`, `rerender`, `unmount` возвращают промис —
 * в тестах их нужно `await`. Так поведение одинаково и с `act`, и без него.
 */

// --- Зависимости среды -------------------------------------------------------------

export interface ReactRoot {
  render(node: unknown): void;
  unmount(): void;
}

export interface ReactLike {
  createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): unknown;
  isValidElement(value: unknown): boolean;
  /** В production-сборке React `act` бросает — тогда харнесс работает без него. */
  act?: (callback: () => unknown) => PromiseLike<unknown>;
}

export interface ReactDomClientLike {
  createRoot(container: Element): ReactRoot;
}

export interface ReactHarnessDeps {
  React: ReactLike;
  ReactDOMClient: ReactDomClientLike;
  /** Модули, доступные коду пользователя через import. */
  modules: Record<string, unknown>;
  window: Window & typeof globalThis;
}

/** Имена, которые тесты React-задач видят как переменные. */
export const REACT_HARNESS_NAMES = [
  'expect',
  'deepEqual',
  'sleep',
  'React',
  'h',
  'act',
  'render',
  'renderHook',
  'screen',
  'within',
  'fireEvent',
  'waitFor',
  'require',
] as const;

/** Настройки sucrase для TSX-модуля с import/export. Структурно совместимы с `sucrase.Options`. */
export interface ReactTransformOptions {
  transforms: Array<'typescript' | 'jsx' | 'imports'>;
  jsxRuntime: 'automatic';
  production: boolean;
  disableESTransforms: boolean;
}

export function reactTransformOptions(): ReactTransformOptions {
  return {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'automatic',
    production: true,
    disableESTransforms: true,
  };
}

/**
 * Программа для `new Function('__harness', program)`. Код пользователя уже транспилирован
 * в CommonJS: `import` превратился в `require`, `export` — в запись в `exports`.
 * Возвращает экспорты модуля и тест-кейсы.
 */
export function buildReactProgram(compiledCode: string, tests: readonly RunnableTest[]): string {
  return `"use strict";
const { ${REACT_HARNESS_NAMES.join(', ')} } = __harness;
const module = { exports: {} };
const exports = module.exports;

${compiledCode}

return { exports: module.exports, cases: ${renderTestCases(tests)} };`;
}

/** Что считать компонентом для превью: default-экспорт или экспорт `App`. */
export function pickComponent(moduleExports: Record<string, unknown>): unknown {
  const candidate = moduleExports['default'] ?? moduleExports['App'];
  return typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null)
    ? candidate
    : null;
}

// --- Сопоставление текста ----------------------------------------------------------

export type TextMatch = string | RegExp;

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function matchText(text: string | null | undefined, matcher: TextMatch): boolean {
  if (text === null || text === undefined) return false;
  const value = normalize(text);
  return typeof matcher === 'string' ? value === normalize(matcher) : matcher.test(value);
}

function describeMatch(matcher: TextMatch): string {
  return typeof matcher === 'string' ? `"${matcher}"` : String(matcher);
}

/** Текст только из собственных текстовых узлов — как `getNodeText` в RTL. */
function ownText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent ?? '')
    .join('');
}

// --- Роли и доступные имена --------------------------------------------------------

const TEXTBOX_INPUT_TYPES = new Set(['', 'text', 'email', 'tel', 'url']);
const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image']);

function implicitRole(element: Element): string | null {
  const tag = element.tagName.toLowerCase();

  switch (tag) {
    case 'button':
      return 'button';
    case 'a':
      return element.hasAttribute('href') ? 'link' : null;
    case 'textarea':
      return 'textbox';
    case 'select':
      return element.hasAttribute('multiple') ? 'listbox' : 'combobox';
    case 'option':
      return 'option';
    case 'ul':
    case 'ol':
      return 'list';
    case 'li':
      return 'listitem';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return 'heading';
    case 'img':
      return element.getAttribute('alt') === '' ? 'presentation' : 'img';
    case 'nav':
      return 'navigation';
    case 'main':
      return 'main';
    case 'form':
      return 'form';
    case 'dialog':
      return 'dialog';
    case 'table':
      return 'table';
    case 'tr':
      return 'row';
    case 'td':
      return 'cell';
    case 'th':
      return 'columnheader';
    case 'progress':
      return 'progressbar';
    case 'article':
      return 'article';
    case 'input': {
      const type = (element.getAttribute('type') ?? '').toLowerCase();
      if (BUTTON_INPUT_TYPES.has(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'range') return 'slider';
      if (type === 'number') return 'spinbutton';
      if (type === 'search') return 'searchbox';
      if (TEXTBOX_INPUT_TYPES.has(type)) return 'textbox';
      return null;
    }
    default:
      return null;
  }
}

function roleOf(element: Element): string | null {
  const explicit = element.getAttribute('role')?.trim().split(/\s+/)[0];
  return explicit || implicitRole(element);
}

function labelsOf(element: Element): Element[] {
  const labels = (element as HTMLInputElement).labels;
  if (labels && labels.length > 0) return Array.from(labels);

  // Запасной путь для сред, где `labels` не реализован.
  const found: Element[] = [];
  const id = element.getAttribute('id');
  const document = element.ownerDocument;
  if (id) found.push(...Array.from(document.querySelectorAll(`label[for="${id}"]`)));
  const wrapping = element.closest('label');
  if (wrapping && !found.includes(wrapping)) found.push(wrapping);
  return found;
}

function accessibleName(element: Element): string {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return normalize(ariaLabel);

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const document = element.ownerDocument;
    return normalize(
      labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' '),
    );
  }

  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const type = (element.getAttribute('type') ?? '').toLowerCase();
    if (tag === 'input' && BUTTON_INPUT_TYPES.has(type)) {
      return normalize((element as HTMLInputElement).value || element.getAttribute('alt') || '');
    }
    const fromLabels = labelsOf(element)
      .map((label) => label.textContent ?? '')
      .join(' ');
    if (normalize(fromLabels)) return normalize(fromLabels);
    return normalize(element.getAttribute('title') ?? element.getAttribute('placeholder') ?? '');
  }

  if (tag === 'img') return normalize(element.getAttribute('alt') ?? '');

  return normalize(element.textContent ?? '') || normalize(element.getAttribute('title') ?? '');
}

// --- Запросы -----------------------------------------------------------------------

export interface RoleOptions {
  name?: TextMatch;
  /** Для heading. */
  level?: number;
}

export interface WaitForOptions {
  timeout?: number;
  interval?: number;
}

type QueryAll<A extends unknown[]> = (...args: A) => Element[];

export interface BoundQueries {
  getByText(text: TextMatch): HTMLElement;
  queryByText(text: TextMatch): HTMLElement | null;
  getAllByText(text: TextMatch): HTMLElement[];
  queryAllByText(text: TextMatch): HTMLElement[];
  findByText(text: TextMatch, options?: WaitForOptions): Promise<HTMLElement>;
  findAllByText(text: TextMatch, options?: WaitForOptions): Promise<HTMLElement[]>;

  getByRole(role: string, options?: RoleOptions): HTMLElement;
  queryByRole(role: string, options?: RoleOptions): HTMLElement | null;
  getAllByRole(role: string, options?: RoleOptions): HTMLElement[];
  queryAllByRole(role: string, options?: RoleOptions): HTMLElement[];
  findByRole(role: string, options?: RoleOptions & WaitForOptions): Promise<HTMLElement>;
  findAllByRole(role: string, options?: RoleOptions & WaitForOptions): Promise<HTMLElement[]>;

  getByTestId(id: string): HTMLElement;
  queryByTestId(id: string): HTMLElement | null;
  getAllByTestId(id: string): HTMLElement[];
  queryAllByTestId(id: string): HTMLElement[];
  findByTestId(id: string, options?: WaitForOptions): Promise<HTMLElement>;

  getByLabelText(text: TextMatch): HTMLElement;
  queryByLabelText(text: TextMatch): HTMLElement | null;
  getAllByLabelText(text: TextMatch): HTMLElement[];

  getByPlaceholderText(text: TextMatch): HTMLElement;
  queryByPlaceholderText(text: TextMatch): HTMLElement | null;

  getByDisplayValue(value: TextMatch): HTMLElement;
  queryByDisplayValue(value: TextMatch): HTMLElement | null;

  /** Разметка контейнера — удобно для console.log при отладке теста. */
  debug(): string;
}

const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE']);

function descendants(root: Element): Element[] {
  return Array.from(root.querySelectorAll('*')).filter((element) => !IGNORED_TAGS.has(element.tagName));
}

function snippet(root: Element): string {
  const html = root.innerHTML;
  return html.length > 600 ? `${html.slice(0, 600)}…` : html || '(пусто)';
}

// --- Харнесс -----------------------------------------------------------------------

export interface RenderResult extends BoundQueries {
  container: HTMLElement;
  rerender(ui: unknown): Promise<void>;
  unmount(): Promise<void>;
}

export interface RenderHookResult<R, P> {
  result: { current: R };
  rerender(props?: P): Promise<void>;
  unmount(): Promise<void>;
}

export interface EventTarget {
  target?: { value?: string | number; checked?: boolean };
}

export interface FireEvent {
  click(element: Element): Promise<void>;
  dblClick(element: Element): Promise<void>;
  change(element: Element, init: EventTarget): Promise<void>;
  input(element: Element, init: EventTarget): Promise<void>;
  /** Посимвольный ввод: onChange вызывается на каждый символ, как при наборе с клавиатуры. */
  type(element: Element, text: string): Promise<void>;
  submit(element: Element): Promise<void>;
  keyDown(element: Element, init: KeyboardEventInit): Promise<void>;
  keyUp(element: Element, init: KeyboardEventInit): Promise<void>;
  focus(element: Element): Promise<void>;
  blur(element: Element): Promise<void>;
  mouseOver(element: Element): Promise<void>;
  mouseOut(element: Element): Promise<void>;
  scroll(element: Element): Promise<void>;
}

export interface ReactHarness {
  expect: typeof expect;
  deepEqual: typeof deepEqual;
  /** Реальное ожидание: таймеры и эффекты за это время отрабатывают как в браузере. */
  sleep(ms: number): Promise<void>;
  React: ReactLike;
  h: ReactLike['createElement'];
  act(callback: () => unknown): Promise<void>;
  render(ui: unknown): Promise<RenderResult>;
  renderHook<R, P>(hook: (props: P) => R, options?: { initialProps?: P }): Promise<RenderHookResult<R, P>>;
  screen: BoundQueries;
  within(element: Element): BoundQueries;
  fireEvent: FireEvent;
  waitFor<T>(callback: () => T | Promise<T>, options?: WaitForOptions): Promise<T>;
  require(name: string): unknown;
  /** Размонтировать всё и вернуть глобальное окружение в исходное состояние. Вызывает раннер. */
  cleanup(): Promise<void>;
}

type ActFlag = { IS_REACT_ACT_ENVIRONMENT?: boolean };

export function createReactHarness(deps: ReactHarnessDeps): ReactHarness {
  const { React, ReactDOMClient, window } = deps;
  const document = window.document;
  const globals = globalThis as typeof globalThis & ActFlag;

  const originalFetch = globals.fetch;
  const mounted = new Set<{ root: ReactRoot; container: HTMLElement }>();
  let actSupported = typeof React.act === 'function';

  globals.IS_REACT_ACT_ENVIRONMENT = true;

  const tick = (): Promise<void> => sleep(0);

  async function act(callback: () => unknown): Promise<void> {
    if (actSupported && React.act) {
      try {
        await React.act(async () => {
          await callback();
        });
        return;
      } catch (error) {
        // production-сборка React: «act(...) is not supported in production builds».
        if (!(error instanceof Error && /production/i.test(error.message))) throw error;
        actSupported = false;
      }
    }
    await callback();
    await tick();
    await tick();
  }

  // --- Запросы ---

  function makeQueries(root: () => Element): BoundQueries {
    const byText: QueryAll<[TextMatch]> = (text) =>
      descendants(root()).filter((element) => matchText(ownText(element), text));

    const byRole: QueryAll<[string, RoleOptions?]> = (role, options = {}) =>
      descendants(root()).filter((element) => {
        if (roleOf(element) !== role) return false;
        if (options.level !== undefined && element.tagName.toLowerCase() !== `h${options.level}`) {
          return false;
        }
        return options.name === undefined || matchText(accessibleName(element), options.name);
      });

    const byTestId: QueryAll<[string]> = (id) =>
      descendants(root()).filter((element) => element.getAttribute('data-testid') === id);

    const byLabelText: QueryAll<[TextMatch]> = (text) => {
      const result: Element[] = [];
      for (const element of descendants(root())) {
        if (element.tagName === 'LABEL' && matchText(element.textContent, text)) {
          const label = element as HTMLLabelElement;
          const control =
            label.control ??
            (label.htmlFor ? element.ownerDocument.getElementById(label.htmlFor) : null) ??
            element.querySelector('input, textarea, select');
          if (control && !result.includes(control)) result.push(control);
        } else if (matchText(element.getAttribute('aria-label'), text) && !result.includes(element)) {
          result.push(element);
        }
      }
      return result;
    };

    const byPlaceholder: QueryAll<[TextMatch]> = (text) =>
      descendants(root()).filter((element) => matchText(element.getAttribute('placeholder'), text));

    const byDisplayValue: QueryAll<[TextMatch]> = (value) =>
      descendants(root()).filter((element) => {
        const tag = element.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return false;
        return matchText((element as HTMLInputElement).value, value);
      });

    const single = <A extends unknown[]>(query: QueryAll<A>, describe: (...args: A) => string) => ({
      get: (...args: A): HTMLElement => {
        const found = query(...args);
        if (found.length === 0) {
          throw new Error(`Не найден элемент: ${describe(...args)}\n\nDOM:\n${snippet(root())}`);
        }
        if (found.length > 1) {
          throw new Error(
            `Найдено ${found.length} элементов: ${describe(...args)}. ` +
              'Используйте getAllBy… или уточните запрос.',
          );
        }
        return found[0] as HTMLElement;
      },
      query: (...args: A): HTMLElement | null => {
        const found = query(...args);
        if (found.length > 1) {
          throw new Error(`Найдено ${found.length} элементов: ${describe(...args)}`);
        }
        return (found[0] as HTMLElement | undefined) ?? null;
      },
      getAll: (...args: A): HTMLElement[] => {
        const found = query(...args);
        if (found.length === 0) {
          throw new Error(`Не найдено ни одного элемента: ${describe(...args)}\n\nDOM:\n${snippet(root())}`);
        }
        return found as HTMLElement[];
      },
      queryAll: (...args: A): HTMLElement[] => query(...args) as HTMLElement[],
    });

    const text = single(byText, (value) => `с текстом ${describeMatch(value)}`);
    const role = single(byRole, (value, options) =>
      options?.name === undefined ? `роль "${value}"` : `роль "${value}" с именем ${describeMatch(options.name)}`,
    );
    const testId = single(byTestId, (id) => `data-testid="${id}"`);
    const label = single(byLabelText, (value) => `поле с label ${describeMatch(value)}`);
    const placeholder = single(byPlaceholder, (value) => `поле с placeholder ${describeMatch(value)}`);
    const displayValue = single(byDisplayValue, (value) => `поле со значением ${describeMatch(value)}`);

    return {
      getByText: text.get,
      queryByText: text.query,
      getAllByText: text.getAll,
      queryAllByText: text.queryAll,
      findByText: (value, options) => waitFor(() => text.get(value), options),
      findAllByText: (value, options) => waitFor(() => text.getAll(value), options),

      getByRole: role.get,
      queryByRole: role.query,
      getAllByRole: role.getAll,
      queryAllByRole: role.queryAll,
      findByRole: (value, options) => waitFor(() => role.get(value, options), options),
      findAllByRole: (value, options) => waitFor(() => role.getAll(value, options), options),

      getByTestId: testId.get,
      queryByTestId: testId.query,
      getAllByTestId: testId.getAll,
      queryAllByTestId: testId.queryAll,
      findByTestId: (id, options) => waitFor(() => testId.get(id), options),

      getByLabelText: label.get,
      queryByLabelText: label.query,
      getAllByLabelText: label.getAll,

      getByPlaceholderText: placeholder.get,
      queryByPlaceholderText: placeholder.query,

      getByDisplayValue: displayValue.get,
      queryByDisplayValue: displayValue.query,

      debug: () => root().innerHTML,
    };
  }

  // --- waitFor ---

  async function waitFor<T>(callback: () => T | Promise<T>, options: WaitForOptions = {}): Promise<T> {
    const timeout = options.timeout ?? 1000;
    const interval = options.interval ?? 20;
    const deadline = Date.now() + timeout;
    let lastError: unknown = null;

    // Как в RTL: пока ждём, обновления приходят вне act, и предупреждать о них не нужно.
    const previous = globals.IS_REACT_ACT_ENVIRONMENT;
    globals.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      for (;;) {
        try {
          return await callback();
        } catch (error) {
          lastError = error;
        }
        if (Date.now() >= deadline) break;
        await sleep(interval);
      }
    } finally {
      globals.IS_REACT_ACT_ENVIRONMENT = previous;
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`waitFor: условие не выполнилось за ${timeout} мс.\n${reason}`);
  }

  // --- render ---

  const toElement = (ui: unknown): unknown =>
    React.isValidElement(ui) ? ui : typeof ui === 'function' ? React.createElement(ui) : ui;

  async function render(ui: unknown): Promise<RenderResult> {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    const entry = { root, container };
    mounted.add(entry);

    await act(() => root.render(toElement(ui)));

    return {
      container,
      ...makeQueries(() => container),
      rerender: (next) => act(() => root.render(toElement(next))),
      unmount: async () => {
        await act(() => root.unmount());
        container.remove();
        mounted.delete(entry);
      },
    };
  }

  async function renderHook<R, P>(
    hook: (props: P) => R,
    options: { initialProps?: P } = {},
  ): Promise<RenderHookResult<R, P>> {
    const result = { current: undefined as R };
    function HookHost({ hookProps }: { hookProps: P }): null {
      result.current = hook(hookProps);
      return null;
    }

    let props = options.initialProps as P;
    const rendered = await render(React.createElement(HookHost, { hookProps: props }));

    return {
      result,
      rerender: (next) => {
        if (next !== undefined) props = next;
        return rendered.rerender(React.createElement(HookHost, { hookProps: props }));
      },
      unmount: rendered.unmount,
    };
  }

  // --- События ---

  const dispatch = (element: Element, event: Event): Promise<void> =>
    act(() => {
      element.dispatchEvent(event);
    });

  /** Значение ставится через сеттер прототипа, минуя трекер React, — иначе onChange не сработает. */
  function setNativeValue(element: Element, value: string): void {
    let prototype: object | null = Object.getPrototypeOf(element);
    while (prototype) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      if (descriptor?.set) {
        descriptor.set.call(element, value);
        return;
      }
      prototype = Object.getPrototypeOf(prototype);
    }
    (element as HTMLInputElement).value = value;
  }

  async function change(element: Element, init: EventTarget): Promise<void> {
    const target = init.target ?? {};
    await act(() => {
      if (target.value !== undefined) setNativeValue(element, String(target.value));
      if (target.checked !== undefined) (element as HTMLInputElement).checked = target.checked;
      element.dispatchEvent(new window.Event('input', { bubbles: true }));
      element.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  }

  const fireEvent: FireEvent = {
    click: (element) =>
      act(() => {
        if (element instanceof window.HTMLElement) element.click();
        else element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      }),
    dblClick: (element) =>
      dispatch(element, new window.MouseEvent('dblclick', { bubbles: true, cancelable: true })),
    change,
    input: change,
    type: async (element, text) => {
      let value = (element as HTMLInputElement).value ?? '';
      for (const char of text) {
        value += char;
        await change(element, { target: { value } });
      }
    },
    submit: (element) => dispatch(element, new window.Event('submit', { bubbles: true, cancelable: true })),
    keyDown: (element, init) =>
      dispatch(element, new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })),
    keyUp: (element, init) =>
      dispatch(element, new window.KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...init })),
    // React 17+ слушает focusin/focusout, а focus()/blur() на элементе без фокуса событий
    // не порождают. Поэтому, как и RTL, диспатчим оба события явно.
    focus: (element) =>
      act(() => {
        element.dispatchEvent(new window.FocusEvent('focus'));
        element.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
      }),
    blur: (element) =>
      act(() => {
        element.dispatchEvent(new window.FocusEvent('blur'));
        element.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
      }),
    mouseOver: (element) => dispatch(element, new window.MouseEvent('mouseover', { bubbles: true })),
    mouseOut: (element) => dispatch(element, new window.MouseEvent('mouseout', { bubbles: true })),
    scroll: (element) => dispatch(element, new window.Event('scroll')),
  };

  // --- Остальное ---

  function requireModule(name: string): unknown {
    if (name in deps.modules) return deps.modules[name];
    throw new Error(
      `Модуль "${name}" недоступен в песочнице. Можно импортировать: ${Object.keys(deps.modules).join(', ')}`,
    );
  }

  async function cleanup(): Promise<void> {
    for (const entry of mounted) {
      try {
        await act(() => entry.root.unmount());
      } catch {
        // Компонент мог упасть при размонтировании — следующему тесту это не должно мешать.
      }
      entry.container.remove();
    }
    mounted.clear();
    document.body.innerHTML = '';
    globals.fetch = originalFetch;
    globals.IS_REACT_ACT_ENVIRONMENT = true;
  }

  /**
   * Ожидание вне act: внутри async-act React копит работу в очереди до конца колбэка,
   * и цепочка «таймер → setState → эффект → запрос» не продвигалась бы. Поэтому ждём
   * в обычном режиме (как waitFor), а в конце добиваем оставшуюся работу через act.
   */
  async function realSleep(ms: number): Promise<void> {
    const previous = globals.IS_REACT_ACT_ENVIRONMENT;
    globals.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      await sleep(ms);
    } finally {
      globals.IS_REACT_ACT_ENVIRONMENT = previous;
    }
    await act(() => undefined);
  }

  return {
    expect,
    deepEqual,
    sleep: realSleep,
    React,
    h: (type, props, ...children) => React.createElement(type, props, ...children),
    act,
    render,
    renderHook,
    screen: makeQueries(() => document.body),
    within: (element) => makeQueries(() => element),
    fireEvent,
    waitFor,
    require: requireModule,
    cleanup,
  };
}

// --- Прогон ------------------------------------------------------------------------

export interface ReactTestCase {
  name: string;
  index: number;
  run: () => Promise<void>;
}

export interface ReactModuleProgram {
  exports: Record<string, unknown>;
  cases: ReactTestCase[];
}

/** Исполняет собранную программу. Бросает, если код модуля упал при выполнении. */
export function instantiateReactProgram(program: string, harness: ReactHarness): ReactModuleProgram {
  const factory = new Function('__harness', program) as (h: ReactHarness) => ReactModuleProgram;
  return factory(harness);
}
