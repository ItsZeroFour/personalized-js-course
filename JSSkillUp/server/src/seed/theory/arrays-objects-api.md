# Методы массивов и объектов

## reduce: то, что спрашивают чаще всего

```js
array.reduce(callback(accumulator, current, index, array), initialValue);
```

Ключевые детали:

- без `initialValue` аккумулятором становится **первый элемент**, а обход начинается
  со второго;
- `reduce` на пустом массиве без начального значения бросает `TypeError`;
- колбэк **обязан вернуть** аккумулятор — забытый `return` даёт `undefined` на следующем шаге.

```js
[].reduce((a, b) => a + b);      // TypeError: Reduce of empty array with no initial value
[].reduce((a, b) => a + b, 0);   // 0
```

Типичные применения:

```js
const sum = nums.reduce((acc, n) => acc + n, 0);

const byId = users.reduce((acc, user) => {
  acc[user.id] = user;
  return acc;
}, {});

const grouped = users.reduce((acc, user) => {
  (acc[user.role] ??= []).push(user);
  return acc;
}, {});

// reduce как замена map + filter за один проход
const names = users.reduce((acc, user) => {
  if (user.active) acc.push(user.name);
  return acc;
}, []);
```

Антипаттерн, который стоит уметь критиковать на собеседовании:

```js
// O(n²) по памяти и времени: на каждом шаге создаётся новый объект
users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});
```

Современная замена группировки — `Object.groupBy` и `Map.groupBy` (ES2024):

```js
Object.groupBy(users, (user) => user.role);
```

## Мутирующие и немутирующие методы

| Мутирует | Не мутирует |
| --- | --- |
| `push`, `pop`, `shift`, `unshift` | `concat`, spread |
| `splice` | `slice`, `toSpliced` |
| `sort` | `toSorted` |
| `reverse` | `toReversed` |
| `fill`, `copyWithin` | `with` |

Мутирующие методы возвращают не то, что обычно ждут:

```js
const arr = [3, 1, 2];
const a = arr.push(4);        // 4 — новая длина, а не массив
const b = arr.sort();         // ссылка на ТОТ ЖЕ массив, уже отсортированный
```

Именно поэтому `items.sort()` в React-компоненте молча портит состояние.

## sort: компаратор обязателен

Без компаратора элементы приводятся к строкам:

```js
[10, 9, 1].sort();                 // [1, 10, 9]
[10, 9, 1].sort((a, b) => a - b);  // [1, 9, 10]
```

Компаратор возвращает отрицательное число, ноль или положительное. Сортировка
в современных движках **стабильная** (гарантировано спецификацией с ES2019):
равные элементы сохраняют относительный порядок. Это позволяет сортировать
по нескольким полям последовательно.

```js
const byName = (a, b) => a.name.localeCompare(b.name, 'ru'); // корректно для кириллицы
```

## Пропуски в разреженных массивах

```js
const sparse = [1, , 3];
sparse.map((x) => x * 2);      // [2, <пусто>, 6] — колбэк для дырки не вызывается
sparse.forEach((x) => {});      // дырка пропущена
Array.from(sparse);             // [1, undefined, 3] — дырки становятся undefined
new Array(3).fill(0);           // [0, 0, 0] — правильный способ создать заполненный массив
Array.from({ length: 3 }, (_, i) => i); // [0, 1, 2]
```

## Поиск и проверки

```js
arr.find((x) => x.id === 1);       // сам элемент или undefined
arr.findIndex((x) => x.id === 1);  // индекс или -1
arr.findLast(...), arr.findLastIndex(...);
arr.includes(NaN);                 // true — в отличие от indexOf
arr.indexOf(NaN);                  // -1: indexOf использует ===
arr.some((x) => x > 5);
arr.every((x) => x > 5);           // на пустом массиве всегда true
arr.at(-1);                        // последний элемент
```

## flat и flatMap

```js
[1, [2, [3, [4]]]].flat();          // [1, 2, [3, [4]]] — глубина 1 по умолчанию
[1, [2, [3, [4]]]].flat(Infinity);  // [1, 2, 3, 4]

sentences.flatMap((s) => s.split(' ')); // map + flat(1) за один проход
```

Flatten руками — частая задача:

```js
function flatten(arr, depth = 1) {
  return depth < 1
    ? arr.slice()
    : arr.reduce((acc, item) => acc.concat(Array.isArray(item) ? flatten(item, depth - 1) : item), []);
}
```

## Объекты: обход и преобразование

```js
Object.keys(obj);      // собственные перечисляемые строковые ключи
Object.values(obj);
Object.entries(obj);   // [[key, value], ...]
Object.fromEntries(pairs);

Object.getOwnPropertyNames(obj); // включая неперечисляемые
Object.getOwnPropertySymbols(obj);
Reflect.ownKeys(obj);            // всё сразу
```

Связка entries → fromEntries закрывает большинство задач:

```js
const upper = Object.fromEntries(
  Object.entries(obj).map(([key, value]) => [key.toUpperCase(), value]),
);

const filtered = Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value != null),
);
```

## Порядок ключей

Спецификация фиксирует порядок для `Object.keys`:

1. целочисленные индексы по возрастанию;
2. остальные строковые ключи в порядке добавления;
3. символы в порядке добавления.

```js
Object.keys({ b: 1, 2: 2, a: 3, 1: 4 }); // ['1', '2', 'b', 'a']
```

Отсюда правило: если нужен предсказуемый порядок с числовыми ключами — берите `Map`.

## Опциональная цепочка и присваивания

```js
user?.address?.city;
user?.getName?.();
arr?.[0];

obj.count ??= 0;   // присвоить, только если null/undefined
obj.flag ||= true;
obj.value &&= next;
```

## Как это спрашивают

- «Как работает `reduce`?» — сигнатура, поведение без начального значения, пустой массив.
- «Реализуйте `map`/`filter`/`reduce` через `reduce`» или «через цикл».
- «Какие методы мутируют массив?» — и почему это важно для React.
- «Почему `[10, 9, 1].sort()` даёт `[1, 10, 9]`?»
- «Как сгруппировать массив объектов по полю?» — `reduce` или `Object.groupBy`.
- «Чем `Object.keys` отличается от `for...in`?» — собственные против унаследованных.
- «Как перевернуть объект ключ-значение?» — `entries` + `map` + `fromEntries`.
