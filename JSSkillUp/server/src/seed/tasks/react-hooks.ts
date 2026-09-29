import type { SeedTask } from '../types.js';

/** Кастомные хуки и эффекты: то, что чаще всего просят написать руками. */
export const reactHooksTasks: SeedTask[] = [
  {
    slug: 'react-use-debounce',
    topic: 'custom-hooks',
    title: 'Хук useDebounce',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'easy',
    tags: ['кастомные хуки', 'useEffect', 'таймеры'],
    statementMd: `Напишите хук \`useDebounce<T>(value: T, delay: number): T\`.

- Сразу возвращает начальное значение.
- Новое значение «доходит» до результата, только если \`value\` не менялось \`delay\` мс.
- Каждое изменение \`value\` (или \`delay\`) перезапускает ожидание.
- При размонтировании таймер должен очищаться.

Типичное применение — поиск: запрос уходит, когда пользователь перестал печатать.
В заготовке есть \`App\` для превью.`,
    starterCode: `import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  // TODO
  return value;
}

export default function App() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 500);
  return (
    <div>
      <label htmlFor="q">Поиск</label>
      <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>Сразу: {query}</p>
      <p>С задержкой: {debounced}</p>
    </div>
  );
}
`,
    solutionCode: `import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    // Cleanup срабатывает перед следующим запуском эффекта и при размонтировании —
    // именно он «сбрасывает» ожидание при каждом новом значении.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function App() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 500);
  return (
    <div>
      <label htmlFor="q">Поиск</label>
      <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>Сразу: {query}</p>
      <p>С задержкой: {debounced}</p>
    </div>
  );
}
`,
    solutionNotesMd: `Весь debounce держится на **cleanup эффекта**: React вызывает его перед каждым
повторным запуском эффекта (изменились \`value\` или \`delay\`) и при размонтировании.
Поэтому старый таймер всегда отменяется, а срабатывает только последний.

Сравните с «обычным» \`debounce(fn, ms)\` из задач по JS: там таймер хранится в замыкании,
здесь — в замыкании конкретного запуска эффекта.

Что спросят дальше:
- чем \`useDebounce(value)\` отличается от \`useDebouncedCallback(fn)\` и когда нужен второй
  (debounce обработчика, а не значения; там нужен \`useRef\` на последний \`fn\`);
- что будет в StrictMode (эффект выполнится дважды при монтировании — cleanup спасает);
- зачем \`useDeferredValue\` в React 18 и почему это не debounce (нет фиксированной задержки,
  React сам откладывает низкоприоритетный рендер).`,
    hints: [
      'Храните отложенное значение в `useState`, а обновляйте его из `setTimeout` внутри `useEffect`.',
      'Что вернуть из эффекта, чтобы при новом `value` предыдущий таймер отменился?',
    ],
    tests: [
      {
        name: 'сразу возвращает начальное значение',
        code: `const { result } = await renderHook(() => exports.useDebounce('a', 50));
expect(result.current).toBe('a');`,
      },
      {
        name: 'обновляется только после задержки',
        code: `const { result, rerender } = await renderHook((p) => exports.useDebounce(p.value, 50), { initialProps: { value: 'a' } });
await rerender({ value: 'b' });
expect(result.current).toBe('a');
await sleep(80);
expect(result.current).toBe('b');`,
      },
      {
        name: 'частые изменения перезапускают ожидание',
        hidden: true,
        code: `const { result, rerender } = await renderHook((p) => exports.useDebounce(p.value, 60), { initialProps: { value: 'a' } });
await rerender({ value: 'b' });
await sleep(35);
await rerender({ value: 'c' });
await sleep(35);
expect(result.current).toBe('a');
await sleep(50);
expect(result.current).toBe('c');`,
      },
      {
        name: 'размонтирование очищает таймер',
        hidden: true,
        code: `const cleared = [];
const originalClear = globalThis.clearTimeout;
globalThis.clearTimeout = (id) => { cleared.push(id); return originalClear(id); };
try {
  const { rerender, unmount } = await renderHook((p) => exports.useDebounce(p.value, 50), { initialProps: { value: 1 } });
  await rerender({ value: 2 });
  const before = cleared.length;
  await unmount();
  expect(cleared.length > before).toBe(true);
} finally {
  globalThis.clearTimeout = originalClear;
}`,
      },
    ],
  },

  {
    slug: 'react-use-previous',
    topic: 'refs',
    title: 'Хук usePrevious',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'easy',
    tags: ['кастомные хуки', 'состояние из прошлых рендеров'],
    statementMd: `Напишите хук \`usePrevious<T>(value: T): T | undefined\`, который возвращает
**предыдущее значение, отличное от текущего**.

- На первом рендере — \`undefined\`.
- Когда \`value\` меняется (сравнение через \`Object.is\`), хук возвращает старое значение.
- Повторный рендер с **тем же** \`value\` результат не меняет.

\`\`\`tsx
const prev = usePrevious(count); // count: 0 → 1 → 1 → 5
// prev:                              undefined → 0 → 0 → 1
\`\`\`

Эта формулировка не совпадает с классическим «значение с прошлого рендера» — прочитайте
заметки к решению, там разобраны оба варианта и почему React-документация советует этот.`,
    starterCode: `import { useState } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  // TODO
  return undefined;
}

export default function App() {
  const [count, setCount] = useState(0);
  const [, force] = useState(0);
  const previous = usePrevious(count);
  return (
    <div>
      <p>Сейчас: {count}, раньше: {String(previous)}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => force((n) => n + 1)}>Ререндер без изменений</button>
    </div>
  );
}
`,
    solutionCode: `import { useState } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<T | undefined>(undefined);

  // «Хранение информации из предыдущих рендеров»: setState прямо во время рендера
  // допустим, если он защищён условием. React сразу перезапустит компонент
  // с новым состоянием, не отрисовывая промежуточный результат.
  if (!Object.is(value, current)) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}

export default function App() {
  const [count, setCount] = useState(0);
  const [, force] = useState(0);
  const previous = usePrevious(count);
  return (
    <div>
      <p>Сейчас: {count}, раньше: {String(previous)}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => force((n) => n + 1)}>Ререндер без изменений</button>
    </div>
  );
}
`,
    solutionNotesMd: `Два известных варианта:

**1. Через ref и эффект** — «значение с прошлого рендера»:
\`\`\`tsx
const ref = useRef<T>();
useEffect(() => { ref.current = value; });
return ref.current;
\`\`\`
Минусы: чтение \`ref.current\` во время рендера (правило React Compiler и линтера
\`react-hooks/refs\` на это ругается), а любой посторонний ререндер «сдвигает» previous
к текущему значению.

**2. Через state во время рендера** (решение выше) — «предыдущее *отличающееся* значение».
Это паттерн из документации React «Storing information from previous renders»:
\`setState\` в рендере допустим под условием; React выбросит текущий JSX и сразу
отрендерит компонент заново, до коммита.

Что спросят дальше: почему нельзя сделать то же самое через \`useEffect\` + \`setState\`
(лишний коммит с устаревшими данными — пользователь увидит мигание), и чем ref
отличается от state (изменение ref не вызывает рендер и не участвует в снапшоте рендера).`,
    hints: [
      'Нужно помнить два значения: то, что было «текущим» в прошлый раз, и предыдущее.',
      'Сравните `value` с сохранённым текущим прямо во время рендера и, если отличается, обновите оба состояния — условный setState в рендере допустим.',
    ],
    tests: [
      {
        name: 'на первом рендере undefined',
        code: `const { result } = await renderHook(() => exports.usePrevious(10));
expect(result.current).toBeUndefined();`,
      },
      {
        name: 'после изменения — старое значение',
        code: `const { result, rerender } = await renderHook((p) => exports.usePrevious(p.value), { initialProps: { value: 0 } });
await rerender({ value: 1 });
expect(result.current).toBe(0);
await rerender({ value: 5 });
expect(result.current).toBe(1);`,
      },
      {
        name: 'ререндер с тем же значением ничего не меняет',
        hidden: true,
        code: `const { result, rerender } = await renderHook((p) => exports.usePrevious(p.value), { initialProps: { value: 'a' } });
await rerender({ value: 'b' });
await rerender({ value: 'b' });
await rerender({ value: 'b' });
expect(result.current).toBe('a');`,
      },
      {
        name: 'сравнение через Object.is (NaN)',
        hidden: true,
        code: `const { result, rerender } = await renderHook((p) => exports.usePrevious(p.value), { initialProps: { value: 1 } });
await rerender({ value: NaN });
await rerender({ value: NaN });
expect(result.current).toBe(1);`,
      },
    ],
  },

  {
    slug: 'react-use-fetch-abort',
    topic: 'effects',
    title: 'useFetch с отменой запроса',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['useEffect', 'AbortController', 'race condition'],
    statementMd: `Напишите хук \`useFetch<T>(url: string | null)\`, который возвращает
\`{ data: T | null; error: string | null; loading: boolean }\`.

- \`url === null\` — ничего не запрашивать: \`{ data: null, error: null, loading: false }\`.
- При каждом новом \`url\`: \`loading: true\`, \`data\` и \`error\` сбрасываются в \`null\`,
  затем \`fetch(url, { signal })\` и \`response.json()\`.
- Ответ с \`!response.ok\` — ошибка с текстом \`HTTP <status>\` (например, \`HTTP 404\`).
- **Предыдущий запрос отменяется** через \`AbortController\`, когда меняется \`url\` или
  компонент размонтируется. Ответ устаревшего запроса не должен попасть в состояние,
  а отмена не должна считаться ошибкой.

Это классическая проверка на race condition в эффектах.`,
    starterCode: `import { useEffect, useState } from 'react';

type FetchState<T> = { data: T | null; error: string | null; loading: boolean };

export function useFetch<T>(url: string | null): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, error: null, loading: false });

  useEffect(() => {
    if (url === null) return;
    // TODO: запрос с отменой
    fetch(url)
      .then((response) => response.json())
      .then((data: T) => setState({ data, error: null, loading: false }));
  }, [url]);

  return state;
}

export default function App() {
  const [id, setId] = useState(1);
  // data: URL — демо работает без сети, fetch умеет их читать.
  const { data, error, loading } = useFetch<{ title: string }>(
    \`data:application/json,\${encodeURIComponent(JSON.stringify({ title: \`Задача №\${id}\` }))}\`,
  );
  return (
    <div>
      <button onClick={() => setId((n) => n + 1)}>Следующий</button>
      {loading ? <p>Загрузка…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {data ? <p>{data.title}</p> : null}
    </div>
  );
}
`,
    solutionCode: `import { useEffect, useState } from 'react';

type FetchState<T> = { data: T | null; error: string | null; loading: boolean };

const IDLE = { data: null, error: null, loading: false };

export function useFetch<T>(url: string | null): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>(
    url === null ? IDLE : { data: null, error: null, loading: true },
  );

  useEffect(() => {
    if (url === null) {
      setState(IDLE);
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
        return (await response.json()) as T;
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        // Отменённый запрос — не ошибка: его результат просто никому не нужен.
        if (controller.signal.aborted) return;
        setState({ data: null, error: error instanceof Error ? error.message : String(error), loading: false });
      });

    // Cleanup: новый url или размонтирование отменяют текущий запрос.
    return () => controller.abort();
  }, [url]);

  return state;
}

export default function App() {
  const [id, setId] = useState(1);
  // data: URL — демо работает без сети, fetch умеет их читать.
  const { data, error, loading } = useFetch<{ title: string }>(
    \`data:application/json,\${encodeURIComponent(JSON.stringify({ title: \`Задача №\${id}\` }))}\`,
  );
  return (
    <div>
      <button onClick={() => setId((n) => n + 1)}>Следующий</button>
      {loading ? <p>Загрузка…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {data ? <p>{data.title}</p> : null}
    </div>
  );
}
`,
    solutionNotesMd: `**Race condition.** Пользователь быстро переключает \`url\`: A → B. Если ответ A
придёт позже ответа B, без защиты на экране окажутся данные A. Два способа защиты:

1. **Флаг \`ignore\`** в замыкании эффекта: \`let ignore = false; … return () => { ignore = true }\`.
   Ответ устаревшего запроса отбрасывается, но сам запрос продолжает качаться.
2. **\`AbortController\`** — запрос реально отменяется (экономит сеть), \`fetch\` отклоняется
   с \`AbortError\`, который нужно отличить от настоящей ошибки: \`controller.signal.aborted\`.

Детали:
- \`fetch\` не отклоняется на 404/500 — проверка \`response.ok\` обязательна.
- \`setState\` синхронно в эффекте допустим здесь, потому что это реакция на внешний
  процесс (начало запроса), но в реальном проекте такую логику берут из TanStack Query /
  SWR: кеш, дедупликация, повторные запросы, инвалидация.

Что спросят дальше: почему в StrictMode запрос уходит дважды и что об этом думать
(cleanup отменит первый — это и есть проверка правильности эффекта); как бы вы
кешировали ответы между компонентами.`,
    hints: [
      'Создайте `AbortController` внутри эффекта и передайте `signal` вторым аргументом `fetch`.',
      'Из эффекта верните `() => controller.abort()` — это отменит запрос и при смене url, и при размонтировании.',
      'После отмены `fetch` отклоняется с AbortError. В `catch` проверьте `controller.signal.aborted` и в этом случае ничего не делайте.',
    ],
    tests: [
      {
        name: 'загружает данные и снимает loading',
        code: `globalThis.fetch = (url, init) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({ url }) }), 10);
  init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
});
const { result } = await renderHook(() => exports.useFetch('/api/a'));
expect(result.current.loading).toBe(true);
await waitFor(() => expect(result.current.loading).toBe(false));
expect(result.current.data).toEqual({ url: '/api/a' });
expect(result.current.error).toBeNull();`,
      },
      {
        name: 'HTTP-ошибка превращается в error',
        code: `globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
const { result } = await renderHook(() => exports.useFetch('/missing'));
await waitFor(() => expect(result.current.loading).toBe(false));
expect(result.current.error).toBe('HTTP 404');
expect(result.current.data).toBeNull();`,
      },
      {
        name: 'url === null — запроса нет',
        code: `let calls = 0;
globalThis.fetch = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({}) }; };
const { result } = await renderHook(() => exports.useFetch(null));
await sleep(20);
expect(calls).toBe(0);
expect(result.current).toEqual({ data: null, error: null, loading: false });`,
      },
      {
        name: 'смена url отменяет прошлый запрос, побеждает последний',
        hidden: true,
        code: `const signals = [];
globalThis.fetch = (url, init) => new Promise((resolve, reject) => {
  signals.push(init?.signal);
  const timer = setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({ url }) }), url === '/slow' ? 80 : 10);
  init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
});
const { result, rerender } = await renderHook((p) => exports.useFetch(p.url), { initialProps: { url: '/slow' } });
await rerender({ url: '/fast' });
await sleep(120);
expect(result.current.data).toEqual({ url: '/fast' });
expect(result.current.error).toBeNull();
expect(Boolean(signals[0])).toBe(true);
expect(signals[0].aborted).toBe(true);`,
      },
      {
        name: 'при смене url данные сбрасываются',
        hidden: true,
        code: `globalThis.fetch = (url) => new Promise((resolve) => setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({ url }) }), 20));
const { result, rerender } = await renderHook((p) => exports.useFetch(p.url), { initialProps: { url: '/a' } });
await waitFor(() => expect(result.current.data).toEqual({ url: '/a' }));
await rerender({ url: '/b' });
expect(result.current.loading).toBe(true);
expect(result.current.data).toBeNull();`,
      },
      {
        name: 'размонтирование отменяет запрос без ошибок',
        hidden: true,
        code: `const signals = [];
const errors = [];
const originalError = console.error;
console.error = (...args) => { errors.push(args.join(' ')); };
try {
  globalThis.fetch = (url, init) => new Promise((resolve, reject) => {
    signals.push(init?.signal);
    const timer = setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({}) }), 40);
    init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
  });
  const { unmount } = await renderHook(() => exports.useFetch('/a'));
  await unmount();
  await sleep(60);
  expect(signals[0]?.aborted).toBe(true);
} finally {
  console.error = originalError;
}`,
      },
    ],
  },

  {
    slug: 'react-stopwatch-stale-closure',
    topic: 'stale-closures',
    title: 'Секундомер: stale closure в setInterval',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'medium',
    tags: ['stale closure', 'useEffect', 'баг'],
    statementMd: `Секундомер в заготовке **сломан**. Найдите и исправьте баги, не меняя разметку.

Как должно работать (\`tickMs\` — длительность «секунды», по умолчанию 1000; в тестах она меньше):
- **«Старт»** запускает счёт: значение в \`data-testid="time"\` растёт на 1 каждые \`tickMs\`.
- **«Стоп»** останавливает счёт, значение замирает.
- Повторный «Старт» продолжает с того же значения **с той же скоростью**.
- **«Сброс»** обнуляет значение.
- После размонтирования никакие таймеры не работают.

Сначала запустите тесты и посмотрите, что именно не так, — потом объясните себе причину
каждого бага. На собеседовании это спрашивают именно в формате «почему так».`,
    starterCode: `import { useEffect, useState } from 'react';

export default function Stopwatch({ tickMs = 1000 }: { tickMs?: number }) {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    setInterval(() => {
      setTime(time + 1);
    }, tickMs);
  }, [running]);

  return (
    <div>
      <p data-testid="time">{time}</p>
      <button onClick={() => setRunning(true)}>Старт</button>
      <button onClick={() => setRunning(false)}>Стоп</button>
      <button onClick={() => setTime(0)}>Сброс</button>
    </div>
  );
}
`,
    solutionCode: `import { useEffect, useState } from 'react';

export default function Stopwatch({ tickMs = 1000 }: { tickMs?: number }) {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    // Функциональное обновление не зависит от time из замыкания первого рендера.
    const id = setInterval(() => {
      setTime((current) => current + 1);
    }, tickMs);
    // Без cleanup «Стоп» не останавливал интервал, а каждый «Старт» добавлял ещё один.
    return () => clearInterval(id);
  }, [running, tickMs]);

  return (
    <div>
      <p data-testid="time">{time}</p>
      <button onClick={() => setRunning(true)}>Старт</button>
      <button onClick={() => setRunning(false)}>Стоп</button>
      <button onClick={() => setTime(0)}>Сброс</button>
    </div>
  );
}
`,
    solutionNotesMd: `В заготовке три бага:

1. **Stale closure.** Колбэк интервала создан один раз — в эффекте рендера, где
   \`running\` стал \`true\`. Он навсегда «видит» \`time\` из того рендера, поэтому
   \`setTime(time + 1)\` каждый раз ставит одно и то же значение: счётчик застревает на 1.
   Исправление — \`setTime(t => t + 1)\`. Альтернатива «добавить \`time\` в зависимости»
   хуже: интервал будет пересоздаваться каждую секунду и сбиваться по фазе.
2. **Нет cleanup.** \`clearInterval\` не вызывается: «Стоп» ничего не останавливает,
   а повторный «Старт» запускает второй интервал — счёт идёт вдвое быстрее. После
   размонтирования интервал продолжает дёргать \`setState\`.
3. **Неполные зависимости.** \`tickMs\` используется в эффекте, но не указан в массиве —
   смена пропса не применится. Это ловит правило \`react-hooks/exhaustive-deps\`.

Что спросят дальше: паттерн \`useInterval\` Дэна Абрамова (колбэк в ref, интервал
не пересоздаётся), и почему \`useEffectEvent\` решает ту же проблему «читать свежие значения,
не будучи зависимостью».`,
    hints: [
      'Запустите и посмотрите: доходит ли счётчик дальше 1? Какое значение `time` видит колбэк интервала?',
      'Что происходит с интервалом при «Стоп»? Эффект перезапускается — а кто очищает старый интервал?',
      'Нужны функциональное обновление `setTime(t => t + 1)`, `return () => clearInterval(id)` и полный массив зависимостей.',
    ],
    tests: [
      {
        name: 'счёт идёт после «Старт»',
        code: `await render(h(exports.default, { tickMs: 20 }));
await fireEvent.click(screen.getByRole('button', { name: 'Старт' }));
await sleep(130);
const value = Number(screen.getByTestId('time').textContent);
expect(value >= 3).toBe(true);`,
      },
      {
        name: '«Стоп» замораживает значение',
        code: `await render(h(exports.default, { tickMs: 20 }));
await fireEvent.click(screen.getByRole('button', { name: 'Старт' }));
await sleep(90);
await fireEvent.click(screen.getByRole('button', { name: 'Стоп' }));
const stopped = screen.getByTestId('time').textContent;
await sleep(80);
expect(screen.getByTestId('time').textContent).toBe(stopped);`,
      },
      {
        name: 'повторный «Старт» не ускоряет счёт',
        hidden: true,
        code: `await render(h(exports.default, { tickMs: 25 }));
const start = screen.getByRole('button', { name: 'Старт' });
const stop = screen.getByRole('button', { name: 'Стоп' });
await fireEvent.click(start);
await fireEvent.click(stop);
await fireEvent.click(start);
await fireEvent.click(stop);
await fireEvent.click(start);
await sleep(160);
const value = Number(screen.getByTestId('time').textContent);
expect(value >= 3 && value <= 8).toBe(true);`,
      },
      {
        name: '«Сброс» обнуляет, счёт продолжается с нуля',
        hidden: true,
        code: `await render(h(exports.default, { tickMs: 20 }));
await fireEvent.click(screen.getByRole('button', { name: 'Старт' }));
await sleep(90);
await fireEvent.click(screen.getByRole('button', { name: 'Сброс' }));
const afterReset = Number(screen.getByTestId('time').textContent);
expect(afterReset <= 1).toBe(true);
await sleep(70);
expect(Number(screen.getByTestId('time').textContent) >= 2).toBe(true);`,
      },
      {
        name: 'размонтирование останавливает интервал',
        hidden: true,
        code: `const cleared = [];
const originalClear = globalThis.clearInterval;
globalThis.clearInterval = (id) => { cleared.push(id); return originalClear(id); };
try {
  const view = await render(h(exports.default, { tickMs: 20 }));
  await fireEvent.click(screen.getByRole('button', { name: 'Старт' }));
  await view.unmount();
  expect(cleared.length >= 1).toBe(true);
} finally {
  globalThis.clearInterval = originalClear;
}`,
      },
    ],
  },

  {
    slug: 'react-use-history',
    topic: 'custom-hooks',
    title: 'Хук useHistory: undo / redo',
    kind: 'react',
    runtime: 'preview',
    difficulty: 'hard',
    tags: ['кастомные хуки', 'useReducer', 'иммутабельность'],
    statementMd: `Напишите хук \`useHistory<T>(initial: T, limit = 50)\`, который хранит историю значений.

Возвращает объект:
| Поле | Что делает |
| --- | --- |
| \`value\` | текущее значение |
| \`set(next)\` | \`next\` — значение или функция \`(prev) => next\`; новое значение попадает в историю |
| \`undo()\` / \`redo()\` | шаг назад / вперёд; на краях ничего не делают |
| \`canUndo\` / \`canRedo\` | можно ли сделать шаг |
| \`reset(value)\` | история очищается, остаётся одно значение |

Правила:
- \`set\` после \`undo\` **отбрасывает** «будущее» (redo больше недоступен).
- \`set\` с тем же значением (\`Object.is\`) историю не меняет.
- В истории не больше \`limit\` значений — самые старые выбрасываются.
- Функции \`set\`, \`undo\`, \`redo\`, \`reset\` **стабильны** между рендерами (одна и та же ссылка),
  чтобы их можно было отдавать в \`memo\`-компоненты и зависимости эффектов.

В тестах вызовы оборачиваются в \`act\` — как в Testing Library.`,
    starterCode: `import { useState } from 'react';

export function useHistory<T>(initial: T, limit = 50) {
  const [value, setValue] = useState(initial);
  // TODO
  return {
    value,
    set: (next: T | ((prev: T) => T)) => setValue(next),
    undo: () => {},
    redo: () => {},
    reset: (next: T) => setValue(next),
    canUndo: false,
    canRedo: false,
  };
}

export default function App() {
  const text = useHistory('');
  return (
    <div>
      <input aria-label="Текст" value={text.value} onChange={(e) => text.set(e.target.value)} />
      <button onClick={text.undo} disabled={!text.canUndo}>Отменить</button>
      <button onClick={text.redo} disabled={!text.canRedo}>Повторить</button>
    </div>
  );
}
`,
    solutionCode: `import { useCallback, useMemo, useReducer } from 'react';

type History<T> = { past: T[]; present: T; future: T[] };

type Action<T> =
  | { type: 'set'; next: T | ((prev: T) => T); limit: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; value: T };

function reducer<T>(state: History<T>, action: Action<T>): History<T> {
  switch (action.type) {
    case 'set': {
      const next =
        typeof action.next === 'function'
          ? (action.next as (prev: T) => T)(state.present)
          : action.next;
      if (Object.is(next, state.present)) return state;
      // В истории limit значений: past + present. Будущее при новом set отбрасывается.
      const past = [...state.past, state.present].slice(-(action.limit - 1));
      return { past, present: next, future: [] };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1] as T;
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future as [T, ...T[]];
      return { past: [...state.past, state.present], present: next, future: rest };
    }
    case 'reset':
      return { past: [], present: action.value, future: [] };
  }
}

export function useHistory<T>(initial: T, limit = 50) {
  const [state, dispatch] = useReducer(reducer<T>, { past: [], present: initial, future: [] });

  // dispatch стабилен сам по себе, поэтому и обёртки над ним стабильны.
  const set = useCallback((next: T | ((prev: T) => T)) => dispatch({ type: 'set', next, limit }), [limit]);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback((value: T) => dispatch({ type: 'reset', value }), []);

  return useMemo(
    () => ({
      value: state.present,
      set,
      undo,
      redo,
      reset,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state, set, undo, redo, reset],
  );
}

export default function App() {
  const text = useHistory('');
  return (
    <div>
      <input aria-label="Текст" value={text.value} onChange={(e) => text.set(e.target.value)} />
      <button onClick={text.undo} disabled={!text.canUndo}>Отменить</button>
      <button onClick={text.redo} disabled={!text.canRedo}>Повторить</button>
    </div>
  );
}
`,
    solutionNotesMd: `**Модель past / present / future** — стандартная для undo/redo (так устроен
redux-undo). Все переходы — чистые функции в редьюсере, поэтому их легко тестировать
без React.

Почему \`useReducer\`, а не несколько \`useState\`:
- переход затрагивает сразу три поля — в редьюсере они меняются атомарно;
- \`dispatch\` стабилен, значит \`undo\`/\`redo\` не зависят от текущего состояния и
  не пересоздаются. С \`useState\` пришлось бы писать \`setHistory(h => …)\` — тоже можно.

Детали, на которых ловят:
- функциональный \`set(prev => …)\` должен получать **актуальный** present — поэтому
  функция вызывается внутри редьюсера, а не в хуке;
- \`typeof next === 'function'\` ломается, если \`T\` сам функция — это ограничение
  того же рода, что у \`useState\`;
- лимит: \`past\` хранит максимум \`limit - 1\` значений, плюс present.

Что спросят дальше: как хранить историю большого документа без копий (патчи /
immer produceWithPatches, структурное разделение); группировка ввода по времени, чтобы
undo откатывал слово, а не букву.`,
    hints: [
      'Разделите историю на три части: `past`, `present`, `future`. Undo переносит present в начало future, а последний элемент past делает present.',
      'Удобно описать переходы редьюсером и использовать `useReducer`: `dispatch` стабилен, и функции-обёртки над ним тоже будут стабильны.',
      'Для лимита обрезайте `past`: `[...past, present].slice(-(limit - 1))`.',
    ],
    tests: [
      {
        name: 'set, undo и redo',
        code: `const { result } = await renderHook(() => exports.useHistory(0));
await act(() => result.current.set(1));
await act(() => result.current.set(2));
expect(result.current.value).toBe(2);
await act(() => result.current.undo());
expect(result.current.value).toBe(1);
await act(() => result.current.undo());
expect(result.current.value).toBe(0);
expect(result.current.canUndo).toBe(false);
await act(() => result.current.redo());
expect(result.current.value).toBe(1);
expect(result.current.canRedo).toBe(true);`,
      },
      {
        name: 'функциональный set получает актуальное значение',
        code: `const { result } = await renderHook(() => exports.useHistory(10));
await act(() => {
  result.current.set((n) => n + 1);
  result.current.set((n) => n + 1);
});
expect(result.current.value).toBe(12);
await act(() => result.current.undo());
expect(result.current.value).toBe(11);`,
      },
      {
        name: 'set после undo отбрасывает будущее',
        hidden: true,
        code: `const { result } = await renderHook(() => exports.useHistory('a'));
await act(() => result.current.set('b'));
await act(() => result.current.set('c'));
await act(() => result.current.undo());
await act(() => result.current.set('x'));
expect(result.current.canRedo).toBe(false);
await act(() => result.current.redo());
expect(result.current.value).toBe('x');
await act(() => result.current.undo());
expect(result.current.value).toBe('b');`,
      },
      {
        name: 'то же значение не попадает в историю',
        hidden: true,
        code: `const { result } = await renderHook(() => exports.useHistory(1));
await act(() => result.current.set(1));
expect(result.current.canUndo).toBe(false);`,
      },
      {
        name: 'лимит истории',
        hidden: true,
        code: `const { result } = await renderHook(() => exports.useHistory(0, 3));
for (let i = 1; i <= 5; i++) await act(() => result.current.set(i));
await act(() => result.current.undo());
await act(() => result.current.undo());
await act(() => result.current.undo());
expect(result.current.value).toBe(3);
expect(result.current.canUndo).toBe(false);`,
      },
      {
        name: 'reset и стабильность функций',
        hidden: true,
        code: `const { result } = await renderHook(() => exports.useHistory('a'));
const { set, undo, redo, reset } = result.current;
await act(() => set('b'));
expect(result.current.set).toBe(set);
expect(result.current.undo).toBe(undo);
expect(result.current.redo).toBe(redo);
expect(result.current.reset).toBe(reset);
await act(() => reset('z'));
expect(result.current.value).toBe('z');
expect(result.current.canUndo).toBe(false);
expect(result.current.canRedo).toBe(false);`,
      },
    ],
  },
];
