# Прототипы и наследование

## Два разных понятия с похожими именами

Это главная путаница темы, и её проверяют почти всегда.

- **`[[Prototype]]`** — внутренний слот, который есть у **каждого объекта**. Ссылка на объект,
  у которого будут искаться свойства, если их нет у самого объекта. Читается через
  `Object.getPrototypeOf(obj)` (легаси-доступ — `obj.__proto__`).
- **`prototype`** — обычное свойство, которое есть **только у функций** (кроме стрелочных).
  Это объект, который станет `[[Prototype]]` для экземпляров, созданных через `new`.

```js
function User(name) {
  this.name = name;
}
const user = new User('Аня');

Object.getPrototypeOf(user) === User.prototype; // true
User.prototype.constructor === User;            // true
user.__proto__ === User.prototype;              // true, но так писать не стоит
```

## Как ищется свойство

Обращение `obj.prop` запускает `[[Get]]`:

1. есть ли собственное свойство у `obj` — вернуть;
2. нет — перейти по `[[Prototype]]` и повторить;
3. дошли до `null` — вернуть `undefined`.

```js
const animal = { eats: true };
const rabbit = Object.create(animal);
rabbit.jumps = true;

rabbit.eats;                            // true — нашлось в animal
rabbit.hasOwnProperty('eats');          // false
Object.hasOwn(rabbit, 'eats');          // false — современный способ
'eats' in rabbit;                       // true — in смотрит всю цепочку
```

Стандартная цепочка объекта: `obj → Object.prototype → null`.
Стандартная цепочка массива: `arr → Array.prototype → Object.prototype → null`.

## Запись работает иначе, чем чтение

Присваивание **не** идёт по цепочке (кроме случая с сеттером):

```js
const animal = { eats: true };
const rabbit = Object.create(animal);

rabbit.eats = false;     // создаёт СОБСТВЕННОЕ свойство, animal не трогает
animal.eats;             // true
```

Это называется shadowing — своё свойство перекрывает прототипное.

## Object.create и наследование без классов

```js
const animalMethods = {
  eat() {
    return `${this.name} ест`;
  },
};

function createAnimal(name) {
  const animal = Object.create(animalMethods);
  animal.name = name;
  return animal;
}
```

`Object.create(null)` создаёт объект **без прототипа** — «чистый словарь» без
`toString`, `hasOwnProperty` и риска коллизии с `__proto__`. Полезно для мап,
ключи которых приходят извне.

## Функции-конструкторы и new

```js
function User(name) {
  this.name = name;
}
User.prototype.greet = function () {
  return `Привет, ${this.name}`;
};
```

Что делает `new User('Аня')`:

1. создаёт пустой объект;
2. ставит ему `[[Prototype]] = User.prototype`;
3. вызывает `User` с этим объектом как `this`;
4. возвращает объект, если функция не вернула **другой объект** явно.

```js
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);
  return typeof result === 'object' && result !== null ? result : obj;
}
```

## Почему методы кладут в prototype

```js
function A(name) {
  this.name = name;
  this.greet = function () {};  // новая функция на каждый экземпляр
}

function B(name) {
  this.name = name;
}
B.prototype.greet = function () {}; // одна функция на всех
```

Миллион экземпляров `A` — миллион функций в памяти. У `B` — одна.
Это же объясняет, почему модульный паттерн на замыканиях дороже классов по памяти.

## instanceof

```js
user instanceof User;
```

Проверяет, встречается ли `User.prototype` в цепочке прототипов `user`.
Отсюда два следствия: `instanceof` ломается между realm (iframe, worker) и его поведение
можно переопределить через `Symbol.hasInstance`.

## Наследование цепочкой

Через классы (см. следующую тему) или руками:

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.eat = function () {
  return `${this.name} ест`;
};

function Dog(name, breed) {
  Animal.call(this, name);   // «super» для свойств
  this.breed = breed;
}
Dog.prototype = Object.create(Animal.prototype); // «super» для методов
Dog.prototype.constructor = Dog;                 // иначе constructor будет Animal
Dog.prototype.bark = function () {
  return 'Гав';
};
```

Здесь важны обе строки после `Object.create`: без восстановления `constructor` объект
будет врать про свой конструктор.

## Изменение прототипа на лету

```js
Object.setPrototypeOf(obj, proto); // работает, но убивает оптимизации движка
```

Менять `[[Prototype]]` существующего объекта — плохая практика: V8 деоптимизирует
скрытые классы (hidden classes) и код становится существенно медленнее. Правильный
способ задать прототип — сделать это при создании (`Object.create`, `new`, литерал `__proto__`).

## Как это спрашивают

- «Чем `prototype` отличается от `__proto__`?» — свойство функции против внутреннего
  слота объекта.
- «Как работает поиск свойства?» — по цепочке, до `null`.
- «Что делает `new`?» — четыре шага, лучше с реализацией `myNew`.
- «Почему методы объявляют в прототипе?» — память и переиспользование.
- «Как проверить, что свойство собственное?» — `Object.hasOwn`, а не `in`.
- «Что такое prototype pollution?» — запись в `Object.prototype` через `__proto__`
  из недоверенных данных: один изменённый прототип отравляет все объекты приложения.
