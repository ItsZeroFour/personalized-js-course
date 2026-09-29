# this, call, apply, bind

## Главный принцип

**`this` определяется в момент вызова, а не в момент объявления.** Смотреть надо на
call-site — то, как функция была вызвана. Единственное исключение — стрелочные функции,
у которых своего `this` нет вообще.

## Четыре правила, в порядке приоритета

### 1. `new` — самый высокий приоритет

```js
function User(name) {
  this.name = name;
}
const user = new User('Аня'); // this — новый объект, он же результат вызова
```

`new` создаёт объект, привязывает его прототип к `User.prototype`, вызывает функцию
с этим объектом как `this` и возвращает его (если функция не вернула другой объект явно).

### 2. Явная привязка: `call`, `apply`, `bind`

```js
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: 'Аня' };

greet.call(user, 'Привет', '!');      // аргументы списком
greet.apply(user, ['Привет', '!']);   // аргументы массивом
const bound = greet.bind(user, 'Привет');
bound('!');                            // bind возвращает новую функцию
```

Мнемоника: **a**pply — **a**rray, **c**all — **c**omma.

`bind` создаёт функцию с жёстко привязанным `this`, которую **нельзя перепривязать**:

```js
const hard = greet.bind(user);
hard.call({ name: 'Другой' }); // всё равно 'Аня'
```

Но `new hard()` игнорирует привязанный `this` — `new` сильнее.

### 3. Неявная привязка: вызов как метод

```js
const obj = {
  name: 'Аня',
  getName() {
    return this.name;
  },
};

obj.getName(); // 'Аня' — this это obj
```

Важно: значение имеет **только последняя точка** перед вызовом.

```js
const outer = { name: 'внешний', inner: { name: 'внутренний', get() { return this.name } } };
outer.inner.get(); // 'внутренний'
```

### 4. Вызов без контекста

```js
function show() {
  return this;
}
show();            // undefined в strict mode, globalThis в sloppy
```

Модули и классы всегда в strict mode, поэтому в современном коде это `undefined`.

## Потеря контекста — главный практический баг

```js
const user = {
  name: 'Аня',
  getName() {
    return this.name;
  },
};

const fn = user.getName;
fn(); // TypeError: Cannot read properties of undefined — точки перед вызовом нет

setTimeout(user.getName, 100);      // то же самое
[1].map(user.getName);              // и здесь
```

Три способа починить:

```js
setTimeout(() => user.getName(), 100);       // стрелка сохраняет вызов целиком
setTimeout(user.getName.bind(user), 100);    // жёсткая привязка
[1].map(user.getName, user);                 // второй аргумент map — thisArg
```

## Стрелочные функции

У стрелки **нет собственного** `this`, `arguments`, `super` и `new.target`.
`this` внутри стрелки — это `this` окружающей области на момент создания, найденный
по обычной лексической цепочке.

```js
const timer = {
  seconds: 0,
  startBroken() {
    setInterval(function () {
      this.seconds++; // this — не timer
    }, 1000);
  },
  startOk() {
    setInterval(() => {
      this.seconds++; // this взят из startOk, то есть timer
    }, 1000);
  },
};
```

И обратная ловушка — стрелка как метод объекта:

```js
const broken = {
  name: 'Аня',
  getName: () => this.name, // this взят из модуля, а не из broken
};
broken.getName(); // undefined или ошибка
```

Стрелку нельзя вызвать через `new`, и `call`/`apply`/`bind` не меняют её `this`.

## this в классах

```js
class Button {
  label = 'ОК';

  handleBroken() {
    console.log(this.label);
  }

  handleOk = () => {
    console.log(this.label);
  };
}

const button = new Button();
const broken = button.handleBroken;
broken(); // TypeError — тело класса в strict mode, this === undefined

const ok = button.handleOk;
ok(); // 'ОК' — стрелка в поле класса замкнулась на экземпляр
```

Цена поля-стрелки: метод создаётся заново на каждый экземпляр и не лежит в прототипе.
Для React-классов это был стандартный приём; в функциональных компонентах вопрос отпал.

## this и React

В функциональных компонентах `this` не используется вообще — это хороший ответ
на вопрос «а как с `this` в React?». Но понимать привязку всё равно нужно: она всплывает
в обработчиках, в работе с внешними библиотеками и в вопросах про классовые компоненты.

## Реализация bind руками

Частая задача на собеседовании:

```js
Function.prototype.myBind = function (context, ...boundArgs) {
  const fn = this;
  function bound(...callArgs) {
    // при вызове через new привязанный контекст игнорируется
    const isNew = this instanceof bound;
    return fn.apply(isNew ? this : context, [...boundArgs, ...callArgs]);
  }
  bound.prototype = Object.create(fn.prototype || null);
  return bound;
};
```

## Как это спрашивают

- «Как определяется `this`?» — четыре правила по приоритету, обязательно про call-site.
- «Чем стрелочная функция отличается от обычной?» — нет своего `this`, `arguments`,
  нельзя `new`, нет `prototype`.
- «Что выведет код с потерей контекста?» — ждут и ответ, и способ починки.
- «Чем `call` отличается от `apply` и `bind`?» — первые два вызывают сразу, `bind` возвращает
  функцию.
- «Напишите `bind` руками» — проверяют понимание `apply`, rest-аргументов и поведения с `new`.
