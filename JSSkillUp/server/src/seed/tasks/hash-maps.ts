import type { SeedTask } from '../types.js';

/** Обменять память на скорость — самый частый приём на фронтенд-интервью. */
export const hashMapsTasks: SeedTask[] = [
  {
    slug: 'two-sum',
    topic: 'hash-maps',
    title: 'Two Sum',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['хеш-мапа', 'leetcode'],
    statementMd: `Дан массив чисел и целевая сумма. Верните индексы **двух** элементов,
дающих в сумме \`target\`. Если такой пары нет — верните \`null\`.

\`\`\`js
twoSum([2, 7, 11, 15], 9);  // [0, 1]
twoSum([3, 2, 4], 6);       // [1, 2]
twoSum([1, 2], 10);         // null
\`\`\`

Каждый элемент можно использовать только один раз. Решение за O(n²) засчитывается,
но интервьюер сразу спросит, как сделать за O(n).`,
    starterCode: `function twoSum(nums: number[], target: number): [number, number] | null {
  // ваш код
  return null;
}`,
    solutionCode: `function twoSum(nums: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();

  for (let i = 0; i < nums.length; i += 1) {
    const current = nums[i]!;
    const complement = target - current;

    const complementIndex = seen.get(complement);
    if (complementIndex !== undefined) return [complementIndex, i];

    seen.set(current, i);
  }

  return null;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени, O(n) по памяти** — классический размен памяти на скорость.

Ключевая идея: вместо поиска пары перебором мы на каждом шаге спрашиваем «а видели ли мы
уже число, которого не хватает до target». Поиск в \`Map\` — в среднем O(1).

Важная деталь: число кладётся в \`Map\` **после** проверки. Иначе на входе \`[3, 3]\`
с target 6 элемент нашёл бы сам себя.

Наивное решение — вложенный цикл, O(n²). На 10 элементах разницы нет, на 100 000 — секунды
против миллисекунд.`,
    hints: [
      'Не ищите пару перебором. На каждом шаге спросите: «какое число мне нужно, чтобы получить target?»',
      'Храните в `Map` уже увиденные числа и их индексы. Кладите текущее число в `Map` **после** проверки, иначе элемент найдёт сам себя.',
    ],
    tests: [
      { name: 'находит пару в начале', code: `expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);` },
      { name: 'находит пару в середине', code: `expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);` },
      { name: 'пары нет', code: `expect(twoSum([1, 2], 10)).toBe(null);` },
      {
        name: 'одинаковые числа',
        code: `expect(twoSum([3, 3], 6)).toEqual([0, 1]);`,
        hidden: true,
      },
      {
        name: 'отрицательные числа и нули',
        code: `expect(twoSum([-3, 4, 3, 90], 0)).toEqual([0, 2]);
expect(twoSum([0, 0], 0)).toEqual([0, 1]);`,
        hidden: true,
      },
      {
        name: 'справляется с большим массивом (наивное O(n²) не уложится в лимит)',
        code: `const big = Array.from({ length: 50000 }, (_, i) => i);
expect(twoSum(big, 99997)).toEqual([49998, 49999]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'group-by',
    topic: 'hash-maps',
    title: 'groupBy — сгруппировать по ключу',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['хеш-мапа', 'утилиты'],
    statementMd: `Реализуйте \`groupBy(items, getKey)\`: группирует элементы по ключу,
который возвращает функция.

\`\`\`js
const users = [
  { name: 'Аня', role: 'dev' },
  { name: 'Олег', role: 'qa' },
  { name: 'Ира', role: 'dev' },
];

groupBy(users, (user) => user.role);
// { dev: [{ name: 'Аня', ... }, { name: 'Ира', ... }], qa: [{ name: 'Олег', ... }] }

groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? 'even' : 'odd'));
// { odd: [1, 3], even: [2, 4] }
\`\`\`

Порядок элементов внутри группы должен совпадать с порядком во входном массиве.`,
    starterCode: `function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  // ваш код
  return {};
}`,
    solutionCode: `function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = Object.create(null);

  for (const item of items) {
    const key = getKey(item);
    (result[key] ??= []).push(item);
  }

  return result;
}`,
    solutionNotesMd: `Сложность: O(n) по времени и памяти — один проход.

\`Object.create(null)\` создаёт объект без прототипа. Это защищает от ключей вроде
\`__proto__\`, \`toString\` и \`constructor\`: в обычном литерале \`{}\` запись в \`__proto__\`
не создала бы группу, а изменила прототип.

\`(result[key] ??= []).push(item)\` — логическое присваивание: создаёт массив,
только если ключа ещё не было.

Антипаттерн, который стоит уметь раскритиковать:

\`\`\`js
items.reduce((acc, item) => ({ ...acc, [getKey(item)]: [...(acc[getKey(item)] ?? []), item] }), {});
\`\`\`

Он создаёт новый объект на каждом шаге — O(n²) по времени и памяти.

В свежих движках есть встроенный \`Object.groupBy(items, getKey)\`.`,
    hints: [
      'Один проход по массиву: вычисляете ключ и добавляете элемент в соответствующую группу.',
      'Инициализируйте группу лениво: `(result[key] ??= []).push(item)`. Для защиты от ключей вроде `__proto__` используйте `Object.create(null)` вместо `{}`.',
    ],
    tests: [
      {
        name: 'группирует по полю',
        code: `const users = [
  { name: 'Аня', role: 'dev' },
  { name: 'Олег', role: 'qa' },
  { name: 'Ира', role: 'dev' },
];
const result = groupBy(users, (user) => user.role);
expect(Object.keys(result).sort()).toEqual(['dev', 'qa']);
expect(result.dev.map((u) => u.name)).toEqual(['Аня', 'Ира']);
expect(result.qa.map((u) => u.name)).toEqual(['Олег']);`,
      },
      {
        name: 'группирует по вычисленному ключу',
        code: `const result = groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? 'even' : 'odd'));
expect(result.odd).toEqual([1, 3]);
expect(result.even).toEqual([2, 4]);`,
      },
      {
        name: 'пустой массив',
        code: `expect(Object.keys(groupBy([], (x) => String(x)))).toEqual([]);`,
        hidden: true,
      },
      {
        name: 'опасные ключи не ломают результат',
        code: `const result = groupBy(['a', 'b'], () => '__proto__');
expect(result['__proto__']).toEqual(['a', 'b']);
expect(Object.prototype.polluted).toBeUndefined();`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'unique-by',
    topic: 'hash-maps',
    title: 'uniqueBy — дедупликация объектов по ключу',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['хеш-мапа', 'утилиты'],
    statementMd: `Реализуйте \`uniqueBy(items, getKey)\`: убирает дубликаты по ключу,
оставляя **первое** вхождение.

\`\`\`js
uniqueBy([{ id: 1 }, { id: 2 }, { id: 1 }], (x) => x.id);
// [{ id: 1 }, { id: 2 }]
\`\`\`

Объясните в решении, почему \`new Set(items)\` здесь не сработает, и назовите сложность.`,
    starterCode: `function uniqueBy<T>(items: T[], getKey: (item: T) => unknown): T[] {
  // ваш код
  return [];
}`,
    solutionCode: `function uniqueBy<T>(items: T[], getKey: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени и O(n) по памяти.**

\`new Set(items)\` не сработает, потому что объекты сравниваются **по ссылке**:
два разных объекта с одинаковым \`id\` — это два разных элемента множества.
Поэтому в \`Set\` кладём не сам элемент, а вычисленный ключ.

Наивный вариант даёт O(n²):

\`\`\`js
items.filter((item, i) => items.findIndex((x) => getKey(x) === getKey(item)) === i);
\`\`\`

Однострочник через \`Map\` короче, но оставляет **последнее** вхождение:

\`\`\`js
[...new Map(items.map((item) => [getKey(item), item])).values()];
\`\`\``,
    hints: [
      'Ключи — это не сами объекты. Складывайте в `Set` результат `getKey`, а не элемент.',
      'Один проход: если ключ уже в `Set` — пропускаем, иначе добавляем и в `Set`, и в результат.',
    ],
    tests: [
      {
        name: 'убирает дубликаты по id',
        code: `const result = uniqueBy([{ id: 1 }, { id: 2 }, { id: 1 }], (x) => x.id);
expect(result).toEqual([{ id: 1 }, { id: 2 }]);`,
      },
      {
        name: 'оставляет первое вхождение',
        code: `const result = uniqueBy(
  [{ id: 1, v: 'a' }, { id: 1, v: 'b' }],
  (x) => x.id,
);
expect(result).toEqual([{ id: 1, v: 'a' }]);`,
      },
      {
        name: 'работает с примитивами',
        code: `expect(uniqueBy([1, 2, 2, 3, 1], (x) => x)).toEqual([1, 2, 3]);`,
        hidden: true,
      },
      {
        name: 'пустой массив',
        code: `expect(uniqueBy([], (x) => x)).toEqual([]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'is-anagram',
    topic: 'hash-maps',
    title: 'Анаграммы',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['хеш-мапа', 'строки', 'leetcode'],
    statementMd: `Реализуйте \`isAnagram(a, b)\`: состоят ли строки из одних и тех же букв.

Регистр и пробелы игнорируются.

\`\`\`js
isAnagram('листок', 'столик');   // true
isAnagram('Аз Бука', 'бук аза'); // true
isAnagram('abc', 'abd');         // false
\`\`\`

Решение через сортировку — O(n log n). Можно ли за O(n)?`,
    starterCode: `function isAnagram(a: string, b: string): boolean {
  // ваш код
  return false;
}`,
    solutionCode: `function isAnagram(a: string, b: string): boolean {
  const normalize = (text: string): string[] =>
    text.toLowerCase().split('').filter((char) => char.trim().length > 0);

  const first = normalize(a);
  const second = normalize(b);
  if (first.length !== second.length) return false;

  const counts = new Map<string, number>();
  for (const char of first) counts.set(char, (counts.get(char) ?? 0) + 1);

  for (const char of second) {
    const count = counts.get(char);
    if (count === undefined || count === 0) return false;
    counts.set(char, count - 1);
  }

  return true;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени и O(k) по памяти**, где k — размер алфавита.

Через сортировку было бы O(n log n):

\`\`\`js
normalize(a).sort().join('') === normalize(b).sort().join('');
\`\`\`

Частотный словарь (frequency map) — тот же приём, что в Two Sum: один проход считает,
второй вычитает. Ранний выход по разной длине экономит проход.

Проверка \`count === 0\` обязательна: без неё строка с лишним повтором буквы
прошла бы проверку.`,
    hints: [
      'Сравнение отсортированных строк работает, но это O(n log n). Подумайте про частотный словарь.',
      'Первый проход: считаем, сколько раз каждая буква встречается в первой строке. Второй проход: вычитаем по второй строке и падаем, если счётчик ушёл в ноль или буквы не было.',
    ],
    tests: [
      { name: 'анаграмма на русском', code: `expect(isAnagram('листок', 'столик')).toBe(true);` },
      {
        name: 'регистр и пробелы игнорируются',
        code: `expect(isAnagram('Аз Бука', 'бук аза')).toBe(true);`,
      },
      { name: 'не анаграмма', code: `expect(isAnagram('abc', 'abd')).toBe(false);` },
      {
        name: 'разная длина',
        code: `expect(isAnagram('abc', 'ab')).toBe(false);
expect(isAnagram('aab', 'abb')).toBe(false);`,
        hidden: true,
      },
      {
        name: 'пустые строки',
        code: `expect(isAnagram('', '')).toBe(true);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'first-unique-char',
    topic: 'hash-maps',
    title: 'Первый неповторяющийся символ',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['хеш-мапа', 'строки', 'leetcode'],
    statementMd: `Реализуйте \`firstUniqueChar(text)\`: индекс первого символа, который встречается
в строке ровно один раз. Если такого нет — \`-1\`.

\`\`\`js
firstUniqueChar('leetcode');    // 0
firstUniqueChar('loveleetcode'); // 2
firstUniqueChar('aabb');         // -1
\`\`\``,
    starterCode: `function firstUniqueChar(text: string): number {
  // ваш код
  return -1;
}`,
    solutionCode: `function firstUniqueChar(text: string): number {
  const counts = new Map<string, number>();

  for (const char of text) counts.set(char, (counts.get(char) ?? 0) + 1);

  for (let i = 0; i < text.length; i += 1) {
    if (counts.get(text[i]!) === 1) return i;
  }

  return -1;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени, O(k) по памяти** — два прохода по строке.

Одним проходом задачу не решить: чтобы понять, повторяется ли первый символ,
нужно знать про всю строку.

Частая ошибка — \`indexOf(char) === lastIndexOf(char)\` внутри цикла: выглядит коротко,
но это O(n²).

Порядок вставки в \`Map\` тоже гарантирован, поэтому второй проход можно делать
и по \`counts.entries()\` — но тогда придётся отдельно искать индекс.`,
    hints: [
      'Одним проходом не обойтись: чтобы узнать про первый символ, нужно знать всю строку.',
      'Первый проход считает частоты, второй идёт по строке слева направо и возвращает индекс первого символа с частотой 1.',
    ],
    tests: [
      { name: 'первый символ уникален', code: `expect(firstUniqueChar('leetcode')).toBe(0);` },
      { name: 'уникальный символ в середине', code: `expect(firstUniqueChar('loveleetcode')).toBe(2);` },
      { name: 'уникальных нет', code: `expect(firstUniqueChar('aabb')).toBe(-1);` },
      {
        name: 'пустая строка и один символ',
        code: `expect(firstUniqueChar('')).toBe(-1);
expect(firstUniqueChar('z')).toBe(0);`,
        hidden: true,
      },
      {
        name: 'кириллица',
        code: `expect(firstUniqueChar('ааббв')).toBe(4);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'array-intersection',
    topic: 'hash-maps',
    title: 'Пересечение массивов',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['Set', 'массивы'],
    statementMd: `Реализуйте \`intersection(a, b)\`: элементы, встречающиеся в обоих массивах,
без дубликатов, в порядке появления в первом массиве.

\`\`\`js
intersection([1, 2, 2, 3], [2, 3, 4]);  // [2, 3]
intersection([1, 2], [3, 4]);           // []
\`\`\`

Оцените сложность своего решения и сравните с вложенным циклом.`,
    starterCode: `function intersection<T>(a: T[], b: T[]): T[] {
  // ваш код
  return [];
}`,
    solutionCode: `function intersection<T>(a: T[], b: T[]): T[] {
  const inB = new Set(b);
  const added = new Set<T>();
  const result: T[] = [];

  for (const item of a) {
    if (!inB.has(item) || added.has(item)) continue;
    added.add(item);
    result.push(item);
  }

  return result;
}`,
    solutionNotesMd: `Сложность: **O(n + m) по времени, O(m) по памяти.**

Вариант \`a.filter((x) => b.includes(x))\` читается проще, но \`includes\` — линейный поиск,
поэтому вместе с внешним циклом получается **O(n × m)**. На тысяче элементов в каждом
массиве это миллион операций вместо двух тысяч.

Второй \`Set\` нужен для дедупликации результата: во входном массиве значение может
встретиться несколько раз.

В свежих движках есть встроенные методы множеств: \`new Set(a).intersection(new Set(b))\`,
но они не сохраняют порядок исходного массива.`,
    hints: [
      '`b.includes(x)` внутри цикла по `a` даёт O(n × m). Что даст поиск за O(1)?',
      'Положите `b` в `Set` для быстрой проверки вхождения и заведите второй `Set` для дедупликации результата.',
    ],
    tests: [
      {
        name: 'пересечение с дубликатами во входе',
        code: `expect(intersection([1, 2, 2, 3], [2, 3, 4])).toEqual([2, 3]);`,
      },
      { name: 'пустое пересечение', code: `expect(intersection([1, 2], [3, 4])).toEqual([]);` },
      {
        name: 'порядок берётся из первого массива',
        code: `expect(intersection([3, 1, 2], [1, 2, 3])).toEqual([3, 1, 2]);`,
      },
      {
        name: 'пустые массивы',
        code: `expect(intersection([], [1])).toEqual([]);
expect(intersection([1], [])).toEqual([]);`,
        hidden: true,
      },
      {
        name: 'работает со строками',
        code: `expect(intersection(['a', 'b'], ['b', 'c'])).toEqual(['b']);`,
        hidden: true,
      },
    ],
  },
];
