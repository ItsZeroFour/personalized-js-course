# async/await и обработка ошибок

## Что это на самом деле

`async` перед функцией делает две вещи:

1. функция **всегда** возвращает промис (значение оборачивается в `Promise.resolve`,
   исключение — в `Promise.reject`);
2. внутри разрешается `await`.

```js
async function f() {
  return 1;
}
f() instanceof Promise; // true
f().then(console.log);  // 1
```

`await` приостанавливает выполнение функции, ставит остаток тела в очередь микрозадач
и возвращает управление вызывающему коду. Это ровно тот же механизм, что у генераторов:
async-функция — это генератор, которым управляет встроенный раннер.

Важно: `await` **не блокирует поток**. Блокируется только конкретная async-функция.

## await работает с любым значением

```js
await 42;                // микрозадача, потом 42
await { then(r) { r(1) } }; // thenable тоже разворачивается
```

Даже `await` не-промиса создаёт микрозадачу — это часто решает исход задачи
«что выведет этот код».

## Последовательно или параллельно

Самая частая ошибка на практике:

```js
// 3 секунды: запросы идут друг за другом
const user = await fetchUser();     // 1 c
const posts = await fetchPosts();   // 1 c
const tags = await fetchTags();     // 1 c
```

```js
// 1 секунда: запросы стартуют одновременно
const [user, posts, tags] = await Promise.all([fetchUser(), fetchPosts(), fetchTags()]);
```

Последовательность нужна, только если следующий запрос зависит от результата предыдущего.

Промежуточный вариант — стартовать сразу, ждать позже:

```js
const userPromise = fetchUser();
const postsPromise = fetchPosts();
const user = await userPromise;
const posts = await postsPromise;
```

Осторожно: если один из промисов отклонится раньше, чем до него дойдёт `await`,
получите unhandled rejection. Поэтому `Promise.all` надёжнее.

## Асинхронность в циклах

```js
// НЕ работает: forEach не ждёт async-колбэк
items.forEach(async (item) => {
  await save(item);
});
console.log('готово'); // выведется до того, как что-либо сохранится
```

```js
// последовательно, по одному
for (const item of items) {
  await save(item);
}

// параллельно
await Promise.all(items.map((item) => save(item)));

// параллельно с ограничением: батчами
for (let i = 0; i < items.length; i += 5) {
  await Promise.all(items.slice(i, i + 5).map(save));
}
```

Есть и `for await...of` — для асинхронных итераторов:

```js
for await (const chunk of stream) {
  process(chunk);
}
```

## try/catch и проброс ошибок

```js
async function load() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      // fetch НЕ отклоняется на 404 и 500 — только на сетевой ошибке
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logError(error);
    throw error;         // проглотить ошибку молча — худшее, что можно сделать
  } finally {
    setLoading(false);
  }
}
```

Два нюанса, которые проверяют:

**`return await` против `return`.** Внутри `try` разница есть: `return promise` вернёт
промис до того, как `catch` сможет его поймать, а `return await promise` дождётся
и поймает ошибку. Вне `try/catch` `return await` — лишний такт микрозадачи.

**Ошибка в неожиданном месте:**

```js
const results = await Promise.all([a(), b()]); // одна ошибка рушит всё
const results = await Promise.allSettled([a(), b()]); // разбираем по одному
```

## Отмена через AbortController

Промисы не отменяются. Отменяется операция, которая за ними стоит.

```js
const controller = new AbortController();

async function load(signal) {
  const response = await fetch('/api/data', { signal });
  return response.json();
}

load(controller.signal).catch((error) => {
  if (error.name === 'AbortError') return; // это не ошибка, а отмена
  throw error;
});

controller.abort();
```

В React это лечит гонки запросов:

```jsx
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/items/${id}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => {
      if (e.name !== 'AbortError') setError(e);
    });

  return () => controller.abort();
}, [id]);
```

Без отмены ответ по старому `id` может прийти позже нового и перезаписать данные.

## Полезные обёртки

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry(fn, { attempts = 3, baseDelay = 300 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // экспоненциальная задержка с джиттером, чтобы не долбить сервер синхронно
      const delay = baseDelay * 2 ** attempt + Math.random() * 100;
      await sleep(delay);
    }
  }
  throw lastError;
}
```

## Top-level await

В ES-модулях `await` работает на верхнем уровне. Цена: модуль становится асинхронным
и задерживает выполнение всех, кто его импортирует.

## Как это спрашивают

- «Чем `async/await` отличается от `then`?» — синтаксис поверх того же механизма,
  плюс нормальный `try/catch` и читаемость.
- «Как выполнить запросы параллельно?» — `Promise.all`, и объяснить, чем плох
  последовательный `await`.
- «Почему `forEach` с `async` не работает?» — колбэк возвращает промис, который никто не ждёт.
- «Как отменить запрос?» — `AbortController`, и обязательно упомянуть гонки в `useEffect`.
- «Отклоняется ли `fetch` на статусе 500?» — нет, только на сетевой ошибке.
- «Что делает `return await` внутри `try`?» — позволяет поймать ошибку локально.
