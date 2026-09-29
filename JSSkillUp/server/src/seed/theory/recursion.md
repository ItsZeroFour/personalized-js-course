# Рекурсия и backtracking

## База, шаг и стек

Рекурсивная функция вызывает саму себя. Обязательные части:

- **базовый случай** — когда остановиться и вернуть ответ без рекурсии;
- **рекурсивный шаг** — свести задачу к меньшей и **приблизиться** к базовому случаю.

```js
function sum(nums, i = 0) {
  if (i === nums.length) return 0;       // база
  return nums[i] + sum(nums, i + 1);     // шаг
}
```

Каждый вызов занимает **кадр стека** (аргументы, локальные переменные, адрес возврата).
Глубина ограничена — порядка 10 000 кадров в зависимости от движка и размера кадра.
Превышение — `RangeError: Maximum call stack size exceeded`.

**Хвостовой рекурсии в V8 нет**: TCO есть в спецификации ES2015, но реализована только
в Safari. Глубокую рекурсию (длинные списки, большие числа) переписывают на цикл или
явный стек. Рекурсия хороша для **деревьев** разумной глубины: DOM, JSON, меню,
комментарии.

## Обход вложенных структур

```js
function findById(node, id) {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}
```

Шаблон: обработать текущий узел, рекурсивно — детей, собрать результат.

## flatten

```js
function flatten(items, depth = Infinity) {
  const result = [];
  for (const item of items) {
    if (Array.isArray(item) && depth > 0) result.push(...flatten(item, depth - 1));
    else result.push(item);
  }
  return result;
}
```

Итеративная версия без риска переполнения стека — через явный стек:

```js
function flattenIterative(items) {
  const stack = [...items].reverse();
  const result = [];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);
    else result.push(item);
  }
  return result;
}
```

## deepClone с циклическими ссылками

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);        // цикл: вернуть уже созданную копию
  if (value instanceof Date) return new Date(value);
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    for (const [k, v] of value) copy.set(deepClone(k, seen), deepClone(v, seen));
    return copy;
  }
  const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);                               // до рекурсии — иначе цикл зациклит
  for (const key of Reflect.ownKeys(value)) copy[key] = deepClone(value[key], seen);
  return copy;
}
```

Детали, на которых ловят: запомнить копию **до** рекурсии, Date/Map/Set/RegExp,
символьные ключи. Встроенный `structuredClone` делает почти то же (без функций,
DOM-узлов и прототипов классов).

## Перестановки и подмножества (backtracking)

Backtracking — перебор с «откатом»: сделать выбор, рекурсивно продолжить, отменить выбор.

```js
function permutations(items) {
  const result = [];
  const current = [];
  const used = new Array(items.length).fill(false);

  function backtrack() {
    if (current.length === items.length) {
      result.push([...current]);          // копия! current дальше изменится
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(items[i]);             // выбор
      backtrack();                        // продолжение
      current.pop();                      // откат
      used[i] = false;
    }
  }

  backtrack();
  return result;
}

function subsets(items) {
  const result = [];
  (function go(start, current) {
    result.push([...current]);
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      go(i + 1, current);
      current.pop();
    }
  })(0, []);
  return result;
}
```

Сложность: перестановки — O(n · n!), подмножества — O(n · 2ⁿ). Это нормально: ответ
такого размера. На интервью важно проговорить и **отсечения** (не продолжать заведомо
плохие ветки).

## Рекурсия с мемоизацией против динамики

Наивный Фибоначчи — O(2ⁿ): одни и те же подзадачи считаются снова и снова.

```js
// сверху вниз: рекурсия + кеш — O(n)
function fib(n, memo = new Map()) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n);
  const value = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, value);
  return value;
}

// снизу вверх: динамическое программирование — O(n) времени, O(1) памяти
function fibIterative(n) {
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}
```

Признак для ДП: **перекрывающиеся подзадачи** + оптимальная подструктура (ответ собирается
из ответов подзадач). Мемоизация проще написать; «снизу вверх» — без риска переполнения стека.

## Как это спрашивают

- «Напишите flatten / deepClone / обход дерева» — классика, часто с вопросом
  «а без рекурсии?».
- «Сгенерируйте все перестановки / подмножества / комбинации скобок».
- «Почему упало с Maximum call stack size? Есть ли в JS оптимизация хвостовой рекурсии?»
- «Ускорьте рекурсивный Фибоначчи» — мемоизация, затем итерация.
