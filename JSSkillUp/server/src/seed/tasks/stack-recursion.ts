import type { SeedTask } from '../types.js';

/** Стек, очередь и рекурсия — базовые структуры, которые чаще всего просят «написать руками». */
export const stackRecursionTasks: SeedTask[] = [
  {
    slug: 'valid-parentheses',
    topic: 'stack-queue',
    title: 'Валидные скобки',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['стек', 'leetcode'],
    statementMd: `Реализуйте \`isValid(text)\`: проверяет правильность расстановки скобок
\`()\`, \`[]\`, \`{}\`.

\`\`\`js
isValid('()[]{}');   // true
isValid('([{}])');   // true
isValid('(]');       // false
isValid('([)]');     // false
isValid('(');        // false
\`\`\`

Символы, не являющиеся скобками, игнорируйте.`,
    starterCode: `function isValid(text: string): boolean {
  // ваш код
  return false;
}`,
    solutionCode: `function isValid(text: string): boolean {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const opening = new Set(Object.values(pairs));
  const stack: string[] = [];

  for (const char of text) {
    if (opening.has(char)) {
      stack.push(char);
      continue;
    }

    const expected = pairs[char];
    if (expected === undefined) continue; // не скобка — пропускаем

    if (stack.pop() !== expected) return false;
  }

  return stack.length === 0;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени и O(n) по памяти** (в худшем случае все скобки открывающие).

Стек здесь — естественная структура: последняя открытая скобка должна закрыться первой,
это ровно LIFO.

Две обязательные проверки:

1. \`stack.pop() !== expected\` — закрывающая скобка не того типа или стек пуст
   (\`pop()\` на пустом массиве даёт \`undefined\`, что тоже не совпадёт);
2. \`stack.length === 0\` в конце — иначе \`'('\` прошло бы проверку.

Словарь \`pairs\` отображает закрывающую скобку на открывающую, а не наоборот:
так проверка на шаге закрытия делается одним обращением.`,
    hints: [
      'Открывающие скобки кладите в стек. Встретили закрывающую — снимите верхний элемент и сравните.',
      'Не забудьте два случая: закрывающая скобка при пустом стеке и непустой стек в конце строки.',
    ],
    tests: [
      { name: 'простые пары', code: `expect(isValid('()[]{}')).toBe(true);` },
      { name: 'вложенные скобки', code: `expect(isValid('([{}])')).toBe(true);` },
      { name: 'несовпадение типов', code: `expect(isValid('(]')).toBe(false);` },
      { name: 'пересечение', code: `expect(isValid('([)]')).toBe(false);` },
      {
        name: 'незакрытая и лишняя закрывающая',
        code: `expect(isValid('(')).toBe(false);
expect(isValid(')')).toBe(false);`,
        hidden: true,
      },
      {
        name: 'пустая строка и посторонние символы',
        code: `expect(isValid('')).toBe(true);
expect(isValid('a(b)c')).toBe(true);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'rpn-eval',
    topic: 'stack-queue',
    title: 'Обратная польская запись',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['стек', 'leetcode'],
    statementMd: `Реализуйте \`evalRPN(tokens)\`: вычисляет выражение в обратной польской записи.

Поддерживаемые операции: \`+\`, \`-\`, \`*\`, \`/\`. Деление — целочисленное с усечением к нулю.

\`\`\`js
evalRPN(['2', '1', '+', '3', '*']);        // 9   ((2 + 1) * 3)
evalRPN(['4', '13', '5', '/', '+']);       // 6   (4 + 13 / 5)
evalRPN(['5']);                            // 5
\`\`\`

На некорректном выражении бросьте \`Error\`.`,
    starterCode: `function evalRPN(tokens: string[]): number {
  // ваш код
  return 0;
}`,
    solutionCode: `function evalRPN(tokens: string[]): number {
  const operations: Record<string, (a: number, b: number) => number> = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => Math.trunc(a / b),
  };

  const stack: number[] = [];

  for (const token of tokens) {
    const operation = operations[token];

    if (operation === undefined) {
      const value = Number(token);
      if (Number.isNaN(value)) throw new Error(\`Некорректный токен: \${token}\`);
      stack.push(value);
      continue;
    }

    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error('Недостаточно операндов');

    stack.push(operation(a, b));
  }

  if (stack.length !== 1) throw new Error('Некорректное выражение');
  return stack[0]!;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени и памяти.**

Главная ловушка — **порядок снятия операндов**. Первым со стека снимается правый
операнд, вторым левый. Для \`+\` и \`*\` ошибка незаметна, для \`-\` и \`/\` — ломает всё.

\`Math.trunc\` вместо \`Math.floor\`: усечение к нулю, поэтому \`-7 / 2\` даёт \`-3\`,
а не \`-4\`. В формулировке LeetCode требуется именно это.

Проверка \`stack.length !== 1\` в конце ловит и лишние операнды (\`['1', '2']\`),
и пустой вход.`,
    hints: [
      'Числа кладите в стек. Встретили оператор — снимите два операнда, примените и положите результат обратно.',
      'Порядок важен: первым со стека снимается **правый** операнд. Для деления используйте `Math.trunc`, а не `Math.floor` — они расходятся на отрицательных числах.',
    ],
    tests: [
      { name: 'сложение и умножение', code: `expect(evalRPN(['2', '1', '+', '3', '*'])).toBe(9);` },
      { name: 'деление с усечением', code: `expect(evalRPN(['4', '13', '5', '/', '+'])).toBe(6);` },
      { name: 'одно число', code: `expect(evalRPN(['5'])).toBe(5);` },
      {
        name: 'порядок операндов для вычитания и деления',
        code: `expect(evalRPN(['10', '3', '-'])).toBe(7);
expect(evalRPN(['10', '3', '/'])).toBe(3);`,
        hidden: true,
      },
      {
        name: 'усечение к нулю для отрицательных',
        code: `expect(evalRPN(['-7', '2', '/'])).toBe(-3);`,
        hidden: true,
      },
      {
        name: 'некорректное выражение бросает ошибку',
        code: `expect(() => evalRPN(['+'])).toThrow();
expect(() => evalRPN(['1', '2'])).toThrow();`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'daily-temperatures',
    topic: 'stack-queue',
    title: 'Монотонный стек: сколько дней ждать потепления',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['стек', 'leetcode'],
    statementMd: `Дан массив дневных температур. Для каждого дня верните, через сколько дней
станет теплее. Если потепления не будет — 0.

\`\`\`js
dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]);
// [1, 1, 4, 2, 1, 1, 0, 0]
\`\`\`

Решение «в лоб» — для каждого дня искать следующий тёплый, O(n²).
Монотонный стек даёт O(n).`,
    starterCode: `function dailyTemperatures(temps: number[]): number[] {
  // ваш код
  return [];
}`,
    solutionCode: `function dailyTemperatures(temps: number[]): number[] {
  const result = new Array<number>(temps.length).fill(0);
  // В стеке лежат индексы дней, для которых ответ ещё не найден.
  const stack: number[] = [];

  for (let i = 0; i < temps.length; i += 1) {
    while (stack.length > 0 && temps[stack[stack.length - 1]!]! < temps[i]!) {
      const previous = stack.pop()!;
      result[previous] = i - previous;
    }
    stack.push(i);
  }

  return result;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени, O(n) по памяти.**

Монотонный стек хранит индексы дней с **убывающими** температурами — то есть тех,
для кого ответ ещё не найден. Как только приходит более тёплый день, он закрывает
сразу все накопившиеся дни.

Вложенный \`while\` не делает алгоритм квадратичным: каждый индекс попадает в стек
ровно один раз и снимается тоже один раз, итого не больше 2n операций.

В стеке лежат **индексы**, а не температуры — иначе не посчитать расстояние.

\`new Array(n).fill(0)\` вместо \`new Array(n)\`: разреженный массив сломал бы
последующие \`map\` и сравнение через \`toEqual\`.`,
    hints: [
      'Храните в стеке индексы дней, для которых ответ ещё не найден.',
      'Стек должен оставаться монотонным по убыванию температуры. Пришёл более тёплый день — снимайте со стека всё, что холоднее, и записывайте им ответ `i - previous`.',
    ],
    tests: [
      {
        name: 'пример из условия',
        code: `expect(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]))
  .toEqual([1, 1, 4, 2, 1, 1, 0, 0]);`,
      },
      {
        name: 'температура только растёт',
        code: `expect(dailyTemperatures([1, 2, 3])).toEqual([1, 1, 0]);`,
      },
      {
        name: 'температура только падает',
        code: `expect(dailyTemperatures([3, 2, 1])).toEqual([0, 0, 0]);`,
      },
      {
        name: 'одинаковые температуры',
        code: `expect(dailyTemperatures([5, 5, 5])).toEqual([0, 0, 0]);`,
        hidden: true,
      },
      {
        name: 'пустой массив и один элемент',
        code: `expect(dailyTemperatures([])).toEqual([]);
expect(dailyTemperatures([10])).toEqual([0]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'queue-from-stacks',
    topic: 'stack-queue',
    title: 'Очередь на двух стеках',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['стек', 'очередь'],
    statementMd: `Реализуйте класс \`Queue\` с методами \`push\`, \`pop\`, \`peek\` и \`size\`,
используя внутри **только массивы как стеки** — то есть только \`push\` и \`pop\`.

Метод \`shift\` использовать нельзя: именно от него мы и уходим.

\`\`\`js
const q = new Queue();
q.push(1);
q.push(2);
q.pop();   // 1
q.push(3);
q.pop();   // 2
q.pop();   // 3
q.pop();   // undefined
\`\`\`

Амортизированная сложность \`pop\` должна быть O(1) — объясните почему.`,
    starterCode: `class Queue<T> {
  push(value: T): void {
    // ваш код
  }

  pop(): T | undefined {
    // ваш код
    return undefined;
  }

  peek(): T | undefined {
    // ваш код
    return undefined;
  }

  size(): number {
    // ваш код
    return 0;
  }
}`,
    solutionCode: `class Queue<T> {
  // Входящий стек принимает новые элементы, исходящий отдаёт в правильном порядке.
  private inbox: T[] = [];
  private outbox: T[] = [];

  push(value: T): void {
    this.inbox.push(value);
  }

  pop(): T | undefined {
    this.transfer();
    return this.outbox.pop();
  }

  peek(): T | undefined {
    this.transfer();
    return this.outbox[this.outbox.length - 1];
  }

  size(): number {
    return this.inbox.length + this.outbox.length;
  }

  /** Переливание происходит, только когда исходящий стек пуст. */
  private transfer(): void {
    if (this.outbox.length > 0) return;
    while (this.inbox.length > 0) {
      this.outbox.push(this.inbox.pop()!);
    }
  }
}`,
    solutionNotesMd: `**Амортизированная сложность \`pop\` — O(1).**

Рассуждение: каждый элемент за всю свою жизнь перекладывается ровно дважды —
один раз из \`inbox\` в \`outbox\`, и один раз снимается. Значит, на n операций
приходится не больше 2n перекладываний, то есть в среднем константа на операцию.
Отдельный \`pop\` может стоить O(k), но такие дорогие вызовы происходят редко.

Критическая деталь — **переливать только когда \`outbox\` пуст**. Если переливать
каждый раз, порядок перемешается и очередь сломается.

Зачем это вообще нужно: \`Array.prototype.shift\` сдвигает все элементы и работает
за O(n). На больших очередях это заметно.`,
    hints: [
      'Два стека: один принимает новые элементы, второй отдаёт старые.',
      'Переливайте из входящего в исходящий **только когда исходящий пуст**. Если переливать каждый раз, порядок нарушится.',
    ],
    tests: [
      {
        name: 'FIFO-порядок',
        code: `const q = new Queue();
q.push(1);
q.push(2);
expect(q.pop()).toBe(1);
q.push(3);
expect(q.pop()).toBe(2);
expect(q.pop()).toBe(3);`,
      },
      {
        name: 'пустая очередь',
        code: `const q = new Queue();
expect(q.pop()).toBeUndefined();
expect(q.peek()).toBeUndefined();
expect(q.size()).toBe(0);`,
      },
      {
        name: 'peek не удаляет элемент',
        code: `const q = new Queue();
q.push('a');
q.push('b');
expect(q.peek()).toBe('a');
expect(q.peek()).toBe('a');
expect(q.size()).toBe(2);`,
      },
      {
        name: 'чередование push и pop',
        code: `const q = new Queue();
const out = [];
for (let i = 0; i < 5; i += 1) q.push(i);
out.push(q.pop(), q.pop());
q.push(5);
while (q.size() > 0) out.push(q.pop());
expect(out).toEqual([0, 1, 2, 3, 4, 5]);`,
        hidden: true,
      },
      {
        name: 'size корректен',
        code: `const q = new Queue();
q.push(1);
q.push(2);
q.pop();
expect(q.size()).toBe(1);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'flatten',
    topic: 'recursion',
    title: 'flatten — развернуть вложенные массивы',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['рекурсия', 'массивы'],
    statementMd: `Реализуйте \`flatten(items, depth)\`: разворачивает вложенные массивы
на заданную глубину. По умолчанию глубина 1, \`Infinity\` разворачивает полностью.

\`\`\`js
flatten([1, [2, [3, [4]]]]);            // [1, 2, [3, [4]]]
flatten([1, [2, [3, [4]]]], Infinity);  // [1, 2, 3, 4]
flatten([1, [2, [3]]], 2);              // [1, 2, 3]
\`\`\`

Встроенный \`Array.prototype.flat\` использовать нельзя.`,
    starterCode: `function flatten(items: unknown[], depth = 1): unknown[] {
  // ваш код
  return [];
}`,
    solutionCode: `function flatten(items: unknown[], depth = 1): unknown[] {
  const result: unknown[] = [];

  for (const item of items) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flatten(item, depth - 1));
    } else {
      result.push(item);
    }
  }

  return result;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени**, где n — общее число элементов на всех уровнях.
По памяти O(n) плюс глубина стека вызовов.

База рекурсии здесь не «пустой массив», а \`depth === 0\`: как только глубина исчерпана,
вложенный массив кладётся как обычное значение.

На очень глубокой вложенности (десятки тысяч уровней) рекурсия упрётся в
\`RangeError: Maximum call stack size exceeded\`. Итеративный вариант со стеком:

\`\`\`js
function flattenIterative(items) {
  const stack = [...items];
  const result = [];
  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) stack.push(...item);
    else result.push(item);
  }
  return result.reverse();
}
\`\`\`

Осторожно со \`push(...array)\`: на очень больших массивах spread как аргументы
тоже переполняет стек — там нужен цикл.`,
    hints: [
      'Рекурсия: если элемент — массив и глубина ещё не исчерпана, разверните его с глубиной на единицу меньше.',
      'База рекурсии — `depth === 0`, а не пустой массив. `Array.isArray` — правильная проверка, `typeof` здесь не поможет.',
    ],
    tests: [
      {
        name: 'глубина по умолчанию 1',
        code: `expect(flatten([1, [2, [3, [4]]]])).toEqual([1, 2, [3, [4]]]);`,
      },
      {
        name: 'полное разворачивание',
        code: `expect(flatten([1, [2, [3, [4]]]], Infinity)).toEqual([1, 2, 3, 4]);`,
      },
      { name: 'конкретная глубина', code: `expect(flatten([1, [2, [3]]], 2)).toEqual([1, 2, 3]);` },
      {
        name: 'пустые и вложенные пустые массивы',
        code: `expect(flatten([])).toEqual([]);
expect(flatten([[], [[]]], Infinity)).toEqual([]);`,
        hidden: true,
      },
      {
        name: 'сохраняет не-массивы как есть',
        code: `expect(flatten([1, null, [undefined, { a: 1 }]], 1)).toEqual([1, null, undefined, { a: 1 }]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'deep-clone',
    topic: 'recursion',
    title: 'deepClone с циклическими ссылками',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['рекурсия', 'объекты'],
    statementMd: `Реализуйте \`deepClone(value)\`: глубокое копирование.

Требования:

- примитивы возвращаются как есть;
- массивы и обычные объекты копируются рекурсивно;
- \`Date\`, \`Map\` и \`Set\` копируются как соответствующие типы;
- **циклические ссылки не приводят к бесконечной рекурсии**.

\`\`\`js
const source = { a: 1, nested: { b: 2 } };
const copy = deepClone(source);
copy.nested.b = 99;
source.nested.b; // 2
\`\`\`

\`structuredClone\` использовать нельзя — задача в том, чтобы написать его руками.`,
    starterCode: `function deepClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  // ваш код
  return value;
}`,
    solutionCode: `function deepClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value;

  const source = value as unknown as object;
  if (seen.has(source)) return seen.get(source) as T;

  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as unknown as T;

  if (value instanceof Map) {
    const result = new Map();
    seen.set(source, result);
    for (const [key, item] of value) {
      result.set(deepClone(key, seen), deepClone(item, seen));
    }
    return result as unknown as T;
  }

  if (value instanceof Set) {
    const result = new Set();
    seen.set(source, result);
    for (const item of value) result.add(deepClone(item, seen));
    return result as unknown as T;
  }

  const result: Record<string, unknown> = Array.isArray(value) ? ([] as never) : {};
  seen.set(source, result);

  for (const [key, item] of Object.entries(source)) {
    result[key] = deepClone(item, seen);
  }

  return result as unknown as T;
}`,
    solutionNotesMd: `Сложность: **O(n)** по числу узлов структуры.

Ключевой приём — \`WeakMap\` «оригинал → копия». Он решает сразу две задачи:

1. **циклические ссылки** — при повторной встрече объекта возвращается уже созданная копия;
2. **разделяемые ссылки** — если один и тот же объект встречается в двух местах,
   в копии он тоже будет одним объектом, а не двумя.

Критично: \`seen.set(source, result)\` вызывается **до** рекурсивного обхода полей.
Если поставить после, цикл уйдёт в бесконечную рекурсию.

Почему \`WeakMap\`, а не \`Map\`: слабые ссылки не мешают сборке мусора, если
клонирование прервалось исключением.

Чего не покрывает эта реализация: символьные ключи (нужен \`Reflect.ownKeys\`),
прототипы классов (нужен \`Object.create(Object.getPrototypeOf(value))\`),
функции и геттеры.`,
    hints: [
      'Рекурсивно обходите объект. Примитивы возвращайте как есть — это база рекурсии.',
      'Для циклических ссылок заведите `WeakMap` «оригинал → копия» и **записывайте копию в неё до того**, как начнёте обходить поля.',
    ],
    tests: [
      {
        name: 'копирует вложенные объекты',
        code: `const source = { a: 1, nested: { b: 2 } };
const copy = deepClone(source);
copy.nested.b = 99;
expect(source.nested.b).toBe(2);
expect(copy).toEqual({ a: 1, nested: { b: 99 } });`,
      },
      {
        name: 'копирует массивы',
        code: `const source = [1, [2, [3]]];
const copy = deepClone(source);
expect(copy).toEqual([1, [2, [3]]]);
expect(copy[1]).not.toBe(source[1]);`,
      },
      {
        name: 'обрабатывает циклическую ссылку',
        code: `const source = { name: 'root' };
source.self = source;
const copy = deepClone(source);
expect(copy.name).toBe('root');
expect(copy.self).toBe(copy);
expect(copy.self).not.toBe(source);`,
      },
      {
        name: 'Date, Map и Set',
        code: `const date = new Date('2020-01-01T00:00:00.000Z');
const copy = deepClone({ date, map: new Map([['k', { v: 1 }]]), set: new Set([1, 2]) });
expect(copy.date).toBeInstanceOf(Date);
expect(copy.date.getTime()).toBe(date.getTime());
expect(copy.date).not.toBe(date);
expect(copy.map.get('k')).toEqual({ v: 1 });
expect(copy.set.has(2)).toBe(true);`,
        hidden: true,
      },
      {
        name: 'примитивы и null возвращаются как есть',
        code: `expect(deepClone(42)).toBe(42);
expect(deepClone('text')).toBe('text');
expect(deepClone(null)).toBe(null);
expect(deepClone(undefined)).toBeUndefined();`,
        hidden: true,
      },
      {
        name: 'общая ссылка остаётся общей',
        code: `const shared = { v: 1 };
const copy = deepClone({ a: shared, b: shared });
expect(copy.a).toBe(copy.b);
expect(copy.a).not.toBe(shared);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'sum-nested',
    topic: 'recursion',
    title: 'Сумма чисел во вложенной структуре',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['рекурсия', 'объекты'],
    statementMd: `Реализуйте \`sumNested(value)\`: складывает все числа, найденные на любой глубине
вложенности массивов и объектов.

\`\`\`js
sumNested([1, [2, { a: 3 }], { b: { c: 4 } }]);  // 10
sumNested({ a: 'текст', b: [1, null, 2] });      // 3
sumNested(5);                                     // 5
sumNested('abc');                                 // 0
\`\`\`

\`NaN\` и \`Infinity\` числами не считаем — пропускайте их.`,
    starterCode: `function sumNested(value: unknown): number {
  // ваш код
  return 0;
}`,
    solutionCode: `function sumNested(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (Array.isArray(value)) {
    return value.reduce<number>((acc, item) => acc + sumNested(item), 0);
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).reduce<number>((acc, item) => acc + sumNested(item), 0);
  }

  return 0;
}`,
    solutionNotesMd: `Сложность: **O(n)** по числу узлов.

Структура решения — разбор случаев: число, массив, объект, всё остальное.
Это типовой шаблон для рекурсивного обхода разнородных данных.

Две ловушки:

1. \`typeof null === 'object'\` — проверка на \`null\` обязательна, иначе
   \`Object.values(null)\` бросит \`TypeError\`;
2. \`Number.isFinite\` отсекает \`NaN\` и \`Infinity\`: без этого одно \`NaN\`
   отравило бы всю сумму.

\`Object.values\` работает и для массивов, так что отдельную ветку для них можно
не писать — но явная проверка читается понятнее.`,
    hints: [
      'Разберите случаи по типу значения: число, массив, объект, остальное.',
      'Помните, что `typeof null === "object"` — проверьте на null до обращения к `Object.values`. И отсеките `NaN` через `Number.isFinite`.',
    ],
    tests: [
      {
        name: 'смешанная вложенность',
        code: `expect(sumNested([1, [2, { a: 3 }], { b: { c: 4 } }])).toBe(10);`,
      },
      {
        name: 'пропускает нечисловые значения',
        code: `expect(sumNested({ a: 'текст', b: [1, null, 2] })).toBe(3);`,
      },
      {
        name: 'скаляры',
        code: `expect(sumNested(5)).toBe(5);
expect(sumNested('abc')).toBe(0);`,
      },
      {
        name: 'NaN и Infinity игнорируются',
        code: `expect(sumNested([1, NaN, Infinity, 2])).toBe(3);`,
        hidden: true,
      },
      {
        name: 'пустые структуры и null',
        code: `expect(sumNested([])).toBe(0);
expect(sumNested({})).toBe(0);
expect(sumNested(null)).toBe(0);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'permutations',
    topic: 'recursion',
    title: 'Все перестановки массива',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['рекурсия', 'backtracking', 'leetcode'],
    statementMd: `Реализуйте \`permutations(items)\`: все перестановки элементов массива.

\`\`\`js
permutations([1, 2, 3]);
// [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]

permutations([]);   // [[]]
\`\`\`

Порядок перестановок в результате не важен — тесты сравнивают множества.
Элементы считаем уникальными.`,
    starterCode: `function permutations<T>(items: T[]): T[][] {
  // ваш код
  return [];
}`,
    solutionCode: `function permutations<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]];

  const result: T[][] = [];

  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const permutation of permutations(rest)) {
      result.push([items[i]!, ...permutation]);
    }
  }

  return result;
}`,
    solutionNotesMd: `Сложность: **O(n! × n)** — перестановок n!, и на сборку каждой уходит O(n).
Меньше быть не может: столько же и результатов.

База рекурсии — пустой массив, который даёт **одну** перестановку: пустую.
Частая ошибка — вернуть \`[]\` вместо \`[[]]\`, тогда результат всегда пустой.

Идея шага: фиксируем каждый элемент первым и рекурсивно переставляем остальные.

Альтернатива — backtracking с массивом использованных флагов и общим буфером:
экономит выделение промежуточных массивов, но читается сложнее:

\`\`\`js
function permutations(items) {
  const result = [];
  const current = [];
  const used = new Array(items.length).fill(false);

  const backtrack = () => {
    if (current.length === items.length) { result.push([...current]); return; }
    for (let i = 0; i < items.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      current.push(items[i]);
      backtrack();
      current.pop();
      used[i] = false;
    }
  };

  backtrack();
  return result;
}
\`\`\``,
    hints: [
      'База рекурсии — пустой массив. Подумайте, сколько перестановок у пустого массива: ноль или одна?',
      'Шаг: по очереди делайте каждый элемент первым и рекурсивно переставляйте оставшиеся.',
    ],
    tests: [
      {
        name: 'три элемента дают шесть перестановок',
        code: `const result = permutations([1, 2, 3]);
expect(result).toHaveLength(6);
const asStrings = result.map((p) => p.join('')).sort();
expect(asStrings).toEqual(['123', '132', '213', '231', '312', '321']);`,
      },
      {
        name: 'пустой массив даёт одну пустую перестановку',
        code: `expect(permutations([])).toEqual([[]]);`,
      },
      {
        name: 'один элемент',
        code: `expect(permutations(['a'])).toEqual([['a']]);`,
      },
      {
        name: 'количество растёт как факториал',
        code: `expect(permutations([1, 2, 3, 4])).toHaveLength(24);`,
        hidden: true,
      },
      {
        name: 'исходный массив не мутируется',
        code: `const source = [1, 2, 3];
permutations(source);
expect(source).toEqual([1, 2, 3]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'tree-walk',
    topic: 'recursion',
    title: 'Обход дерева и поиск узла',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['рекурсия', 'деревья'],
    statementMd: `Дано дерево вида \`{ id, children?: Node[] }\`. Реализуйте две функции:

- \`findNode(root, id)\` — находит узел по id или возвращает \`null\`;
- \`flattenTree(root)\` — возвращает плоский массив всех узлов в порядке обхода
  в глубину (сначала родитель, потом потомки слева направо).

\`\`\`js
const tree = { id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }] }] };

findNode(tree, 4);      // { id: 4 }
findNode(tree, 99);     // null
flattenTree(tree).map((n) => n.id);  // [1, 2, 3, 4]
\`\`\`

Такая задача постоянно встречается на практике: меню, дерево комментариев, файловая структура.`,
    starterCode: `interface TreeNode {
  id: number;
  children?: TreeNode[];
}

function findNode(root: TreeNode, id: number): TreeNode | null {
  // ваш код
  return null;
}

function flattenTree(root: TreeNode): TreeNode[] {
  // ваш код
  return [];
}`,
    solutionCode: `interface TreeNode {
  id: number;
  children?: TreeNode[];
}

function findNode(root: TreeNode, id: number): TreeNode | null {
  if (root.id === id) return root;

  for (const child of root.children ?? []) {
    const found = findNode(child, id);
    // Важно вернуть сразу: иначе следующая итерация затрёт найденный результат.
    if (found !== null) return found;
  }

  return null;
}

function flattenTree(root: TreeNode): TreeNode[] {
  const result: TreeNode[] = [root];

  for (const child of root.children ?? []) {
    result.push(...flattenTree(child));
  }

  return result;
}`,
    solutionNotesMd: `Сложность: **O(n)** по числу узлов, память — O(глубина) на стек вызовов
плюс O(n) на результат у \`flattenTree\`.

Самая частая ошибка в \`findNode\` — забыть ранний возврат внутри цикла:

\`\`\`js
for (const child of root.children ?? []) {
  findNode(child, id);   // результат выброшен
}
\`\`\`

\`root.children ?? []\` избавляет от отдельной проверки на листовой узел.

Если дерево может быть очень глубоким, рекурсия упрётся в стек — тогда обход
делают итеративно, со своим стеком:

\`\`\`js
function flattenIterative(root) {
  const stack = [root];
  const result = [];
  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node);
    // в обратном порядке, чтобы обойти слева направо
    for (let i = (node.children?.length ?? 0) - 1; i >= 0; i -= 1) {
      stack.push(node.children[i]);
    }
  }
  return result;
}
\`\`\`

Замена стека на очередь (\`shift\` вместо \`pop\`) превращает обход в поиск в ширину.`,
    hints: [
      'Обе функции — классическая рекурсия: обработать текущий узел, потом рекурсивно обойти `children`.',
      'В `findNode` обязателен ранний `return` внутри цикла по детям: без него найденный результат потеряется на следующей итерации.',
    ],
    tests: [
      {
        name: 'находит вложенный узел',
        code: `const tree = { id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }] }] };
expect(findNode(tree, 4)).toEqual({ id: 4 });
expect(findNode(tree, 1).id).toBe(1);`,
      },
      {
        name: 'возвращает null для отсутствующего id',
        code: `const tree = { id: 1, children: [{ id: 2 }] };
expect(findNode(tree, 99)).toBe(null);`,
      },
      {
        name: 'порядок обхода в глубину',
        code: `const tree = { id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }] }] };
expect(flattenTree(tree).map((n) => n.id)).toEqual([1, 2, 3, 4]);`,
      },
      {
        name: 'узел без детей',
        code: `expect(flattenTree({ id: 7 }).map((n) => n.id)).toEqual([7]);
expect(findNode({ id: 7 }, 7).id).toBe(7);`,
        hidden: true,
      },
      {
        name: 'возвращается ссылка на узел, а не копия',
        code: `const leaf = { id: 5 };
const tree = { id: 1, children: [leaf] };
expect(findNode(tree, 5)).toBe(leaf);`,
        hidden: true,
      },
      {
        name: 'глубокая ветка',
        code: `const deep = { id: 1, children: [{ id: 2, children: [{ id: 3, children: [{ id: 4 }] }] }] };
expect(flattenTree(deep).map((n) => n.id)).toEqual([1, 2, 3, 4]);`,
        hidden: true,
      },
    ],
  },
];
