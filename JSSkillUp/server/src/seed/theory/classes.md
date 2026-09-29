# Классы, приватные поля, static

## Сахар, но не совсем

`class` — синтаксический сахар над прототипным наследованием, но с добавленными правилами,
которых у функций-конструкторов нет:

- тело класса всегда исполняется в **strict mode**;
- класс **не поднимается** как function declaration — он в TDZ до объявления;
- вызов без `new` — `TypeError`;
- методы класса не перечисляются (`enumerable: false`), в отличие от присваивания
  в `prototype` вручную;
- методы нельзя вызвать через `new`.

```js
class User {
  constructor(name) {
    this.name = name;
  }
  greet() {
    return `Привет, ${this.name}`;
  }
}

typeof User;                                   // 'function'
Object.getOwnPropertyNames(User.prototype);    // ['constructor', 'greet']
Object.keys(User.prototype);                   // [] — методы не enumerable
User('Аня');                                   // TypeError: cannot be invoked without 'new'
```

## Поля класса: где они живут

```js
class Widget {
  instanceField = 'на экземпляре';   // создаётся в конструкторе, лежит на объекте
  method() {}                        // лежит в Widget.prototype
  arrow = () => {};                  // тоже на экземпляре, новая функция на каждый объект
}
```

Разница важна для производительности и для `this`: поле-стрелка привязано к экземпляру
(см. тему про `this`), обычный метод — нет.

Порядок инициализации в конструкторе: сначала `super()`, потом поля экземпляра,
потом тело конструктора.

## Наследование и super

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} издаёт звук`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);          // обязателен ДО обращения к this
    this.breed = breed;
  }
  speak() {
    return `${super.speak()}, а именно гавкает`;
  }
}
```

Правило, которое любят спрашивать: **в производном классе `this` не существует
до вызова `super()`**. Обращение к `this` раньше — `ReferenceError`. Причина в том,
что объект-экземпляр создаёт базовый конструктор, а не производный.

Если конструктор не написан, движок подставляет `constructor(...args) { super(...args) }`.

`extends` связывает две цепочки сразу:

```js
Object.getPrototypeOf(Dog.prototype) === Animal.prototype; // методы экземпляра
Object.getPrototypeOf(Dog) === Animal;                     // статические методы
```

## Приватные поля (#)

```js
class Counter {
  #count = 0;

  increment() {
    this.#count += 1;
  }
  get value() {
    return this.#count;
  }
  static isCounter(obj) {
    return #count in obj; // безопасная проверка «есть ли приватное поле»
  }
}

const c = new Counter();
c.#count;              // SyntaxError на этапе парсинга
Object.keys(c);        // [] — приватные поля не видны рефлексии
JSON.stringify(c);     // '{}'
```

Это **настоящая** приватность на уровне языка, в отличие от соглашения `_name`.
Приватные поля не наследуются: подкласс не видит `#count` родителя.

До `#` приватность делали через замыкания (дорого по памяти) или `WeakMap`:

```js
const privates = new WeakMap();
class Old {
  constructor() {
    privates.set(this, { count: 0 });
  }
  inc() {
    privates.get(this).count += 1;
  }
}
```

## static

```js
class Config {
  static instances = 0;

  static #secret = 'ключ';          // приватное статическое поле

  static {                           // статический блок инициализации
    Config.instances = 0;
  }

  static create() {                  // фабрика, this === Config
    Config.instances += 1;
    return new this();
  }
}
```

`static` принадлежит самому классу, а не экземплярам. В статическом методе `this` — это
класс, поэтому `new this()` в наследнике создаст экземпляр наследника.

## Геттеры, сеттеры и defineProperty

```js
class Temperature {
  #celsius = 0;

  get fahrenheit() {
    return this.#celsius * 1.8 + 32;
  }
  set fahrenheit(value) {
    this.#celsius = (value - 32) / 1.8;
  }
}
```

Аксессоры лежат в прототипе как пара `get`/`set` дескриптора. То же вручную:

```js
Object.defineProperty(obj, 'fahrenheit', {
  get() { /* ... */ },
  set(value) { /* ... */ },
  enumerable: false,
  configurable: true,
});
```

## Абстрактных классов и интерфейсов в JS нет

Имитация:

```js
class Shape {
  constructor() {
    if (new.target === Shape) {
      throw new Error('Shape — абстрактный класс');
    }
  }
  area() {
    throw new Error('Не реализовано');
  }
}
```

`new.target` — это конструктор, через который шёл вызов `new`; в обычном вызове функции
он `undefined`.

## Как это спрашивают

- «Класс — это просто сахар?» — в основном да, но перечислите отличия: strict mode, TDZ,
  запрет вызова без `new`, неперечисляемые методы.
- «Почему нельзя обращаться к `this` до `super()`?» — объект создаёт базовый конструктор.
- «Чем `#private` лучше `_private`?» — язык, а не соглашение; невидимо для `Object.keys`,
  `JSON.stringify` и отладчика по имени.
- «Где живут методы и где поля?» — прототип против экземпляра, и почему это важно.
- «Что такое `static` и что такое `this` в статическом методе?»
