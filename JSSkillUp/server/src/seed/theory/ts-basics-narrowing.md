# Базовые типы, narrowing, type guards

## any, unknown и never

**`any`** отключает проверку типов. Значение с типом `any` заражает всё вокруг:
его можно передать куда угодно, вызвать как функцию, обратиться к любому свойству.
Один `any` в ядре типов обесценивает типизацию целого модуля.

**`unknown`** — безопасный верх иерархии. Принимает что угодно, но ничего не позволяет
сделать, пока тип не сужен.

```ts
function handle(value: unknown) {
  value.trim();                  // Error: 'value' is of type 'unknown'
  if (typeof value === 'string') {
    value.trim();                // OK — сузили
  }
}
```

Правило: всё, что приходит извне (`JSON.parse`, ответ сети, `catch`), — это `unknown`,
и разбирать его нужно явно или схемой валидации вроде Zod.

**`never`** — тип, у которого нет значений. Возвращается функцией, которая никогда
не завершается нормально, и остаётся после исчерпывающей проверки union.

```ts
function fail(message: string): never {
  throw new Error(message);
}
```

## Union, intersection, литеральные типы

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';   // union литералов
type WithId = { id: string };
type WithName = { name: string };
type Entity = WithId & WithName;                          // intersection
```

Литеральные типы — основной инструмент моделирования состояний. Вместо
`{ loading: boolean; error: string | null; data: T | null }` (где возможны
невозможные комбинации) лучше:

```ts
type State<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```

Это **discriminated union**: общее поле-дискриминант с литеральными типами.
Теперь недопустимое состояние невыразимо, а TypeScript сам сужает тип по `status`.

## const и расширение типа

```ts
let a = 'hello';           // string — let расширяется
const b = 'hello';         // 'hello' — литеральный тип

const config = { method: 'GET' };
fetch(url, config);        // method: string, а ожидается конкретный литерал

const config2 = { method: 'GET' } as const;  // { readonly method: 'GET' }
```

`as const` часто нужен для массивов, из которых выводят union:

```ts
const STATUSES = ['idle', 'loading'] as const;
type Status = (typeof STATUSES)[number];    // 'idle' | 'loading'
```

Этот приём используется в проекте повсюду: константа для рантайма и тип из неё.

## Narrowing — как TypeScript сужает типы

### typeof

```ts
function format(value: string | number) {
  if (typeof value === 'string') return value.trim();
  return value.toFixed(2);
}
```

### Проверка на истинность

```ts
function greet(name?: string) {
  if (!name) return 'Привет, гость';
  return `Привет, ${name}`;   // name: string
}
```

Осторожно: `if (value)` отсекает не только `undefined`, но и `''` и `0`.
Для «только null и undefined» — `if (value == null)`.

### in

```ts
type Dog = { bark(): void };
type Cat = { meow(): void };

function speak(pet: Dog | Cat) {
  if ('bark' in pet) pet.bark();
  else pet.meow();
}
```

### instanceof

```ts
function log(error: unknown) {
  if (error instanceof Error) console.error(error.message);
  else console.error(String(error));
}
```

Это канонический разбор `catch`: в современном TS переменная в `catch` имеет тип `unknown`
(при включённом `useUnknownInCatchVariables`, который входит в `strict`).

### Дискриминант

```ts
function render(state: State<User>) {
  switch (state.status) {
    case 'success':
      return state.data.name;   // data доступна только здесь
    case 'error':
      return state.error;
    default:
      return null;
  }
}
```

## Exhaustive check

Приём, который ловит забытую ветку при добавлении нового варианта в union:

```ts
function assertNever(value: never): never {
  throw new Error(`Необработанный вариант: ${JSON.stringify(value)}`);
}

function label(status: Status): string {
  switch (status) {
    case 'idle': return 'Ожидание';
    case 'loading': return 'Загрузка';
    case 'success': return 'Готово';
    case 'error': return 'Ошибка';
    default: return assertNever(status);  // ошибка компиляции, если добавили вариант
  }
}
```

Это один из самых сильных аргументов в пользу union вместо enum и строк.

## Пользовательские type guards

```ts
interface User {
  id: string;
  name: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'string'
  );
}
```

`value is User` — предикат типа. Компилятор верит ему на слово, поэтому неправильный
guard опаснее его отсутствия.

Полезный частный случай — фильтрация:

```ts
const items: (string | null)[] = ['a', null, 'b'];
const clean: string[] = items.filter((item): item is string => item !== null);
```

Без аннотации предиката `filter` вернёт `(string | null)[]`.

## Assertion functions

```ts
function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error('Значение не задано');
  }
}

const element = document.getElementById('root');
assertIsDefined(element);
element.append('ok');   // element: HTMLElement
```

Требование компилятора: у такой функции должна быть **явная** аннотация типа —
вывод типа здесь не работает.

## as против satisfies

```ts
const a = value as User;        // «поверь мне» — проверок нет, это дыра
const b = <User>value;          // то же самое, старый синтаксис (конфликтует с JSX)

const config = {
  url: '/api',
  retries: 3,
} satisfies Config;             // проверяет соответствие, НЕ расширяя тип
```

`satisfies` — правильный выбор, когда нужно и проверить объект по типу,
и сохранить точный вывод литералов.

`as` оправдан в трёх случаях: работа с DOM (`as HTMLInputElement`), сужение после
собственной проверки, и границы с нетипизированными библиотеками. Каждое использование
стоит сопровождать комментарием.

## Строгие флаги, которые реально важны

- `strictNullChecks` — `null` и `undefined` больше не входят в каждый тип. Основа всего.
- `noUncheckedIndexedAccess` — `arr[0]` даёт `T | undefined`. Спасает от целого класса
  ошибок ценой дополнительных проверок.
- `useUnknownInCatchVariables` — `catch (e)` даёт `unknown`.
- `exactOptionalPropertyTypes` — различает «свойства нет» и «свойство равно `undefined`».

## Как это спрашивают

- «Чем `unknown` отличается от `any`?» — и почему `unknown` лучше на границах.
- «Что такое discriminated union и зачем он нужен?»
- «Как сделать проверку на исчерпанность union?» — `never` + `assertNever`.
- «Что такое type guard и чем он опасен?» — компилятор доверяет предикату.
- «Чем `as` отличается от `satisfies`?»
- «Что даёт `strictNullChecks`?»
