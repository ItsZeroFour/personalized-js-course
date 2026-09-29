import type { TestVisibility } from './tasks.js';

/**
 * Ядро прогона автотестов. Используется и Web Worker-ом в браузере, и валидатором
 * seed-задач на бэкенде, чтобы «проверено в Node» означало «работает в браузере».
 */

export interface RunnableTest {
  name: string;
  code: string;
  visibility: TestVisibility;
}

export interface TestCase {
  name: string;
  index: number;
  run: () => Promise<void>;
}

// --- Форматирование значений для сообщений об ошибке --------------------------------

const MAX_LENGTH = 300;

function truncate(text: string): string {
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text;
}

const MAX_DEPTH = 4;

/** DOM-узел форматируется разметкой, а не обходом свойств: у узла огромный граф ссылок. */
function formatNode(value: object): string | null {
  const node = value as { nodeType?: unknown; nodeName?: unknown; outerHTML?: unknown; textContent?: unknown };
  if (typeof node.nodeType !== 'number' || typeof node.nodeName !== 'string') return null;
  if (typeof node.outerHTML === 'string') return truncate(node.outerHTML);
  return `#${node.nodeName.toLowerCase()} ${JSON.stringify(String(node.textContent ?? ''))}`;
}

export function formatValue(value: unknown, seen = new Set<unknown>()): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;
  if (type === 'string') return JSON.stringify(value);
  if (type === 'number' || type === 'boolean' || type === 'bigint') return String(value);
  if (type === 'symbol') return String(value);
  if (type === 'function') {
    const name = (value as { name?: string }).name;
    return name ? `[Function: ${name}]` : '[Function (anonymous)]';
  }

  if (seen.has(value)) return '[Circular]';
  const node = formatNode(value as object);
  if (node !== null) return node;
  if (seen.size >= MAX_DEPTH) return Array.isArray(value) ? '[…]' : '{…}';
  seen.add(value);

  try {
    if (value instanceof Date) return `Date(${value.toISOString()})`;
    if (value instanceof RegExp) return String(value);
    if (value instanceof Error) return `${value.name}: ${value.message}`;

    if (Array.isArray(value)) {
      return truncate(`[${value.map((item) => formatValue(item, seen)).join(', ')}]`);
    }
    if (value instanceof Map) {
      const entries = [...value.entries()].map(
        ([key, item]) => `${formatValue(key, seen)} => ${formatValue(item, seen)}`,
      );
      return truncate(`Map(${value.size}) {${entries.join(', ')}}`);
    }
    if (value instanceof Set) {
      const items = [...value.values()].map((item) => formatValue(item, seen));
      return truncate(`Set(${value.size}) {${items.join(', ')}}`);
    }

    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => `${key}: ${formatValue(item, seen)}`,
    );
    return truncate(`{ ${entries.join(', ')} }`);
  } finally {
    seen.delete(value);
  }
}

// --- Глубокое сравнение -------------------------------------------------------------

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (a instanceof RegExp || b instanceof RegExp) {
    return a instanceof RegExp && b instanceof RegExp && String(a) === String(b);
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }

  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key))) return false;
    }
    return true;
  }

  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) return false;
    // Сравниваем по вхождению: для примитивов достаточно has, для объектов ищем пару.
    for (const value of a) {
      if (b.has(value)) continue;
      const matched = [...b].some((candidate) => deepEqual(value, candidate));
      if (!matched) return false;
    }
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

// --- Матчеры ------------------------------------------------------------------------

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeInstanceOf(constructor: new (...args: never[]) => unknown): void;
  toHaveLength(length: number): void;
  toContain(item: unknown): void;
  toThrow(expected?: string | RegExp): void;
  readonly not: Matchers;
}

interface Check {
  pass: boolean;
  message: () => string;
  negatedMessage: () => string;
}

