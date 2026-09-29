# Promise: устройство и комбинаторы

## Состояния

Промис — объект с внутренним состоянием `[[PromiseState]]`:

- **pending** — исходное;
- **fulfilled** — выполнен со значением;
- **rejected** — отклонён с причиной.

Переход из pending происходит **один раз и навсегда**. Повторные вызовы `resolve`/`reject`
игнорируются молча.

```js
const p = new Promise((resolve, reject) => {
  resolve('первый');
  resolve('второй');  // игнорируется
  reject('ошибка');   // игнорируется
});
```

Исполнитель (функция, переданная в конструктор) вызывается **синхронно**:

```js
console.log('до');
new Promise((resolve) => {
  console.log('внутри');
  resolve();
}).then(() => console.log('then'));
console.log('после');
// до, внутри, после, then
```

## then возвращает новый промис

Это главное свойство, на котором держится чейнинг.

```js
const p1 = Promise.resolve(1);
const p2 = p1.then((x) => x + 1);
p1 === p2; // false
```

Что возвращает колбэк, тем и разрешается новый промис:

| Колбэк вернул | Результат нового промиса |
| --- | --- |
| обычное значение | fulfilled этим значением |
| промис | ждёт его и принимает его состояние |
| ничего (`undefined`) | fulfilled с `undefined` |
| бросил исключение | rejected этим исключением |

```js
Promise.resolve(1)
  .then((x) => x + 1)               // 2
  .then((x) => Promise.resolve(x * 10)) // ждёт вложенный промис → 20
  .then((x) => { console.log(x); })  // 20, возвращает undefined
  .then((x) => console.log(x));      // undefined
```

Классическая ловушка — забытый `return`:

```js
fetchUser()
  .then((user) => {
    fetchPosts(user.id); // нет return — следующий then не дождётся
  })
  .then((posts) => console.log(posts)); // undefined
```

## Обработка ошибок

`catch(fn)` — это `then(undefined, fn)`. Ошибка «падает» вниз по цепочке до первого
обработчика отклонения.

```js
Promise.reject(new Error('бум'))
  .then(() => console.log('пропущен'))
  .catch((e) => {
    console.log('поймали', e.message);
    return 'восстановились';        // цепочка снова fulfilled
  })
  .then((v) => console.log(v));      // 'восстановились'
```

Разница, которую спрашивают:

```js
promise.then(onSuccess, onError);   // onError НЕ поймает ошибку из onSuccess
promise.then(onSuccess).catch(onError); // поймает обе
```

`finally` не получает значение и не меняет его — просто пропускает дальше:

```js
fetchData()
  .finally(() => setLoading(false))
  .then((data) => use(data));
```

Необработанное отклонение вызывает событие `unhandledrejection` в браузере и
может уронить процесс в Node.

## Комбинаторы

```js
Promise.all([a, b, c]);
```
Ждёт **все**. Один reject — мгновенный reject всего, остальные не отменяются,
а продолжают выполняться. Результат — массив значений в порядке аргументов, не завершения.

```js
Promise.allSettled([a, b, c]);
```
Никогда не отклоняется. Результат — массив `{ status: 'fulfilled', value }` или
`{ status: 'rejected', reason }`. Это то, что нужно, когда важны все ответы,
включая неудачные.

```js
Promise.race([a, b]);
```
Первый **завершившийся** — успех или ошибка. Типичное применение — таймаут:

```js
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
```

```js
Promise.any([a, b]);
```
Первый **успешный**. Если все отклонены — `AggregateError` со списком причин.

Сводка:

| Комбинатор | Успех | Ошибка |
| --- | --- | --- |
| `all` | все выполнены | первая ошибка |
| `allSettled` | всегда | никогда |
| `race` | первый завершившийся | первый завершившийся |
| `any` | первый успешный | все отклонены → AggregateError |

## Микрозадачи

Колбэки промисов попадают в очередь микрозадач. Даже уже разрешённый промис
не вызывает `then` синхронно:

```js
const p = Promise.resolve();
p.then(() => console.log('then'));
console.log('sync');
// sync, then
```

Нюанс: возврат промиса из `then` стоит **два** такта микрозадач (обёртка + распаковка),
поэтому в «что выведет» задачах цепочки с промисами отстают от цепочек со значениями.

## Реализация Promise.all руками

Частая задача на собеседовании:

```js
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = [...iterable];
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) {
      resolve(results);
      return;
    }

    items.forEach((item, index) => {
      // Promise.resolve нормализует обычные значения и thenable
      Promise.resolve(item).then((value) => {
        results[index] = value;
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}
```

Что здесь проверяют: обработку пустого массива, сохранение порядка через индекс,
счётчик вместо `results.length`, нормализацию не-промисов.

## Promisify

```js
function promisify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (error, value) => (error ? reject(error) : resolve(value)));
    });
}
```

## Как это спрашивают

- «Какие состояния у промиса и можно ли вернуться в pending?» — нельзя.
- «Что вернёт `then`?» — новый промис, дальше по таблице.
- «Чем `all` отличается от `allSettled` и `any`?» — с примером, когда что выбрать.
- «Отменяется ли `Promise.all` при ошибке?» — нет, остальные запросы продолжают идти;
  для отмены нужен `AbortController`.
- «Напишите `Promise.all` / `promisify` / таймаут для промиса» — код руками.
- «Синхронно ли выполняется тело `new Promise`?» — да, и это часто удивляет.
