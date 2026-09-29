import type { SeedFlashcard } from '../types.js';

export const typescriptFlashcards: SeedFlashcard[] = [
  // --- ts-basics-narrowing --------------------------------------------------
  {
    topic: 'ts-basics-narrowing',
    front: '`any` против `unknown`',
    back: '`any` отключает проверку и заражает всё вокруг. `unknown` принимает любое значение, но не даёт ничего с ним сделать без сужения. Всё, что приходит извне, — `unknown`.',
  },
  {
    topic: 'ts-basics-narrowing',
    front: 'Что такое `never` и где он появляется',
    back: 'Тип без значений. Возвращается функцией, которая никогда не завершается нормально, и остаётся после исчерпывающей проверки union — на этом строится `assertNever`.',
  },
  {
    topic: 'ts-basics-narrowing',
    front: 'Что такое discriminated union',
    back: 'Union объектных типов с общим полем-дискриминантом литерального типа. TypeScript сужает тип по значению этого поля, а недопустимые состояния становятся невыразимыми.',
  },
  {
    topic: 'ts-basics-narrowing',
    front: 'Как проверить исчерпанность union',
    back:
      '```ts\n' +
      'function assertNever(v: never): never {\n' +
      '  throw new Error(`Не обработано: ${JSON.stringify(v)}`);\n' +
      '}\n' +
      '// в default ветке switch\n' +
      '```\n' +
      'При добавлении нового варианта код перестанет компилироваться.',
  },
  {
    topic: 'ts-basics-narrowing',
    front: 'Способы narrowing',
    back: '`typeof`, `instanceof`, оператор `in`, проверка на истинность, сравнение с литералом (дискриминант), пользовательский предикат `value is T`, assertion function `asserts value is T`.',
  },
  {
    topic: 'ts-basics-narrowing',
    front: 'Чем `satisfies` лучше `as`',
    back: '`as` подавляет проверку и ничего не гарантирует. `satisfies` проверяет объект по типу, но сохраняет точный выведенный тип литералов.',
  },
  {
    topic: 'ts-basics-narrowing',
    front: 'Чем опасен пользовательский type guard',
    back: 'Компилятор верит предикату `value is T` на слово и не проверяет тело. Неправильный guard опаснее его отсутствия — ошибка всплывёт в рантайме.',
  },

  // --- generics -------------------------------------------------------------
  {
    topic: 'generics',
    front: 'Когда дженерик действительно нужен',
    back: 'Когда тип результата зависит от типа аргумента или несколько аргументов связаны между собой. Эвристика: если параметр типа встречается в сигнатуре один раз — он лишний.',
  },
  {
    topic: 'generics',
    front: 'Типобезопасный доступ к свойству',
    back:
      '```ts\n' +
      'function get<T extends object, K extends keyof T>(obj: T, key: K): T[K] {\n' +
      '  return obj[key];\n' +
      '}\n' +
      '```\n' +
      '`K extends keyof T` ловит опечатку, `T[K]` даёт точный тип значения.',
  },
  {
    topic: 'generics',
    front: 'Что делают `keyof` и `typeof` в позиции типа',
    back: '`keyof T` — union ключей типа. `typeof value` — тип существующего значения. Вместе: `keyof typeof ROUTES` даёт union ключей объекта-константы.',
  },
  {
    topic: 'generics',
    front: 'Как получить union значений из массива-константы',
    back:
      '```ts\n' +
      "const STATUSES = ['idle', 'loading'] as const;\n" +
      "type Status = (typeof STATUSES)[number];  // 'idle' | 'loading'\n" +
      '```',
  },
  {
    topic: 'generics',
    front: 'Зачем `as const` в возврате кастомного хука',
    back: 'Без него выведется массив union-типа `(T | setter)[]` и деструктуризация сломается. `as const` делает тип кортежем с точными типами по позициям.',
  },
  {
    topic: 'generics',
    front: 'Почему `<T>(x: T) => x` не компилируется в .tsx',
    back: '`<T>` разбирается как JSX-тег. Решение — запятая `<T,>(x: T) => x` или объявление через `function`.',
  },

  // --- utility-types --------------------------------------------------------
  {
    topic: 'utility-types',
    front: 'Реализация `Partial` и `Required`',
    back:
      '```ts\n' +
      'type MyPartial<T> = { [K in keyof T]?: T[K] };\n' +
      'type MyRequired<T> = { [K in keyof T]-?: T[K] };\n' +
      '```\n' +
      '`-` снимает модификатор, так же работает с `readonly`.',
  },
  {
    topic: 'utility-types',
    front: 'Реализация `Pick` и `Omit`',
    back:
      '```ts\n' +
      'type MyPick<T, K extends keyof T> = { [P in K]: T[P] };\n' +
      'type MyOmit<T, K extends keyof never> = Pick<T, Exclude<keyof T, K>>;\n' +
      '```',
  },
  {
    topic: 'utility-types',
    front: 'Чем `Omit` опаснее `Pick`',
    back: '`Pick` требует `K extends keyof T`, а `Omit` принимает любой ключ. Опечатка `Omit<User, \'emial\'>` не вызовет ошибку и молча вернёт весь тип.',
  },
  {
    topic: 'utility-types',
    front: 'Как заставить компилятор требовать обработку нового варианта union',
    back: '`Record<Union, T>` — словарь требует ключ для каждого члена union. Либо `switch` с `assertNever` в `default`.',
  },
  {
    topic: 'utility-types',
    front: '`Exclude`, `Extract`, `NonNullable`',
    back:
      '```ts\n' +
      'type Exclude<T, U> = T extends U ? never : T;\n' +
      'type Extract<T, U> = T extends U ? T : never;\n' +
      '```\n' +
      'Работают за счёт дистрибутивности условных типов по union.',
  },
  {
    topic: 'utility-types',
    front: '`Parameters`, `ReturnType`, `Awaited`',
    back: 'Извлекают из типа функции аргументы (кортеж), результат и распакованное значение промиса. Все реализованы через `infer`.',
  },
  {
    topic: 'utility-types',
    front: 'Как сделать `DeepPartial`',
    back:
      '```ts\n' +
      'type DeepPartial<T> = T extends object\n' +
      '  ? { [K in keyof T]?: DeepPartial<T[K]> }\n' +
      '  : T;\n' +
      '```\n' +
      'Встроенные utility types все поверхностные.',
  },

  // --- conditional-mapped ---------------------------------------------------
  {
    topic: 'conditional-mapped',
    front: 'Что такое distributive conditional type',
    back: 'Если проверяемый тип — голый параметр и в него подставлен union, условие применяется к каждому члену отдельно. `ToArray<string | number>` даёт `string[] | number[]`.',
  },
  {
    topic: 'conditional-mapped',
    front: 'Как отключить дистрибутивность',
    back: 'Обернуть обе стороны в кортеж: `[T] extends [U] ? X : Y`. Так пишут `IsNever<T> = [T] extends [never] ? true : false`.',
  },
  {
    topic: 'conditional-mapped',
    front: 'Что делает `infer`',
    back: 'Объявляет переменную типа прямо внутри условия и захватывает часть типа: `T extends Promise<infer V> ? V : T`. На нём построены `ReturnType`, `Awaited`, `Parameters`.',
  },
  {
    topic: 'conditional-mapped',
    front: 'Что такое key remapping',
    back: '`[K in keyof T as NewKey]` — переименование ключей в mapped type. Если выражение после `as` даёт `never`, ключ отбрасывается — так фильтруют поля по типу значения.',
  },
  {
    topic: 'conditional-mapped',
    front: 'Как собрать union ключей по типу значения',
    back:
      '```ts\n' +
      'type KeysOfType<T, U> = {\n' +
      '  [K in keyof T]: T[K] extends U ? K : never;\n' +
      '}[keyof T];\n' +
      '```\n' +
      'Индексный доступ `[keyof T]` собирает значения в union, `never` из него исчезает.',
  },
  {
    topic: 'conditional-mapped',
    front: 'Чем опасны template literal types',
    back: 'Union внутри шаблона перемножается: несколько union по пять членов дают сотни комбинаций и упираются в лимит компилятора.',
  },

  // --- ts-react -------------------------------------------------------------
  {
    topic: 'ts-react',
    front: '`ReactNode` против `ReactElement` и `ComponentType`',
    back: '`ReactNode` — всё, что можно отрендерить (элемент, строка, массив, `null`). `ReactElement` — только результат JSX. `ComponentType<P>` — сам компонент, рендерится как `<Component />`.',
  },
  {
    topic: 'ts-react',
    front: 'Как унаследовать пропсы обычного `<button>`',
    back: '`interface Props extends React.ComponentPropsWithoutRef<\'button\'>`. Для проброса ref — `ComponentPropsWithRef`. Пропсы чужого компонента: `React.ComponentProps<typeof Link>`.',
  },
  {
    topic: 'ts-react',
    front: 'Почему отказались от `React.FC`',
    back: 'Раньше неявно добавлял `children`, плохо работает с дженериками и мешает `defaultProps`. Современная практика — обычная функция с типизированными пропсами.',
  },
  {
    topic: 'ts-react',
    front: 'Почему `useState([])` — ошибка',
    back: 'Из пустого массива выводится `never[]`, положить в него ничего нельзя. Нужен явный дженерик: `useState<Item[]>([])`. Та же проблема с `useState(null)`.',
  },
  {
    topic: 'ts-react',
    front: 'Три варианта `useRef`',
    back: '`useRef<HTMLInputElement>(null)` → `RefObject` с readonly `current` (для DOM). `useRef<number | null>(null)` → изменяемый `MutableRefObject`. Тип элемента задаётся дженериком.',
  },
  {
    topic: 'ts-react',
    front: 'Как типизировать `useReducer`',
    back: 'Состояние — отдельный тип, экшены — discriminated union по полю `type`. В `default` ветке `switch` — присваивание в `never` для проверки исчерпанности.',
  },
  {
    topic: 'ts-react',
    front: 'Паттерн типизации контекста без `| null` у потребителей',
    back: '`createContext<T | null>(null)`, а проверку спрятать в кастомный хук: `if (ctx === null) throw new Error(...)`. Сам контекст наружу не экспортировать.',
  },
  {
    topic: 'ts-react',
    front: 'Чем опасен `response.json()`',
    back: 'Он возвращает `Promise<any>` — дыра в типах. Приведение `as T` ничего не проверяет; на границе нужна валидация схемой (Zod, Valibot).',
  },
];