function createMatchers(actual: unknown, negated: boolean): Matchers {
  const assert = ({ pass, message, negatedMessage }: Check): void => {
    if (negated ? !pass : pass) return;
    throw new AssertionError(negated ? negatedMessage() : message());
  };

  const matchers: Matchers = {
    toBe(expected) {
      assert({
        pass: Object.is(actual, expected),
        message: () => `Ожидалось ${formatValue(expected)}, получено ${formatValue(actual)}`,
        negatedMessage: () => `Значение не должно было быть ${formatValue(expected)}`,
      });
    },

    toEqual(expected) {
      assert({
        pass: deepEqual(actual, expected),
        message: () => `Ожидалось ${formatValue(expected)}, получено ${formatValue(actual)}`,
        negatedMessage: () => `Значение не должно было совпадать с ${formatValue(expected)}`,
      });
    },

    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(Number(actual) - expected);
      assert({
        pass: diff < 10 ** -precision / 2,
        message: () => `Ожидалось ≈${expected} (точность ${precision}), получено ${formatValue(actual)}`,
        negatedMessage: () => `Значение не должно было быть близко к ${expected}`,
      });
    },

    toBeTruthy() {
      assert({
        pass: Boolean(actual),
        message: () => `Ожидалось truthy-значение, получено ${formatValue(actual)}`,
        negatedMessage: () => `Ожидалось falsy-значение, получено ${formatValue(actual)}`,
      });
    },

    toBeFalsy() {
      assert({
        pass: !actual,
        message: () => `Ожидалось falsy-значение, получено ${formatValue(actual)}`,
        negatedMessage: () => `Ожидалось truthy-значение, получено ${formatValue(actual)}`,
      });
    },

    toBeNull() {
      assert({
        pass: actual === null,
        message: () => `Ожидалось null, получено ${formatValue(actual)}`,
        negatedMessage: () => 'Значение не должно было быть null',
      });
    },

    toBeUndefined() {
      assert({
        pass: actual === undefined,
        message: () => `Ожидалось undefined, получено ${formatValue(actual)}`,
        negatedMessage: () => 'Значение не должно было быть undefined',
      });
    },

    toBeDefined() {
      assert({
        pass: actual !== undefined,
        message: () => 'Ожидалось определённое значение, получено undefined',
        negatedMessage: () => 'Значение должно было быть undefined',
      });
    },

    toBeInstanceOf(constructor) {
      assert({
        pass: actual instanceof constructor,
        message: () => `Ожидался экземпляр ${constructor.name}, получено ${formatValue(actual)}`,
        negatedMessage: () => `Значение не должно было быть экземпляром ${constructor.name}`,
      });
    },

    toHaveLength(length) {
      const actualLength = (actual as { length?: unknown } | null)?.length;
      assert({
        pass: actualLength === length,
        message: () => `Ожидалась длина ${length}, получено ${formatValue(actualLength)}`,
        negatedMessage: () => `Длина не должна была быть ${length}`,
      });
    },

    toContain(item) {
      let pass = false;
      if (typeof actual === 'string') pass = actual.includes(String(item));
      else if (Array.isArray(actual)) pass = actual.some((value) => deepEqual(value, item));
      else if (actual instanceof Set) pass = [...actual].some((value) => deepEqual(value, item));

      assert({
        pass,
        message: () => `Ожидалось, что ${formatValue(actual)} содержит ${formatValue(item)}`,
        negatedMessage: () => `Значение не должно было содержать ${formatValue(item)}`,
      });
    },

    toThrow(expected) {
      if (typeof actual !== 'function') {
        throw new AssertionError('toThrow ожидает функцию в expect(...)');
      }

      let thrown: unknown;
      let didThrow = false;
      try {
        actual();
      } catch (error) {
        didThrow = true;
        thrown = error;
      }

      if (!didThrow) {
        assert({
          pass: false,
          message: () => 'Ожидалось исключение, но функция отработала без ошибки',
          negatedMessage: () => '',
        });
        return;
      }

      const message = thrown instanceof Error ? thrown.message : String(thrown);
      const matches =
        expected === undefined
          ? true
          : expected instanceof RegExp
            ? expected.test(message)
            : message.includes(expected);

      assert({
        pass: matches,
        message: () => `Ожидалось исключение с текстом ${formatValue(expected)}, получено "${message}"`,
        negatedMessage: () => `Функция не должна была бросать исключение, но бросила "${message}"`,
      });
    },

    get not() {
      return createMatchers(actual, !negated);
    },
  };

  return matchers;
}

export function expect(actual: unknown): Matchers {
  return createMatchers(actual, false);
}

// shared собирается без lib DOM и без типов Node: объявляем таймер как требование к среде.
declare const setTimeout: (handler: () => void, timeout: number) => unknown;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface TestHarness {
  expect: typeof expect;
  deepEqual: typeof deepEqual;
  sleep: typeof sleep;
}

export const harness: TestHarness = { expect, deepEqual, sleep };

/** Имена, которые программа теста получает из `__harness` для обычных JS/TS-задач. */
export const DEFAULT_HARNESS_NAMES = ['expect', 'deepEqual', 'sleep'] as const;

/** Тесты превращаются в массив объектов `TestCase` — литерал для вставки в программу. */
export function renderTestCases(tests: readonly RunnableTest[]): string {
  const cases = tests
    .map(
      (test, index) =>
        `  {\n    name: ${JSON.stringify(test.name)},\n    index: ${index},\n` +
        `    run: async () => {\n${test.code}\n    },\n  }`,
    )
    .join(',\n');
  return `[\n${cases}\n]`;
}

/**
 * Собирает исполняемую программу: код решения и тесты попадают в одну область видимости,
 * поэтому тесты видят объявленные пользователем функции без всякого экспорта.
 * Результат передаётся в `new Function('__harness', program)`.
 */
export function buildTestProgram(
  userCode: string,
  tests: readonly RunnableTest[],
  harnessNames: readonly string[] = DEFAULT_HARNESS_NAMES,
): string {
  return `"use strict";
const { ${harnessNames.join(', ')} } = __harness;

${userCode}

return ${renderTestCases(tests)};`;
}
