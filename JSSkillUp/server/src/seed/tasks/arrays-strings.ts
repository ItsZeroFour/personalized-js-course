import type { SeedTask } from '../types.js';

/** Базовые манипуляции массивами и строками: первое, что просят написать у доски. */
export const arraysStringsTasks: SeedTask[] = [
  {
    slug: 'chunk',
    topic: 'arrays-strings',
    title: 'chunk — разбить массив на группы',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['массивы'],
    statementMd: `Реализуйте \`chunk(items, size)\`: разбивает массив на подмассивы длины \`size\`.
Последняя группа может быть короче.

\`\`\`js
chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
chunk([], 3);              // []
\`\`\`

Если \`size\` меньше единицы — бросьте \`Error\`.

Исходный массив менять нельзя.`,
    starterCode: `function chunk<T>(items: T[], size: number): T[][] {
  // ваш код
  return [];
}`,
    solutionCode: `function chunk<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('size должен быть целым числом больше нуля');
  }

  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}`,
    solutionNotesMd: `Сложность: O(n) по времени и O(n) по памяти.

Шаг цикла — \`size\`, а не 1: так не нужен счётчик текущей группы.
\`slice\` сам обрезает выход за границу массива, поэтому хвост короче обрабатывается
без отдельной ветки.`,
    hints: [
      'Идите по массиву шагом `size`, а не по одному элементу.',
      '`slice(i, i + size)` не выходит за границы массива и сам вернёт короткий хвост — отдельная обработка последней группы не нужна.',
    ],
    tests: [
      {
        name: 'разбивает нацело',
        code: `expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);`,
      },
      {
        name: 'последняя группа короче',
        code: `expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);`,
      },
      {
        name: 'пустой массив',
        code: `expect(chunk([], 3)).toEqual([]);`,
      },
      {
        name: 'size больше длины',
        code: `expect(chunk([1, 2], 10)).toEqual([[1, 2]]);`,
        hidden: true,
      },
      {
        name: 'не мутирует исходный массив',
        code: `const source = [1, 2, 3];
chunk(source, 2);
expect(source).toEqual([1, 2, 3]);`,
        hidden: true,
      },
      {
        name: 'бросает ошибку на некорректном size',
        code: `expect(() => chunk([1, 2], 0)).toThrow();
expect(() => chunk([1, 2], -1)).toThrow();`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'range',
    topic: 'arrays-strings',
    title: 'range — последовательность чисел',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['массивы'],
    statementMd: `Реализуйте \`range(start, end, step)\`: массив чисел от \`start\` (включительно)
до \`end\` (не включая) с шагом \`step\`.

\`\`\`js
range(0, 5);        // [0, 1, 2, 3, 4]
range(1, 10, 3);    // [1, 4, 7]
range(5, 0, -1);    // [5, 4, 3, 2, 1]
range(0, 0);        // []
\`\`\`

По умолчанию \`step === 1\`. Если шаг равен нулю или направлен не в ту сторону — верните
пустой массив, а не зациклитесь.`,
    starterCode: `function range(start: number, end: number, step = 1): number[] {
  // ваш код
  return [];
}`,
    solutionCode: `function range(start: number, end: number, step = 1): number[] {
  if (step === 0) return [];

  const result: number[] = [];
  if (step > 0) {
    for (let value = start; value < end; value += step) result.push(value);
  } else {
    for (let value = start; value > end; value += step) result.push(value);
  }
  return result;
}`,
    solutionNotesMd: `Сложность: O(n), где n — количество получившихся элементов.

Главная ловушка — бесконечный цикл при \`step === 0\` или при шаге, направленном
против интервала. Поэтому знак шага проверяется до цикла, а условие продолжения
для отрицательного шага противоположное.`,
    hints: [
      'Разберите два случая: положительный и отрицательный шаг — у них противоположные условия продолжения цикла.',
      'Отдельно обработайте `step === 0`, иначе цикл никогда не завершится.',
    ],
    tests: [
      { name: 'по умолчанию шаг 1', code: `expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);` },
      { name: 'произвольный шаг', code: `expect(range(1, 10, 3)).toEqual([1, 4, 7]);` },
      { name: 'отрицательный шаг', code: `expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);` },
      {
        name: 'пустой результат',
        code: `expect(range(0, 0)).toEqual([]);
expect(range(5, 0)).toEqual([]);`,
        hidden: true,
      },
      {
        name: 'нулевой шаг не зацикливается',
        code: `expect(range(0, 5, 0)).toEqual([]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'is-palindrome',
    topic: 'arrays-strings',
    title: 'Палиндром без учёта регистра и знаков',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['строки', 'два указателя'],
    statementMd: `Реализуйте \`isPalindrome(text)\`: читается ли строка одинаково в обе стороны.

Учитываются только буквы и цифры, регистр игнорируется.

\`\`\`js
isPalindrome('А роза упала на лапу Азора'); // true
isPalindrome('Was it a car or a cat I saw?'); // true
isPalindrome('привет'); // false
isPalindrome(''); // true
\`\`\`

Постарайтесь обойтись без создания перевёрнутой копии строки.`,
    starterCode: `function isPalindrome(text: string): boolean {
  // ваш код
  return false;
}`,
    solutionCode: `function isPalindrome(text: string): boolean {
  const isAlphanumeric = (char: string): boolean => /[\\p{L}\\p{N}]/u.test(char);

  let left = 0;
  let right = text.length - 1;

  while (left < right) {
    while (left < right && !isAlphanumeric(text[left]!)) left += 1;
    while (left < right && !isAlphanumeric(text[right]!)) right -= 1;

    if (text[left]!.toLowerCase() !== text[right]!.toLowerCase()) return false;

    left += 1;
    right -= 1;
  }

  return true;
}`,
    solutionNotesMd: `Сложность: O(n) по времени и **O(1) по памяти** — в этом весь смысл двух указателей.

Вариант «в лоб» — очистить строку и сравнить с \`[...clean].reverse().join('')\` — тоже O(n),
но создаёт две дополнительные строки. На интервью стоит проговорить оба варианта
и объяснить разницу по памяти.

\`\\p{L}\` и \`\\p{N}\` с флагом \`u\` — юникодные категории «буква» и «цифра»,
поэтому кириллица обрабатывается корректно, в отличие от \`[a-z0-9]\`.`,
    hints: [
      'Два указателя: один с начала, второй с конца, двигайте их навстречу.',
      'Перед сравнением сдвигайте указатели через символы, которые не являются буквами или цифрами. Для кириллицы используйте `/[\\p{L}\\p{N}]/u`, а не `[a-z0-9]`.',
    ],
    tests: [
      {
        name: 'палиндром на русском',
        code: `expect(isPalindrome('А роза упала на лапу Азора')).toBe(true);`,
      },
      {
        name: 'палиндром со знаками препинания',
        code: `expect(isPalindrome('Was it a car or a cat I saw?')).toBe(true);`,
      },
      { name: 'не палиндром', code: `expect(isPalindrome('привет')).toBe(false);` },
      {
        name: 'пустая строка и один символ',
        code: `expect(isPalindrome('')).toBe(true);
expect(isPalindrome('a')).toBe(true);`,
        hidden: true,
      },
      {
        name: 'цифры учитываются',
        code: `expect(isPalindrome('12321')).toBe(true);
expect(isPalindrome('12345')).toBe(false);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'reverse-words',
    topic: 'arrays-strings',
    title: 'Перевернуть порядок слов',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['строки'],
    statementMd: `Реализуйте \`reverseWords(text)\`: переворачивает порядок слов в строке.

Лишние пробелы в начале, в конце и между словами должны схлопнуться в один.

\`\`\`js
reverseWords('  привет   большой  мир ');  // 'мир большой привет'
reverseWords('одно');                       // 'одно'
reverseWords('   ');                        // ''
\`\`\``,
    starterCode: `function reverseWords(text: string): string {
  // ваш код
  return '';
}`,
    solutionCode: `function reverseWords(text: string): string {
  return text
    .split(/\\s+/)
    .filter((word) => word.length > 0)
    .reverse()
    .join(' ');
}`,
    solutionNotesMd: `Сложность: O(n) по времени и памяти.

\`split(/\\s+/)\` схлопывает подряд идущие пробелы, но даёт пустую строку в начале,
если строка начиналась с пробела, — поэтому нужен \`filter\`. Альтернатива — сначала
\`trim()\`, тогда \`filter\` не нужен.

\`reverse\` мутирует массив, но здесь это безопасно: массив только что создан \`split\`.`,
    hints: [
      'Разбейте строку по пробельным символам, переверните массив и склейте обратно.',
      '`split(/\\s+/)` даст пустую строку в начале, если строка начиналась с пробела. Либо отфильтруйте пустые, либо сделайте `trim()` до разбиения.',
    ],
    tests: [
      {
        name: 'лишние пробелы схлопываются',
        code: `expect(reverseWords('  привет   большой  мир ')).toBe('мир большой привет');`,
      },
      { name: 'одно слово', code: `expect(reverseWords('одно')).toBe('одно');` },
      {
        name: 'только пробелы',
        code: `expect(reverseWords('   ')).toBe('');
expect(reverseWords('')).toBe('');`,
        hidden: true,
      },
      {
        name: 'табы и переводы строк',
        code: `expect(reverseWords('a\\tb\\nc')).toBe('c b a');`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'zip',
    topic: 'arrays-strings',
    title: 'zip — склеить массивы попарно',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['массивы'],
    statementMd: `Реализуйте \`zip(...arrays)\`: объединяет массивы поэлементно.

Длина результата равна длине **самого длинного** массива, недостающие элементы — \`undefined\`.

\`\`\`js
zip([1, 2, 3], ['a', 'b', 'c']);  // [[1, 'a'], [2, 'b'], [3, 'c']]
zip([1, 2], ['a']);               // [[1, 'a'], [2, undefined]]
zip();                            // []
\`\`\``,
    starterCode: `function zip(...arrays: unknown[][]): unknown[][] {
  // ваш код
  return [];
}`,
    solutionCode: `function zip(...arrays: unknown[][]): unknown[][] {
  if (arrays.length === 0) return [];

  const length = Math.max(...arrays.map((array) => array.length));

  return Array.from({ length }, (_, index) => arrays.map((array) => array[index]));
}`,
    solutionNotesMd: `Сложность: O(n × m), где n — длина самого длинного массива, m — количество массивов.

\`Math.max(...[])\` возвращает \`-Infinity\`, поэтому пустой список массивов нужно отсечь
отдельно — иначе \`Array.from({ length: -Infinity })\` бросит \`RangeError\`.

\`Array.from({ length }, fn)\` создаёт **заполненный** массив: \`new Array(n).map(fn)\`
не сработал бы, потому что \`map\` пропускает дырки разреженного массива.`,
    hints: [
      'Длина результата — максимум из длин входных массивов.',
      'Осторожно с пустым списком аргументов: `Math.max(...[])` даёт `-Infinity`. И помните, что `new Array(n).map(...)` не работает — нужен `Array.from({ length: n }, ...)`.',
    ],
    tests: [
      {
        name: 'массивы одинаковой длины',
        code: `expect(zip([1, 2, 3], ['a', 'b', 'c'])).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);`,
      },
      {
        name: 'разная длина дополняется undefined',
        code: `expect(zip([1, 2], ['a'])).toEqual([[1, 'a'], [2, undefined]]);`,
      },
      {
        name: 'три массива',
        code: `expect(zip([1], ['a'], [true])).toEqual([[1, 'a', true]]);`,
      },
      {
        name: 'без аргументов',
        code: `expect(zip()).toEqual([]);`,
        hidden: true,
      },
      {
        name: 'результат заполнен, а не разрежен',
        code: `const result = zip([1, 2]);
expect(result).toHaveLength(2);
expect(Object.keys(result)).toEqual(['0', '1']);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'rotate-array',
    topic: 'arrays-strings',
    title: 'Циклический сдвиг массива',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['массивы'],
    statementMd: `Реализуйте \`rotate(items, k)\`: циклически сдвигает элементы вправо на \`k\` позиций.

\`\`\`js
rotate([1, 2, 3, 4, 5], 2);   // [4, 5, 1, 2, 3]
rotate([1, 2, 3], -1);        // [2, 3, 1]   — отрицательный k сдвигает влево
rotate([1, 2, 3], 5);         // [2, 3, 1]   — k больше длины
\`\`\`

Возвращайте **новый** массив, исходный не меняйте.`,
    starterCode: `function rotate<T>(items: T[], k: number): T[] {
  // ваш код
  return [];
}`,
    solutionCode: `function rotate<T>(items: T[], k: number): T[] {
  if (items.length === 0) return [];

  // Приводим сдвиг к диапазону [0, length): остаток в JS может быть отрицательным.
  const shift = ((k % items.length) + items.length) % items.length;
  if (shift === 0) return items.slice();

  return [...items.slice(-shift), ...items.slice(0, -shift)];
}`,
    solutionNotesMd: `Сложность: O(n) по времени и памяти.

Две ловушки:

1. \`k\` может быть больше длины — берём остаток.
2. Остаток от деления в JS сохраняет знак делимого: \`-1 % 3 === -1\`. Формула
   \`((k % n) + n) % n\` приводит результат к неотрицательному диапазону.

Отдельная ветка для \`shift === 0\` нужна потому, что \`slice(-0)\` — это \`slice(0)\`,
то есть весь массив, и результат был бы задублирован.`,
    hints: [
      'Сначала приведите `k` к диапазону от 0 до длины массива через остаток от деления.',
      'Остаток в JS может быть отрицательным: `-1 % 3 === -1`. Используйте `((k % n) + n) % n`. И проверьте случай нулевого сдвига отдельно — `slice(-0)` ведёт себя как `slice(0)`.',
    ],
    tests: [
      { name: 'сдвиг вправо', code: `expect(rotate([1, 2, 3, 4, 5], 2)).toEqual([4, 5, 1, 2, 3]);` },
      { name: 'отрицательный сдвиг', code: `expect(rotate([1, 2, 3], -1)).toEqual([2, 3, 1]);` },
      { name: 'сдвиг больше длины', code: `expect(rotate([1, 2, 3], 5)).toEqual([2, 3, 1]);` },
      {
        name: 'нулевой сдвиг и кратный длине',
        code: `expect(rotate([1, 2, 3], 0)).toEqual([1, 2, 3]);
expect(rotate([1, 2, 3], 3)).toEqual([1, 2, 3]);`,
        hidden: true,
      },
      {
        name: 'пустой массив и отсутствие мутации',
        code: `expect(rotate([], 2)).toEqual([]);
const source = [1, 2, 3];
rotate(source, 1);
expect(source).toEqual([1, 2, 3]);`,
        hidden: true,
      },
    ],
  },
];
