import type { SeedTask } from '../types.js';

export const sortingSearchTasks: SeedTask[] = [
  {
    slug: 'binary-search',
    topic: 'sorting-searching',
    title: 'Бинарный поиск',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['бинарный поиск'],
    statementMd: `Реализуйте \`binarySearch(sorted, target)\`: индекс элемента в отсортированном
по возрастанию массиве или \`-1\`, если элемента нет.

\`\`\`js
binarySearch([1, 3, 5, 7, 9], 7);   // 3
binarySearch([1, 3, 5], 4);         // -1
binarySearch([], 1);                // -1
\`\`\`

Сложность должна быть O(log n). Реализуйте итеративно, без рекурсии.`,
    starterCode: `function binarySearch(sorted: number[], target: number): number {
  // ваш код
  return -1;
}`,
    solutionCode: `function binarySearch(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length - 1;

  while (low <= high) {
    // Такая форма середины не переполняется на больших индексах, в отличие от (low + high) / 2.
    const middle = low + Math.floor((high - low) / 2);
    const value = sorted[middle]!;

    if (value === target) return middle;
    if (value < target) low = middle + 1;
    else high = middle - 1;
  }

  return -1;
}`,
    solutionNotesMd: `Сложность: **O(log n) по времени, O(1) по памяти.**

Три места, где обычно ошибаются:

1. **условие цикла** — \`low <= high\`, а не \`<\`. С \`<\` теряется случай,
   когда остался один элемент;
2. **сдвиг границ** — \`middle + 1\` и \`middle - 1\`. Присваивание \`low = middle\`
   даёт бесконечный цикл, когда \`low\` и \`high\` стоят рядом;
3. **вычисление середины** — \`low + (high - low) / 2\` вместо \`(low + high) / 2\`.
   В JavaScript с числами до 2⁵³ переполнения не будет, но это канонический приём,
   и его ждут услышать.

Рекурсивная версия читается не хуже, но тратит O(log n) стека.`,
    hints: [
      'Держите две границы: low и high. На каждом шаге сравнивайте элемент в середине с целью.',
      'Проверьте два граничных случая: условие цикла должно быть `low <= high`, а границы должны сдвигаться на `middle ± 1`, иначе получите бесконечный цикл.',
    ],
    tests: [
      { name: 'находит элемент', code: `expect(binarySearch([1, 3, 5, 7, 9], 7)).toBe(3);` },
      { name: 'элемента нет', code: `expect(binarySearch([1, 3, 5], 4)).toBe(-1);` },
      { name: 'пустой массив', code: `expect(binarySearch([], 1)).toBe(-1);` },
      {
        name: 'границы массива',
        code: `expect(binarySearch([1, 2, 3], 1)).toBe(0);
expect(binarySearch([1, 2, 3], 3)).toBe(2);
expect(binarySearch([5], 5)).toBe(0);`,
        hidden: true,
      },
      {
        name: 'большой массив без зацикливания',
        code: `const big = Array.from({ length: 100000 }, (_, i) => i * 2);
expect(binarySearch(big, 199998)).toBe(99999);
expect(binarySearch(big, 3)).toBe(-1);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'sort-by',
    topic: 'sorting-searching',
    title: 'Сортировка по нескольким полям',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['сортировка', 'компараторы'],
    statementMd: `Реализуйте \`sortBy(items, ...rules)\`: сортирует массив объектов по нескольким
правилам. Каждое правило — это \`[getKey, direction]\`, где \`direction\` — \`'asc'\` или \`'desc'\`.

\`\`\`js
const users = [
  { name: 'Оля', age: 30 },
  { name: 'Аня', age: 25 },
  { name: 'Ира', age: 30 },
];

sortBy(users, [(u) => u.age, 'desc'], [(u) => u.name, 'asc']);
// Ира (30), Оля (30), Аня (25)
\`\`\`

Требования:

- исходный массив **не мутируется**;
- строки сравниваются через \`localeCompare\` с локалью \`'ru'\`;
- сортировка стабильна.`,
    starterCode: `type SortRule<T> = [(item: T) => string | number, 'asc' | 'desc'];

function sortBy<T>(items: T[], ...rules: SortRule<T>[]): T[] {
  // ваш код
  return items;
}`,
    solutionCode: `type SortRule<T> = [(item: T) => string | number, 'asc' | 'desc'];

function sortBy<T>(items: T[], ...rules: SortRule<T>[]): T[] {
  const compareValues = (a: string | number, b: string | number): number => {
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'ru');
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  };

  return [...items].sort((left, right) => {
    for (const [getKey, direction] of rules) {
      const result = compareValues(getKey(left), getKey(right));
      if (result !== 0) return direction === 'desc' ? -result : result;
    }
    return 0;
  });
}`,
    solutionNotesMd: `Сложность: **O(n log n × k)**, где k — количество правил.

Три вещи, которые проверяют этой задачей:

1. **\`sort\` мутирует массив** и возвращает ссылку на него же. Поэтому обязательна
   копия: \`[...items].sort(...)\` или сразу \`items.toSorted(...)\`;
2. **порядок правил** — компаратор возвращает результат первого правила, которое
   дало ненулевую разницу. Возврат нуля означает «эти правила не различают элементы»;
3. **\`localeCompare\`** — без него кириллица сортируется по кодам символов,
   и «Ё» окажется не там, где ожидает пользователь.

Стабильность \`Array.prototype.sort\` гарантирована спецификацией с ES2019,
поэтому равные по всем правилам элементы сохранят исходный порядок.`,
    hints: [
      'Один компаратор, который последовательно применяет правила и возвращает первый ненулевой результат.',
      'Не забудьте скопировать массив перед `sort` — он мутирует. Для строк используйте `localeCompare(b, "ru")`, иначе кириллица отсортируется по кодам символов.',
    ],
    tests: [
      {
        name: 'сортирует по двум полям',
        code: `const users = [
  { name: 'Оля', age: 30 },
  { name: 'Аня', age: 25 },
  { name: 'Ира', age: 30 },
];
const result = sortBy(users, [(u) => u.age, 'desc'], [(u) => u.name, 'asc']);
expect(result.map((u) => u.name)).toEqual(['Ира', 'Оля', 'Аня']);`,
      },
      {
        name: 'не мутирует исходный массив',
        code: `const users = [{ n: 2 }, { n: 1 }];
const result = sortBy(users, [(u) => u.n, 'asc']);
expect(users.map((u) => u.n)).toEqual([2, 1]);
expect(result).not.toBe(users);`,
      },
      {
        name: 'сортировка по возрастанию и убыванию',
        code: `const nums = [{ v: 3 }, { v: 1 }, { v: 2 }];
expect(sortBy(nums, [(x) => x.v, 'asc']).map((x) => x.v)).toEqual([1, 2, 3]);
expect(sortBy(nums, [(x) => x.v, 'desc']).map((x) => x.v)).toEqual([3, 2, 1]);`,
      },
      {
        name: 'кириллица сравнивается по алфавиту',
        code: `const words = [{ w: 'яблоко' }, { w: 'Апельсин' }, { w: 'банан' }];
expect(sortBy(words, [(x) => x.w, 'asc']).map((x) => x.w))
  .toEqual(['Апельсин', 'банан', 'яблоко']);`,
        hidden: true,
      },
      {
        name: 'без правил и на пустом массиве',
        code: `expect(sortBy([3, 1, 2])).toEqual([3, 1, 2]);
expect(sortBy([])).toEqual([]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'merge-sort',
    topic: 'sorting-searching',
    title: 'Merge sort',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['сортировка', 'рекурсия'],
    statementMd: `Реализуйте \`mergeSort(nums)\`: сортировка слиянием.

\`\`\`js
mergeSort([5, 2, 9, 1, 5, 6]);  // [1, 2, 5, 5, 6, 9]
mergeSort([]);                   // []
\`\`\`

Исходный массив не мутируется. Встроенный \`sort\` использовать нельзя.

Будьте готовы объяснить, почему сложность O(n log n) и почему эта сортировка стабильна.`,
    starterCode: `function mergeSort(nums: number[]): number[] {
  // ваш код
  return [];
}`,
    solutionCode: `function mergeSort(nums: number[]): number[] {
  if (nums.length <= 1) return [...nums];

  const middle = Math.floor(nums.length / 2);
  const left = mergeSort(nums.slice(0, middle));
  const right = mergeSort(nums.slice(middle));

  const result: number[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    // <= вместо < делает сортировку стабильной
    if (left[i]! <= right[j]!) result.push(left[i++]!);
    else result.push(right[j++]!);
  }

  while (i < left.length) result.push(left[i++]!);
  while (j < right.length) result.push(right[j++]!);

  return result;
}`,
    solutionNotesMd: `Сложность: **O(n log n) по времени и O(n) по памяти.**

Почему n log n: массив делится пополам, значит глубина рекурсии log₂n. На каждом
уровне рекурсии суммарно сливается n элементов. Итого n × log n.

Почему стабильна: при равных элементах берётся элемент из **левой** половины
(\`<=\`, а не \`<\`), а левая половина по построению стояла раньше в исходном массиве.

В отличие от quick sort, merge sort даёт O(n log n) **гарантированно**, а не в среднем,
но требует O(n) дополнительной памяти. Именно поэтому в V8 для объектов используется
TimSort — гибрид merge sort и вставками.

База рекурсии возвращает копию (\`[...nums]\`), а не сам массив, — чтобы результат
не оказался ссылкой на исходный массив длины 1.`,
    hints: [
      'Разделяй и властвуй: делите массив пополам, сортируйте половины рекурсивно, затем сливайте.',
      'Шаг слияния — это задача «слить два отсортированных массива» двумя указателями. Сравнение через `<=` сделает сортировку стабильной.',
    ],
    tests: [
      { name: 'сортирует массив', code: `expect(mergeSort([5, 2, 9, 1, 5, 6])).toEqual([1, 2, 5, 5, 6, 9]);` },
      {
        name: 'пустой массив и один элемент',
        code: `expect(mergeSort([])).toEqual([]);
expect(mergeSort([1])).toEqual([1]);`,
      },
      {
        name: 'уже отсортированный и обратный',
        code: `expect(mergeSort([1, 2, 3])).toEqual([1, 2, 3]);
expect(mergeSort([3, 2, 1])).toEqual([1, 2, 3]);`,
      },
      {
        name: 'не мутирует исходный массив',
        code: `const source = [3, 1, 2];
mergeSort(source);
expect(source).toEqual([3, 1, 2]);`,
        hidden: true,
      },
      {
        name: 'отрицательные числа и дубликаты',
        code: `expect(mergeSort([0, -5, 3, -5, 1])).toEqual([-5, -5, 0, 1, 3]);`,
        hidden: true,
      },
      {
        name: 'большой массив',
        code: `const big = Array.from({ length: 5000 }, (_, i) => (i * 7919) % 5000);
const sorted = mergeSort(big);
expect(sorted).toHaveLength(5000);
expect(sorted.every((v, i) => i === 0 || sorted[i - 1] <= v)).toBe(true);`,
        hidden: true,
      },
    ],
  },
];
