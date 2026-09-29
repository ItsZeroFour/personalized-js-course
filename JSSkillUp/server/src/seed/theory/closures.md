# Замыкания (closures)

## Определение, которое стоит произносить

**Замыкание — это функция вместе со ссылкой на лексическое окружение, в котором она была
создана.** В JavaScript замыкание образует любая функция: она всегда хранит внутреннюю
ссылку `[[Environment]]` на окружение, где её объявили.

Ключевое: замыкание захватывает **переменную, а не её значение**. Это ссылка на ячейку,
а не копия.

```js
function makeCounter() {
  let count = 0;
  return {
    inc: () => ++count,
    get: () => count,
  };
}

const counter = makeCounter();
counter.inc();
counter.inc();
counter.get(); // 2
```

`count` не собирается сборщиком мусора, пока жива хотя бы одна из возвращённых функций:
она достижима через их `[[Environment]]`.

## Ссылка, а не копия — почему это важно

```js
let x = 1;
const show = () => console.log(x);
x = 42;
show(); // 42, а не 1
```

Отсюда все ловушки с циклами (см. тему «Область видимости») и stale closures в React.

## Приватное состояние

До приватных полей классов это был основной способ инкапсуляции:

```js
function createAccount(initial) {
  let balance = initial;

  return {
    deposit(amount) {
      if (amount <= 0) throw new Error('Сумма должна быть положительной');
      balance += amount;
      return balance;
    },
    getBalance: () => balance,
  };
}

const account = createAccount(100);
account.balance; // undefined — снаружи не достать
```

Цена: у каждого экземпляра свои копии методов (методы не переиспользуются через прототип).
Для тысяч объектов это заметно по памяти — на собеседовании это хороший ответ на вопрос
«в чём минус модульного паттерна по сравнению с классами».

## Одно окружение на несколько функций

```js
function makeToggle() {
  let on = false;
  const toggle = () => (on = !on);
  const isOn = () => on;
  return { toggle, isOn };
}
```

`toggle` и `isOn` замкнуты на **одно и то же** окружение, поэтому видят общее `on`.
А вот два вызова `makeToggle()` дают два независимых окружения.

## Практика: утилиты на замыканиях

```js
function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (called) return result;
    called = true;
    result = fn.apply(this, args);
    return result;
  };
}

function memoize(fn, getKey = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  return function (...args) {
    const key = getKey(...args);
    if (cache.has(key)) return cache.get(key);
    const value = fn.apply(this, args);
    cache.set(key, value);
    return value;
  };
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

Во всех трёх приватное состояние (`called`, `cache`, `timer`) живёт в замыкании.
Обратите внимание на `fn.apply(this, args)` — обычная функция, а не стрелочная, чтобы
сохранить контекст вызова.

## Замыкания и утечки памяти

Замыкание держит **всё окружение**, а не только используемые переменные (хотя современные
движки умеют отбрасывать заведомо неиспользуемые привязки — полагаться на это нельзя).

```js
function leak() {
  const huge = new Array(1_000_000).fill('данные');
  return () => 'привет'; // huge может остаться в памяти вместе с этим замыканием
}
```

Реальные утечки во фронтенде:

```js
// обработчик держит компонент и весь его стейт
element.addEventListener('click', handler); // нет removeEventListener — утечка

// таймер держит замыкание вечно
setInterval(() => console.log(state), 1000); // нет clearInterval — утечка
```

Именно поэтому в `useEffect` обязателен cleanup.

## Замыкания в React

Каждый рендер компонента — это новый вызов функции, а значит **новые замыкания**.
Обработчик, созданный в третьем рендере, видит props и state третьего рендера навсегда.

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // stale closure: count здесь навсегда 0
    }, 1000);
    return () => clearInterval(id);
  }, []); // пустые зависимости заморозили замыкание на первом рендере

  return <span>{count}</span>;
}
```

Правильно — функциональная форма, которая не зависит от замкнутого значения:

```jsx
setCount((prev) => prev + 1);
```

Подробнее — в теме «Stale closures и ловушки хуков».

## Как это спрашивают

- «Что такое замыкание?» — определение через лексическое окружение, потом пример.
  Слабый ответ: «функция внутри функции».
- «Напишите счётчик с приватным состоянием» — проверяют, что вы понимаете, где живёт `count`.
- «Реализуйте `once` / `memoize` / `debounce`» — самые частые задачи на замыкания.
- «Могут ли замыкания вызвать утечку памяти?» — да, и ждут пример с таймером или слушателем.
- «Сколько замыканий создаст цикл на 1000 итераций с `let`?» — 1000 окружений,
  по одному на итерацию.
