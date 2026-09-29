# Conditional и mapped types

## Conditional types

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'привет'>;   // true
type B = IsString<42>;         // false
```

`T extends U` здесь означает «T присваиваем к U», то есть T является подтипом U.

Практический пример:

```ts
type ApiResult<T> = T extends { error: string } ? never : T;
```

## Distributive conditional types

Если проверяемый тип — **голый параметр типа** и в него подставлен union,
условие применяется к каждому члену union по отдельности.

```ts
type ToArray<T> = T extends unknown ? T[] : never;

type Result = ToArray<string | number>;
// не (string | number)[], а string[] | number[]
```

Именно на этом работает `Exclude`:

```ts
type MyExclude<T, U> = T extends U ? never : T;
type R = MyExclude<'a' | 'b' | 'c', 'a'>;
// 'a' extends 'a' ? never : 'a'  → never
// 'b' extends 'a' ? never : 'b'  → 'b'
// 'c' extends 'a' ? never : 'c'  → 'c'
// итог: 'b' | 'c'
```

Отключить дистрибутивность можно обёрткой в кортеж:

```ts
type NotDistributive<T> = [T] extends [unknown] ? T[] : never;
type R2 = NotDistributive<string | number>;   // (string | number)[]
```

Этот приём нужен, когда важно проверить union целиком:

```ts
type IsNever<T> = [T] extends [never] ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
```

Побочный эффект дистрибутивности: `never` — это пустой union, поэтому
дистрибутивный условный тип на `never` даёт `never`, минуя обе ветки.

## infer

`infer` объявляет переменную типа прямо внутри условия и захватывает часть типа.

```ts
type ElementType<T> = T extends (infer U)[] ? U : never;
type E = ElementType<string[]>;   // string

type ReturnOf<T> = T extends (...args: never[]) => infer R ? R : never;
type PromiseValue<T> = T extends Promise<infer V> ? V : T;

type First<T extends readonly unknown[]> = T extends readonly [infer F, ...unknown[]] ? F : never;
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;
```

Рекурсия с `infer` — как разворачивают вложенные промисы:

```ts
type DeepAwaited<T> = T extends Promise<infer V> ? DeepAwaited<V> : T;
type X = DeepAwaited<Promise<Promise<string>>>;   // string
```

`infer` с ограничением (TS 4.7+):

```ts
type FirstString<T> = T extends [infer F extends string, ...unknown[]] ? F : never;
```

## Mapped types

Перебирают ключи и строят новый объектный тип.

```ts
type Optional<T> = {
  [K in keyof T]?: T[K];
};
```

Модификаторы добавляются `+` (по умолчанию) и снимаются `-`:

```ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };
```

Значение тоже можно менять:

```ts
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Stringify<T> = { [K in keyof T]: string };
type Promisify<T> = { [K in keyof T]: Promise<T[K]> };
```

## Key remapping через as

TS 4.1 позволил переименовывать и **отфильтровывать** ключи:

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  id: string;
  name: string;
}

type UserGetters = Getters<User>;
// { getId: () => string; getName: () => string }
```

Ключ отбрасывается, если новое имя — `never`:

```ts
type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

type WithoutFunctions = OmitByType<{ a: string; b: () => void }, Function>;
// { a: string }
```

Обратная операция — оставить только ключи определённого типа:

```ts
type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

type StringKeys = KeysOfType<{ a: string; b: number; c: string }, string>;  // 'a' | 'c'
```

Здесь два шага: mapped type превращает значения в имена ключей или `never`,
а индексный доступ `[keyof T]` собирает их в union и выбрасывает `never`.

## Template literal types

```ts
type Greeting = `Привет, ${string}`;
type Route = `/${string}`;

type EventName<T extends string> = `on${Capitalize<T>}`;
type CssVar<T extends string> = `--${T}`;

type Size = 'sm' | 'md';
type Tone = 'primary' | 'danger';
type ClassName = `btn-${Size}-${Tone}`;
// 'btn-sm-primary' | 'btn-sm-danger' | 'btn-md-primary' | 'btn-md-danger'
```

Union в шаблоне перемножается — это и мощно, и опасно: комбинаторный взрыв
легко упирается в лимит компилятора.

Разбор строки на части:

```ts
type Split<S extends string, D extends string> =
  S extends `${infer Head}${D}${infer Tail}` ? [Head, ...Split<Tail, D>] : [S];

type Parts = Split<'a.b.c', '.'>;   // ['a', 'b', 'c']
```

Отсюда типобезопасный доступ по пути:

```ts
type PathValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

type City = PathValue<{ user: { address: { city: string } } }, 'user.address.city'>; // string
```

Это типичный «сложный» вопрос на собеседовании уровня middle+.

## Практический пример: типизация действий

```ts
type Actions = {
  increment: { by: number };
  reset: undefined;
  setName: { name: string };
};

type Action = {
  [K in keyof Actions]: Actions[K] extends undefined
    ? { type: K }
    : { type: K; payload: Actions[K] };
}[keyof Actions];

// { type: 'increment'; payload: { by: number } }
//   | { type: 'reset' }
//   | { type: 'setName'; payload: { name: string } }
```

Получился discriminated union из одной таблицы — добавление действия автоматически
расширяет тип и ломает неполный `switch`.

## Ограничения и осторожность

- Рекурсия ограничена глубиной (~50 для условных типов, ~1000 для хвостовой).
  Слишком хитрый тип упирается в `Type instantiation is excessively deep`.
- Сложные типы замедляют сервер типов в редакторе.
- Правило: если тип читается дольше, чем код, который он описывает, — упростить.

## Как это спрашивают

- «Что такое distributive conditional types и как их отключить?»
- «Напишите `ReturnType` / `Awaited` / `ElementType`» — `infer`.
- «Как отфильтровать ключи объекта по типу значения?» — key remapping или `KeysOfType`.
- «Как сделать все поля изменяемыми?» — `-readonly`.
- «Что такое template literal types и где они полезны?»
