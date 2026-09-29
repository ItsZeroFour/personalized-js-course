import type { SeedTask } from '../types.js';

/** Классика фронтенд-интервью: реализовать руками то, что обычно берут из lodash. */
export const utilityTasks: SeedTask[] = [
  {
    slug: 'my-reduce',
    topic: 'utility-implementations',
    title: 'Реализовать reduce',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['массивы', 'реализация'],
    statementMd: `Реализуйте \`myReduce(items, callback, initialValue?)\` — аналог
\`Array.prototype.reduce\`.

\`\`\`js
myReduce([1, 2, 3], (acc, x) => acc + x, 0);  // 6
myReduce([1, 2, 3], (acc, x) => acc + x);     // 6 — аккумулятор это первый элемент
myReduce([], (acc, x) => acc + x, 0);         // 0
myReduce([], (acc, x) => acc + x);            // TypeError
\`\`\`

Колбэк принимает \`(accumulator, currentValue, index, array)\`.
Воспроизведите поведение на граничных случаях — в них вся задача.`,
    starterCode: `function myReduce<T, R>(
  items: T[],
  callback: (accumulator: R, current: T, index: number, array: T[]) => R,
  initialValue?: R,
): R {
  // ваш код
  return undefined as R;
}`,
    solutionCode: `function myReduce<T, R>(
  items: T[],
  callback: (accumulator: R, current: T, index: number, array: T[]) => R,
  initialValue?: R,
): R {
  const hasInitial = arguments.length >= 3;

  if (!hasInitial && items.length === 0) {
    throw new TypeError('Reduce of empty array with no initial value');
  }

  let accumulator: R;
  let startIndex: number;

  if (hasInitial) {
    accumulator = initialValue as R;
    startIndex = 0;
  } else {
    accumulator = items[0] as unknown as R;
    startIndex = 1;
  }

  for (let i = startIndex; i < items.length; i += 1) {
    accumulator = callback(accumulator, items[i]!, i, items);
  }

  return accumulator;
}`,
    solutionNotesMd: `Сложность: O(n).

Три детали, ради которых и дают эту задачу:

1. **Пустой массив без начального значения** — \`TypeError\`, а не \`undefined\`.
2. **Без начального значения аккумулятор — первый элемент**, а обход начинается
   со второго. Не с нуля: иначе первый элемент обработается дважды.
3. **Отличить «не передали initialValue» от «передали undefined»**. Проверка
   \`initialValue === undefined\` неверна: \`myReduce([1], fn, undefined)\` должен
   вести себя как «начальное значение есть». Поэтому используется \`arguments.length\`
   (или rest-параметр, если функция стрелочная).

Настоящий \`reduce\` ещё и пропускает дырки разреженных массивов — об этом можно
упомянуть, но реализовывать обычно не просят.`,
    hints: [
      'Разберите два режима: с начальным значением и без. Во втором случае аккумулятор — первый элемент, а цикл начинается со второго.',
      'Как отличить «initialValue не передали» от «передали undefined»? Сравнение с `undefined` здесь неверно — посмотрите на `arguments.length`.',
    ],
    tests: [
      {
        name: 'с начальным значением',
        code: `expect(myReduce([1, 2, 3], (acc, x) => acc + x, 0)).toBe(6);
expect(myReduce([1, 2, 3], (acc, x) => acc + x, 10)).toBe(16);`,
      },
      {
        name: 'без начального значения',
        code: `expect(myReduce([1, 2, 3], (acc, x) => acc + x)).toBe(6);`,
      },
      {
        name: 'пустой массив',
        code: `expect(myReduce([], (acc, x) => acc + x, 0)).toBe(0);
expect(() => myReduce([], (acc, x) => acc + x)).toThrow();`,
      },
      {
        name: 'передаёт индекс и массив',
        code: `const seen = [];
myReduce(['a', 'b'], (acc, value, index, array) => {
  seen.push([value, index, array.length]);
  return acc;
}, null);
expect(seen).toEqual([['a', 0, 2], ['b', 1, 2]]);`,
        hidden: true,
      },
      {
        name: 'явно переданный undefined считается начальным значением',
        code: `expect(myReduce([1], (acc, x) => (acc === undefined ? 'was-undefined' : 'other'), undefined))
  .toBe('was-undefined');`,
        hidden: true,
      },
      {
        name: 'строит объект',
        code: `const users = [{ id: 'a' }, { id: 'b' }];
const byId = myReduce(users, (acc, user) => { acc[user.id] = user; return acc; }, {});
expect(Object.keys(byId)).toEqual(['a', 'b']);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'map-filter-via-reduce',
    topic: 'utility-implementations',
    title: 'map и filter через reduce',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['массивы', 'реализация'],
    statementMd: `Реализуйте \`myMap(items, fn)\` и \`myFilter(items, predicate)\`,
используя внутри **только** \`Array.prototype.reduce\`.

\`\`\`js
myMap([1, 2, 3], (x) => x * 2);          // [2, 4, 6]
myFilter([1, 2, 3, 4], (x) => x % 2);    // [1, 3]
\`\`\`

Колбэки получают \`(value, index, array)\`. Исходный массив не мутируется.

Задача проверяет не знание \`reduce\`, а понимание, что \`map\` и \`filter\` —
его частные случаи.`,
    starterCode: `function myMap<T, R>(items: T[], fn: (value: T, index: number, array: T[]) => R): R[] {
  // ваш код, только через reduce
  return [];
}

function myFilter<T>(
  items: T[],
  predicate: (value: T, index: number, array: T[]) => unknown,
): T[] {
  // ваш код, только через reduce
  return [];
}`,
    solutionCode: `function myMap<T, R>(items: T[], fn: (value: T, index: number, array: T[]) => R): R[] {
  return items.reduce<R[]>((acc, value, index, array) => {
    acc.push(fn(value, index, array));
    return acc;
  }, []);
}

function myFilter<T>(
  items: T[],
  predicate: (value: T, index: number, array: T[]) => unknown,
): T[] {
  return items.reduce<T[]>((acc, value, index, array) => {
    if (predicate(value, index, array)) acc.push(value);
    return acc;
  }, []);
}`,
    solutionNotesMd: `Сложность: O(n) у обеих функций.

Аккумулятор — массив, который мутируется **внутри** reduce. Это не нарушает
иммутабельность: массив создан здесь же начальным значением и наружу утекает
уже готовым.

Антипаттерн, который стоит уметь раскритиковать:

\`\`\`js
items.reduce((acc, x) => [...acc, fn(x)], []);   // O(n²)
\`\`\`

Он создаёт новый массив на каждом шаге: на 10 000 элементов это 50 миллионов
копирований вместо 10 тысяч push.

\`predicate\` объявлен возвращающим \`unknown\`, а не \`boolean\`, — настоящий \`filter\`
проверяет результат на truthiness, поэтому \`(x) => x % 2\` работает.`,
    hints: [
      'Начальное значение reduce — пустой массив. Аккумулятор накапливает результат.',
      'Не пишите `[...acc, item]` — это создаёт новый массив на каждом шаге и даёт O(n²). Мутируйте аккумулятор через push и возвращайте его.',
    ],
    tests: [
      {
        name: 'myMap преобразует элементы',
        code: `expect(myMap([1, 2, 3], (x) => x * 2)).toEqual([2, 4, 6]);
expect(myMap([], (x) => x)).toEqual([]);`,
      },
      {
        name: 'myFilter отбирает элементы',
        code: `expect(myFilter([1, 2, 3, 4], (x) => x % 2 === 0)).toEqual([2, 4]);
expect(myFilter([1, 2], () => false)).toEqual([]);`,
      },
      {
        name: 'колбэки получают индекс и массив',
        code: `expect(myMap(['a', 'b'], (v, i) => v + i)).toEqual(['a0', 'b1']);
expect(myFilter([10, 20, 30], (v, i) => i > 0)).toEqual([20, 30]);`,
      },
      {
        name: 'filter проверяет truthiness, а не строгое равенство true',
        code: `expect(myFilter([0, 1, '', 'a', null], (x) => x)).toEqual([1, 'a']);`,
        hidden: true,
      },
      {
        name: 'не мутируют исходный массив',
        code: `const source = [1, 2, 3];
myMap(source, (x) => x * 2);
myFilter(source, (x) => x > 1);
expect(source).toEqual([1, 2, 3]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'debounce',
    topic: 'utility-implementations',
    title: 'debounce',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['замыкания', 'таймеры', 'реализация'],
    statementMd: `Реализуйте \`debounce(fn, delay)\`: возвращает функцию, которая вызывает \`fn\`
только после того, как её перестали дёргать в течение \`delay\` миллисекунд.

\`\`\`js
const search = debounce((query) => request(query), 300);
search('a'); search('ab'); search('abc');
// через 300 мс после последнего вызова выполнится request('abc')
\`\`\`

Требования:

- вызывается **последний** набор аргументов;
- сохраняется \`this\` вызова;
- у возвращённой функции есть метод \`cancel()\`, отменяющий отложенный вызов.

Это самая частая задача на замыкания на фронтенд-собеседовании.`,
    starterCode: `function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
): ((...args: A) => void) & { cancel: () => void } {
  // ваш код
  const debounced = (..._args: A): void => {};
  debounced.cancel = (): void => {};
  return debounced;
}`,
    solutionCode: `function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
): ((...args: A) => void) & { cancel: () => void } {
  // Идентификатор таймера живёт в замыкании — это и есть приватное состояние.
  let timer: ReturnType<typeof setTimeout> | null = null;

  function debounced(this: unknown, ...args: A): void {
    if (timer !== null) clearTimeout(timer);

    // Обычная функция, а не стрелочная: нужен this вызова.
    const context = this;
    timer = setTimeout(() => {
      timer = null;
      fn.apply(context, args);
    }, delay);
  }

  debounced.cancel = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  return debounced;
}`,
    solutionNotesMd: `Ключевые моменты:

1. **Замыкание хранит \`timer\`** — приватное состояние между вызовами.
2. **\`clearTimeout\` перед новым \`setTimeout\`** — иначе каждый вызов породит
   свой отложенный вызов, и debounce превратится в задержку.
3. **Обычная функция, а не стрелочная.** Стрелка не имеет своего \`this\`,
   поэтому обёртка не смогла бы передать контекст вызова в \`fn.apply\`.
4. **\`cancel\`** обязателен на практике: в React его вызывают в cleanup эффекта,
   иначе отложенный вызов сработает после размонтирования.

Частые расширения задачи на интервью: опции \`leading\` (вызвать сразу на первом
вызове) и \`maxWait\` (гарантировать вызов не реже чем раз в N мс).

Чем отличается от throttle: debounce откладывает до «тишины», throttle
пропускает вызовы с постоянной частотой. Для поля поиска нужен debounce,
для обработчика скролла — throttle.`,
    hints: [
      'Храните идентификатор таймера в замыкании. При каждом вызове сбрасывайте предыдущий таймер и ставьте новый.',
      'Чтобы сохранить `this`, возвращайте обычную функцию, а не стрелочную, и вызывайте `fn.apply(this, args)`. Метод `cancel` просто делает `clearTimeout`.',
    ],
    tests: [
      {
        name: 'вызывает функцию один раз после паузы',
        code: `let calls = 0;
const fn = debounce(() => { calls += 1; }, 50);
fn(); fn(); fn();
expect(calls).toBe(0);
await sleep(100);
expect(calls).toBe(1);`,
      },
      {
        name: 'передаёт последние аргументы',
        code: `let received = null;
const fn = debounce((value) => { received = value; }, 40);
fn('a'); fn('ab'); fn('abc');
await sleep(90);
expect(received).toBe('abc');`,
      },
      {
        name: 'cancel отменяет отложенный вызов',
        code: `let calls = 0;
const fn = debounce(() => { calls += 1; }, 40);
fn();
fn.cancel();
await sleep(90);
expect(calls).toBe(0);`,
      },
      {
        name: 'сохраняет this',
        code: `const obj = {
  name: 'объект',
  seen: null,
};
obj.method = debounce(function () { this.seen = this.name; }, 30);
obj.method();
await sleep(70);
expect(obj.seen).toBe('объект');`,
        hidden: true,
      },
      {
        name: 'после срабатывания можно вызвать снова',
        code: `let calls = 0;
const fn = debounce(() => { calls += 1; }, 30);
fn();
await sleep(70);
fn();
await sleep(70);
expect(calls).toBe(2);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'throttle',
    topic: 'utility-implementations',
    title: 'throttle',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['замыкания', 'таймеры', 'реализация'],
    statementMd: `Реализуйте \`throttle(fn, interval)\`: функция вызывается не чаще одного раза
в \`interval\` миллисекунд.

Семантика **leading edge**: первый вызов проходит немедленно, все последующие в течение
интервала игнорируются.

\`\`\`js
const onScroll = throttle(() => update(), 100);
onScroll(); // выполнится сразу
onScroll(); // проигнорирован
onScroll(); // проигнорирован
// через 100 мс следующий вызов снова выполнится
\`\`\`

Сохраняйте \`this\` и аргументы вызова.

Будьте готовы объяснить, чем throttle отличается от debounce и когда что нужно.`,
    starterCode: `function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  interval: number,
): (...args: A) => void {
  // ваш код
  return (..._args: A): void => {};
}`,
    solutionCode: `function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  interval: number,
): (...args: A) => void {
  let lastCall = 0;

  return function throttled(this: unknown, ...args: A): void {
    const now = Date.now();
    if (now - lastCall < interval) return;

    lastCall = now;
    fn.apply(this, args);
  };
}`,
    solutionNotesMd: `Реализация через отметку времени проще, чем через флаг с \`setTimeout\`,
и не оставляет висящих таймеров.

Начальное значение \`lastCall = 0\` гарантирует, что самый первый вызов пройдёт:
\`Date.now() - 0\` заведомо больше любого разумного интервала.

**Чем отличается от debounce** — главный вопрос по этой теме:

| | debounce | throttle |
| --- | --- | --- |
| Когда вызывает | после паузы в вызовах | не чаще раза в интервал |
| При непрерывном потоке | не вызовет ни разу | вызывает регулярно |
| Типичное применение | поле поиска, автосохранение | скролл, resize, mousemove |

Вариант с trailing edge (запомнить последний вызов и выполнить его в конце интервала)
сложнее, но не теряет последнее событие — например, финальную позицию скролла.
На интервью стоит проговорить, что вы выбрали leading, и почему.`,
    hints: [
      'Достаточно запомнить время последнего выполнения и сравнивать с `Date.now()`.',
      'Начальное значение времени должно быть таким, чтобы самый первый вызов прошёл. Не забудьте `fn.apply(this, args)`.',
    ],
    tests: [
      {
        name: 'первый вызов проходит сразу',
        code: `let calls = 0;
const fn = throttle(() => { calls += 1; }, 50);
fn();
expect(calls).toBe(1);`,
      },
      {
        name: 'вызовы внутри интервала игнорируются',
        code: `let calls = 0;
const fn = throttle(() => { calls += 1; }, 60);
fn(); fn(); fn();
expect(calls).toBe(1);`,
      },
      {
        name: 'после интервала вызов снова проходит',
        code: `let calls = 0;
const fn = throttle(() => { calls += 1; }, 40);
fn();
await sleep(80);
fn();
expect(calls).toBe(2);`,
      },
      {
        name: 'передаёт аргументы и this',
        code: `const obj = { name: 'объект', seen: null };
obj.method = throttle(function (suffix) { this.seen = this.name + suffix; }, 30);
obj.method('!');
expect(obj.seen).toBe('объект!');`,
        hidden: true,
      },
      {
        name: 'не превращается в debounce',
        code: `let calls = 0;
const fn = throttle(() => { calls += 1; }, 30);
fn();
await sleep(50);
fn();
await sleep(50);
fn();
expect(calls).toBe(3);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'curry',
    topic: 'utility-implementations',
    title: 'curry',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['замыкания', 'функции', 'реализация'],
    statementMd: `Реализуйте \`curry(fn)\`: превращает функцию от нескольких аргументов
в цепочку вызовов.

\`\`\`js
const add = (a, b, c) => a + b + c;
const curried = curry(add);

curried(1)(2)(3);   // 6
curried(1, 2)(3);   // 6
curried(1)(2, 3);   // 6
curried(1, 2, 3);   // 6
\`\`\`

Количество ожидаемых аргументов берите из \`fn.length\`.
Одну и ту же частично применённую функцию можно переиспользовать несколько раз.`,
    starterCode: `function curry(fn: (...args: never[]) => unknown): (...args: unknown[]) => unknown {
  // ваш код
  return () => undefined;
}`,
    solutionCode: `function curry(fn: (...args: never[]) => unknown): (...args: unknown[]) => unknown {
  const arity = fn.length;

  return function curried(this: unknown, ...args: unknown[]): unknown {
    if (args.length >= arity) {
      return (fn as (...a: unknown[]) => unknown).apply(this, args);
    }

    // Новый массив на каждом шаге — иначе частично применённая функция
    // накапливала бы аргументы между независимыми вызовами.
    return (...rest: unknown[]) => curried.apply(this, [...args, ...rest]);
  };
}`,
    solutionNotesMd: `Ключевая идея: пока аргументов меньше, чем \`fn.length\`, возвращаем функцию,
которая добавит следующую порцию.

Главная ловушка — **не накапливать аргументы в общем массиве**. Если написать
\`args.push(...rest)\`, то переиспользование частично применённой функции сломается:

\`\`\`js
const addTo1 = curried(1);
addTo1(2, 3);   // 6
addTo1(5, 5);   // должно быть 11, а с общим массивом получится мусор
\`\`\`

Поэтому \`[...args, ...rest]\` создаёт новый массив.

Ограничения \`fn.length\`: оно не считает параметры со значениями по умолчанию
и rest-параметры. Для \`(a, b = 1) => ...\` арность равна 1. Поэтому у lodash
есть явный второй аргумент \`curry(fn, arity)\`.

Практическое применение во фронтенде: частичное применение обработчиков
(\`onChange(fieldName)\`), конфигурируемые селекторы, композиция функций.`,
    hints: [
      'Сравнивайте количество накопленных аргументов с `fn.length`. Хватает — вызывайте, не хватает — возвращайте функцию, ждущую остальные.',
      'Не накапливайте аргументы в одном массиве через push: тогда частично применённую функцию нельзя будет переиспользовать дважды. Создавайте новый массив `[...args, ...rest]`.',
    ],
    tests: [
      {
        name: 'все варианты разбиения аргументов',
        code: `const add = (a, b, c) => a + b + c;
const curried = curry(add);
expect(curried(1)(2)(3)).toBe(6);
expect(curried(1, 2)(3)).toBe(6);
expect(curried(1)(2, 3)).toBe(6);
expect(curried(1, 2, 3)).toBe(6);`,
      },
      {
        name: 'частично применённая функция переиспользуется',
        code: `const add = (a, b, c) => a + b + c;
const addTo1 = curry(add)(1);
expect(addTo1(2, 3)).toBe(6);
expect(addTo1(5, 5)).toBe(11);`,
      },
      {
        name: 'функция от одного аргумента',
        code: `const double = (x) => x * 2;
expect(curry(double)(5)).toBe(10);`,
      },
      {
        name: 'работает со строками и объектами',
        code: `const join = (a, b) => a + '-' + b;
expect(curry(join)('x')('y')).toBe('x-y');`,
        hidden: true,
      },
      {
        name: 'лишние аргументы не ломают вызов',
        code: `const add = (a, b) => a + b;
expect(curry(add)(1, 2, 99)).toBe(3);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'memoize',
    topic: 'utility-implementations',
    title: 'memoize',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['замыкания', 'кеш', 'реализация'],
    statementMd: `Реализуйте \`memoize(fn, getKey?)\`: кеширует результаты по аргументам.

\`\`\`js
let calls = 0;
const slowSquare = memoize((x) => { calls += 1; return x * x; });

slowSquare(4);  // 16, calls === 1
slowSquare(4);  // 16, calls === 1 — взято из кеша
slowSquare(5);  // 25, calls === 2
\`\`\`

Требования:

- ключ по умолчанию — \`JSON.stringify(args)\`; можно передать свой \`getKey\`;
- кешируется в том числе результат \`undefined\` (функция не должна вызываться повторно);
- у обёртки есть метод \`clear()\`, очищающий кеш.`,
    starterCode: `function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  getKey?: (...args: A) => string,
): ((...args: A) => R) & { clear: () => void } {
  // ваш код
  const memoized = (..._args: A): R => undefined as R;
  memoized.clear = (): void => {};
  return memoized;
}`,
    solutionCode: `function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  getKey: (...args: A) => string = (...args) => JSON.stringify(args),
): ((...args: A) => R) & { clear: () => void } {
  const cache = new Map<string, R>();

  function memoized(this: unknown, ...args: A): R {
    const key = getKey(...args);

    // has, а не проверка результата на undefined: undefined тоже валидный результат.
    if (cache.has(key)) return cache.get(key) as R;

    const value = fn.apply(this, args);
    cache.set(key, value);
    return value;
  }

  memoized.clear = (): void => {
    cache.clear();
  };

  return memoized;
}`,
    solutionNotesMd: `Ключевые моменты:

1. **\`cache.has(key)\`, а не \`cache.get(key) !== undefined\`.** Иначе функция,
   возвращающая \`undefined\`, вызывалась бы каждый раз — кеш не работал бы вовсе.
2. **\`JSON.stringify\` как ключ по умолчанию** — компромисс. Он не различает
   \`{a: 1, b: 2}\` и \`{b: 2, a: 1}\` (разный порядок ключей даёт разные строки),
   не сериализует функции и \`undefined\`, а на больших объектах стоит дорого.
   Поэтому и нужен параметр \`getKey\`.
3. **Утечка памяти.** \`Map\` держит ключи и значения вечно. Для продакшена нужен
   либо лимит размера (LRU), либо \`WeakMap\` с объектом-аргументом в качестве ключа.

Связь с React: \`useMemo\` и \`React.memo\` — это тот же приём, но с кешем
размера 1 и сравнением зависимостей вместо строкового ключа.`,
    hints: [
      'Замыкание хранит `Map` «ключ → результат». Ключ по умолчанию — `JSON.stringify(args)`.',
      'Проверяйте наличие через `cache.has(key)`, а не сравнением результата с `undefined`: иначе функция, возвращающая `undefined`, никогда не закешируется.',
    ],
    tests: [
      {
        name: 'кеширует результат',
        code: `let calls = 0;
const square = memoize((x) => { calls += 1; return x * x; });
expect(square(4)).toBe(16);
expect(square(4)).toBe(16);
expect(calls).toBe(1);
expect(square(5)).toBe(25);
expect(calls).toBe(2);`,
      },
      {
        name: 'различает разные аргументы',
        code: `const concat = memoize((a, b) => a + b);
expect(concat('x', 'y')).toBe('xy');
expect(concat('y', 'x')).toBe('yx');`,
      },
      {
        name: 'кеширует undefined',
        code: `let calls = 0;
const fn = memoize(() => { calls += 1; return undefined; });
fn();
fn();
expect(calls).toBe(1);`,
      },
      {
        name: 'clear сбрасывает кеш',
        code: `let calls = 0;
const fn = memoize((x) => { calls += 1; return x; });
fn(1);
fn.clear();
fn(1);
expect(calls).toBe(2);`,
        hidden: true,
      },
      {
        name: 'поддерживает свой getKey',
        code: `let calls = 0;
const fn = memoize(
  (user) => { calls += 1; return user.name; },
  (user) => String(user.id),
);
expect(fn({ id: 1, name: 'Аня' })).toBe('Аня');
expect(fn({ id: 1, name: 'Другое имя' })).toBe('Аня');
expect(calls).toBe(1);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'pipe-compose',
    topic: 'utility-implementations',
    title: 'pipe и compose',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['функции', 'реализация'],
    statementMd: `Реализуйте две функции композиции:

- \`pipe(...fns)\` — применяет функции **слева направо**;
- \`compose(...fns)\` — **справа налево**.

\`\`\`js
const add1 = (x) => x + 1;
const double = (x) => x * 2;

pipe(add1, double)(5);     // 12  — (5 + 1) * 2
compose(add1, double)(5);  // 11  — 5 * 2 + 1
\`\`\`

Первая функция может принимать несколько аргументов, остальные — по одному.
Без функций обе должны возвращать аргумент как есть.`,
    starterCode: `function pipe(...fns: Array<(...args: never[]) => unknown>): (...args: unknown[]) => unknown {
  // ваш код
  return (x) => x;
}

function compose(...fns: Array<(...args: never[]) => unknown>): (...args: unknown[]) => unknown {
  // ваш код
  return (x) => x;
}`,
    solutionCode: `function pipe(...fns: Array<(...args: never[]) => unknown>): (...args: unknown[]) => unknown {
  return (...args: unknown[]): unknown => {
    if (fns.length === 0) return args[0];

    const [first, ...rest] = fns as Array<(...a: unknown[]) => unknown>;
    // Первая функция получает все аргументы, остальные — результат предыдущей.
    return rest.reduce((value, fn) => fn(value), first!(...args));
  };
}

function compose(...fns: Array<(...args: never[]) => unknown>): (...args: unknown[]) => unknown {
  return pipe(...[...fns].reverse());
}`,
    solutionNotesMd: `\`compose\` — это \`pipe\` с перевёрнутым списком, писать его заново не нужно.
Важно копировать массив перед \`reverse\`: он мутирует, и повторный вызов
композиции работал бы с уже перевёрнутым списком.

Почему первая функция особенная: композиция получает произвольные аргументы,
а дальше по цепочке идёт одно значение — результат предыдущего шага.
Поэтому \`reduce\` стартует не с \`args\`, а с результата \`first(...args)\`.

Однострочник, который часто показывают на интервью:

\`\`\`js
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
\`\`\`

Он короче, но теряет поддержку нескольких аргументов у первой функции.

Где встречается: \`compose\` из Redux (применение middleware), утилиты
функционального стиля, обработка данных цепочкой преобразований.`,
    hints: [
      '`reduce` по массиву функций: аккумулятор — это текущее значение, а не массив.',
      '`compose` можно выразить через `pipe` с перевёрнутым списком функций. Только скопируйте массив перед `reverse` — он мутирует.',
    ],
    tests: [
      {
        name: 'pipe применяет слева направо',
        code: `const add1 = (x) => x + 1;
const double = (x) => x * 2;
expect(pipe(add1, double)(5)).toBe(12);`,
      },
      {
        name: 'compose применяет справа налево',
        code: `const add1 = (x) => x + 1;
const double = (x) => x * 2;
expect(compose(add1, double)(5)).toBe(11);`,
      },
      {
        name: 'без функций возвращает аргумент',
        code: `expect(pipe()(42)).toBe(42);
expect(compose()('x')).toBe('x');`,
      },
      {
        name: 'первая функция принимает несколько аргументов',
        code: `const sum = (a, b) => a + b;
const double = (x) => x * 2;
expect(pipe(sum, double)(2, 3)).toBe(10);`,
        hidden: true,
      },
      {
        name: 'композицию можно вызывать повторно',
        code: `const add1 = (x) => x + 1;
const double = (x) => x * 2;
const f = compose(add1, double);
expect(f(5)).toBe(11);
expect(f(5)).toBe(11);`,
        hidden: true,
      },
    ],
  },
];
