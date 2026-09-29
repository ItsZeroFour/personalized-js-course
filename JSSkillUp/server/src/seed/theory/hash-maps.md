# Хеш-таблицы и частотные словари

## Главная идея

Хеш-таблица (`Map`, `Set`, объект) даёт поиск, вставку и удаление за **O(1) в среднем**.
Это самый частый способ превратить O(n²) в O(n): вместо повторного поиска по массиву —
запомнить увиденное и проверять за константу.

## Map против объекта

| | `Map` | `{}` |
| --- | --- | --- |
| ключи | любые значения, в том числе объекты | строки и символы (числа приводятся к строкам) |
| унаследованные ключи | нет | `constructor`, `toString`, `__proto__` |
| порядок | порядок вставки | сначала целочисленные ключи по возрастанию, затем строки |
| размер | `map.size` за O(1) | `Object.keys(obj).length` за O(n) |
| частые добавления/удаления | оптимизирован | хуже |

Для словарей с произвольными ключами — `Map`. Для записей с известной структурой
(DTO, конфиг) — объект.

## Two Sum и вариации

```js
function twoSum(nums, target) {
  const seen = new Map(); // значение → индекс
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return null;
}
```

Шаблон «**уже видели?**»: на каждом шаге проверяем, встречалось ли дополнение, и только
потом кладём текущий элемент (иначе элемент «найдёт» сам себя). O(n) времени, O(n) памяти.

Вариации: число пар с разностью k, подмассив с суммой k (через префиксные суммы в Map),
первый неповторяющийся символ.

## groupBy и countBy своими руками

```js
function groupBy(items, getKey) {
  const groups = {};
  for (const item of items) {
    const key = typeof getKey === 'function' ? getKey(item) : item[getKey];
    (groups[key] ??= []).push(item);
  }
  return groups;
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
```

Встроенные варианты: `Object.groupBy(items, fn)` и `Map.groupBy(items, fn)` (ES2024).
Но на интервью просят написать руками — и спросят, чем результат-объект отличается
от Map (ключ-объект, порядок, прототип: `Object.groupBy` возвращает объект с `null`-прототипом).

## Дедупликация по ключу

```js
// примитивы
const unique = [...new Set(items)];

// объекты по id, оставляя первое вхождение
function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

`Set` сравнивает по **SameValueZero**: `NaN` равен `NaN`, `+0` равен `-0`, объекты — по
ссылке. `items.filter((x, i) => items.indexOf(x) === i)` — O(n²) и теряет `NaN`.

## Пересечение и разность множеств

```js
const intersection = (a, b) => { const s = new Set(b); return a.filter((x) => s.has(x)); };
const difference = (a, b) => { const s = new Set(b); return a.filter((x) => !s.has(x)); };
```

В ES2025 у `Set` появились методы `intersection`, `union`, `difference`,
`symmetricDifference`, `isSubsetOf`.

## Кеширование через Map

```js
function memoize(fn, getKey = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  return function (...args) {
    const key = getKey(...args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

`JSON.stringify` как ключ — просто, но медленно на больших аргументах и неверно для
функций, `undefined`, Map. Для одного аргумента-объекта — `WeakMap` (не держит объект
в памяти). Неограниченный кеш — утечка; в проде нужен лимит (LRU: `Map` помнит порядок
вставки — удаляем первый ключ).

## Как это спрашивают

- «Two Sum» — самая частая задача; сначала O(n²), потом через Map.
- «Реализуйте groupBy / countBy / uniqueBy / memoize».
- «Почему Map, а не объект?»
- «Найдите первый неповторяющийся символ», «сгруппируйте анаграммы».
- «Какая сложность у операций Map? Всегда ли O(1)?» — в среднем; при коллизиях хуже,
  но на практике константа.
