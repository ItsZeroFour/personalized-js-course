import type { SeedTask } from '../types.js';

/** Два указателя и sliding window: приёмы, которые превращают O(n²) в O(n). */
export const pointersWindowTasks: SeedTask[] = [
  {
    slug: 'move-zeroes',
    topic: 'two-pointers',
    title: 'Переместить нули в конец',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['два указателя', 'leetcode'],
    statementMd: `Реализуйте \`moveZeroes(nums)\`: переносит все нули в конец массива,
сохраняя относительный порядок остальных элементов.

Изменяйте массив **на месте** и верните его же.

\`\`\`js
moveZeroes([0, 1, 0, 3, 12]);  // [1, 3, 12, 0, 0]
moveZeroes([0, 0]);            // [0, 0]
\`\`\`

Постарайтесь обойтись одним проходом и O(1) дополнительной памяти.`,
    starterCode: `function moveZeroes(nums: number[]): number[] {
  // ваш код
  return nums;
}`,
    solutionCode: `function moveZeroes(nums: number[]): number[] {
  // insert — позиция, куда попадёт следующий ненулевой элемент.
  let insert = 0;

  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i] === 0) continue;
    if (i !== insert) {
      nums[insert] = nums[i]!;
      nums[i] = 0;
    }
    insert += 1;
  }

  return nums;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени и O(1) по памяти** — вся суть задачи в последнем.

Приём называется «медленный и быстрый указатель»: \`i\` бежит по всему массиву,
\`insert\` отмечает границу уже уплотнённой части.

Проверка \`i !== insert\` не обязательна для корректности, но избавляет от лишних
записей, когда нулей ещё не встречалось.

Решение через \`filter\` + \`concat\` тоже правильное, но это O(n) дополнительной памяти
и не «на месте» — интервьюер обычно просит именно in-place.`,
    hints: [
      'Заведите второй указатель — позицию, куда нужно положить следующий ненулевой элемент.',
      'Идите одним проходом: встретили ненулевой элемент — меняйте его местами с позицией `insert` и двигайте `insert` на единицу.',
    ],
    tests: [
      {
        name: 'переносит нули в конец',
        code: `expect(moveZeroes([0, 1, 0, 3, 12])).toEqual([1, 3, 12, 0, 0]);`,
      },
      {
        name: 'массив из одних нулей',
        code: `expect(moveZeroes([0, 0])).toEqual([0, 0]);`,
      },
      {
        name: 'нулей нет',
        code: `expect(moveZeroes([1, 2, 3])).toEqual([1, 2, 3]);`,
      },
      {
        name: 'изменяет массив на месте',
        code: `const source = [0, 1, 2];
const result = moveZeroes(source);
expect(result).toBe(source);
expect(source).toEqual([1, 2, 0]);`,
        hidden: true,
      },
      {
        name: 'пустой массив и отрицательные числа',
        code: `expect(moveZeroes([])).toEqual([]);
expect(moveZeroes([0, -1, 0, -2])).toEqual([-1, -2, 0, 0]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'remove-duplicates-sorted',
    topic: 'two-pointers',
    title: 'Удалить дубликаты из отсортированного массива',
    kind: 'algo',
    difficulty: 'easy',
    tags: ['два указателя', 'leetcode'],
    statementMd: `Дан **отсортированный** массив. Реализуйте \`removeDuplicates(nums)\`:
удаляет дубликаты на месте и возвращает новую длину.

Первые \`k\` элементов массива должны содержать уникальные значения в том же порядке.
Что лежит после позиции \`k\` — не важно.

\`\`\`js
const nums = [1, 1, 2, 2, 3];
removeDuplicates(nums); // 3, при этом nums начинается с [1, 2, 3]
\`\`\`

Дополнительную память использовать нельзя — в этом и задача.`,
    starterCode: `function removeDuplicates(nums: number[]): number {
  // ваш код
  return 0;
}`,
    solutionCode: `function removeDuplicates(nums: number[]): number {
  if (nums.length === 0) return 0;

  // insert указывает на позицию следующего уникального элемента.
  let insert = 1;

  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] === nums[i - 1]) continue;
    nums[insert] = nums[i]!;
    insert += 1;
  }

  return insert;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени, O(1) по памяти.**

Приём тот же, что в «переместить нули»: быстрый указатель \`i\` читает, медленный
\`insert\` пишет. Работает только потому, что массив отсортирован — одинаковые значения
идут подряд, и достаточно сравнить с предыдущим элементом.

Если бы массив не был отсортирован, понадобился бы \`Set\` — O(n) памяти.

Обратите внимание: возвращается длина, а не массив. Это типичная для LeetCode
формулировка, и на интервью стоит уточнить, что именно ждут.`,
    hints: [
      'Массив отсортирован, значит дубликаты идут подряд — достаточно сравнить элемент с предыдущим.',
      'Заведите указатель на позицию записи. Читаете быстрым указателем, а пишете только когда встретили новое значение.',
    ],
    tests: [
      {
        name: 'удаляет дубликаты',
        code: `const nums = [1, 1, 2, 2, 3];
const length = removeDuplicates(nums);
expect(length).toBe(3);
expect(nums.slice(0, length)).toEqual([1, 2, 3]);`,
      },
      {
        name: 'дубликатов нет',
        code: `const nums = [1, 2, 3];
expect(removeDuplicates(nums)).toBe(3);
expect(nums.slice(0, 3)).toEqual([1, 2, 3]);`,
      },
      {
        name: 'все элементы одинаковые',
        code: `const nums = [5, 5, 5, 5];
const length = removeDuplicates(nums);
expect(length).toBe(1);
expect(nums.slice(0, length)).toEqual([5]);`,
        hidden: true,
      },
      {
        name: 'пустой массив',
        code: `expect(removeDuplicates([])).toBe(0);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'two-sum-sorted',
    topic: 'two-pointers',
    title: 'Two Sum в отсортированном массиве',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['два указателя', 'leetcode'],
    statementMd: `Дан **отсортированный по возрастанию** массив. Найдите два числа с суммой \`target\`
и верните их индексы. Если пары нет — \`null\`.

\`\`\`js
twoSumSorted([2, 7, 11, 15], 9);   // [0, 1]
twoSumSorted([1, 2, 3, 4], 7);     // [2, 3]
twoSumSorted([1, 2], 100);         // null
\`\`\`

Массив отсортирован — используйте это и решите за **O(1) дополнительной памяти**,
в отличие от версии с хеш-мапой.`,
    starterCode: `function twoSumSorted(nums: number[], target: number): [number, number] | null {
  // ваш код
  return null;
}`,
    solutionCode: `function twoSumSorted(nums: number[], target: number): [number, number] | null {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const sum = nums[left]! + nums[right]!;

    if (sum === target) return [left, right];
    if (sum < target) left += 1;
    else right -= 1;
  }

  return null;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени и O(1) по памяти** — выигрыш по памяти
по сравнению с версией на хеш-мапе, которая тратит O(n).

Почему это работает: сумма крайних элементов — «максимально широкая» пара.
Если она меньше target, увеличить сумму можно только сдвигом левого указателя вправо;
если больше — уменьшить только сдвигом правого влево. Ни одна возможная пара при этом
не теряется.

Это и есть главный аргумент за встречные указатели: отсортированность даёт
дополнительную информацию, которой у хеш-мапы нет.`,
    hints: [
      'Поставьте указатели на первый и последний элементы. Сумма слишком мала — двигайте левый, слишком велика — правый.',
      'Докажите себе, что ни одна пара не теряется: если сумма меньше target, то текущий левый элемент не даст пары ни с чем левее правого указателя.',
    ],
    tests: [
      { name: 'пара в начале', code: `expect(twoSumSorted([2, 7, 11, 15], 9)).toEqual([0, 1]);` },
      { name: 'пара в конце', code: `expect(twoSumSorted([1, 2, 3, 4], 7)).toEqual([2, 3]);` },
      { name: 'пары нет', code: `expect(twoSumSorted([1, 2], 100)).toBe(null);` },
      {
        name: 'отрицательные числа',
        code: `expect(twoSumSorted([-5, -2, 0, 3], -2)).toEqual([0, 3]);`,
        hidden: true,
      },
      {
        name: 'массив короче двух элементов',
        code: `expect(twoSumSorted([], 0)).toBe(null);
expect(twoSumSorted([1], 1)).toBe(null);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'merge-sorted',
    topic: 'two-pointers',
    title: 'Слияние двух отсортированных массивов',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['два указателя', 'сортировка'],
    statementMd: `Реализуйте \`mergeSorted(a, b)\`: сливает два отсортированных по возрастанию
массива в один отсортированный.

\`\`\`js
mergeSorted([1, 3, 5], [2, 4, 6]);  // [1, 2, 3, 4, 5, 6]
mergeSorted([], [1, 2]);            // [1, 2]
mergeSorted([1, 1], [1]);           // [1, 1, 1]
\`\`\`

Решение \`[...a, ...b].sort()\` не принимается: оно O((n+m) log(n+m)) и не использует
того, что массивы уже отсортированы. Нужно O(n + m).`,
    starterCode: `function mergeSorted(a: number[], b: number[]): number[] {
  // ваш код
  return [];
}`,
    solutionCode: `function mergeSorted(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i]! <= b[j]!) {
      result.push(a[i]!);
      i += 1;
    } else {
      result.push(b[j]!);
      j += 1;
    }
  }

  // Один из массивов кончился — второй дописывается хвостом целиком.
  while (i < a.length) result.push(a[i++]!);
  while (j < b.length) result.push(b[j++]!);

  return result;
}`,
    solutionNotesMd: `Сложность: **O(n + m) по времени и памяти.**

Это шаг слияния из merge sort — на нём же строится сортировка за O(n log n).

Сравнение через \`<=\`, а не \`<\`, делает слияние **стабильным**: при равных значениях
первым берётся элемент из левого массива. Для чисел разницы не видно, а для объектов,
сортируемых по ключу, это принципиально.

Два хвостовых цикла проще, чем попытка обработать всё одним циклом с проверками
на выход за границу.`,
    hints: [
      'Два указателя, по одному на каждый массив. На каждом шаге берите меньший элемент и двигайте соответствующий указатель.',
      'Когда один массив закончился, остаток второго дописывается целиком — не забудьте эти два хвостовых цикла.',
    ],
    tests: [
      {
        name: 'чередующиеся элементы',
        code: `expect(mergeSorted([1, 3, 5], [2, 4, 6])).toEqual([1, 2, 3, 4, 5, 6]);`,
      },
      {
        name: 'один массив пустой',
        code: `expect(mergeSorted([], [1, 2])).toEqual([1, 2]);
expect(mergeSorted([1, 2], [])).toEqual([1, 2]);`,
      },
      { name: 'повторяющиеся значения', code: `expect(mergeSorted([1, 1], [1])).toEqual([1, 1, 1]);` },
      {
        name: 'массивы разной длины',
        code: `expect(mergeSorted([1], [2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
expect(mergeSorted([10, 20], [1])).toEqual([1, 10, 20]);`,
        hidden: true,
      },
      {
        name: 'оба пустые',
        code: `expect(mergeSorted([], [])).toEqual([]);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'max-subarray-sum-k',
    topic: 'sliding-window',
    title: 'Максимальная сумма подмассива длины k',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['sliding window'],
    statementMd: `Реализуйте \`maxSubarraySum(nums, k)\`: максимальная сумма подряд идущих \`k\` элементов.

\`\`\`js
maxSubarraySum([2, 1, 5, 1, 3, 2], 3);  // 9  (5 + 1 + 3)
maxSubarraySum([1, 2], 3);              // null — окно длиннее массива
\`\`\`

Решение «в лоб» — пересчитывать сумму каждого окна, O(n × k). Нужно O(n).`,
    starterCode: `function maxSubarraySum(nums: number[], k: number): number | null {
  // ваш код
  return null;
}`,
    solutionCode: `function maxSubarraySum(nums: number[], k: number): number | null {
  if (k < 1 || k > nums.length) return null;

  let windowSum = 0;
  for (let i = 0; i < k; i += 1) windowSum += nums[i]!;

  let best = windowSum;

  for (let i = k; i < nums.length; i += 1) {
    // Окно сдвигается: добавляем вошедший элемент, вычитаем вышедший.
    windowSum += nums[i]! - nums[i - k]!;
    if (windowSum > best) best = windowSum;
  }

  return best;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени, O(1) по памяти.**

Ключевая идея окна фиксированной длины: при сдвиге на одну позицию меняются ровно два
элемента — один входит, один выходит. Пересчитывать всю сумму не нужно.

Наивный вариант с двумя вложенными циклами — O(n × k). При n = 100 000 и k = 1000
это 10⁸ операций против 10⁵.

Инициализация \`best = windowSum\`, а не нулём, важна для массивов из отрицательных чисел.`,
    hints: [
      'Не пересчитывайте сумму окна заново на каждом шаге.',
      'При сдвиге окна вправо прибавьте вошедший элемент и вычтите вышедший: `sum += nums[i] - nums[i - k]`.',
    ],
    tests: [
      {
        name: 'находит максимальное окно',
        code: `expect(maxSubarraySum([2, 1, 5, 1, 3, 2], 3)).toBe(9);`,
      },
      {
        name: 'окно длиннее массива',
        code: `expect(maxSubarraySum([1, 2], 3)).toBe(null);`,
      },
      {
        name: 'окно равно длине массива',
        code: `expect(maxSubarraySum([1, 2, 3], 3)).toBe(6);`,
      },
      {
        name: 'отрицательные числа',
        code: `expect(maxSubarraySum([-3, -1, -2], 2)).toBe(-3);`,
        hidden: true,
      },
      {
        name: 'некорректный k',
        code: `expect(maxSubarraySum([1, 2, 3], 0)).toBe(null);
expect(maxSubarraySum([], 1)).toBe(null);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'longest-unique-substring',
    topic: 'sliding-window',
    title: 'Самая длинная подстрока без повторов',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['sliding window', 'хеш-мапа', 'leetcode'],
    statementMd: `Реализуйте \`longestUniqueSubstring(text)\`: длина самой длинной подстроки,
в которой все символы различны.

\`\`\`js
longestUniqueSubstring('abcabcbb');  // 3  ('abc')
longestUniqueSubstring('bbbbb');     // 1  ('b')
longestUniqueSubstring('pwwkew');    // 3  ('wke')
longestUniqueSubstring('');          // 0
\`\`\`

Это окно **переменной** длины: правая граница всегда движется вперёд, левая подтягивается,
когда окно становится некорректным.`,
    starterCode: `function longestUniqueSubstring(text: string): number {
  // ваш код
  return 0;
}`,
    solutionCode: `function longestUniqueSubstring(text: string): number {
  const lastIndex = new Map<string, number>();
  let left = 0;
  let best = 0;

  for (let right = 0; right < text.length; right += 1) {
    const char = text[right]!;
    const seenAt = lastIndex.get(char);

    // Двигаем левую границу только вперёд: старое вхождение могло быть вне окна.
    if (seenAt !== undefined && seenAt >= left) {
      left = seenAt + 1;
    }

    lastIndex.set(char, right);
    best = Math.max(best, right - left + 1);
  }

  return best;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени, O(k) по памяти** (k — размер алфавита).

Каждый символ обрабатывается ровно один раз: правая граница делает n шагов,
левая только увеличивается и суммарно тоже сдвигается не больше n раз.

Критическая деталь — условие \`seenAt >= left\`. Без него левая граница могла бы
**откатиться назад** на символ, который уже вышел из окна, и ответ был бы неверным.
Проверьте на строке \`'abba'\`: правильный ответ 2, без этой проверки получится 3.

Вариант с \`Set\` и вложенным while тоже даёт O(n), но с \`Map\` левая граница
перепрыгивает сразу, без цикла.`,
    hints: [
      'Окно переменной длины: правая граница идёт вперёд всегда, левая подтягивается при конфликте.',
      'Храните в `Map` последний индекс каждого символа. При повторе сдвигайте левую границу за него — но **только вперёд**: проверьте на строке `abba`, что граница не откатывается назад.',
    ],
    tests: [
      { name: 'abcabcbb', code: `expect(longestUniqueSubstring('abcabcbb')).toBe(3);` },
      { name: 'все символы одинаковые', code: `expect(longestUniqueSubstring('bbbbb')).toBe(1);` },
      { name: 'pwwkew', code: `expect(longestUniqueSubstring('pwwkew')).toBe(3);` },
      {
        name: 'левая граница не откатывается назад',
        code: `expect(longestUniqueSubstring('abba')).toBe(2);`,
        hidden: true,
      },
      {
        name: 'пустая строка и все уникальные',
        code: `expect(longestUniqueSubstring('')).toBe(0);
expect(longestUniqueSubstring('abcdef')).toBe(6);`,
        hidden: true,
      },
    ],
  },

  {
    slug: 'min-subarray-len',
    topic: 'sliding-window',
    title: 'Минимальная длина подмассива с суммой ≥ target',
    kind: 'algo',
    difficulty: 'medium',
    tags: ['sliding window', 'leetcode'],
    statementMd: `Дан массив **положительных** чисел. Реализуйте \`minSubarrayLen(nums, target)\`:
минимальная длина подряд идущих элементов с суммой не меньше \`target\`.
Если такого подмассива нет — верните 0.

\`\`\`js
minSubarrayLen([2, 3, 1, 2, 4, 3], 7);  // 2   ([4, 3])
minSubarrayLen([1, 1, 1], 10);          // 0
\`\`\``,
    starterCode: `function minSubarrayLen(nums: number[], target: number): number {
  // ваш код
  return 0;
}`,
    solutionCode: `function minSubarrayLen(nums: number[], target: number): number {
  let left = 0;
  let sum = 0;
  let best = Infinity;

  for (let right = 0; right < nums.length; right += 1) {
    sum += nums[right]!;

    // Как только окно стало достаточным, сжимаем его слева до предела.
    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left]!;
      left += 1;
    }
  }

  return best === Infinity ? 0 : best;
}`,
    solutionNotesMd: `Сложность: **O(n) по времени, O(1) по памяти.**

Вложенный \`while\` не делает алгоритм квадратичным: левая граница только растёт
и суммарно проходит не больше n шагов. Это стандартный аргумент, который стоит
проговорить на интервью — иначе интервьюер решит, что вы не заметили вложенный цикл.

Условие «все числа положительные» существенно: при отрицательных числах сжатие окна
слева перестаёт быть корректным, потому что сумма может снова вырасти.
Для таких входов нужны префиксные суммы.

\`Infinity\` как начальное значение избавляет от отдельного флага «нашли или нет».`,
    hints: [
      'Расширяйте окно вправо, пока сумма меньше target. Как только достигли — попробуйте сжать слева.',
      'Вложенный while не ломает O(n): левая граница только увеличивается и суммарно проходит не больше n шагов. Начальное значение ответа удобно взять `Infinity`.',
    ],
    tests: [
      { name: 'находит минимальное окно', code: `expect(minSubarrayLen([2, 3, 1, 2, 4, 3], 7)).toBe(2);` },
      { name: 'подмассива нет', code: `expect(minSubarrayLen([1, 1, 1], 10)).toBe(0);` },
      { name: 'подходит один элемент', code: `expect(minSubarrayLen([1, 4, 4], 4)).toBe(1);` },
      {
        name: 'нужен весь массив',
        code: `expect(minSubarrayLen([1, 2, 3], 6)).toBe(3);`,
        hidden: true,
      },
      {
        name: 'пустой массив',
        code: `expect(minSubarrayLen([], 1)).toBe(0);`,
        hidden: true,
      },
    ],
  },
];
