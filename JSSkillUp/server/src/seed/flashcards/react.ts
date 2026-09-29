import type { SeedFlashcard } from '../types.js';

export const reactFlashcards: SeedFlashcard[] = [
  // --- rendering-reconciliation ---
  {
    topic: 'rendering-reconciliation',
    front: 'Три причины ререндера компонента',
    back: 'Изменился его state; перерисовался родитель; изменилось значение контекста, который он читает. Пропсы сами рендер не вызывают — рендерится родитель.',
  },
  {
    topic: 'rendering-reconciliation',
    front: 'Эвристики reconciliation',
    back: 'Разный тип элемента → поддерево пересоздаётся (state теряется). Тот же тип → обновление на месте. Списки сопоставляются по `key`. Сложность O(n).',
  },
  {
    topic: 'rendering-reconciliation',
    front: 'Почему нельзя объявлять компонент внутри другого компонента?',
    back: 'На каждом рендере создаётся новая функция = новый тип. React размонтирует и заново смонтирует поддерево: теряется state, фокус, эффекты перезапускаются.',
  },
  {
    topic: 'rendering-reconciliation',
    front: 'Порядок: рендер и эффекты родителя и ребёнка',
    back: 'Рендер — сверху вниз (родитель → ребёнок). Эффекты — снизу вверх (ребёнок → родитель). Cleanup — перед следующим запуском эффекта и при размонтировании.',
  },

  // --- fiber ---
  {
    topic: 'fiber',
    front: 'Что такое Fiber?',
    back: 'Узел внутреннего дерева React (по одному на элемент) со ссылками child/sibling/return, pending-пропсами и очередью обновлений. Итеративный обход позволяет прерывать и приоритизировать рендер.',
  },
  {
    topic: 'fiber',
    front: 'Render phase vs commit phase',
    back: 'Render: вызов компонентов, расчёт изменений; может быть прерван и повторён — должен быть чистым. Commit: изменения DOM, ref, layout-эффекты — синхронно и без прерываний.',
  },
  {
    topic: 'fiber',
    front: 'Что делает StrictMode в dev?',
    back: 'Дважды вызывает рендер и цикл эффект → cleanup → эффект при монтировании, чтобы выявить нечистый рендер и неполный cleanup. В production не действует.',
  },

  // --- keys-lists ---
  {
    topic: 'keys-lists',
    front: 'Чем плох `key={index}`?',
    back: 'Идентичность привязана к позиции: при вставке/удалении/сортировке state и DOM одного элемента достаются другому (неконтролируемые инпуты, фокус, анимации).',
  },
  {
    topic: 'keys-lists',
    front: 'Чем плох `key={Math.random()}`?',
    back: 'Ключ новый на каждом рендере → все элементы размонтируются и монтируются заново: потеря state, лишние эффекты, медленно.',
  },
  {
    topic: 'keys-lists',
    front: 'Как сбросить state компонента при смене сущности?',
    back: '`<Profile key={userId} />` — смена ключа = новый экземпляр с чистым state. Лучше, чем `useEffect` со сбросом.',
  },

  // --- state-hooks ---
  {
    topic: 'state-hooks',
    front: 'Что выведет `console.log(count)` сразу после `setCount(count + 1)`?',
    back: 'Старое значение. State — снапшот рендера; setState ставит обновление в очередь, новое значение появится в следующем рендере.',
  },
  {
    topic: 'state-hooks',
    front: 'Функциональное обновление — когда обязательно?',
    back: 'Когда новое значение зависит от предыдущего и обновлений несколько подряд или колбэк долгоживущий (таймер, подписка): `setCount(c => c + 1)`.',
  },
  {
    topic: 'state-hooks',
    front: 'Ленивая инициализация useState',
    back: '`useState(() => expensive())` — функция вызовется только при монтировании. `useState(expensive())` вызывает её на каждом рендере.',
  },
  {
    topic: 'state-hooks',
    front: 'Automatic batching (React 18+)',
    back: 'Несколько setState подряд дают один ререндер — в обработчиках, промисах, таймерах, нативных событиях. Отключить точечно — `flushSync`.',
  },

  // --- effects ---
  {
    topic: 'effects',
    front: 'Когда запускается useEffect и его cleanup?',
    back: 'После коммита и отрисовки. Cleanup — перед следующим запуском (с values прошлого рендера) и при размонтировании.',
  },
  {
    topic: 'effects',
    front: 'useEffect vs useLayoutEffect',
    back: 'useEffect — после отрисовки, не блокирует кадр. useLayoutEffect — синхронно после изменений DOM, до отрисовки: для измерений и правок без мигания.',
  },
  {
    topic: 'effects',
    front: 'Как избежать гонки запросов в useEffect?',
    back: 'Флаг `ignore` в cleanup или `AbortController` (`return () => controller.abort()`); отменённый запрос — не ошибка.',
  },
  {
    topic: 'effects',
    front: 'Когда эффект не нужен?',
    back: 'Производные данные (считать при рендере), реакция на действие пользователя (в обработчике), сброс state при смене пропса (`key`), уведомление родителя (в том же обработчике).',
  },

  // --- stale-closures ---
  {
    topic: 'stale-closures',
    front: 'Что такое stale closure в React?',
    back: 'Функция замкнула пропсы/state старого рендера и продолжает ими пользоваться: колбэк интервала, подписки, useCallback/useMemo с неполными зависимостями.',
  },
  {
    topic: 'stale-closures',
    front: 'Способы исправить stale closure',
    back: 'Полные зависимости; функциональный setState; ref с актуальным значением («latest ref»); `useEffectEvent`; useReducer (state читается в редьюсере).',
  },
  {
    topic: 'stale-closures',
    front: 'Почему `useCallback(fn, [])` может быть багом?',
    back: 'Функция навсегда видит значения первого рендера. Если внутри читается state/пропсы — это stale closure. Нужны зависимости или функциональное обновление.',
  },

  // --- memoization ---
  {
    topic: 'memoization',
    front: 'memo vs useMemo vs useCallback',
    back: '`memo(Component)` — пропускает рендер при равных пропсах (`Object.is`). `useMemo` — кеш значения. `useCallback` — кеш функции (= `useMemo(() => fn)`).',
  },
  {
    topic: 'memoization',
    front: 'Почему memo не работает с `onClick={() => …}`?',
    back: 'Стрелка в JSX — новая функция на каждый рендер; пропс всегда «изменился». Нужен `useCallback` или стабильная функция (например, сеттер из useState).',
  },
  {
    topic: 'memoization',
    front: 'Структурные оптимизации до мемоизации',
    back: 'Опустить state ниже (в компонент, которому он нужен); передать дорогое поддерево как `children` — оно не перерисуется при изменении state обёртки.',
  },
  {
    topic: 'memoization',
    front: 'Что делает React Compiler?',
    back: 'На этапе сборки автоматически мемоизирует компоненты и значения (аналог memo/useMemo/useCallback). Требует соблюдения правил React: чистый рендер, иммутабельность.',
  },

  // --- context ---
  {
    topic: 'context',
    front: 'Кто перерисуется при смене value контекста?',
    back: 'Все потребители этого контекста, даже в `memo` и даже если используют неизменившуюся часть. Селекторов у Context нет.',
  },
  {
    topic: 'context',
    front: 'Как снизить ререндеры от Context?',
    back: 'Мемоизировать value (`useMemo`, `useCallback`); разделить контексты по частоте изменений; state и actions — в разные контексты; для частых обновлений — стор с селекторами.',
  },
  {
    topic: 'context',
    front: 'Когда используется defaultValue из `createContext`?',
    back: 'Только если выше по дереву нет провайдера. Практика: `createContext<T | null>(null)` + хук, который бросает ошибку вне провайдера.',
  },

  // --- refs ---
  {
    topic: 'refs',
    front: 'useRef vs useState',
    back: 'Ref — изменяемый контейнер `{ current }`, живёт между рендерами, изменение не вызывает рендер. Всё, что показывается пользователю, — state.',
  },
  {
    topic: 'refs',
    front: 'Когда `ref.current` DOM-элемента становится доступен?',
    back: 'В фазе коммита, до layout-эффектов. Во время рендера — `null` (при первом монтировании).',
  },
  {
    topic: 'refs',
    front: 'Ref в React 19',
    back: '`ref` — обычный проп функциональных компонентов, `forwardRef` не нужен. Ref-колбэк может вернуть функцию очистки.',
  },
  {
    topic: 'refs',
    front: 'Зачем `useImperativeHandle`?',
    back: 'Отдать родителю ограниченный императивный API (`focus`, `scrollToTop`) вместо DOM-узла целиком.',
  },

  // --- portals-errors ---
  {
    topic: 'portals-errors',
    front: 'Куда всплывают события из портала?',
    back: 'По дереву React, а не DOM: `onClick` React-родителя сработает, хотя в DOM портал в `body`. Контекст тоже доступен.',
  },
  {
    topic: 'portals-errors',
    front: 'Методы error boundary',
    back: '`static getDerivedStateFromError` — перейти в fallback (render phase, без эффектов). `componentDidCatch` — логирование (commit phase). Только классом.',
  },
  {
    topic: 'portals-errors',
    front: 'Что error boundary не ловит?',
    back: 'Ошибки в обработчиках событий, асинхронном коде (setTimeout, промисы), SSR и в самой границе.',
  },

  // --- suspense-concurrent ---
  {
    topic: 'suspense-concurrent',
    front: 'Как компонент «приостанавливается»?',
    back: 'Бросает промис (исторически) или вызывает `use(promise)`. React показывает fallback ближайшего `<Suspense>` и повторяет рендер, когда промис выполнится.',
  },
  {
    topic: 'suspense-concurrent',
    front: 'useTransition',
    back: '`startTransition(() => setTab(next))` — несрочное обновление: прерывается ради ввода, не показывает fallback для уже видимого контента, `isPending` для индикатора.',
  },
  {
    topic: 'suspense-concurrent',
    front: 'useDeferredValue vs debounce',
    back: 'useDeferredValue — фоновый рендер с отложенным значением без фиксированной задержки, прерываемый новым вводом. Запросы не сокращает — для сети нужен debounce.',
  },

  // --- react-19 ---
  {
    topic: 'react-19',
    front: 'Хук `use`',
    back: 'Читает промис (через Suspense) или контекст. Можно вызывать условно. Промис должен быть стабильным (создан вне рендера или закеширован).',
  },
  {
    topic: 'react-19',
    front: 'useActionState, useFormStatus, useOptimistic',
    back: 'useActionState — результат и isPending async-действия формы. useFormStatus — статус родительской формы из дочернего компонента. useOptimistic — временное значение до ответа сервера.',
  },
  {
    topic: 'react-19',
    front: 'Server Components — главное',
    back: 'Выполняются только на сервере, код не попадает в бандл, могут быть async. Без state, эффектов и обработчиков; интерактивность — в `"use client"`-компонентах.',
  },
  {
    topic: 'react-19',
    front: 'Actions в React 19',
    back: 'Async-функции в transitions: `<form action={fn}>`, `startTransition(async () => …)`. React сам ведёт pending-состояние, ошибки и сброс формы.',
  },

  // --- custom-hooks ---
  {
    topic: 'custom-hooks',
    front: 'Разделяют ли два компонента состояние одного кастомного хука?',
    back: 'Нет. Хук переиспользует логику; каждый вызов — своё state в своём компоненте.',
  },
  {
    topic: 'custom-hooks',
    front: 'Правила хорошего кастомного хука',
    back: 'Имя с `use`; правила хуков внутри; стабильный возвращаемый API (useCallback/useMemo); не знает о разметке; тестируется через renderHook.',
  },
  {
    topic: 'custom-hooks',
    front: 'Функция без хуков внутри — это хук?',
    back: 'Нет, это обычная функция: префикс `use` ей не нужен и вводит в заблуждение линтер и React Compiler.',
  },

  // --- react-patterns ---
  {
    topic: 'react-patterns',
    front: 'Compound components',
    back: 'Набор компонентов с общим состоянием через неявный контекст: `<Tabs><Tabs.List/><Tabs.Panel/></Tabs>`. Гибкая разметка, логика и a11y внутри.',
  },
  {
    topic: 'react-patterns',
    front: 'Controlled vs uncontrolled',
    back: 'Controlled: значение из пропса + `onChange`, источник истины у родителя. Uncontrolled: `defaultValue`, значение внутри (DOM или свой state). Переключаться на лету нельзя.',
  },
  {
    topic: 'react-patterns',
    front: 'HOC и render props — минусы',
    back: 'Wrapper hell, коллизии имён пропсов, неявные источники данных, сложная типизация. Хуки переиспользуют логику без изменения дерева.',
  },

  // --- rules-of-hooks ---
  {
    topic: 'rules-of-hooks',
    front: 'Правила хуков',
    back: '1) Только на верхнем уровне — без условий, циклов, раннего return перед хуком. 2) Только в компонентах и кастомных хуках. Исключение — `use` можно вызывать условно.',
  },
  {
    topic: 'rules-of-hooks',
    front: 'Почему порядок хуков важен?',
    back: 'React хранит состояния хуков списком на fiber и сопоставляет их по порядку вызова. Пропуск хука сдвигает все последующие.',
  },
  {
    topic: 'rules-of-hooks',
    front: 'Что проверяет `exhaustive-deps`?',
    back: 'Что все значения из рендера, используемые в эффекте/useMemo/useCallback, указаны в зависимостях — защита от stale closure.',
  },
];
