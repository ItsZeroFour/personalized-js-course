# Массивы и строки

## Один проход вместо нескольких

Многие задачи решаются за **один проход** с парой переменных-аккумуляторов:

```js
function stats(numbers) {
  if (numbers.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const n of numbers) {
    if (n < min) min = n;
    if (n > max) max = n;
    sum += n;
  }
  return { min, max, avg: sum / numbers.length };
}
```

`Math.max(...numbers)` удобен, но на очень больших массивах падает с RangeError:
аргументы кладутся на стек. `reduce` — тоже один проход, но цикл читается проще,
когда аккумуляторов несколько.

## Развороты и палиндромы

```js
const reverse = (str) => [...str].reverse().join('');
```

`[...str]` делит по code points — эмодзи не ломаются (в отличие от `split('')`).

Палиндром без лишней памяти — два указателя:

```js
function isPalindrome(str) {
  const s = str.toLowerCase().replace(/[^a-zа-яё0-9]/g, '');
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}
```

## Анаграммы и частотные словари

Анаграммы — строки с одинаковым набором символов. Два подхода:

- отсортировать символы и сравнить — O(n log n);
- **посчитать частоты** — O(n):

```js
function isAnagram(a, b) {
  if (a.length !== b.length) return false;
  const counts = new Map();
  for (const ch of a) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of b) {
    const left = counts.get(ch);
    if (!left) return false;
    counts.set(ch, left - 1);
  }
  return true;
}
```

Группировка анаграмм: ключ группы — отсортированная строка (`[...word].sort().join('')`)
или «подпись» из частот.

## chunk, zip, range

```js
// [1..n] или [start, end) с шагом
const range = (start, end, step = 1) =>
  Array.from({ length: Math.max(0, Math.ceil((end - start) / step)) }, (_, i) => start + i * step);

// разбить на части по size
function chunk(items, size) {
  if (size <= 0) throw new RangeError('size должен быть > 0');
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

// склеить по индексам до длины самого короткого
const zip = (...arrays) =>
  Array.from({ length: Math.min(...arrays.map((a) => a.length)) }, (_, i) => arrays.map((a) => a[i]));
```

`Array.from({ length: n }, fn)` — идиоматичный способ создать массив из n элементов.
`new Array(n).map(fn)` **не работает**: массив «дырявый», и `map` пропускает дыры.

## Иммутабельные операции

Методы, **мутирующие** массив: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`,
`reverse`, `fill`, `copyWithin`. В React-состоянии и в функциях, принимающих чужие данные,
их применяют только к копии.

| Нужно | Мутирующий способ | Иммутабельный |
| --- | --- | --- |
| добавить в конец | `push` | `[...arr, x]` |
| удалить по индексу | `splice(i, 1)` | `arr.filter((_, j) => j !== i)` или `toSpliced(i, 1)` |
| заменить элемент | `arr[i] = x` | `arr.map(...)` или `arr.with(i, x)` |
| отсортировать | `sort` | `[...arr].sort()` или `toSorted()` |
| развернуть | `reverse` | `toReversed()` |

`toSorted`, `toReversed`, `toSpliced`, `with` — ES2023, есть во всех современных браузерах.

## Строки: частые ловушки

- Строки **неизменяемы**: `str[0] = 'X'` в нестрогом режиме молча игнорируется, в strict
  mode (модули, классы) — `TypeError`. Новая строка — `'X' + str.slice(1)`.
- `split(' ')` не учитывает несколько пробелов и табы — `trim().split(/\s+/)`.
- Сравнение строк с учётом языка — `localeCompare`, а не `<`: `'ё' < 'ж'` даёт неожиданный
  результат по кодам символов.
- Сборка большой строки в цикле: массив частей + `join` надёжнее `+=`.

## Как это спрашивают

- «Найдите min/max/среднее за один проход», «переверните слова в строке»,
  «проверьте палиндром», «являются ли строки анаграммами» — разминочные задачи.
- «Напишите chunk / zip / range / flatten» — утилиты руками.
- «Какие методы массива мутируют? Как отсортировать, не мутируя?»
- «Почему `new Array(3).map(() => 0)` не работает?»
