import type { SeedTask } from '../types.js';

/** Асинхронные примитивы руками: то, что просят написать, когда дошли до event loop. */
export const asyncPatternTasks: SeedTask[] = [
  {
    slug: 'promise-all',
    topic: 'async-patterns-impl',
    title: 'Реализовать Promise.all',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['промисы', 'реализация'],
    statementMd: `Реализуйте \`promiseAll(items)\` — аналог \`Promise.all\`.

\`\`\`js
await promiseAll([Promise.resolve(1), 2, Promise.resolve(3)]);  // [1, 2, 3]
await promiseAll([]);                                            // []
\`\`\`

Требования:

- результаты в порядке **аргументов**, а не порядке завершения;
- первая же ошибка отклоняет общий промис;
- не-промисы в массиве обрабатываются как уже выполненные;
- пустой массив резолвится сразу.

\`Promise.all\` внутри использовать нельзя.`,
    starterCode: `function promiseAll<T>(items: Array<T | Promise<T>>): Promise<T[]> {
  // ваш код
  return Promise.resolve([]);
}`,
    solutionCode: `function promiseAll<T>(items: Array<T | Promise<T>>): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const list = [...items];
    const results = new Array<T>(list.length);
    let remaining = list.length;

    // Иначе промис никогда не разрешится: цикл ниже не выполнится ни разу.
    if (remaining === 0) {
      resolve(results);
      return;
    }

    list.forEach((item, index) => {
      // Promise.resolve нормализует обычные значения и thenable-объекты.
      Promise.resolve(item).then((value) => {
        results[index] = value;
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}`,
    solutionNotesMd: `Сложность: O(n).

Что проверяет эта задача:

1. **Пустой массив** — без явной ветки промис зависнет навсегда.
2. **Порядок результатов** — запись по индексу (\`results[index] = value\`),
   а не \`results.push(value)\`. Иначе порядок будет по времени завершения.
3. **Счётчик вместо длины** — \`results.length\` не годится: у массива,
   созданного через \`new Array(n)\`, длина уже равна нужной.
4. **Нормализация** — \`Promise.resolve(item)\` превращает обычное значение
   и thenable в промис.
5. **\`reject\` передаётся напрямую** вторым аргументом \`then\`. Повторные вызовы
   промис игнорирует сам, поэтому отдельного флага не нужно.

Что важно проговорить: **отмены нет**. Остальные операции продолжают выполняться
после первой ошибки, их результаты просто никому не нужны. Для реальной отмены
нужен \`AbortController\`.`,
    hints: [
      'Оберните всё в `new Promise`. Счётчик незавершённых промисов подскажет, когда резолвить.',
      'Три граничных случая: пустой массив (резолвить сразу), порядок результатов (писать по индексу, не push) и не-промисы (обернуть в `Promise.resolve`).',
    ],
    tests: [
      {
        name: 'возвращает результаты в порядке аргументов',
        code: `const result = await promiseAll([
  new Promise((r) => setTimeout(() => r(1), 30)),
  Promise.resolve(2),
  new Promise((r) => setTimeout(() => r(3), 10)),
]);
expect(result).toEqual([1, 2, 3]);`,
      },
      {
        name: 'обрабатывает не-промисы',
        code: `expect(await promiseAll([1, Promise.resolve(2), 3])).toEqual([1, 2, 3]);`,
      },
      {
        name: 'пустой массив резолвится сразу',
        code: `expect(await promiseAll([])).toEqual([]);`,
      },
      {
        name: 'первая ошибка отклоняет общий промис',
        code: `let rejected = null;
try {
  await promiseAll([Promise.resolve(1), Promise.reject(new Error('бум')), Promise.resolve(3)]);
} catch (error) {
  rejected = error.message;
}
expect(rejected).toBe('бум');`,
        hidden: true,
      },
      {
        name: 'возвращает именно промис',
        code: `const p = promiseAll([1]);
expect(p).toBeInstanceOf(Promise);
expect(await p).toEqual([1]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'promisify',
    topic: 'async-patterns-impl',
    title: 'promisify',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['промисы', 'реализация'],
    statementMd: `Реализуйте \`promisify(fn)\`: превращает функцию с колбэком в стиле Node
(\`(error, value) => void\` последним аргументом) в функцию, возвращающую промис.

\`\`\`js
const readValue = (key, callback) => {
  if (key === 'bad') callback(new Error('нет такого ключа'));
  else callback(null, 'значение ' + key);
};

const readValueAsync = promisify(readValue);

await readValueAsync('a');    // 'значение a'
await readValueAsync('bad');  // промис отклонится
\`\`\`

Сохраняйте \`this\` вызова.`,
    starterCode: `function promisify(fn: (...args: never[]) => void): (...args: unknown[]) => Promise<unknown> {
  // ваш код
  return () => Promise.resolve();
}`,
    solutionCode: `function promisify(fn: (...args: never[]) => void): (...args: unknown[]) => Promise<unknown> {
  return function promisified(this: unknown, ...args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const callback = (error: unknown, value: unknown): void => {
        if (error) reject(error);
        else resolve(value);
      };

      (fn as (...a: unknown[]) => void).apply(this, [...args, callback]);
    });
  };
}`,
    solutionNotesMd: `Ключевые моменты:

1. Колбэк **добавляется последним аргументом** — это и есть соглашение
   error-first callback.
2. Проверка \`if (error)\`, а не \`if (error !== null)\`: в реальных API на месте
   ошибки бывает \`undefined\`.
3. Обычная функция вместо стрелочной — чтобы \`this\` вызова дошёл до \`fn.apply\`.
   Для методов объекта это критично.
4. Возвращается новый промис; повторные вызовы \`resolve\`/\`reject\` внутри колбэка
   игнорируются самим промисом, поэтому защищаться от двойного вызова не нужно.

В Node есть встроенный \`util.promisify\`, а у многих библиотек — промисные версии
API. Задача остаётся популярной, потому что проверяет понимание конструктора \`Promise\`
и работы с произвольным числом аргументов.`,
    hints: [
      'Верните функцию, которая создаёт `new Promise` и вызывает исходную функцию, добавив колбэк последним аргументом.',
      'Колбэк в стиле Node: первый аргумент — ошибка, второй — значение. Не забудьте `fn.apply(this, [...args, callback])`, чтобы сохранить контекст.',
    ],
    tests: [
      {
        name: 'резолвит значение',
        code: `const readValue = (key, callback) => callback(null, 'значение ' + key);
const async = promisify(readValue);
expect(await async('a')).toBe('значение a');`,
      },
      {
        name: 'отклоняет при ошибке',
        code: `const failing = (callback) => callback(new Error('бум'));
const async = promisify(failing);
let message = null;
try { await async(); } catch (error) { message = error.message; }
expect(message).toBe('бум');`,
      },
      {
        name: 'работает с несколькими аргументами',
        code: `const sum = (a, b, callback) => callback(null, a + b);
expect(await promisify(sum)(2, 3)).toBe(5);`,
      },
      {
        name: 'сохраняет this',
        code: `const obj = {
  prefix: 'pre-',
  method(value, callback) { callback(null, this.prefix + value); },
};
obj.methodAsync = promisify(obj.method);
expect(await obj.methodAsync('x')).toBe('pre-x');`,
        hidden: true,
      },
      {
        name: 'асинхронный колбэк',
        code: `const delayed = (callback) => setTimeout(() => callback(null, 'готово'), 20);
expect(await promisify(delayed)()).toBe('готово');`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'event-emitter',
    topic: 'async-patterns-impl',
    title: 'EventEmitter',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['паттерны', 'реализация'],
    statementMd: `Реализуйте класс \`EventEmitter\` с методами:

- \`on(event, handler)\` — подписаться, возвращает функцию отписки;
- \`off(event, handler)\` — отписаться;
- \`once(event, handler)\` — подписаться на один вызов;
- \`emit(event, ...args)\` — вызвать всех подписчиков, вернуть \`true\`, если кто-то был.

\`\`\`js
const emitter = new EventEmitter();
const unsubscribe = emitter.on('tick', (n) => console.log(n));
emitter.emit('tick', 1);   // выведет 1
unsubscribe();
emitter.emit('tick', 2);   // ничего
\`\`\`

Отдельно продумайте случай, когда обработчик отписывается **во время** \`emit\`.`,
    starterCode: `type Handler = (...args: unknown[]) => void;

class EventEmitter {
  on(event: string, handler: Handler): () => void {
    // ваш код
    return () => {};
  }

  off(event: string, handler: Handler): void {
    // ваш код
  }

  once(event: string, handler: Handler): () => void {
    // ваш код
    return () => {};
  }

  emit(event: string, ...args: unknown[]): boolean {
    // ваш код
    return false;
  }
}`,
    solutionCode: `type Handler = (...args: unknown[]) => void;

class EventEmitter {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    let handlers = this.listeners.get(event);
    if (handlers === undefined) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }
    handlers.add(handler);

    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    const handlers = this.listeners.get(event);
    if (handlers === undefined) return;

    handlers.delete(handler);
    // Не оставляем пустые множества: иначе Map растёт при частых подписках.
    if (handlers.size === 0) this.listeners.delete(event);
  }

  once(event: string, handler: Handler): () => void {
    const wrapper: Handler = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };

    return this.on(event, wrapper);
  }

  emit(event: string, ...args: unknown[]): boolean {
    const handlers = this.listeners.get(event);
    if (handlers === undefined || handlers.size === 0) return false;

    // Копия: обработчик может отписаться или подписаться прямо во время emit.
    for (const handler of [...handlers]) handler(...args);
    return true;
  }
}`,
    solutionNotesMd: `Три детали, ради которых дают эту задачу:

1. **Копия множества перед обходом в \`emit\`.** Если обработчик вызовет \`off\`
   во время \`emit\`, изменение коллекции на лету даст непредсказуемый результат.
   Именно здесь чаще всего ошибаются.
2. **\`once\` через обёртку.** Отписка происходит **до** вызова обработчика —
   иначе рекурсивный \`emit\` внутри обработчика вызвал бы его повторно.
   Побочный эффект: \`off(event, handler)\` с исходной функцией не отпишет \`once\`.
   Реальные реализации хранят ссылку на оригинал в \`wrapper.listener\`.
3. **\`on\` возвращает функцию отписки.** Это современный API: в React такую
   функцию удобно вернуть прямо из \`useEffect\`.

\`Set\` вместо массива даёт удаление за O(1) и автоматически защищает от двойной
подписки одного и того же обработчика.`,
    hints: [
      '`Map` из имени события в `Set` обработчиков. `Set` даёт удаление за O(1).',
      'В `emit` обходите **копию** множества: обработчик может отписаться прямо во время вызова. В `once` отписывайтесь до вызова обработчика, а не после.',
    ],
    tests: [
      {
        name: 'подписка и вызов',
        code: `const emitter = new EventEmitter();
const seen = [];
emitter.on('tick', (n) => seen.push(n));
expect(emitter.emit('tick', 1)).toBe(true);
emitter.emit('tick', 2);
expect(seen).toEqual([1, 2]);`,
      },
      {
        name: 'отписка через возвращённую функцию и через off',
        code: `const emitter = new EventEmitter();
const seen = [];
const handler = (n) => seen.push(n);
const unsubscribe = emitter.on('tick', handler);
emitter.emit('tick', 1);
unsubscribe();
emitter.emit('tick', 2);

emitter.on('other', handler);
emitter.off('other', handler);
emitter.emit('other', 3);

expect(seen).toEqual([1]);`,
      },
      {
        name: 'once вызывается ровно один раз',
        code: `const emitter = new EventEmitter();
let calls = 0;
emitter.once('tick', () => { calls += 1; });
emitter.emit('tick');
emitter.emit('tick');
expect(calls).toBe(1);`,
      },
      {
        name: 'emit возвращает false без подписчиков',
        code: `const emitter = new EventEmitter();
expect(emitter.emit('nobody')).toBe(false);`,
        hidden: true,
      },
      {
        name: 'отписка во время emit не ломает обход',
        code: `const emitter = new EventEmitter();
const seen = [];
const first = () => { seen.push('first'); emitter.off('tick', second); };
const second = () => { seen.push('second'); };
emitter.on('tick', first);
emitter.on('tick', second);
emitter.emit('tick');
emitter.emit('tick');
expect(seen).toEqual(['first', 'second', 'first']);`,
        hidden: true,
      },
      {
        name: 'несколько событий независимы',
        code: `const emitter = new EventEmitter();
const seen = [];
emitter.on('a', () => seen.push('a'));
emitter.on('b', () => seen.push('b'));
emitter.emit('b');
expect(seen).toEqual(['b']);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'retry-with-backoff',
    topic: 'async-patterns-impl',
    title: 'retry с экспоненциальной задержкой',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['промисы', 'реализация'],
    statementMd: `Реализуйте \`retry(fn, options)\`: повторяет асинхронную операцию при ошибке.

\`\`\`js
const data = await retry(() => fetchData(), { attempts: 3, baseDelay: 100 });
\`\`\`

Требования:

- \`attempts\` — общее число попыток (по умолчанию 3), \`baseDelay\` — базовая задержка (300 мс);
- задержка растёт экспоненциально: \`baseDelay * 2 ** номерПопытки\`;
- **перед первой попыткой задержки нет**;
- если все попытки провалились — пробрасывается **последняя** ошибка;
- при успехе возвращается результат немедленно, оставшиеся попытки не делаются.

Именно так устроена обработка 429 от внешних API.`,
    starterCode: `interface RetryOptions {
  attempts?: number;
  baseDelay?: number;
}

async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  // ваш код
  return fn();
}`,
    solutionCode: `interface RetryOptions {
  attempts?: number;
  baseDelay?: number;
}

async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelay = options.baseDelay ?? 300;

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    // Перед первой попыткой не ждём: задержка нужна только между повторами.
    if (attempt > 0) {
      const delay = baseDelay * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}`,
    solutionNotesMd: `Ключевые моменты:

1. **\`return await fn()\` внутри \`try\`**, а не \`return fn()\`. Без \`await\`
   промис вернётся до того, как \`catch\` успеет сработать, и ретраев не будет.
2. **Задержка только между попытками.** Первая попытка идёт сразу — иначе каждый
   успешный вызов был бы медленнее на \`baseDelay\`.
3. **Сохранение последней ошибки.** Пробрасывать первую бессмысленно: полезнее
   та, на которой всё окончательно сломалось.
4. **Экспонента** \`baseDelay * 2 ** (attempt - 1)\` даёт 300, 600, 1200 мс —
   нагрузка на падающий сервис растёт не линейно.

Чего здесь нет и о чём стоит сказать на интервью:

- **джиттер** — случайная добавка к задержке, чтобы клиенты не долбили сервер
  синхронно после общего сбоя;
- **проверка типа ошибки** — повторять имеет смысл сетевые ошибки и 429/503,
  а не 400 и 404;
- **уважение к \`Retry-After\`** — если сервер прислал заголовок, ждать нужно столько,
  сколько он просит;
- **отмена** через \`AbortSignal\`.`,
    hints: [
      'Цикл по попыткам с `try/catch`. Успех — сразу возвращаем результат, ошибка — запоминаем и идём дальше.',
      'Внутри `try` пишите `return await fn()`, а не `return fn()`: без `await` ошибка пролетит мимо `catch`. И не ждите перед первой попыткой.',
    ],
    tests: [
      {
        name: 'успех с первой попытки',
        code: `let calls = 0;
const result = await retry(async () => { calls += 1; return 'ок'; }, { baseDelay: 5 });
expect(result).toBe('ок');
expect(calls).toBe(1);`,
      },
      {
        name: 'повторяет до успеха',
        code: `let calls = 0;
const result = await retry(async () => {
  calls += 1;
  if (calls < 3) throw new Error('временная ошибка');
  return 'наконец-то';
}, { attempts: 5, baseDelay: 5 });
expect(result).toBe('наконец-то');
expect(calls).toBe(3);`,
      },
      {
        name: 'пробрасывает последнюю ошибку',
        code: `let calls = 0;
let message = null;
try {
  await retry(async () => {
    calls += 1;
    throw new Error('ошибка ' + calls);
  }, { attempts: 3, baseDelay: 5 });
} catch (error) {
  message = error.message;
}
expect(calls).toBe(3);
expect(message).toBe('ошибка 3');`,
      },
      {
        name: 'перед первой попыткой не ждёт',
        code: `const started = Date.now();
await retry(async () => 'ок', { attempts: 3, baseDelay: 200 });
expect(Date.now() - started < 100).toBe(true);`,
        hidden: true,
      },
      {
        name: 'задержка растёт экспоненциально',
        code: `const timestamps = [];
try {
  await retry(async () => {
    timestamps.push(Date.now());
    throw new Error('всегда падает');
  }, { attempts: 3, baseDelay: 40 });
} catch {}
expect(timestamps).toHaveLength(3);
const firstGap = timestamps[1] - timestamps[0];
const secondGap = timestamps[2] - timestamps[1];
expect(firstGap >= 30).toBe(true);
expect(secondGap > firstGap).toBe(true);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'map-limit',
    topic: 'async-patterns-impl',
    title: 'Ограничение параллельности запросов',
    kind: 'algo',
    difficulty: 'hard',
    tags: ['промисы', 'реализация'],
    statementMd: `Реализуйте \`mapLimit(items, limit, fn)\`: применяет асинхронную функцию
ко всем элементам, но держит в работе одновременно не больше \`limit\` операций.

\`\`\`js
const results = await mapLimit(urls, 3, (url) => fetch(url));
\`\`\`

Требования:

- результаты в порядке **входного массива**;
- одновременно выполняется не более \`limit\` операций;
- как только одна завершилась, сразу стартует следующая (не батчами по \`limit\`);
- любая ошибка отклоняет общий промис.

Это реальная задача: без ограничения 500 одновременных запросов уронят и браузер,
и сервер.`,
    starterCode: `async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  // ваш код
  return [];
}`,
    solutionCode: `async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  if (items.length === 0) return results;

  const size = Math.max(1, Math.min(limit, items.length));
  let nextIndex = 0;

  // Каждый «рабочий» в цикле забирает следующий свободный индекс.
  // Так следующая операция стартует сразу после завершения предыдущей,
  // а не после того, как закончится вся пачка.
  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index]!, index);
    }
  };

  await Promise.all(Array.from({ length: size }, () => worker()));

  return results;
}`,
    solutionNotesMd: `Сложность: O(n) вызовов, максимум \`limit\` одновременно.

Паттерн называется «пул воркеров». Ключевая идея: запускаем ровно \`limit\`
параллельных циклов, и каждый в своём темпе разбирает общую очередь индексов.
Инкремент \`nextIndex\` безопасен, потому что JavaScript однопоточный — между
чтением и записью не может вклиниться другой воркер.

Наивное решение батчами:

\`\`\`js
for (let i = 0; i < items.length; i += limit) {
  results.push(...await Promise.all(items.slice(i, i + limit).map(fn)));
}
\`\`\`

Оно тоже ограничивает параллельность, но **ждёт самую медленную операцию в пачке**
прежде чем начать следующую. При разбросе времён это заметно медленнее.

Запись по индексу сохраняет порядок результатов независимо от порядка завершения.

\`Math.max(1, ...)\` защищает от \`limit = 0\`, при котором не стартовал бы ни один
воркер и промис завис бы навсегда.`,
    hints: [
      'Не запускайте задачи батчами по `limit` — так вы будете ждать самую медленную в каждой пачке.',
      'Запустите ровно `limit` параллельных «воркеров», каждый в цикле забирает следующий свободный индекс из общего счётчика и пишет результат по этому индексу.',
    ],
    tests: [
      {
        name: 'возвращает результаты в порядке входа',
        code: `const delays = [30, 5, 20, 10];
const result = await mapLimit(delays, 2, async (ms, i) => {
  await sleep(ms);
  return i;
});
expect(result).toEqual([0, 1, 2, 3]);`,
      },
      {
        name: 'не превышает лимит параллельности',
        code: `let running = 0;
let peak = 0;
await mapLimit([1, 2, 3, 4, 5, 6], 2, async () => {
  running += 1;
  peak = Math.max(peak, running);
  await sleep(15);
  running -= 1;
});
expect(peak).toBe(2);`,
      },
      {
        name: 'пустой массив',
        code: `expect(await mapLimit([], 3, async (x) => x)).toEqual([]);`,
      },
      {
        name: 'лимит больше числа элементов',
        code: `const result = await mapLimit([1, 2], 10, async (x) => x * 2);
expect(result).toEqual([2, 4]);`,
        hidden: true,
      },
      {
        name: 'ошибка отклоняет общий промис',
        code: `let message = null;
try {
  await mapLimit([1, 2, 3], 2, async (x) => {
    if (x === 2) throw new Error('упало на ' + x);
    return x;
  });
} catch (error) {
  message = error.message;
}
expect(message).toBe('упало на 2');`,
        hidden: true,
      },
      {
        name: 'следующая задача стартует сразу после освободившейся',
        code: `const order = [];
await mapLimit([40, 5, 5, 5], 2, async (ms, i) => {
  await sleep(ms);
  order.push(i);
});
expect(order[0]).toBe(1);
expect(order[order.length - 1]).toBe(0);`,
        hidden: true,
      },
    ],
  },
];
