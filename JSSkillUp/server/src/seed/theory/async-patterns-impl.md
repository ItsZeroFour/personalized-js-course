# Асинхронные примитивы руками

## Promise.all

```js
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = [...iterable];
    const results = new Array(items.length);
    let completed = 0;

    if (items.length === 0) {
      resolve([]);                                  // пустой вход — сразу
      return;
    }

    items.forEach((item, index) => {
      Promise.resolve(item).then((value) => {       // не-промисы тоже разрешены
        results[index] = value;                     // по индексу, а не push
        completed += 1;
        if (completed === items.length) resolve(results);
      }, reject);                                   // первый reject отклоняет всё
    });
  });
}
```

Ключевые детали:

- **результаты по индексу**, а не в порядке завершения;
- **счётчик** выполненных — `results.length` у массива с дырами врёт;
- пустой вход → `[]` сразу (иначе промис зависнет навсегда);
- `Promise.resolve(item)` — во входе могут быть обычные значения и thenable.

## Promise.race и allSettled

```js
const promiseRace = (iterable) =>
  new Promise((resolve, reject) => {
    for (const item of iterable) Promise.resolve(item).then(resolve, reject);
  });

function promiseAllSettled(iterable) {
  return promiseAll(
    [...iterable].map((item) =>
      Promise.resolve(item).then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason }),
      ),
    ),
  );
}
```

`race` с пустым входом никогда не завершится — так по спецификации. `allSettled` никогда
не отклоняется. Ещё есть `Promise.any` — первый **успешный**, отклоняется `AggregateError`,
если все провалились.

## EventEmitter

```js
class EventEmitter {
  #listeners = new Map(); // событие → Set обработчиков

  on(event, listener) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(listener);
    return () => this.off(event, listener);     // удобная отписка
  }

  off(event, listener) {
    this.#listeners.get(event)?.delete(listener);
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    const listeners = this.#listeners.get(event);
    if (!listeners) return false;
    for (const listener of [...listeners]) listener(...args); // копия: отписка во время emit
    return true;
  }
}
```

Детали: **копия списка** перед вызовом (обработчик может отписаться, и итерация по
живому Set пропустит соседей или вызовет новых); `once` через обёртку; `off` для `once`
по исходной функции требует хранить связь обёртка ↔ оригинал.

## Ограничение параллельности

Загрузить 100 URL, но не больше 5 одновременно:

```js
async function mapWithLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;                      // захватить индекс синхронно
      results[index] = await task(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
```

`next++` безопасен: JS однопоточный, между чтением и инкрементом нет `await`.

## retry с экспоненциальной задержкой

```js
async function retry(fn, { attempts = 3, baseDelay = 200 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();                        // await внутри try обязателен
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        const delay = baseDelay * 2 ** attempt;
        const jitter = Math.random() * delay * 0.2;   // разнести повторы клиентов
        await sleep(delay + jitter);
      }
    }
  }
  throw lastError;
}
```

`return fn()` без `await` внутри `try` — классическая ошибка: отклонение произойдёт
после выхода из `try`, `catch` не сработает. Повторять стоит только временные ошибки
(сеть, 429, 5xx), но не 400/401.

## sleep, timeout, promisify

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Таймаут ${ms} мс`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);                        // иначе таймер держит процесс/тест
  }
}

function promisify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (error, result) => (error ? reject(error) : resolve(result)));
    });
}
```

Таймаут через `race` **не отменяет** исходную операцию — только перестаёт её ждать.
Для `fetch` правильнее `AbortSignal.timeout(ms)`: запрос действительно прерывается.

## Как это спрашивают

- «Реализуйте Promise.all» — самая частая задача блока; проверяют порядок, пустой вход,
  не-промисы.
- «Реализуйте EventEmitter с on, off, once, emit».
- «Загрузите список URL не более чем по N одновременно».
- «Напишите retry с экспоненциальной задержкой».
- «Почему `return fn()` в try/catch не ловит ошибку?»
