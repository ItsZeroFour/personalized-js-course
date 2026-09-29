# Реализация утилит руками

Утилиты из lodash — любимый формат live-coding: небольшой объём кода, но проверяются
замыкания, `this`, работа с аргументами и граничные случаи.

## debounce с leading, trailing и cancel

```js
function debounce(fn, wait, { leading = false, trailing = true } = {}) {
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;                 // сохраняем this последнего вызова
    const callNow = leading && timer === null;

    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) fn.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }, wait);

    if (callNow) {
      fn.apply(this, args);
      lastArgs = lastThis = null;    // не повторять этот же вызов в trailing
    }
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = lastArgs = lastThis = null;
  };

  return debounced;
}
```

Что проверяют: таймер в замыкании, **сброс** таймера при каждом вызове, **`this` и
аргументы последнего** вызова (обычная функция, а не стрелка для `debounced`, и `apply`),
отсутствие двойного вызова при `leading + trailing`.

## throttle

```js
function throttle(fn, wait) {
  let last = 0;
  let timer = null;
  let pendingArgs = null;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      last = now;
      fn.apply(this, args);
    } else {
      pendingArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          fn.apply(this, pendingArgs);   // trailing-вызов с последними аргументами
        }, remaining);
      }
    }
  };
}
```

Разница: **debounce** — один вызов после паузы; **throttle** — не чаще раза в `wait`,
пока вызовы продолжаются.

## curry и partial application

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return (...next) => curried.apply(this, [...args, ...next]);
  };
}

const add3 = curry((a, b, c) => a + b + c);
add3(1)(2)(3); // 6
add3(1, 2)(3); // 6
```

`fn.length` — число параметров **до первого со значением по умолчанию** и без rest.
Для функций с `(...args)` нужна явная арность: `curry(fn, arity)`.

**Partial application** — зафиксировать часть аргументов: `fn.bind(null, a)` или
`(...rest) => fn(a, ...rest)`. Каррирование — частный случай: по одному аргументу.

## memoize с кастомным ключом

```js
function memoize(fn, resolver = (first) => first) {
  const cache = new Map();
  function memoized(...args) {
    const key = resolver(...args);
    if (cache.has(key)) return cache.get(key);   // has, а не get: результат может быть undefined
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }
  memoized.cache = cache;
  return memoized;
}
```

По умолчанию lodash кеширует по **первому аргументу**. Ключ `JSON.stringify(args)` —
удобно, но медленно и неверно для функций, `undefined`, Map. Для объектов-ключей —
`WeakMap`. Кеш промисов: при ошибке запись нужно удалить, иначе ошибка закешируется.

## pipe, compose, once

```js
const pipe = (...fns) => (input) => fns.reduce((acc, fn) => fn(acc), input);     // слева направо
const compose = (...fns) => (input) => fns.reduceRight((acc, fn) => fn(acc), input); // справа налево

function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
```

`once` — флаг `called`, а не проверка `result === undefined`: функция может вернуть
`undefined`.

## Общие правила для утилит

- **Обычная функция** в возвращаемой обёртке, `fn.apply(this, args)` — чтобы утилиту
  можно было использовать как метод объекта.
- **Rest-параметры** вместо `arguments`.
- Граничные случаи: пустой ввод, `wait = 0`, повторный вызов после `cancel`,
  исключение внутри `fn` (не ломает ли оно состояние обёртки?).
- Проговаривайте сложность и память: кеш `memoize` растёт бесконечно — где его ограничить.

## Как это спрашивают

- «Напишите debounce» — почти на каждом фронтенд-интервью; затем «добавьте leading»,
  «сохраните this», «добавьте cancel».
- «Чем throttle отличается от debounce? Напишите throttle».
- «Реализуйте curry так, чтобы работали `f(1)(2)(3)` и `f(1, 2)(3)`».
- «Напишите memoize. Какие проблемы у ключа через JSON.stringify?»
- «Реализуйте once / pipe / compose».
