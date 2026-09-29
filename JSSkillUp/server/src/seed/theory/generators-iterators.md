# Итераторы и генераторы

## Два протокола

**Iterator** — объект с методом `next()`, который возвращает `{ value, done }`.

**Iterable** — объект с методом `[Symbol.iterator]()`, возвращающим iterator.

Всё, что работает с «перебором», опирается ровно на эти два протокола:
`for...of`, spread `...`, деструктуризация массивов, `Array.from`, `Promise.all`,
`new Map(...)`, `yield*`.

```js
const range = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return current <= last ? { value: current++, done: false } : { value: undefined, done: true };
      },
    };
  },
};

[...range];                 // [1, 2, 3]
for (const n of range) {}   // 1, 2, 3
Array.from(range);          // [1, 2, 3]
```

Итерируемые из коробки: `Array`, `String` (по code points, а не по code units),
`Map`, `Set`, `arguments`, `NodeList`, `TypedArray`. **Обычный объект — нет**,
поэтому `for...of` по объекту бросает `TypeError`.

```js
for (const [key, value] of Object.entries(obj)) {} // так правильно
```

## for...of против for...in

```js
const arr = ['a', 'b'];
arr.extra = 'x';

for (const i in arr) console.log(i);   // '0', '1', 'extra' — ключи, включая прототипные
for (const v of arr) console.log(v);   // 'a', 'b' — значения, по протоколу итератора
```

`for...in` перебирает перечисляемые строковые ключи, включая унаследованные,
в неопределённом порядке для нецелочисленных ключей. По массивам его использовать не стоит.

## Генераторы

Функция `function*` при вызове **не выполняется**, а возвращает генератор —
объект, который одновременно iterator и iterable.

```js
function* gen() {
  console.log('старт');
  yield 1;
  console.log('середина');
  yield 2;
  return 3;
}

const g = gen();
g.next(); // 'старт'    → { value: 1, done: false }
g.next(); // 'середина' → { value: 2, done: false }
g.next(); //             → { value: 3, done: true }
g.next(); //             → { value: undefined, done: true }
```

`yield` приостанавливает функцию, сохраняя всё её состояние: локальные переменные,
позицию в цикле, стек `try/finally`. Это единственный в языке способ приостановить
и возобновить выполнение — на нём построены async/await.

Значение из `return` попадает в `value` вместе с `done: true` и **не** попадает
в `for...of` и spread:

```js
[...gen()]; // [1, 2] — тройка потеряна
```

## Передача значений внутрь

`next(value)` подставляет значение как результат **текущего** `yield`:

```js
function* dialog() {
  const name = yield 'Как вас зовут?';
  const age = yield `Привет, ${name}. Сколько вам лет?`;
  return `${name}, ${age}`;
}

const d = dialog();
d.next();        // { value: 'Как вас зовут?', done: false }
d.next('Аня');   // { value: 'Привет, Аня. Сколько вам лет?', done: false }
d.next(25);      // { value: 'Аня, 25', done: true }
```

Первый `next()` всегда без аргумента — его значение некуда подставить.

Ещё два метода:

```js
g.throw(new Error('бум')); // бросает исключение в точке текущего yield
g.return(42);              // досрочно завершает, выполняя блоки finally
```

## yield* — делегирование

```js
function* inner() {
  yield 1;
  yield 2;
}
function* outer() {
  yield 0;
  yield* inner();   // передаёт управление другому итерируемому
  yield 3;
}
[...outer()]; // [0, 1, 2, 3]
```

`yield*` работает с любым iterable, не только с генератором.

## Ленивость и бесконечные последовательности

Генератор вычисляет значение только когда его попросили. Это позволяет описывать
бесконечные последовательности:

```js
function* naturals() {
  let n = 1;
  while (true) yield n++;
}

function* take(iterable, count) {
  let taken = 0;
  for (const value of iterable) {
    if (taken++ >= count) return;
    yield value;
  }
}

function* map(iterable, fn) {
  for (const value of iterable) yield fn(value);
}

[...take(map(naturals(), (n) => n * n), 5)]; // [1, 4, 9, 16, 25]
```

Здесь ни один массив не материализуется целиком — обрабатывается ровно пять чисел.
На больших данных это принципиальная экономия памяти по сравнению
с `arr.map().filter().slice()`.

## Обход дерева

Каноничное применение — рекурсивный обход без накопления результата в массив:

```js
function* walk(node) {
  yield node;
  for (const child of node.children ?? []) {
    yield* walk(child);
  }
}

for (const node of walk(root)) {
  if (node.id === target) break; // обход честно прекращается
}
```

## Асинхронные генераторы

```js
async function* readLines(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) yield line;
  }
}

for await (const line of readLines(response)) {
  console.log(line);
}
```

Это ровно то, как читают стриминговые ответы (например, поток токенов от LLM).

## Где встречается на практике

- Redux-Saga целиком построен на генераторах.
- Пагинация: генератор отдаёт страницы по одной, скрывая логику курсора.
- Тестовые утилиты и итерация по большим коллекциям.

## Как это спрашивают

- «Что такое итерируемый объект?» — через `Symbol.iterator`, а не «то, что можно перебрать».
- «Сделайте объект итерируемым» — написать `[Symbol.iterator]` руками.
- «Чем `for...of` отличается от `for...in`?»
- «Что такое генератор и зачем он нужен?» — приостановка выполнения, ленивость.
- «Как реализовать бесконечную последовательность?»
- «Как связаны генераторы и async/await?» — async-функция это генератор с автоматическим
  раннером, который делает `next()` на каждое разрешение промиса.
