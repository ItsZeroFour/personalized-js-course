import type { SeedQuestion } from '../types.js';

export const typescriptQuestions: SeedQuestion[] = [
  // --- ts-basics-narrowing --------------------------------------------------
  {
    topic: 'ts-basics-narrowing',
    kind: 'mc',
    difficulty: 'easy',
    promptMd: 'В чём главное отличие `unknown` от `any`?',
    options: [
      { id: 'a', text: 'Разницы нет, unknown — просто новое имя для any' },
      {
        id: 'b',
        text: 'В unknown можно записать что угодно, но использовать значение нельзя без сужения типа',
      },
      { id: 'c', text: 'unknown принимает только примитивы' },
      { id: 'd', text: 'unknown нельзя использовать в дженериках' },
    ],
    correct: ['b'],
    explanationMd:
      '`any` отключает проверку типов и «заражает» всё вокруг: значение можно вызвать, ' +
      'обратиться к любому свойству, передать куда угодно.\n\n' +
      '`unknown` — безопасный верх иерархии: принимает любое значение, но не даёт с ним ' +
      'ничего сделать, пока тип не сужен через `typeof`, `instanceof`, type guard или схему.\n\n' +
      'Правило: всё, что приходит извне (`JSON.parse`, ответ сети, `catch`), — это `unknown`.',
    tags: ['unknown', 'any'],
  },
  {
    topic: 'ts-basics-narrowing',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'Что такое discriminated union и какую проблему он решает? Покажите, как добиться ' +
      'проверки на исчерпанность.',
    explanationMd:
      'Один из главных приёмов практической типизации. Ждут моделирование состояний и `never`.',
    referenceAnswerMd:
      'Discriminated union — объединение объектных типов с общим полем-**дискриминантом**, ' +
      'у которого литеральные типы. По значению этого поля TypeScript автоматически сужает тип.\n\n' +
      'Проблема, которую он решает, — **невыразимость недопустимых состояний**. Плохо:\n\n' +
      '```ts\n' +
      'interface State {\n' +
      '  loading: boolean;\n' +
      '  data: User | null;\n' +
      '  error: string | null;\n' +
      '}\n' +
      '// допускает loading: true вместе с data и error одновременно\n' +
      '```\n\n' +
      'Хорошо:\n\n' +
      '```ts\n' +
      'type State =\n' +
      "  | { status: 'idle' }\n" +
      "  | { status: 'loading' }\n" +
      "  | { status: 'success'; data: User }\n" +
      "  | { status: 'error'; error: string };\n" +
      '```\n\n' +
      'Теперь `data` доступна только в ветке `success`, а недопустимые комбинации ' +
      'просто нельзя записать.\n\n' +
      '**Проверка на исчерпанность:**\n\n' +
      '```ts\n' +
      'function assertNever(value: never): never {\n' +
      '  throw new Error(`Необработанный вариант: ${JSON.stringify(value)}`);\n' +
      '}\n\n' +
      'function render(state: State): string {\n' +
      '  switch (state.status) {\n' +
      "    case 'idle': return '';\n" +
      "    case 'loading': return 'Загрузка';\n" +
      '    case \'success\': return state.data.name;\n' +
      '    case \'error\': return state.error;\n' +
      '    default: return assertNever(state);\n' +
      '  }\n' +
      '}\n' +
      '```\n\n' +
      'Если в union добавят новый вариант, `state` в `default` перестанет быть `never` — ' +
      'и код не скомпилируется. Это ловит забытую ветку на этапе сборки, а не в проде.\n\n' +
      'Тот же приём с `Record<Status, T>`: словарь с union-ключами требует заполнить все ' +
      'варианты.',
    rubric: [
      'Определение через общее поле с литеральными типами',
      'Объяснить, зачем: недопустимые состояния становятся невыразимыми',
      'Показать сужение по дискриминанту',
      'Реализовать assertNever и объяснить, как он ловит новый вариант',
    ],
    tags: ['union', 'narrowing'],
  },
  {
    topic: 'ts-basics-narrowing',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Что не так с этим кодом?',
    code: `const items: (string | null)[] = ['a', null, 'b'];
const clean: string[] = items.filter((item) => item !== null);`,
    options: [
      { id: 'a', text: 'Всё корректно' },
      {
        id: 'b',
        text: 'filter не сужает тип: результат будет (string | null)[], нужен предикат item is string',
      },
      { id: 'c', text: 'Нужно использовать flatMap вместо filter' },
      { id: 'd', text: 'Нельзя сравнивать с null через !==' },
    ],
    correct: ['b'],
    explanationMd:
      'Обычная сигнатура `filter` возвращает тот же тип элемента — компилятор не анализирует ' +
      'тело колбэка. Нужен предикат типа:\n\n' +
      '```ts\n' +
      'const clean = items.filter((item): item is string => item !== null);\n' +
      '```\n\n' +
      'В TypeScript 5.5 появился вывод предикатов для простых колбэков, поэтому в свежих ' +
      'версиях этот код может скомпилироваться. Но полагаться на вывод не стоит — явный ' +
      'предикат надёжнее и читается однозначно.',
    tags: ['type guards', 'filter'],
  },
  {
    topic: 'ts-basics-narrowing',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Чем `satisfies` отличается от `as`?',
    options: [
      {
        id: 'a',
        text: '`as` подавляет проверку и не даёт гарантий; `satisfies` проверяет соответствие типу, сохраняя точный вывод литералов',
      },
      { id: 'b', text: 'Это синонимы, satisfies просто новее' },
      { id: 'c', text: '`satisfies` работает только с примитивами' },
      { id: 'd', text: '`as` проверяет тип строже, чем satisfies' },
    ],
    correct: ['a'],
    explanationMd:
      '```ts\n' +
      "const a = { url: '/api', retries: 3 } as Config;       // проверки нет, это дыра\n" +
      "const b = { url: '/api', retries: 3 } satisfies Config; // проверка есть\n" +
      '```\n\n' +
      'При аннотации `const c: Config = {...}` тип переменной становится `Config`, и точные ' +
      'литералы теряются. `satisfies` проверяет объект по типу, но оставляет выведенный ' +
      'узкий тип — поэтому `b.url` будет `\'/api\'`, а не `string`.',
    tags: ['satisfies', 'as'],
  },

  // --- generics -------------------------------------------------------------
  {
    topic: 'generics',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'Напишите типобезопасную функцию `getProperty(obj, key)`, которая возвращает значение ' +
      'правильного типа и не позволяет передать несуществующий ключ.',
    explanationMd: 'Базовая задача на `keyof` и индексный доступ.',
    referenceAnswerMd:
      '```ts\n' +
      'function getProperty<T extends object, K extends keyof T>(obj: T, key: K): T[K] {\n' +
      '  return obj[key];\n' +
      '}\n' +
      '```\n\n' +
      '```ts\n' +
      "const user = { id: '1', name: 'Аня', age: 25 };\n\n" +
      "getProperty(user, 'age');    // number\n" +
      "getProperty(user, 'name');   // string\n" +
      "getProperty(user, 'email');  // Error: 'email' не существует в типе\n" +
      '```\n\n' +
      'Как это работает:\n\n' +
      '- `K extends keyof T` ограничивает ключ реальными ключами объекта — отсюда ошибка ' +
      'на опечатке;\n' +
      '- `T[K]` — indexed access type: тип значения именно по этому ключу, а не union всех ' +
      'значений;\n' +
      '- оба параметра выводятся автоматически, указывать их при вызове не нужно.\n\n' +
      'Если бы вместо `K extends keyof T` стояло просто `key: string`, возвращаемый тип ' +
      'пришлось бы объявить как `unknown` или union всех значений — точность потерялась бы.\n\n' +
      'Развитие задачи — установка значения и вложенные пути:\n\n' +
      '```ts\n' +
      'function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): void {\n' +
      '  obj[key] = value;\n' +
      '}\n' +
      '```',
    rubric: [
      'Два параметра типа: T и K extends keyof T',
      'Возвращаемый тип T[K]',
      'Объяснить, почему ограничение обязательно',
      'Показать, что вывод работает без явного указания типов',
    ],
    tags: ['дженерики', 'keyof'],
  },
  {
    topic: 'generics',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Зачем кастомный хук возвращает `as const`?',
    code: `function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle] as const;
}`,
    options: [
      { id: 'a', text: 'Чтобы запретить мутацию массива в рантайме' },
      {
        id: 'b',
        text: 'Чтобы тип был кортежем [boolean, () => void], а не массивом union-типа',
      },
      { id: 'c', text: 'Это требование правил хуков' },
      { id: 'd', text: 'Для оптимизации: React сравнивает результат поверхностно' },
    ],
    correct: ['b'],
    explanationMd:
      'Без `as const` выведется `(boolean | (() => void))[]` — массив union-типа. ' +
      'При деструктуризации `const [value, toggle] = useToggle()` обе переменные получат ' +
      'этот union, и ни `value` нельзя будет использовать как boolean, ни `toggle` вызвать.\n\n' +
      '`as const` делает тип кортежем фиксированной длины с точными типами по позициям.\n\n' +
      'Альтернатива — явная аннотация возвращаемого типа или возврат объекта ' +
      '(тогда порядок не важен, что удобнее при трёх и более значениях).',
    tags: ['дженерики', 'as const', 'React'],
  },
  {
    topic: 'generics',
    kind: 'mc',
    difficulty: 'hard',
    promptMd: 'В каком из случаев дженерик **избыточен**?',
    options: [
      { id: 'a', text: 'function first<T>(items: T[]): T | undefined' },
      { id: 'b', text: 'function log<T>(value: T): void' },
      { id: 'c', text: 'function getProperty<T, K extends keyof T>(obj: T, key: K): T[K]' },
      { id: 'd', text: 'function identity<T>(value: T): T' },
    ],
    correct: ['b'],
    explanationMd:
      'Параметр типа оправдан, когда он связывает вход и выход или несколько аргументов между ' +
      'собой. В `log<T>(value: T): void` тип `T` используется ровно один раз и никуда не ' +
      'передаётся — это то же самое, что `log(value: unknown): void`, но выглядит сложнее.\n\n' +
      'Эвристика: **если параметр типа встречается в сигнатуре только один раз, он не нужен**.',
    tags: ['дженерики'],
  },

  // --- utility-types --------------------------------------------------------
  {
    topic: 'utility-types',
    kind: 'open',
    difficulty: 'medium',
    promptMd: 'Реализуйте `Pick`, `Omit` и `Partial` самостоятельно.',
    explanationMd: 'Проверяют владение mapped types и conditional types.',
    referenceAnswerMd:
      '```ts\n' +
      'type MyPartial<T> = { [K in keyof T]?: T[K] };\n\n' +
      'type MyRequired<T> = { [K in keyof T]-?: T[K] };   // минус снимает модификатор\n\n' +
      'type MyReadonly<T> = { readonly [K in keyof T]: T[K] };\n\n' +
      'type MyPick<T, K extends keyof T> = { [P in K]: T[P] };\n\n' +
      'type MyExclude<T, U> = T extends U ? never : T;\n\n' +
      'type MyOmit<T, K extends keyof never> = MyPick<T, MyExclude<keyof T, K>>;\n' +
      '```\n\n' +
      'Ключевые детали:\n\n' +
      '- `[K in keyof T]` — mapped type, перебор ключей;\n' +
      '- `?` добавляет необязательность, `-?` снимает, то же работает с `readonly`;\n' +
      '- `MyExclude` опирается на **distributive conditional types**: когда в `T` подставлен ' +
      'union, условие применяется к каждому члену отдельно, результаты объединяются;\n' +
      '- `Omit` в стандартной библиотеке принимает `K extends keyof never` (то есть любой ключ), ' +
      'а не `keyof T`. Поэтому опечатка не вызовет ошибку:\n\n' +
      '```ts\n' +
      "type Broken = Omit<User, 'emial'>;   // молча вернёт весь User\n" +
      '```\n\n' +
      'Строгий вариант пишут сами: `type StrictOmit<T, K extends keyof T> = Omit<T, K>`.\n\n' +
      'Все эти типы **поверхностные**. Глубокий вариант:\n\n' +
      '```ts\n' +
      'type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;\n' +
      '```',
    rubric: [
      'Корректные mapped types для Partial и Pick',
      'Знать модификаторы ? и -?',
      'Omit через Pick + Exclude',
      'Бонус: нестрогость ключей у стандартного Omit или DeepPartial',
    ],
    tags: ['utility types', 'mapped types'],
  },
  {
    topic: 'utility-types',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Какой тип получится?',
    code: `interface User {
  id: string;
  name: string;
  email?: string;
}

type Result = Required<Pick<User, 'id' | 'email'>>;`,
    options: [
      { id: 'a', text: '{ id: string; email?: string }' },
      { id: 'b', text: '{ id: string; email: string }' },
      { id: 'c', text: '{ id: string; name: string; email: string }' },
      { id: 'd', text: '{ id?: string; email?: string }' },
    ],
    correct: ['b'],
    explanationMd:
      '`Pick<User, \'id\' | \'email\'>` оставляет два поля, сохраняя их модификаторы: ' +
      '`{ id: string; email?: string }`.\n\n' +
      '`Required<T>` снимает `?` со всех полей через `-?` и заодно убирает `undefined` ' +
      'из типа значения. Итог: `{ id: string; email: string }`.',
    tags: ['utility types'],
  },
  {
    topic: 'utility-types',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Как гарантировать, что при добавлении нового значения в union компилятор потребует добавить перевод?',
    code: `type Status = 'idle' | 'loading' | 'error';`,
    options: [
      { id: 'a', text: 'const LABELS: Record<Status, string> = { ... }' },
      { id: 'b', text: 'const LABELS: { [key: string]: string } = { ... }' },
      { id: 'c', text: 'const LABELS = { ... } as Record<string, string>' },
      { id: 'd', text: 'Никак, это проверяется только в рантайме' },
    ],
    correct: ['a'],
    explanationMd:
      '`Record<Status, string>` требует ключ для **каждого** члена union. Добавили `success` ' +
      'в `Status` — код перестал компилироваться, пока не добавлен перевод.\n\n' +
      'Индексная сигнатура `{ [key: string]: string }` принимает любой набор ключей и ничего ' +
      'не проверяет, а `as` просто подавляет проверку.\n\n' +
      'Тот же приём в этом проекте: `TOPIC_STATUS_LABELS: Record<TopicStatus, string>`.',
    tags: ['Record', 'utility types'],
  },

  // --- conditional-mapped ---------------------------------------------------
  {
    topic: 'conditional-mapped',
    kind: 'mc',
    difficulty: 'hard',
    promptMd: 'Какой тип получится?',
    code: `type ToArray<T> = T extends unknown ? T[] : never;
type Result = ToArray<string | number>;`,
    options: [
      { id: 'a', text: '(string | number)[]' },
      { id: 'b', text: 'string[] | number[]' },
      { id: 'c', text: 'never' },
      { id: 'd', text: 'unknown[]' },
    ],
    correct: ['b'],
    explanationMd:
      'Это **distributive conditional type**: когда проверяемый тип — голый параметр типа, ' +
      'а в него подставлен union, условие применяется к каждому члену отдельно, ' +
      'и результаты объединяются.\n\n' +
      'Отключить дистрибутивность можно обёрткой в кортеж:\n\n' +
      '```ts\n' +
      'type NotDistributive<T> = [T] extends [unknown] ? T[] : never;\n' +
      'type R = NotDistributive<string | number>;   // (string | number)[]\n' +
      '```\n\n' +
      'На дистрибутивности построены `Exclude`, `Extract` и `NonNullable`.',
    tags: ['conditional types'],
  },
  {
    topic: 'conditional-mapped',
    kind: 'open',
    difficulty: 'hard',
    promptMd:
      'Напишите тип `ReturnType` и тип, который оставляет из объекта только ключи ' +
      'со значениями заданного типа.',
    explanationMd: 'Проверяют владение `infer` и key remapping.',
    referenceAnswerMd:
      '**ReturnType через `infer`:**\n\n' +
      '```ts\n' +
      'type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never;\n' +
      '```\n\n' +
      '`infer R` объявляет переменную типа прямо в условии и захватывает тип результата. ' +
      '`never[]` в параметрах — из-за контравариантности: он подходит к любой сигнатуре.\n\n' +
      '**Ключи по типу значения — два способа:**\n\n' +
      '```ts\n' +
      '// 1. Собрать union имён ключей\n' +
      'type KeysOfType<T, U> = {\n' +
      '  [K in keyof T]: T[K] extends U ? K : never;\n' +
      '}[keyof T];\n\n' +
      "type StringKeys = KeysOfType<{ a: string; b: number; c: string }, string>;  // 'a' | 'c'\n" +
      '```\n\n' +
      'Здесь mapped type превращает значения в имена ключей или `never`, а индексный доступ ' +
      '`[keyof T]` собирает их в union — `never` из union исчезает сам.\n\n' +
      '```ts\n' +
      '// 2. Сразу получить объект — через key remapping (TS 4.1+)\n' +
      'type PickByType<T, U> = {\n' +
      '  [K in keyof T as T[K] extends U ? K : never]: T[K];\n' +
      '};\n\n' +
      'type OnlyStrings = PickByType<{ a: string; b: number }, string>;  // { a: string }\n' +
      '```\n\n' +
      'Ключ отбрасывается, если выражение после `as` даёт `never`. Тот же приём делает ' +
      'переименование:\n\n' +
      '```ts\n' +
      'type Getters<T> = {\n' +
      '  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];\n' +
      '};\n' +
      '```',
    rubric: [
      'ReturnType через infer в позиции возвращаемого типа',
      'Приём с [keyof T] для сборки union ключей',
      'Key remapping через as и отбрасывание по never',
      'Бонус: template literal type для переименования',
    ],
    tags: ['infer', 'mapped types'],
  },
  {
    topic: 'conditional-mapped',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Какой тип получится?',
    code: `type Size = 'sm' | 'md';
type Tone = 'primary' | 'danger';
type ClassName = \`btn-\${Size}-\${Tone}\`;`,
    options: [
      { id: 'a', text: 'string' },
      { id: 'b', text: "'btn-sm-primary' | 'btn-md-danger'" },
      {
        id: 'c',
        text: "'btn-sm-primary' | 'btn-sm-danger' | 'btn-md-primary' | 'btn-md-danger'",
      },
      { id: 'd', text: '`btn-${string}`' },
    ],
    correct: ['c'],
    explanationMd:
      'Union внутри template literal type **перемножается**: получается декартово произведение, ' +
      '2 × 2 = 4 варианта.\n\n' +
      'Это и сила, и опасность: несколько union по пять членов дают сотни комбинаций, ' +
      'и компилятор упирается в лимит.',
    tags: ['template literal types'],
  },

  // --- ts-react -------------------------------------------------------------
  {
    topic: 'ts-react',
    kind: 'mc',
    difficulty: 'easy',
    promptMd: 'Как правильно типизировать проп, в который передают произвольное содержимое для рендера?',
    options: [
      { id: 'a', text: 'children: JSX.Element' },
      { id: 'b', text: 'children: React.ReactNode' },
      { id: 'c', text: 'children: React.ComponentType' },
      { id: 'd', text: 'children: string | JSX.Element' },
    ],
    correct: ['b'],
    explanationMd:
      '`ReactNode` покрывает всё, что React умеет отрендерить: элемент, строку, число, массив, ' +
      '`null`, `undefined`, `false`.\n\n' +
      '`ReactElement` и `JSX.Element` — только результат JSX, они отсекут строку и массив. ' +
      '`ComponentType` — это сам компонент (функция или класс), а не его результат; ' +
      'такой проп рендерят как `<Component />`.',
    tags: ['React', 'типы'],
  },
  {
    topic: 'ts-react',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Что не так с этим кодом?',
    code: `const [items, setItems] = useState([]);

useEffect(() => {
  loadItems().then(setItems);
}, []);`,
    options: [
      { id: 'a', text: 'Всё корректно' },
      { id: 'b', text: 'Тип выведется как never[], и setItems не примет реальные данные' },
      { id: 'c', text: 'useState нельзя вызывать с пустым массивом' },
      { id: 'd', text: 'Нужен useMemo вместо useState' },
    ],
    correct: ['b'],
    explanationMd:
      'Из `[]` TypeScript выводит `never[]` — массив, в который ничего нельзя положить. ' +
      'Вызов `setItems(realItems)` не скомпилируется.\n\n' +
      '```ts\n' +
      'const [items, setItems] = useState<Item[]>([]);\n' +
      '```\n\n' +
      'Та же проблема с `useState(null)` — выведется `null`. Всегда задавайте дженерик, ' +
      'если начальное значение не отражает будущий тип.',
    tags: ['React', 'useState'],
  },
  {
    topic: 'ts-react',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'Как типизировать контекст так, чтобы потребителям не приходилось проверять его на `null`, ' +
      'но использование вне провайдера всё равно ловилось?',
    explanationMd: 'Стандартный приём, который ждут от middle-разработчика.',
    referenceAnswerMd:
      'Проблема: `createContext<AuthContextValue>()` требует значение по умолчанию. Придумывать ' +
      'фиктивный объект плохо — использование вне провайдера пройдёт незамеченным. А с ' +
      '`createContext<T | null>(null)` каждому потребителю придётся писать проверку.\n\n' +
      'Решение — спрятать проверку в собственный хук:\n\n' +
      '```tsx\n' +
      'interface AuthContextValue {\n' +
      '  user: User | null;\n' +
      '  login: (credentials: Credentials) => Promise<void>;\n' +
      '  logout: () => void;\n' +
      '}\n\n' +
      'const AuthContext = createContext<AuthContextValue | null>(null);\n\n' +
      'export function useAuth(): AuthContextValue {\n' +
      '  const context = useContext(AuthContext);\n' +
      '  if (context === null) {\n' +
      "    throw new Error('useAuth должен вызываться внутри AuthProvider');\n" +
      '  }\n' +
      '  return context;  // здесь тип уже сужен до AuthContextValue\n' +
      '}\n' +
      '```\n\n' +
      'Что это даёт:\n\n' +
      '- потребители пишут `const { user } = useAuth()` без проверок;\n' +
      '- использование вне провайдера падает сразу и с понятным сообщением, а не даёт ' +
      '`undefined` где-то дальше;\n' +
      '- сам `AuthContext` не экспортируется — снаружи доступны только `AuthProvider` и `useAuth`, ' +
      'то есть у модуля появляется нормальный публичный API.\n\n' +
      'Отдельная тема — производительность: любое изменение `value` перерисовывает всех ' +
      'потребителей. Поэтому `value` мемоизируют и часто делят контекст на два — значение ' +
      'и стабильные экшены.',
    rubric: [
      'createContext с null и union-типом',
      'Кастомный хук с проверкой и throw',
      'Объяснить, что после проверки тип сужен',
      'Бонус: не экспортировать сам контекст, мемоизация value',
    ],
    tags: ['React', 'Context'],
  },
  {
    topic: 'ts-react',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Как унаследовать все стандартные пропсы `<button>` в своём компоненте?',
    options: [
      { id: 'a', text: 'interface Props extends HTMLButtonElement' },
      { id: 'b', text: "interface Props extends React.ComponentPropsWithoutRef<'button'>" },
      { id: 'c', text: 'interface Props extends React.ButtonHTMLAttributes' },
      { id: 'd', text: 'type Props = typeof HTMLButtonElement' },
    ],
    correct: ['b'],
    explanationMd:
      '`ComponentPropsWithoutRef<\'button\'>` даёт именно набор React-пропсов: `onClick`, ' +
      '`type`, `disabled`, `aria-*` и остальные. Есть парный ' +
      '`ComponentPropsWithRef<\'button\'>`, если компонент пробрасывает `ref`.\n\n' +
      '`HTMLButtonElement` — это DOM-узел, а не пропсы. ' +
      '`ButtonHTMLAttributes` требует параметр типа (`ButtonHTMLAttributes<HTMLButtonElement>`) ' +
      'и не включает `key` и `ref`.\n\n' +
      'Взять пропсы чужого компонента: `React.ComponentProps<typeof Link>`.',
    tags: ['React', 'типы'],
  },
];
