# Event loop, микро- и макрозадачи

## Из чего состоит картина

JavaScript **однопоточен**: один call stack, одна задача за раз. Асинхронность обеспечивает
не язык, а окружение (браузер или Node).

- **Call stack** — стек выполняемых функций.
- **Web APIs / платформа** — таймеры, сеть, DOM-события. Живут вне движка.
- **Macrotask queue** (task queue) — очередь задач: колбэки `setTimeout`, `setInterval`,
  события DOM, `fetch`-колбэки, сообщения.
- **Microtask queue** — очередь микрозадач: колбэки промисов, `queueMicrotask`,
  `MutationObserver`.
- **Event loop** — цикл, который берёт задачу и выполняет её до конца.

## Алгоритм одного оборота

1. Взять **одну** макрозадачу из очереди и выполнить до опустошения стека.
2. Выполнить **всю** очередь микрозадач. Микрозадача, добавившая микрозадачу,
   будет выполнена в этом же шаге.
3. При необходимости — отрисовать кадр (`requestAnimationFrame`, пересчёт стилей, layout, paint).
4. Вернуться к шагу 1.

Отсюда два практических вывода:
**микрозадачи всегда обгоняют макрозадачи**, а бесконечный поток микрозадач
полностью блокирует отрисовку.

## Базовый пример

```js
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

queueMicrotask(() => console.log('4'));

console.log('5');
```

Вывод: `1`, `5`, `3`, `4`, `2`.

Синхронный код целиком (`1`, `5`) → вся очередь микрозадач (`3`, `4`) → макрозадача (`2`).

## Микрозадачи порождают микрозадачи

```js
Promise.resolve().then(() => {
  console.log('a');
  Promise.resolve().then(() => console.log('b'));
});
setTimeout(() => console.log('c'));
```

Вывод: `a`, `b`, `c`. Новая микрозадача `b` попадает в ту же очередь и выполняется
до того, как дойдёт очередь до таймера.

Это же — источник зависаний:

```js
function freeze() {
  Promise.resolve().then(freeze); // страница перестаёт отвечать: рендер не наступает
}
```

## async/await в терминах очередей

`await` разбивает функцию на части: всё после `await` становится микрозадачей.

```js
async function f() {
  console.log('1');
  await null;        // даже await не-промиса создаёт микрозадачу
  console.log('2');
}

f();
console.log('3');
```

Вывод: `1`, `3`, `2`.

Более сложный пример, который любят на собеседованиях:

```js
async function async1() {
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

console.log('script end');
```

Вывод:

```
script start
async1 start
async2
promise executor
script end
async1 end
promise then
setTimeout
```

Ключевые моменты: тело `new Promise` синхронно; `async1 end` встаёт в микрозадачи
раньше, чем `then`, потому что `await` сработал раньше по коду.

## setTimeout(0) — это не «сразу»

Минимальная задержка по спецификации — **4 мс** после пяти вложенных таймеров.
Плюс задача ждёт освобождения стека и всей очереди микрозадач. Поэтому:

```js
setTimeout(() => console.log('таймер'), 0);
for (let i = 0; i < 1e9; i++) {} // блокирует поток на секунды — таймер ждёт
```

Порядок двух таймеров с одинаковой задержкой гарантирован (FIFO), с разными — нет,
если разница меньше разрешения таймера.

## requestAnimationFrame

`rAF` — не макрозадача и не микрозадача: его колбэки выполняются на шаге отрисовки,
перед пересчётом стилей, примерно 60 раз в секунду.

```js
setTimeout(() => console.log('timeout'));
requestAnimationFrame(() => console.log('raf'));
Promise.resolve().then(() => console.log('micro'));
```

`micro` всегда первый. Порядок `timeout` и `raf` зависит от того, где мы находимся
относительно кадра, — гарантий нет, и это честный ответ на собеседовании.

Для анимаций используют `rAF`, для «выполнить после отрисовки» — `setTimeout` или
`requestIdleCallback`.

## Node.js: чуть другая картина

В Node у event loop есть фазы (timers, pending callbacks, poll, check, close),
и две дополнительные очереди:

- `process.nextTick()` — выполняется **раньше** промисов;
- `setImmediate()` — фаза check, после poll.

```js
setTimeout(() => console.log('timeout'));
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
```

`nextTick` → `promise` → дальше порядок `timeout`/`immediate` в главном модуле
недетерминирован (внутри I/O-колбэка `immediate` всегда раньше).

## Почему это важно во фронтенде

- Тяжёлый синхронный цикл блокирует ввод: клики не обрабатываются, анимации замирают.
  Это и есть long task, который портит метрику INP.
- Разбиение работы на макрозадачи (`setTimeout`, `scheduler.yield`) даёт браузеру
  отрисовать кадр между кусками.
- В React `useEffect` вызывается после отрисовки (макрозадачно по ощущению),
  а `useLayoutEffect` — синхронно после мутаций DOM и **до** отрисовки. Отсюда правило:
  измерения DOM — в `useLayoutEffect`, иначе пользователь увидит мигание.

## Как это спрашивают

- «Что выведет этот код?» — почти всегда комбинация `setTimeout`, `Promise.then`
  и `async/await`.
- «Чем микрозадача отличается от макрозадачи?» — ждут «вся очередь микрозадач
  выполняется между макрозадачами».
- «Что будет, если микрозадача бесконечно планирует микрозадачи?» — зависнет вкладка.
- «`setTimeout(fn, 0)` выполнится сразу?» — нет, объяснить через стек и очереди.
- «Как не заблокировать UI тяжёлым вычислением?» — разбить на чанки или вынести
  в Web Worker.
