# Сравнение, мутабельность, копирование

## Значение и ссылка

Примитивы копируются по значению, объекты — по ссылке. В переменной с объектом
лежит не объект, а указатель на него.

```js
let a = { n: 1 };
let b = a;
b.n = 2;
a.n;        // 2 — одна и та же ячейка
a === b;    // true

let c = { n: 2 };
a === c;    // false — разные объекты, содержимое не сравнивается
```

Часто спрашивают «передаются ли аргументы по ссылке?». Аккуратный ответ:
JavaScript всегда передаёт **по значению**, но для объектов значением является ссылка.
Поэтому мутация поля видна снаружи, а переприсваивание — нет:

```js
function mutate(obj) {
  obj.n = 42;      // видно снаружи
}
function reassign(obj) {
  obj = { n: 42 }; // не видно: переписали локальную переменную
}
```

## Поверхностное копирование

```js
const original = { name: 'Аня', address: { city: 'Москва' } };

const copy1 = { ...original };
const copy2 = Object.assign({}, original);

copy1.name = 'Оля';            // оригинал цел
copy1.address.city = 'Питер';  // оригинал ИЗМЕНЁН — вложенный объект общий
original.address.city;          // 'Питер'
```

Для массивов то же самое: `[...arr]`, `arr.slice()`, `Array.from(arr)` — все поверхностные.

Нюансы spread: он копирует только **собственные перечисляемые** свойства,
не переносит прототип и превращает геттеры в обычные значения.

```js
const withGetter = { get now() { return Date.now(); } };
const copied = { ...withGetter };  // now — зафиксированное число, а не геттер
```

## Глубокое копирование

```js
structuredClone(value);
```

Штатный способ. Умеет `Date`, `Map`, `Set`, `RegExp`, `ArrayBuffer`, циклические ссылки.
Не умеет функции, `Symbol`, DOM-узлы, прототипы классов (получится обычный объект)
и приватные поля — на них бросает `DataCloneError`.

Старый трюк `JSON.parse(JSON.stringify(obj))` ломается на многом:

```js
JSON.parse(JSON.stringify({
  date: new Date(),       // станет строкой
  undef: undefined,       // ключ исчезнет
  fn() {},                // ключ исчезнет
  nan: NaN,               // станет null
  inf: Infinity,          // станет null
  map: new Map([[1, 2]]), // станет {}
}));
// циклическая ссылка → TypeError
```

Ручная реализация — частая задача на собеседовании:

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);          // циклические ссылки

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const result = new Map();
    seen.set(value, result);
    for (const [k, v] of value) result.set(deepClone(k, seen), deepClone(v, seen));
    return result;
  }
  if (value instanceof Set) {
    const result = new Set();
    seen.set(value, result);
    for (const v of value) result.add(deepClone(v, seen));
    return result;
  }

  const result = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, result);
  for (const key of Reflect.ownKeys(value)) {
    result[key] = deepClone(value[key], seen);
  }
  return result;
}
```

Что здесь проверяют: `WeakMap` для циклов (и почему именно Weak), обработка особых типов,
`Reflect.ownKeys` вместо `Object.keys` ради символов.

## Object.freeze и настоящая иммутабельность

```js
const config = Object.freeze({ url: '/api', nested: { retries: 3 } });

config.url = 'x';           // молча игнорируется (TypeError в strict mode)
config.nested.retries = 5;  // работает! freeze поверхностный
```

Глубокая заморозка — рекурсивно:

```js
function deepFreeze(obj) {
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') deepFreeze(value);
  }
  return Object.freeze(obj);
}
```

Соседи: `Object.seal` (нельзя добавлять и удалять свойства, менять можно),
`Object.preventExtensions` (нельзя только добавлять).

## Иммутабельные операции над массивами

Мутирующие методы: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`.
Именно они ломают React, если применить их к элементу состояния.

```js
// было
const sorted = items.sort((a, b) => a - b); // мутировал items!

// современные немутирующие аналоги (ES2023)
const sorted = items.toSorted((a, b) => a - b);
const reversed = items.toReversed();
const patched = items.with(0, 'новое');
const spliced = items.toSpliced(1, 2);

// классика
const added = [...items, newItem];
const removed = items.filter((item) => item.id !== id);
const updated = items.map((item) => (item.id === id ? { ...item, done: true } : item));
```

## Почему React требует новую ссылку

React сравнивает состояние и пропсы **поверхностно** (`Object.is`). Мутация не меняет
ссылку, поэтому изменения не видно:

```jsx
const [user, setUser] = useState({ name: 'Аня' });

user.name = 'Оля';
setUser(user);        // ререндера не будет: Object.is(prev, next) === true

setUser({ ...user, name: 'Оля' }); // правильно
```

То же самое ломает `React.memo`, `useMemo` и `useEffect` с зависимостью-объектом:
новый литерал на каждом рендере — новая ссылка — мемоизация бесполезна.

## Сравнение объектов

Встроенного глубокого сравнения в языке нет. Варианты:

```js
JSON.stringify(a) === JSON.stringify(b);  // зависит от порядка ключей, ломается на undefined
```

Ручная реализация:

```js
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
}
```

## Как это спрашивают

- «Передаются ли объекты по ссылке?» — формулировка «по значению, но значение это ссылка».
- «Чем поверхностное копирование отличается от глубокого?» — с примером вложенного объекта.
- «Как сделать глубокую копию?» — `structuredClone`, его ограничения, и реализация руками.
- «Почему `JSON.parse(JSON.stringify())` — плохая идея?» — перечислить, что теряется.
- «Почему не сработал `setState` после мутации?» — поверхностное сравнение по ссылке.
- «`Object.freeze` защищает вложенные объекты?» — нет.
