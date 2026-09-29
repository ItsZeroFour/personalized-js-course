# Utility types

Встроенные типы-помощники — это не магия, а короткие выражения на mapped
и conditional types. Понимать их реализацию важнее, чем помнить список:
на собеседовании часто просят написать свой `Pick` или `Omit`.

## Модификаторы полей

```ts
interface User {
  id: string;
  name: string;
  email?: string;
}

type PartialUser = Partial<User>;    // все поля необязательные
type RequiredUser = Required<User>;  // все обязательные, email: string
type ReadonlyUser = Readonly<User>;  // все только для чтения
```

Реализация:

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };   // минус убирает модификатор
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
```

Важно: все три **поверхностные**. Глубокий вариант пишут руками:

```ts
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
```

## Выбор и исключение полей

```ts
type Credentials = Pick<User, 'id' | 'email'>;
type PublicUser = Omit<User, 'email'>;
```

```ts
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyOmit<T, K extends keyof never> = Pick<T, Exclude<keyof T, K>>;
```

Тонкость, которую любят спрашивать: `Pick` требует, чтобы ключи существовали
(`K extends keyof T`), а `Omit` — **нет**. Поэтому опечатка в `Omit` не вызовет ошибку:

```ts
type Broken = Omit<User, 'emial'>;   // молча вернёт весь User
```

Строгий вариант пишут сами:

```ts
type StrictOmit<T, K extends keyof T> = Omit<T, K>;
```

## Работа с union

```ts
type Status = 'idle' | 'loading' | 'error';

type Active = Exclude<Status, 'idle'>;          // 'loading' | 'error'
type Only = Extract<Status, 'idle' | 'other'>;  // 'idle'
type Defined = NonNullable<string | null>;      // string
```

```ts
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T & {};
```

`Exclude` и `Extract` опираются на **distributive conditional types**: когда `T` — union,
условный тип применяется к каждому члену по отдельности, и результаты объединяются.

## Record

```ts
type StatusLabels = Record<Status, string>;
// { idle: string; loading: string; error: string }

type Dictionary = Record<string, number>;
```

```ts
type MyRecord<K extends keyof never, V> = { [P in K]: V };
```

`Record` с union-ключами — отличный способ гарантировать, что при добавлении
нового варианта в union компилятор потребует добавить перевод, цвет, обработчик.
В этом проекте так сделаны `TOPIC_STATUS_LABELS` и подобные словари.

## Типы из функций

```ts
function createUser(name: string, age: number) {
  return { id: '1', name, age };
}

type CreateUser = typeof createUser;
type Params = Parameters<CreateUser>;        // [name: string, age: number]
type Result = ReturnType<CreateUser>;        // { id: string; name: string; age: number }
type First = Parameters<CreateUser>[0];      // string

async function load() {
  return { data: 1 };
}
type Loaded = Awaited<ReturnType<typeof load>>;   // { data: number }
```

```ts
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never;
type MyParameters<T> = T extends (...args: infer P) => unknown ? P : never;
```

`infer` объявляет переменную типа прямо в условии — это ключ ко всем этим типам.

Ещё из этой группы: `ConstructorParameters`, `InstanceType`, `ThisParameterType`,
`OmitThisParameter`.

## Работа со строками

```ts
type Upper = Uppercase<'hello'>;       // 'HELLO'
type Cap = Capitalize<'hello'>;        // 'Hello'
```

Вместе с template literal types это даёт типы вроде:

```ts
type EventName<T extends string> = `on${Capitalize<T>}`;
type Handlers = EventName<'click' | 'focus'>;   // 'onClick' | 'onFocus'
```

## Что из этого реально применяют

```ts
// Форма из модели: id генерируется сервером
type UserForm = Omit<User, 'id'>;

// Черновик при редактировании
type UserDraft = Partial<UserForm>;

// Пропсы компонента без служебных полей
type ButtonProps = Omit<React.ComponentProps<'button'>, 'type'> & {
  variant: 'primary' | 'secondary';
};

// Полный словарь переводов — компилятор не даст забыть вариант
const LABELS: Record<Status, string> = {
  idle: 'Ожидание',
  loading: 'Загрузка',
  error: 'Ошибка',
};

// Типы состояний из значения
const ROUTES = { home: '/', profile: '/profile' } as const;
type RouteName = keyof typeof ROUTES;     // 'home' | 'profile'
type RoutePath = (typeof ROUTES)[RouteName];  // '/' | '/profile'
```

## Как это спрашивают

- «Какие utility types вы знаете и когда применяли?» — ждут примеров из практики,
  а не списка.
- «Напишите `Pick` / `Omit` / `Partial` руками» — mapped types.
- «Напишите `ReturnType`» — `infer`.
- «В чём разница `Pick` и `Omit` по строгости ключей?»
- «Как сделать `DeepPartial`?» — рекурсивный mapped type.
- «Как заставить компилятор требовать обработку нового варианта union?» —
  `Record<Union, ...>` или `switch` с `never`.
