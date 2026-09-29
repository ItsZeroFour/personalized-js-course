# Vitest и Jest: основы

## Структура теста

```js
import { describe, it, expect, beforeEach } from 'vitest';

describe('formatPrice', () => {
  it('добавляет пробелы между разрядами и знак рубля', () => {
    expect(formatPrice(1234567)).toBe('1 234 567 ₽');
  });

  it('показывает копейки двумя знаками', () => {
    expect(formatPrice(10.5)).toBe('10,50 ₽');
  });
});
```

- `describe` — группа, `it`/`test` — один сценарий;
- шаблон **AAA**: Arrange (подготовка) → Act (действие) → Assert (проверка);
- **одно поведение на тест**; имя описывает поведение, а не реализацию:
  «показывает ошибку при пустом email», а не «вызывает setError».

## Матчеры

| Матчер | Что проверяет |
| --- | --- |
| `toBe(x)` | `Object.is` — примитивы и одна и та же ссылка |
| `toEqual(x)` | глубокое равенство (игнорирует `undefined`-поля) |
| `toStrictEqual(x)` | глубокое + `undefined`-поля, классы, дырки массивов |
| `toContain(x)` / `toHaveLength(n)` | массивы и строки |
| `toThrow(msg?)` | функция бросает: `expect(() => fn()).toThrow('текст')` |
| `toHaveBeenCalledWith(...)` / `toHaveBeenCalledTimes(n)` | вызовы мока |
| `resolves` / `rejects` | промисы: `await expect(p).rejects.toThrow()` |
| `toMatchObject(obj)` | объект содержит подмножество полей |

`toBe` для объектов сравнивает ссылки: `expect({ a: 1 }).toBe({ a: 1 })` падает.

## Хуки и изоляция

```js
beforeEach(() => { /* свежее окружение для каждого теста */ });
afterEach(() => { vi.restoreAllMocks(); });
beforeAll(() => { /* дорогая общая подготовка, один раз */ });
```

Главный принцип — **тесты не зависят друг от друга и от порядка**. Общее изменяемое
состояние между тестами (модульные переменные, синглтон-сторы, моки, таймеры, кеш
QueryClient) — источник «плавающих» тестов. Сбрасывайте его в `beforeEach`/`afterEach`.

## Асинхронные тесты

```js
it('загружает пользователя', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Аня');
});
```

Тест должен **дождаться** промиса: `async/await` или `return promise`. Забытый `await`
перед `expect(...).rejects` — тест пройдёт до проверки.

## Фейковые таймеры

```js
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('debounce вызывает функцию один раз после паузы', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 300);
  debounced('a');
  debounced('b');
  vi.advanceTimersByTime(299);
  expect(fn).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledOnce();
  expect(fn).toHaveBeenCalledWith('b');
});
```

Подменяют `setTimeout`, `setInterval`, `Date`: тест мгновенный и детерминированный.
`vi.setSystemTime(date)` — зафиксировать «сейчас». С промисами внутри таймеров —
`advanceTimersByTimeAsync`.

## Снапшот-тесты: когда оправданы

```js
expect(serializeConfig(input)).toMatchSnapshot();
```

Снапшот сохраняет результат и сравнивает с ним в следующих запусках.

Оправданы: небольшой **стабильный** вывод — сериализация, сгенерированный код, сообщения
об ошибках, `toMatchInlineSnapshot` для коротких значений.

Вредны: снапшот большого дерева компонента. Он падает от любой правки вёрстки,
разработчики привыкают бездумно обновлять (`-u`), и тест перестаёт что-либо проверять.
Поведение компонента лучше проверять Testing Library.

## Vitest против Jest

- **Vitest** — работает поверх Vite: та же конфигурация, трансформации, алиасы;
  нативный ESM и TypeScript без настройки; быстрый watch-режим; API почти совместим
  с Jest (`vi` вместо `jest`). Выбор по умолчанию для Vite-проектов.
- **Jest** — зрелый стандарт, огромная экосистема; ESM и TS требуют настройки
  (babel/ts-jest, SWC). Часто в существующих проектах и с React Native.

Окружение DOM в обоих — **jsdom** или **happy-dom** (быстрее, чуть менее полный).

## Как это спрашивают

- «Чем `toBe` отличается от `toEqual`?»
- «Как протестировать debounce / таймер?» — фейковые таймеры.
- «Как добиться изоляции тестов?»
- «Что вы думаете о снапшот-тестах?»
- «Почему Vitest, а не Jest?»
