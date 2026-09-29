import type { SeedStage } from './types.js';

/**
 * Роадмап подготовки к собеседованию на React Middle.
 * Порядок этапов задан осознанно: сначала JS core и алгоритмы (самые частые провалы),
 * потом React в глубину, потом инфраструктурные темы.
 */
export const roadmapSeed: SeedStage[] = [
  {
    id: 'js-core',
    title: 'JavaScript core',
    description:
      'Как язык устроен внутри. Самый важный этап: на middle-собеседовании копают именно сюда, а не в знание синтаксиса.',
    icon: '🧠',
    topics: [
      {
        slug: 'types-and-coercion',
        title: 'Типы данных и приведение типов',
        summary:
          'Примитивы и объекты, boxing, typeof/instanceof, ToPrimitive, Symbol.toPrimitive, == против ===, NaN и -0.',
        estimatedMinutes: 90,
        subtopics: [
          'Примитивы, обёртки и автобоксинг',
          'typeof, instanceof, Object.prototype.toString',
          'Алгоритм ToPrimitive и Symbol.toPrimitive',
          'Abstract Equality (==) по шагам спецификации',
          'NaN, Object.is, -0, BigInt',
        ],
      },
      {
        slug: 'scope-hoisting-tdz',
        title: 'Область видимости, hoisting, TDZ',
        summary:
          'Lexical environment, фазы создания и исполнения контекста, var/let/const, temporal dead zone, блочная область.',
        estimatedMinutes: 75,
        subtopics: [
          'Execution context и lexical environment',
          'Hoisting функций и переменных',
          'TDZ у let и const',
          'Блочная область видимости и цикл for',
          'Shadowing и глобальный объект',
        ],
      },
      {
        slug: 'closures',
        title: 'Замыкания (closures)',
        summary:
          'Что реально захватывает замыкание, счётчики и приватность, классические ловушки с циклами, утечки памяти.',
        estimatedMinutes: 90,
        subtopics: [
          'Механика: ссылка на окружение, а не копия значения',
          'Приватное состояние и модульный паттерн',
          'Замыкания в циклах: var, let, IIFE',
          'Замыкания и утечки памяти',
          'Практика: once, memoize, counter',
        ],
      },
      {
        slug: 'this-binding',
        title: 'this, call, apply, bind',
        summary:
          'Четыре правила привязки this, стрелочные функции, потеря контекста при передаче метода, жёсткая привязка.',
        estimatedMinutes: 75,
        subtopics: [
          'Правила определения this по call-site',
          'Стрелочные функции и лексический this',
          'call / apply / bind и частичное применение',
          'Потеря контекста в колбэках и обработчиках',
          'this в классах и в strict mode',
        ],
      },
      {
        slug: 'prototypes',
        title: 'Прототипы и наследование',
        summary:
          'Цепочка прототипов, [[Prototype]] против prototype, Object.create, поиск свойств, shadowing методов.',
        estimatedMinutes: 90,
        subtopics: [
          '[[Prototype]], __proto__ и prototype',
          'Разрешение свойств по цепочке',
          'Object.create и наследование без классов',
          'Функции-конструкторы и new',
          'hasOwnProperty, in, Object.hasOwn',
        ],
      },
      {
        slug: 'classes',
        title: 'Классы, приватные поля, static',
        summary:
          'Классы как синтаксический сахар, super, приватные поля #, static-блоки, геттеры и сеттеры, ошибки при наследовании.',
        estimatedMinutes: 60,
        subtopics: [
          'class как сахар над прототипами',
          'super, порядок вызова конструкторов',
          'Приватные поля # и WeakMap-подход',
          'Static-свойства, методы и блоки',
          'Геттеры, сеттеры и Object.defineProperty',
        ],
      },
      {
        slug: 'event-loop',
        title: 'Event loop, микро- и макрозадачи',
        summary:
          'Call stack, очередь задач и микрозадач, порядок выполнения, requestAnimationFrame, блокировка UI.',
        estimatedMinutes: 120,
        subtopics: [
          'Call stack, task queue, microtask queue',
          'Порядок: sync → microtasks → render → macrotask',
          'setTimeout(0), queueMicrotask, MutationObserver',
          'requestAnimationFrame и кадр отрисовки',
          'Разбор задач «что выведет этот код»',
        ],
      },
      {
        slug: 'promises',
        title: 'Promise: устройство и комбинаторы',
        summary:
          'Состояния промиса, then-чейнинг, обработка ошибок, all/allSettled/race/any, типичные ошибки с возвратом значения.',
        estimatedMinutes: 100,
        subtopics: [
          'Состояния, thenable, микрозадачи промисов',
          'Чейнинг и что возвращает then',
          'catch, finally, unhandled rejection',
          'all, allSettled, race, any',
          'Реализация Promise и Promise.all руками',
        ],
      },
      {
        slug: 'async-await',
        title: 'async/await и обработка ошибок',
        summary:
          'Что async/await делает на самом деле, последовательность против параллельности, try/catch, отмена, AbortController.',
        estimatedMinutes: 80,
        subtopics: [
          'async/await как сахар над промисами и генераторами',
          'Последовательные await против Promise.all',
          'try/catch/finally и проброс ошибок',
          'Отмена через AbortController',
          'Асинхронность в циклах: forEach против for...of',
        ],
      },
      {
        slug: 'generators-iterators',
        title: 'Итераторы и генераторы',
        summary:
          'Протоколы iterable и iterator, for...of, spread, генераторы, yield, ленивые последовательности.',
        estimatedMinutes: 70,
        subtopics: [
          'Протоколы Symbol.iterator и next()',
          'Свой итерируемый объект',
          'Генераторы, yield, yield*',
          'Передача значений в генератор',
          'Ленивые последовательности и бесконечные генераторы',
        ],
      },
      {
        slug: 'modules',
        title: 'Модули: ESM и CommonJS',
        summary:
          'Статический анализ ESM, hoisting импортов, циклические зависимости, tree shaking, динамический import.',
        estimatedMinutes: 60,
        subtopics: [
          'ESM против CommonJS: чем отличаются',
          'Живые биндинги и циклические зависимости',
          'Динамический import() и code splitting',
          'Tree shaking и side effects',
          'Именованный и default экспорт',
        ],
      },
      {
        slug: 'equality-mutability',
        title: 'Сравнение, мутабельность, копирование',
        summary:
          'Ссылки против значений, поверхностное и глубокое копирование, structuredClone, immutability во фронтенде.',
        estimatedMinutes: 70,
        subtopics: [
          'Передача по значению и по ссылке',
          'Shallow copy: spread, Object.assign',
          'Deep copy: structuredClone, ручная рекурсия',
          'Object.freeze и настоящая иммутабельность',
          'Почему React требует новую ссылку',
        ],
      },
      {
        slug: 'memory-gc',
        title: 'Память и garbage collection',
        summary:
          'Достижимость, mark-and-sweep, типичные утечки в SPA, WeakMap и WeakRef, профилирование памяти.',
        estimatedMinutes: 60,
        subtopics: [
          'Достижимость и алгоритм mark-and-sweep',
          'Утечки: таймеры, слушатели, замыкания, детач DOM',
          'WeakMap, WeakSet, WeakRef, FinalizationRegistry',
          'Утечки в useEffect без cleanup',
          'Профилирование через heap snapshot',
        ],
      },
      {
        slug: 'arrays-objects-api',
        title: 'Методы массивов и объектов',
        summary:
          'map/filter/reduce и их семантика, мутирующие и немутирующие методы, новые методы ES2023+, обход объектов.',
        estimatedMinutes: 80,
        subtopics: [
          'reduce: аккумулятор, начальное значение, подводные камни',
          'Мутирующие методы и их immutable-аналоги (toSorted, with)',
          'flat, flatMap, at, Array.from',
          'Object.entries/keys/values, структурная обработка',
          'Порядок ключей в объекте',
        ],
      },
      {
        slug: 'collections',
        title: 'Map, Set, WeakMap, WeakSet',
        summary:
          'Когда Map лучше объекта, сложность операций, ключи любого типа, слабые коллекции и сборка мусора.',
        estimatedMinutes: 50,
        subtopics: [
          'Map против обычного объекта',
          'Set и дедупликация, сложность операций',
          'Ключи-объекты и идентичность',
          'WeakMap для приватных данных и кеша',
          'Конвертация между Map/Set/Array/Object',
        ],
      },
    ],
  },
  {
    id: 'typescript',
    title: 'TypeScript',
    description:
      'Не «типы вместо PropTypes», а система типов как инструмент: дженерики, вывод, сужение и типизация React.',
    icon: '🟦',
    topics: [
      {
        slug: 'ts-basics-narrowing',
        title: 'Базовые типы, narrowing, type guards',
        summary:
          'unknown против any, never, union и intersection, сужение по typeof/in/discriminated union, пользовательские guard-функции.',
        estimatedMinutes: 80,
        subtopics: [
          'any, unknown, never и почему any — это дыра',
          'Union, intersection, литеральные типы',
          'Narrowing: typeof, instanceof, in, truthiness',
          'Discriminated union и exhaustive check',
          'Пользовательские type guards и assertion functions',
        ],
      },
      {
        slug: 'generics',
        title: 'Дженерики',
        summary:
          'Параметры типов, extends-ограничения, вывод типов из аргументов, дженерики в функциях, хуках и компонентах.',
        estimatedMinutes: 80,
        subtopics: [
          'Параметры типа и их вывод',
          'Ограничения через extends и значения по умолчанию',
          'keyof, typeof и indexed access types',
          'Дженерик-функции против дженерик-типов',
          'Дженерик-компоненты в React',
        ],
      },
      {
        slug: 'utility-types',
        title: 'Utility types',
        summary:
          'Partial, Required, Pick, Omit, Record, ReturnType, Parameters, Awaited — и как они устроены внутри.',
        estimatedMinutes: 60,
        subtopics: [
          'Partial, Required, Readonly',
          'Pick, Omit, Record, Exclude, Extract',
          'ReturnType, Parameters, Awaited',
          'NonNullable и работа с null',
          'Как эти типы реализованы через mapped и conditional types',
        ],
      },
      {
        slug: 'conditional-mapped',
        title: 'Conditional и mapped types',
        summary:
          'T extends U ? X : Y, infer, distributive conditional types, mapped types с key remapping, template literal types.',
        estimatedMinutes: 90,
        subtopics: [
          'Conditional types и infer',
          'Distributive conditional types',
          'Mapped types и модификаторы +/-',
          'Key remapping через as',
          'Template literal types',
        ],
      },
      {
        slug: 'ts-react',
        title: 'Типизация React-компонентов и хуков',
        summary:
          'Пропсы и children, generic-компоненты, типы событий, useState/useReducer/useRef, полиморфные компоненты.',
        estimatedMinutes: 80,
        subtopics: [
          'Props, children, PropsWithChildren',
          'Типы событий и ComponentProps<typeof X>',
          'useState, useReducer, useRef и их дженерики',
          'Типизация кастомных хуков',
          'Полиморфные компоненты и as-проп',
        ],
      },
    ],
  },
  {
    id: 'algorithms',
    title: 'Логика и алгоритмы',
    description:
      'Второй приоритет: писать рабочий код руками у доски. Паттерны задач, оценка сложности и реализация утилит с нуля.',
    icon: '🧩',
    topics: [
      {
        slug: 'big-o',
        title: 'Сложность алгоритмов, Big O',
        summary:
          'Как оценивать время и память, амортизированная сложность, сложность методов массива и объекта в JS.',
        estimatedMinutes: 60,
        subtopics: [
          'O(1), O(log n), O(n), O(n log n), O(n²)',
          'Сложность по памяти',
          'Амортизированная сложность push и Map.set',
          'Сложность встроенных методов JS',
          'Как проговаривать оценку на интервью',
        ],
      },
      {
        slug: 'arrays-strings',
        title: 'Массивы и строки',
        summary:
          'Базовые манипуляции: развороты, палиндромы, анаграммы, чанкование, работа с индексами без лишних проходов.',
        estimatedMinutes: 90,
        subtopics: [
          'Обход, сумма, min/max за один проход',
          'Развороты и палиндромы',
          'Анаграммы и частотные словари',
          'chunk, zip, range',
          'Иммутабельные операции над массивом',
        ],
      },
      {
        slug: 'hash-maps',
        title: 'Хеш-таблицы и частотные словари',
        summary:
          'Самый частый приём на интервью: обменять память на скорость. Two Sum, группировка, дедупликация, подсчёт.',
        estimatedMinutes: 90,
        subtopics: [
          'Two Sum и вариации',
          'groupBy и countBy своими руками',
          'Дедупликация по ключу',
          'Пересечение и разность множеств',
          'Кеширование результатов через Map',
        ],
      },
      {
        slug: 'two-pointers',
        title: 'Два указателя',
        summary:
          'Отсортированные массивы, встречное движение, быстрый и медленный указатель, удаление дубликатов на месте.',
        estimatedMinutes: 70,
        subtopics: [
          'Встречные указатели в отсортированном массиве',
          'Быстрый и медленный указатель',
          'Удаление и перемещение элементов на месте',
          'Слияние отсортированных массивов',
          'Когда два указателя не работают',
        ],
      },
      {
        slug: 'sliding-window',
        title: 'Sliding window',
        summary:
          'Окно фиксированной и переменной длины, подстроки без повторов, максимальная сумма подмассива.',
        estimatedMinutes: 70,
        subtopics: [
          'Окно фиксированной длины',
          'Окно переменной длины и условие сжатия',
          'Самая длинная подстрока без повторов',
          'Максимальная сумма подмассива',
          'Отличие от подхода «в лоб» O(n²)',
        ],
      },
      {
        slug: 'stack-queue',
        title: 'Стек и очередь',
        summary:
          'Валидация скобок, обратная польская запись, монотонный стек, очередь на двух стеках, обход в ширину.',
        estimatedMinutes: 70,
        subtopics: [
          'Валидные скобки',
          'Вычисление выражений и RPN',
          'Монотонный стек',
          'Очередь на двух стеках',
          'BFS по дереву или графу',
        ],
      },
      {
        slug: 'recursion',
        title: 'Рекурсия и backtracking',
        summary:
          'База и шаг, обход деревьев и вложенных структур, flatten, перестановки, мемоизация рекурсии, стек вызовов.',
        estimatedMinutes: 90,
        subtopics: [
          'База, шаг и глубина стека',
          'Обход вложенных объектов и деревьев',
          'flatten и deepClone',
          'Перестановки и подмножества',
          'Рекурсия с мемоизацией против динамики',
        ],
      },
      {
        slug: 'sorting-searching',
        title: 'Сортировки и бинарный поиск',
        summary:
          'Как работает Array.prototype.sort, стабильность, компараторы, бинарный поиск и его границы.',
        estimatedMinutes: 70,
        subtopics: [
          'sort: компаратор, стабильность, сортировка строк',
          'Сортировка объектов по нескольким полям',
          'Бинарный поиск и типичные off-by-one',
          'Merge sort и quick sort на пальцах',
          'Поиск в почти отсортированных данных',
        ],
      },
      {
        slug: 'utility-implementations',
        title: 'Реализация утилит руками',
        summary:
          'Классика фронтенд-интервью: debounce, throttle, curry, memoize, deepClone, pipe, compose, once.',
        estimatedMinutes: 120,
        subtopics: [
          'debounce с leading/trailing и cancel',
          'throttle и разница с debounce',
          'curry и partial application',
          'memoize с кастомным ключом',
          'deepClone с циклическими ссылками',
          'pipe, compose, once',
        ],
      },
      {
        slug: 'async-patterns-impl',
        title: 'Асинхронные примитивы руками',
        summary:
          'Реализация Promise.all, promisify, EventEmitter, очереди с ограничением параллельности, retry с backoff.',
        estimatedMinutes: 110,
        subtopics: [
          'Promise.all, race, allSettled своими руками',
          'EventEmitter: on, off, once, emit',
          'Ограничение параллельности запросов',
          'retry с экспоненциальной задержкой',
          'sleep, timeout-обёртка, promisify',
        ],
      },
    ],
  },
  {
    id: 'react',
    title: 'React в глубину',
    description:
      'Не «как использовать хуки», а что происходит внутри: реконсиляция, Fiber, причины ререндеров и ловушки замыканий.',
    icon: '⚛️',
    topics: [
      {
        slug: 'rendering-reconciliation',
        title: 'Рендеринг и reconciliation',
        summary:
          'Что такое рендер, чем он отличается от коммита, эвристики сравнения дерева, почему меняется поддерево.',
        estimatedMinutes: 100,
        subtopics: [
          'Render phase и commit phase',
          'Virtual DOM: что это и чего это не значит',
          'Эвристики diffing: тип элемента и key',
          'Почему ререндер родителя ререндерит детей',
          'children как проп и оптимизация композицией',
        ],
      },
      {
        slug: 'fiber',
        title: 'Fiber-архитектура',
        summary:
          'Fiber-узел и связный список, прерываемый рендер, work loop, приоритеты обновлений, double buffering.',
        estimatedMinutes: 80,
        subtopics: [
          'Fiber-узел: что в нём лежит',
          'Прерываемый рендер и work loop',
          'current и workInProgress дерево',
          'Приоритеты и lanes',
          'Почему рендер должен быть чистым',
        ],
      },
      {
        slug: 'keys-lists',
        title: 'Keys и списки',
        summary:
          'Зачем нужен key, почему индекс — плохая идея, потеря состояния компонента, key как инструмент сброса состояния.',
        estimatedMinutes: 50,
        subtopics: [
          'Как React использует key при сравнении',
          'Баги с key={index}',
          'Сброс состояния через смену key',
          'Устойчивые идентификаторы',
          'Списки и производительность',
        ],
      },
      {
        slug: 'state-hooks',
        title: 'useState, useReducer, батчинг',
        summary:
          'Очередь обновлений, функциональная форма setState, автоматический батчинг в React 18+, ленивая инициализация.',
        estimatedMinutes: 80,
        subtopics: [
          'Очередь обновлений и функциональная форма',
          'Автоматический батчинг и flushSync',
          'Ленивая инициализация useState',
          'useReducer и когда он лучше useState',
          'Производный стейт и когда его не надо хранить',
        ],
      },
      {
        slug: 'effects',
        title: 'useEffect, useLayoutEffect, cleanup',
        summary:
          'Когда эффект запускается, массив зависимостей, cleanup, двойной вызов в StrictMode, гонки запросов.',
        estimatedMinutes: 110,
        subtopics: [
          'Порядок: render → commit → layout effect → paint → effect',
          'Массив зависимостей и правило исчерпывающих зависимостей',
          'Cleanup: подписки, таймеры, отмена запросов',
          'StrictMode и двойной вызов эффектов',
          'Гонки запросов и ignore-флаг',
          'Когда эффект вообще не нужен',
        ],
      },
      {
        slug: 'stale-closures',
        title: 'Stale closures и ловушки хуков',
        summary:
          'Почему в колбэке старое значение стейта, интервалы и подписки, useRef как обход, зависимости useCallback.',
        estimatedMinutes: 80,
        subtopics: [
          'Механика: каждый рендер — своё замыкание',
          'setInterval и устаревший стейт',
          'Обход через функциональную форму setState',
          'useRef для актуального значения',
          'Стабильные колбэки и паттерн useEvent',
        ],
      },
      {
        slug: 'memoization',
        title: 'memo, useMemo, useCallback',
        summary:
          'Что именно мемоизируется, когда мемоизация бесполезна или вредна, React Compiler и его влияние.',
        estimatedMinutes: 90,
        subtopics: [
          'React.memo и поверхностное сравнение пропсов',
          'useMemo: когда он реально нужен',
          'useCallback и стабильность ссылок',
          'Почему мемоизация ломается одним объектом в пропсах',
          'Цена мемоизации и React Compiler',
        ],
      },
      {
        slug: 'context',
        title: 'Context и производительность',
        summary:
          'Как работает подписка на контекст, почему обновляются все потребители, разделение контекстов, селекторы.',
        estimatedMinutes: 80,
        subtopics: [
          'Provider, Consumer, useContext',
          'Почему меняется весь поддерево потребителей',
          'Разделение на контекст значения и контекст экшенов',
          'Мемоизация value провайдера',
          'Когда контекст не замена state manager',
        ],
      },
      {
        slug: 'refs',
        title: 'Refs, useRef, forwardRef, useImperativeHandle',
        summary:
          'Ref как изменяемая коробка, ref на DOM, callback ref, проброс ref, императивный API компонента.',
        estimatedMinutes: 70,
        subtopics: [
          'useRef для значений и для DOM',
          'Callback ref и измерение элемента',
          'forwardRef и ref как проп в React 19',
          'useImperativeHandle',
          'Когда ref — это костыль',
        ],
      },
      {
        slug: 'portals-errors',
        title: 'Portals и error boundaries',
        summary:
          'Порталы и всплытие событий, модалки и z-index, границы ошибок, что они не ловят, fallback-UI.',
        estimatedMinutes: 60,
        subtopics: [
          'createPortal и дерево React против дерева DOM',
          'Всплытие событий через портал',
          'Error boundary: getDerivedStateFromError, componentDidCatch',
          'Что error boundary не ловит',
          'Восстановление после ошибки',
        ],
      },
      {
        slug: 'suspense-concurrent',
        title: 'Suspense и concurrent features',
        summary:
          'Suspense для кода и данных, lazy, useTransition, useDeferredValue, прерывание рендера и tearing.',
        estimatedMinutes: 90,
        subtopics: [
          'React.lazy и Suspense для code splitting',
          'Suspense для данных',
          'useTransition и неблокирующие обновления',
          'useDeferredValue',
          'useSyncExternalStore и tearing',
        ],
      },
      {
        slug: 'react-19',
        title: 'React 19: actions, use, Server Components',
        summary:
          'Actions и useActionState, useOptimistic, хук use, ref как проп, Server Components на уровне понимания.',
        estimatedMinutes: 80,
        subtopics: [
          'Actions, useActionState, useFormStatus',
          'useOptimistic',
          'Хук use и условное чтение промисов',
          'Изменения API: ref как проп, убран forwardRef',
          'Server Components: границы client/server',
        ],
      },
      {
        slug: 'custom-hooks',
        title: 'Кастомные хуки',
        summary:
          'Как выносить логику, правила именования, композиция хуков, тестируемость, типичные ошибки проектирования API.',
        estimatedMinutes: 70,
        subtopics: [
          'Когда логика заслуживает своего хука',
          'Композиция хуков и переиспользование',
          'Стабильный возвращаемый API',
          'Хуки с подписками и cleanup',
          'Тестирование кастомных хуков',
        ],
      },
      {
        slug: 'react-patterns',
        title: 'Паттерны: compound components, render props, HOC',
        summary:
          'Классические паттерны композиции, их плюсы и минусы, что из этого актуально в 2026 году.',
        estimatedMinutes: 70,
        subtopics: [
          'Compound components и неявный контекст',
          'Render props и function as children',
          'HOC: где ещё встречается',
          'Композиция против конфигурации',
          'Controlled и uncontrolled компоненты',
        ],
      },
      {
        slug: 'rules-of-hooks',
        title: 'Правила хуков',
        summary:
          'Почему нельзя вызывать хуки условно, как React связывает вызовы с компонентом, eslint-plugin-react-hooks.',
        estimatedMinutes: 40,
        subtopics: [
          'Список хуков на fiber-узле',
          'Что сломается при условном вызове',
          'Хуки только в компонентах и хуках',
          'Правило зависимостей и когда его нарушают осознанно',
          'Что проверяет линтер',
        ],
      },
    ],
  },
  {
    id: 'state',
    title: 'State management',
    description:
      'Где должен жить стейт и почему. Redux Toolkit, Zustand и TanStack Query как три разных ответа на разные вопросы.',
    icon: '🗄️',
    topics: [
      {
        slug: 'local-vs-global',
        title: 'Локальный и глобальный стейт',
        summary:
          'Классификация стейта: серверный, клиентский, URL, форма. Критерии выноса наверх и подъём состояния.',
        estimatedMinutes: 60,
        subtopics: [
          'Виды стейта: server, client, URL, form',
          'Подъём состояния и prop drilling',
          'Когда нужен глобальный стор',
          'Состояние в URL как источник правды',
          'Колокация состояния',
        ],
      },
      {
        slug: 'redux-toolkit',
        title: 'Redux Toolkit',
        summary:
          'Store, slice, immer, селекторы и мемоизация, RTK Query, middleware, когда Redux всё ещё оправдан.',
        estimatedMinutes: 90,
        subtopics: [
          'createSlice, reducers, immer под капотом',
          'Селекторы и createSelector',
          'Асинхронность: createAsyncThunk и listener middleware',
          'RTK Query',
          'Нормализация данных',
        ],
      },
      {
        slug: 'zustand',
        title: 'Zustand',
        summary:
          'Стор вне React, подписка через селекторы, отсутствие провайдера, сравнение с Redux и Context.',
        estimatedMinutes: 50,
        subtopics: [
          'create и API стора',
          'Селекторы и предотвращение лишних ререндеров',
          'Middleware: persist, devtools, immer',
          'Стор вне компонента и useSyncExternalStore',
          'Сравнение с Redux Toolkit',
        ],
      },
      {
        slug: 'tanstack-query',
        title: 'TanStack Query',
        summary:
          'Кеш, ключи запросов, stale/fresh, инвалидация, оптимистичные обновления, дедупликация и ретраи.',
        estimatedMinutes: 90,
        subtopics: [
          'queryKey и структура кеша',
          'staleTime, gcTime, refetch-политики',
          'Инвалидация и ручное обновление кеша',
          'Мутации и оптимистичные обновления',
          'Пагинация и бесконечные списки',
        ],
      },
    ],
  },
  {
    id: 'browser',
    title: 'Браузер и сеть',
    description:
      'Что происходит между кликом и пикселем на экране, и что спрашивают про HTTP, CORS, производительность и безопасность.',
    icon: '🌐',
    topics: [
      {
        slug: 'dom-events',
        title: 'DOM и события',
        summary:
          'Фазы события, всплытие и погружение, делегирование, stopPropagation против preventDefault, синтетические события React.',
        estimatedMinutes: 70,
        subtopics: [
          'Capturing, target, bubbling',
          'Делегирование событий',
          'stopPropagation, stopImmediatePropagation, preventDefault',
          'Синтетические события React и место подписки',
          'Пассивные слушатели и производительность скролла',
        ],
      },
      {
        slug: 'rendering-path',
        title: 'Критический путь рендеринга',
        summary:
          'От HTML до пикселей: DOM, CSSOM, layout, paint, composite. Reflow и repaint, блокирующие ресурсы.',
        estimatedMinutes: 70,
        subtopics: [
          'Парсинг HTML, CSSOM, render tree',
          'Layout, paint, composite',
          'Что вызывает reflow и как его избежать',
          'Блокирующий CSS и JS, defer и async',
          'Слои композиции и transform/opacity',
        ],
      },
      {
        slug: 'http-cors',
        title: 'HTTP и CORS',
        summary:
          'Методы и коды, заголовки, preflight-запросы, credentials, почему CORS — это про браузер, а не про сервер.',
        estimatedMinutes: 70,
        subtopics: [
          'Методы, статусы, идемпотентность',
          'Same-origin policy',
          'Простые и preflight-запросы',
          'Access-Control-* заголовки и credentials',
          'HTTP/2, HTTP/3 кратко',
        ],
      },
      {
        slug: 'caching',
        title: 'Кеширование',
        summary:
          'Cache-Control, ETag, условные запросы, кеш браузера против CDN, стратегии кеширования бандла.',
        estimatedMinutes: 60,
        subtopics: [
          'Cache-Control: max-age, no-cache, immutable',
          'ETag и If-None-Match',
          'Хеши в именах файлов и вечный кеш',
          'Service Worker и офлайн',
          'localStorage, sessionStorage, IndexedDB, cookies',
        ],
      },
      {
        slug: 'web-vitals',
        title: 'Web Vitals и производительность',
        summary:
          'LCP, INP, CLS: что измеряют и как чинить. Профилирование React, long tasks, виртуализация списков.',
        estimatedMinutes: 70,
        subtopics: [
          'LCP, INP, CLS и их пороги',
          'Long tasks и отзывчивость интерфейса',
          'React Profiler и поиск лишних ререндеров',
          'Виртуализация длинных списков',
          'Оптимизация изображений и шрифтов',
        ],
      },
      {
        slug: 'bundle-optimization',
        title: 'Бандл и загрузка',
        summary:
          'Code splitting, lazy, preload/prefetch, tree shaking, анализ бандла, что реально даёт прирост.',
        estimatedMinutes: 60,
        subtopics: [
          'Code splitting по роутам и по компонентам',
          'React.lazy и Suspense',
          'preload, prefetch, preconnect',
          'Tree shaking и sideEffects',
          'Анализ размера бандла',
        ],
      },
      {
        slug: 'web-security',
        title: 'XSS, CSRF и безопасность фронтенда',
        summary:
          'Откуда берётся XSS в React, dangerouslySetInnerHTML, CSP, CSRF-токены, SameSite, хранение токенов.',
        estimatedMinutes: 70,
        subtopics: [
          'XSS: stored, reflected, DOM-based',
          'Почему React защищает от XSS и где дыра',
          'Content Security Policy',
          'CSRF и SameSite cookies',
          'Где хранить JWT и почему не в localStorage',
        ],
      },
    ],
  },
  {
    id: 'testing',
    title: 'Тестирование',
    description:
      'Что тестировать во фронтенде и как не написать тесты, которые ломаются от любого рефакторинга.',
    icon: '✅',
    topics: [
      {
        slug: 'vitest-jest',
        title: 'Vitest и Jest: основы',
        summary:
          'Структура теста, матчеры, setup/teardown, фейковые таймеры, снапшоты и почему их обычно не стоит любить.',
        estimatedMinutes: 60,
        subtopics: [
          'describe, it, expect и матчеры',
          'beforeEach, afterEach и изоляция',
          'Фейковые таймеры',
          'Снапшот-тесты: когда оправданы',
          'Vitest против Jest',
        ],
      },
      {
        slug: 'rtl',
        title: 'React Testing Library',
        summary:
          'Запросы по роли и тексту, userEvent, асинхронные ожидания, тестирование хуков, что НЕ надо тестировать.',
        estimatedMinutes: 80,
        subtopics: [
          'Приоритет запросов: getByRole и далее',
          'userEvent против fireEvent',
          'findBy, waitFor и асинхронность',
          'Тестирование кастомных хуков',
          'Почему не тестируем внутренний стейт',
        ],
      },
      {
        slug: 'what-to-test',
        title: 'Что и как тестировать',
        summary:
          'Пирамида и трофей тестов, юнит против интеграционных, покрытие как метрика, тесты на баг-репорт.',
        estimatedMinutes: 50,
        subtopics: [
          'Пирамида против testing trophy',
          'Что действительно даёт уверенность',
          'Покрытие и его пределы',
          'Регрессионный тест на каждый баг',
          'Тестирование в CI',
        ],
      },
      {
        slug: 'mocks',
        title: 'Моки и изоляция',
        summary:
          'Моки модулей, спаи, MSW для сети, подмена таймеров и Date, чем мок отличается от стаба.',
        estimatedMinutes: 60,
        subtopics: [
          'vi.mock, vi.spyOn и их область действия',
          'MSW и мок сети на уровне запросов',
          'Подмена Date и таймеров',
          'Мок, стаб, фейк, спай',
          'Когда мок означает плохую архитектуру',
        ],
      },
    ],
  },
  {
    id: 'architecture',
    title: 'Архитектура фронтенда',
    description:
      'Как объяснить структуру проекта и обосновать решения. На middle это отличает от junior сильнее, чем знание API.',
    icon: '🏛️',
    topics: [
      {
        slug: 'project-structure',
        title: 'Структура проекта и FSD',
        summary:
          'Группировка по типам против группировки по фичам, Feature-Sliced Design, слои и правила зависимостей.',
        estimatedMinutes: 70,
        subtopics: [
          'По типам против по фичам',
          'FSD: слои, слайсы, сегменты',
          'Правило направления зависимостей',
          'Публичный API модуля и index-файлы',
          'Когда FSD избыточен',
        ],
      },
      {
        slug: 'solid-frontend',
        title: 'SOLID во фронтенде',
        summary:
          'Как принципы SOLID выглядят в компонентах и хуках, а не в абстрактных классах из учебника.',
        estimatedMinutes: 60,
        subtopics: [
          'Single responsibility для компонента',
          'Open/closed через композицию и слоты',
          'Liskov и подмена компонентов',
          'Interface segregation в пропсах',
          'Dependency inversion и инъекция зависимостей',
        ],
      },
      {
        slug: 'logic-ui-separation',
        title: 'Разделение логики и UI',
        summary:
          'Презентационные и контейнерные компоненты, вынос в хуки, чистые функции и тестируемость.',
        estimatedMinutes: 60,
        subtopics: [
          'Презентационные и контейнерные компоненты',
          'Вынос логики в кастомные хуки',
          'Чистые функции и доменный слой',
          'Слой API и типизированные клиенты',
          'Границы ответственности между слоями',
        ],
      },
      {
        slug: 'error-handling',
        title: 'Обработка ошибок',
        summary:
          'Стратегия ошибок в SPA: границы ошибок, состояния загрузки, ретраи, логирование, сообщения пользователю.',
        estimatedMinutes: 60,
        subtopics: [
          'Ошибки рендера и ошибки данных',
          'Error boundaries и fallback',
          'Состояния loading / empty / error',
          'Ретраи и деградация',
          'Логирование и мониторинг',
        ],
      },
    ],
  },
  {
    id: 'behavioral',
    title: 'Поведенческое интервью',
    description:
      'Половина отказов на middle — не про код. Заготовленные истории, честная оценка задач и разговор о конфликтах.',
    icon: '💬',
    topics: [
      {
        slug: 'self-presentation',
        title: 'Рассказ о себе и проектах',
        summary:
          'Структура рассказа на 2–3 минуты, как подать фриланс-опыт, какие детали проекта интервьюер ждёт услышать.',
        estimatedMinutes: 60,
        subtopics: [
          'Структура «о себе» на 2–3 минуты',
          'Как подавать фриланс и пет-проекты',
          'Технические решения и их обоснование',
          'Метрики и результат вместо списка задач',
          'Вопросы, которые задаёте вы',
        ],
      },
      {
        slug: 'star-method',
        title: 'STAR-метод',
        summary:
          'Situation, Task, Action, Result: как собрать 5–6 историй, которые закроют большинство поведенческих вопросов.',
        estimatedMinutes: 50,
        subtopics: [
          'Формула STAR и типичные ошибки',
          'Банк из 5–6 универсальных историй',
          'История про сложный баг',
          'История про провал и выводы',
          'История про инициативу',
        ],
      },
      {
        slug: 'conflicts',
        title: 'Конфликты и работа в команде',
        summary:
          'Разногласия с коллегами и заказчиком, код-ревью, обратная связь, работа с неопределёнными требованиями.',
        estimatedMinutes: 50,
        subtopics: [
          'Разногласие по техническому решению',
          'Конфликт с заказчиком о скоупе',
          'Код-ревью: давать и принимать критику',
          'Работа с расплывчатыми требованиями',
          'Что не надо говорить про прошлых работодателей',
        ],
      },
      {
        slug: 'estimation',
        title: 'Оценка задач и дедлайны',
        summary:
          'Как оценивать сроки, декомпозиция, буфер, что делать при срыве срока, разговор про переработки.',
        estimatedMinutes: 50,
        subtopics: [
          'Декомпозиция и оценка',
          'Буфер и неопределённость',
          'Что делать, когда срок горит',
          'Технический долг и его продажа бизнесу',
          'Переработки и границы',
        ],
      },
    ],
  },
];
