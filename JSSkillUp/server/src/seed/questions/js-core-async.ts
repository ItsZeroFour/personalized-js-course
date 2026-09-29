import type { SeedQuestion } from '../types.js';

/** Вопросы по асинхронности: event loop, промисы, async/await, генераторы. */
export const jsCoreAsyncQuestions: SeedQuestion[] = [
  // --- event-loop -----------------------------------------------------------
  {
    topic: 'event-loop',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

queueMicrotask(() => console.log('4'));

console.log('5');`,
    expectedOutput: ['1', '5', '3', '4', '2'],
    explanationMd:
      'Сначала до конца выполняется синхронный код: `1`, `5`.\n\n' +
      'Затем event loop опустошает **всю** очередь микрозадач в порядке добавления: `3`, `4`.\n\n' +
      'Только потом берётся макрозадача — колбэк `setTimeout`: `2`.',
    tags: ['event loop', 'микрозадачи'],
  },
  {
    topic: 'event-loop',
    kind: 'output',
    difficulty: 'hard',
    promptMd: 'Что выведет этот код?',
    code: `async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}

async function async2() {
  console.log('async2');
}

console.log('script start');

setTimeout(() => console.log('setTimeout'), 0);

async1();

new Promise((resolve) => {
  console.log('promise executor');
  resolve();
}).then(() => console.log('promise then'));

console.log('script end');`,
    expectedOutput: [
      'script start',
      'async1 start',
      'async2',
      'promise executor',
      'script end',
      'async1 end',
      'promise then',
      'setTimeout',
    ],
    explanationMd:
      'Разбор по шагам:\n\n' +
      '1. `script start` — синхронно.\n' +
      '2. `setTimeout` уходит в очередь макрозадач.\n' +
      '3. `async1()` вызывается: `async1 start`, затем вызывается `async2()` → `async2`. ' +
      '`await` ставит остаток `async1` в микрозадачи и возвращает управление.\n' +
      '4. Тело `new Promise` **синхронно** → `promise executor`. `then` уходит в микрозадачи ' +
      '**после** остатка `async1`.\n' +
      '5. `script end` — синхронно.\n' +
      '6. Очередь микрозадач: `async1 end`, затем `promise then`.\n' +
      '7. Макрозадача: `setTimeout`.\n\n' +
      'Главные ловушки: исполнитель промиса синхронен, а `await` встал в очередь раньше `then`.',
    tags: ['event loop', 'async/await', 'промисы'],
  },
  {
    topic: 'event-loop',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Что произойдёт при выполнении этого кода в браузере?',
    code: `function loop() {
  Promise.resolve().then(loop);
}
loop();`,
    options: [
      { id: 'a', text: 'Ничего страшного: микрозадачи не блокируют рендер' },
      { id: 'b', text: 'Вкладка перестанет отвечать: отрисовка никогда не наступит' },
      { id: 'c', text: 'Сразу выбросится RangeError: Maximum call stack size exceeded' },
      { id: 'd', text: 'Браузер выполнит 1000 итераций и остановится' },
    ],
    correct: ['b'],
    explanationMd:
      'Event loop обязан опустошить **всю** очередь микрозадач перед тем, как перейти к ' +
      'отрисовке и следующей макрозадаче. Каждая микрозадача добавляет новую, очередь никогда ' +
      'не пустеет — рендер, обработка кликов и таймеры не выполняются.\n\n' +
      'Переполнения стека не будет: каждый колбэк вызывается из пустого стека, а не рекурсивно.',
    tags: ['event loop', 'микрозадачи'],
  },
  {
    topic: 'event-loop',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'Чем микрозадача отличается от макрозадачи? Приведите по два примера каждой и объясните, ' +
      'почему разница важна на практике.',
    explanationMd: 'Ждут формулировку «вся очередь микрозадач между макрозадачами».',
    referenceAnswerMd:
      '**Макрозадачи (tasks)**: колбэки `setTimeout` и `setInterval`, обработчики DOM-событий, ' +
      'сообщения `postMessage`, колбэки I/O.\n\n' +
      '**Микрозадачи**: колбэки промисов (`then`, `catch`, `finally`, продолжение после ' +
      '`await`), `queueMicrotask`, `MutationObserver`.\n\n' +
      'Разница в правиле обработки: event loop берёт **одну** макрозадачу, выполняет её до ' +
      'опустошения стека, затем выполняет **всю** очередь микрозадач целиком — включая те, ' +
      'что появились по ходу. Только после этого возможна отрисовка и следующая макрозадача.\n\n' +
      'Практические следствия:\n\n' +
      '- микрозадачи всегда обгоняют таймеры, даже `setTimeout(fn, 0)`;\n' +
      '- бесконечный поток микрозадач полностью блокирует UI — рендер не наступает;\n' +
      '- долгая синхронная работа блокирует всё: это long task, портящий метрику INP. ' +
      'Лечится разбиением на макрозадачи или выносом в Web Worker;\n' +
      '- в React `useLayoutEffect` выполняется до отрисовки, `useEffect` — после, ' +
      'поэтому измерения DOM делают в первом.',
    rubric: [
      'По два корректных примера каждой очереди',
      'Правило: одна макрозадача → вся очередь микрозадач → возможная отрисовка',
      'Микрозадачи выполняются раньше setTimeout(0)',
      'Практическое следствие: блокировка UI, long task или порядок эффектов в React',
    ],
    tags: ['event loop'],
  },

  // --- promises -------------------------------------------------------------
  {
    topic: 'promises',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `Promise.resolve(1)
  .then((x) => x + 1)
  .then((x) => {
    console.log('A', x);
  })
  .then((x) => {
    console.log('B', x);
    throw new Error('boom');
  })
  .catch((e) => {
    console.log('C', e.message);
    return 'recovered';
  })
  .then((x) => console.log('D', x));`,
    expectedOutput: ['A 2', 'B undefined', 'C boom', 'D recovered'],
    explanationMd:
      'Второй `then` ничего не возвращает, поэтому следующий получает `undefined` — ' +
      'классическая ошибка с забытым `return`.\n\n' +
      'Брошенное исключение переводит цепочку в rejected, и её ловит ближайший `catch`.\n\n' +
      '`catch` вернул значение — цепочка снова fulfilled, и следующий `then` получает ' +
      '`"recovered"`. Это и есть восстановление после ошибки.',
    tags: ['промисы'],
  },
  {
    topic: 'promises',
    kind: 'mc',
    difficulty: 'medium',
    promptMd:
      'Нужно выполнить три независимых запроса и получить все ответы, даже если часть из них ' +
      'упадёт. Какой комбинатор подходит?',
    options: [
      { id: 'a', text: 'Promise.all' },
      { id: 'b', text: 'Promise.allSettled' },
      { id: 'c', text: 'Promise.race' },
      { id: 'd', text: 'Promise.any' },
    ],
    correct: ['b'],
    explanationMd:
      '`allSettled` никогда не отклоняется и возвращает массив объектов ' +
      '`{ status: "fulfilled", value }` или `{ status: "rejected", reason }`.\n\n' +
      '`all` отклонится на первой ошибке и потеряет успешные ответы, `race` вернёт только ' +
      'первый завершившийся, `any` — только первый успешный.',
    tags: ['промисы', 'комбинаторы'],
  },
  {
    topic: 'promises',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'В чём разница между этими двумя вариантами?',
    code: `promise.then(onSuccess, onError);
promise.then(onSuccess).catch(onError);`,
    options: [
      { id: 'a', text: 'Разницы нет, второй вариант — просто сахар' },
      {
        id: 'b',
        text: 'Во втором варианте onError поймает и ошибку промиса, и ошибку внутри onSuccess; в первом — только ошибку промиса',
      },
      { id: 'c', text: 'В первом варианте onError выполнится всегда, как finally' },
      { id: 'd', text: 'Во втором варианте onSuccess не выполнится при ошибке' },
    ],
    correct: ['b'],
    explanationMd:
      'Второй аргумент `then` обрабатывает отклонение **исходного** промиса. Если ошибка ' +
      'случится внутри `onSuccess`, этот обработчик её не увидит — она уйдёт дальше по цепочке.\n\n' +
      '`.catch()` стоит после и ловит отклонение любого предыдущего звена, включая исключение ' +
      'из `onSuccess`. Поэтому `.then().catch()` — практически всегда правильный выбор.',
    tags: ['промисы', 'ошибки'],
  },
  {
    topic: 'promises',
    kind: 'open',
    difficulty: 'hard',
    promptMd:
      'Реализуйте `Promise.all` самостоятельно. На какие граничные случаи нужно обратить ' +
      'внимание?',
    explanationMd: 'Смотрят на пустой массив, порядок результатов и нормализацию не-промисов.',
    referenceAnswerMd:
      '```js\n' +
      'function promiseAll(iterable) {\n' +
      '  return new Promise((resolve, reject) => {\n' +
      '    const items = [...iterable];\n' +
      '    const results = new Array(items.length);\n' +
      '    let remaining = items.length;\n\n' +
      '    if (remaining === 0) {\n' +
      '      resolve(results);\n' +
      '      return;\n' +
      '    }\n\n' +
      '    items.forEach((item, index) => {\n' +
      '      Promise.resolve(item).then((value) => {\n' +
      '        results[index] = value;\n' +
      '        remaining -= 1;\n' +
      '        if (remaining === 0) resolve(results);\n' +
      '      }, reject);\n' +
      '    });\n' +
      '  });\n' +
      '}\n' +
      '```\n\n' +
      'Граничные случаи:\n\n' +
      '- **пустой массив** — резолвится сразу пустым массивом, иначе промис зависнет навсегда;\n' +
      '- **порядок результатов** — по индексу аргумента, а не по порядку завершения. ' +
      'Поэтому пишем `results[index] = value`, а не `results.push(value)`;\n' +
      '- **счётчик вместо длины массива** — `results.length` не годится, потому что у ' +
      'разреженного массива длина уже равна нужной;\n' +
      '- **не-промисы** — `Promise.resolve(item)` нормализует обычные значения и thenable;\n' +
      '- **первая ошибка** — `reject` передан напрямую, повторные вызовы промис игнорирует;\n' +
      '- **отмены нет** — остальные операции продолжают выполняться, их результаты просто ' +
      'никому не нужны.\n\n' +
      'Сложность: O(n) по времени и памяти.',
    rubric: [
      'Рабочий код через new Promise и счётчик',
      'Обработка пустого итерируемого',
      'Сохранение порядка через индекс',
      'Нормализация значений через Promise.resolve',
      'Упомянуть, что остальные промисы не отменяются',
    ],
    tags: ['промисы', 'реализация'],
  },

  // --- async-await ----------------------------------------------------------
  {
    topic: 'async-await',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `const items = [1, 2, 3];

items.forEach(async (item) => {
  await new Promise((r) => setTimeout(r, 10));
  console.log('обработан', item);
});

console.log('готово');`,
    expectedOutput: ['готово', 'обработан 1', 'обработан 2', 'обработан 3'],
    explanationMd:
      '`forEach` не умеет ждать асинхронный колбэк: он просто вызывает его и выбрасывает ' +
      'возвращённый промис. Поэтому `готово` печатается первым, ещё до начала обработки.\n\n' +
      'Три колбэка стартуют почти одновременно, поэтому элементы выводятся параллельно ' +
      'в порядке таймеров.\n\n' +
      'Правильные варианты: `for (const item of items) await handle(item)` для ' +
      'последовательной обработки или `await Promise.all(items.map(handle))` для параллельной.',
    tags: ['async/await', 'циклы'],
  },
  {
    topic: 'async-await',
    kind: 'mc',
    difficulty: 'easy',
    promptMd: 'Отклонится ли промис от `fetch`, если сервер ответил статусом 500?',
    options: [
      { id: 'a', text: 'Да, любой статус 4xx и 5xx приводит к reject' },
      {
        id: 'b',
        text: 'Нет, fetch отклоняется только при сетевой ошибке; статус нужно проверять через response.ok',
      },
      { id: 'c', text: 'Да, но только при 5xx; 4xx считается успехом' },
      { id: 'd', text: 'Зависит от настройки в опциях запроса' },
    ],
    correct: ['b'],
    explanationMd:
      '`fetch` отклоняется только когда запрос не удалось выполнить: сеть недоступна, ' +
      'CORS-ошибка, отмена через `AbortController`. Ответ с любым HTTP-статусом — это успех ' +
      'с точки зрения промиса.\n\n' +
      '```js\n' +
      'const response = await fetch(url);\n' +
      'if (!response.ok) throw new Error(`HTTP ${response.status}`);\n' +
      '```\n\n' +
      'Это одно из главных отличий от axios, который бросает сам.',
    tags: ['fetch', 'ошибки'],
  },
  {
    topic: 'async-await',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'В `useEffect` компонент загружает данные по `id`. Как избежать гонки запросов, когда ' +
      '`id` быстро меняется? Напишите код.',
    explanationMd:
      'Классический практический вопрос. Ждут либо AbortController, либо флаг игнорирования, ' +
      'и понимание, что именно ломается без них.',
    referenceAnswerMd:
      'Проблема: при быстрой смене `id` запросы стартуют по порядку, но ответы могут прийти ' +
      'в другом. Ответ по старому `id` придёт позже и перезапишет актуальные данные.\n\n' +
      '**Вариант 1 — отмена запроса (предпочтительный):**\n\n' +
      '```jsx\n' +
      'useEffect(() => {\n' +
      '  const controller = new AbortController();\n\n' +
      '  fetch(`/api/items/${id}`, { signal: controller.signal })\n' +
      '    .then((r) => {\n' +
      '      if (!r.ok) throw new Error(`HTTP ${r.status}`);\n' +
      '      return r.json();\n' +
      '    })\n' +
      '    .then(setData)\n' +
      '    .catch((error) => {\n' +
      '      if (error.name === \'AbortError\') return;  // это не ошибка, а отмена\n' +
      '      setError(error);\n' +
      '    });\n\n' +
      '  return () => controller.abort();\n' +
      '}, [id]);\n' +
      '```\n\n' +
      '**Вариант 2 — флаг игнорирования** (когда отмена недоступна, например у сторонней ' +
      'библиотеки):\n\n' +
      '```jsx\n' +
      'useEffect(() => {\n' +
      '  let ignore = false;\n' +
      '  loadItem(id).then((data) => {\n' +
      '    if (!ignore) setData(data);\n' +
      '  });\n' +
      '  return () => { ignore = true; };\n' +
      '}, [id]);\n' +
      '```\n\n' +
      'Отмена лучше: она ещё и экономит трафик и снимает нагрузку с сервера. Флаг только ' +
      'игнорирует уже полученный ответ.\n\n' +
      'На практике это одна из причин брать TanStack Query: там дедупликация, отмена ' +
      'и кеш по ключу уже реализованы.',
    rubric: [
      'Объяснить саму гонку: ответы приходят не в порядке запросов',
      'Показать cleanup в useEffect',
      'AbortController с обработкой AbortError или флаг ignore',
      'Бонус: почему отмена лучше флага, упоминание TanStack Query',
    ],
    tags: ['async/await', 'React', 'гонки'],
  },
  {
    topic: 'async-await',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Сколько времени примерно займёт выполнение этой функции, если каждый запрос идёт 1 секунду?',
    code: `async function load() {
  const user = await fetchUser();
  const posts = await fetchPosts();
  const tags = await fetchTags();
  return { user, posts, tags };
}`,
    options: [
      { id: 'a', text: '1 секунду — запросы идут параллельно' },
      { id: 'b', text: '3 секунды — каждый await ждёт предыдущий' },
      { id: 'c', text: 'Зависит от порядка ответов сервера' },
      { id: 'd', text: 'Меньше секунды: await не блокирует' },
    ],
    correct: ['b'],
    explanationMd:
      'Запросы не зависят друг от друга, но `await` останавливает выполнение функции до ' +
      'разрешения промиса — следующий `fetch` даже не стартует. Итого 3 секунды.\n\n' +
      '```js\n' +
      'const [user, posts, tags] = await Promise.all([fetchUser(), fetchPosts(), fetchTags()]);\n' +
      '```\n\n' +
      'Так все три запроса стартуют сразу и общее время ≈ 1 секунда. ' +
      'Последовательный `await` оправдан, только когда следующий запрос зависит от предыдущего.',
    tags: ['async/await', 'производительность'],
  },

  // --- generators-iterators -------------------------------------------------
  {
    topic: 'generators-iterators',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `function* gen() {
  const a = yield 1;
  console.log('получено', a);
  const b = yield 2;
  console.log('получено', b);
  return 3;
}

const g = gen();
console.log(g.next('игнор'));
console.log(g.next('первое'));
console.log(g.next('второе'));`,
    expectedOutput: [
      "{ value: 1, done: false }",
      'получено первое',
      "{ value: 2, done: false }",
      'получено второе',
      "{ value: 3, done: true }",
    ],
    explanationMd:
      'Аргумент первого `next()` некуда подставить — генератор ещё не дошёл ни до одного ' +
      '`yield`, поэтому `"игнор"` теряется.\n\n' +
      '`next(value)` подставляет значение как **результат текущего `yield`**, и выполнение ' +
      'продолжается до следующего.\n\n' +
      'Значение из `return` попадает в `value` вместе с `done: true`.',
    tags: ['генераторы'],
  },
  {
    topic: 'generators-iterators',
    kind: 'mc',
    difficulty: 'easy',
    promptMd: 'Что нужно добавить объекту, чтобы он заработал в `for...of` и со spread?',
    options: [
      { id: 'a', text: 'Метод next()' },
      { id: 'b', text: 'Метод [Symbol.iterator](), возвращающий объект с методом next()' },
      { id: 'c', text: 'Свойство length и числовые индексы' },
      { id: 'd', text: 'Унаследовать от Array.prototype' },
    ],
    correct: ['b'],
    explanationMd:
      'Протокол iterable требует метод `[Symbol.iterator]()`, возвращающий iterator — объект ' +
      'с методом `next()`, отдающим `{ value, done }`. На этом протоколе работают `for...of`, ' +
      'spread, деструктуризация массивов, `Array.from`, `Promise.all` и `yield*`.\n\n' +
      'Псевдомассив с `length` и индексами работает с `Array.from`, но не с `for...of`.',
    tags: ['итераторы'],
  },
  {
    topic: 'generators-iterators',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'Зачем нужны генераторы, если есть массивы и async/await? Приведите случай, где генератор ' +
      'даёт реальное преимущество.',
    explanationMd:
      'Ждут «ленивость» и «приостановка выполнения», а не пересказ синтаксиса.',
    referenceAnswerMd:
      'Генератор — единственный способ в языке **приостановить и возобновить** выполнение ' +
      'функции с сохранением всего её состояния: локальных переменных, позиции в цикле, ' +
      'блоков `try/finally`. Именно на этом механизме построен `async/await`.\n\n' +
      'Главное практическое преимущество — **ленивость**: значение вычисляется только когда ' +
      'его запросили.\n\n' +
      '```js\n' +
      'function* naturals() {\n' +
      '  let n = 1;\n' +
      '  while (true) yield n++;\n' +
      '}\n\n' +
      'function* take(iterable, count) {\n' +
      '  let taken = 0;\n' +
      '  for (const value of iterable) {\n' +
      '    if (taken++ >= count) return;\n' +
      '    yield value;\n' +
      '  }\n' +
      '}\n\n' +
      '[...take(naturals(), 5)];   // [1, 2, 3, 4, 5]\n' +
      '```\n\n' +
      'Бесконечную последовательность массивом не выразить вообще.\n\n' +
      'Другие случаи:\n\n' +
      '- **обход дерева** с возможностью честно прерваться по `break`, без накопления ' +
      'промежуточного массива;\n' +
      '- **пагинация**: генератор скрывает логику курсора, потребитель просто итерируется;\n' +
      '- **стриминг**: `async function*` + `for await...of` для чтения потока по частям — ' +
      'так читают ответы, приходящие кусками;\n' +
      '- **Redux-Saga** целиком построена на генераторах: сага описывает эффекты, а раннер ' +
      'решает, что с ними делать, — это ещё и делает логику тестируемой без моков.',
    rubric: [
      'Приостановка выполнения с сохранением состояния',
      'Ленивость: значения по требованию',
      'Конкретный пример, недостижимый массивом (бесконечная последовательность или стрим)',
      'Бонус: связь с async/await или Redux-Saga',
    ],
    tags: ['генераторы'],
  },
];
