# Zustand

## Стор за пять строк

```js
import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  add: (item) => set((state) => ({ items: [...state.items, item] })),
  remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  total: () => get().items.reduce((sum, i) => sum + i.price, 0),
}));
```

- **Без провайдера**: стор — модульный синглтон, хук работает в любом компоненте.
- `set` **мержит** объект на верхнем уровне (как `setState` в классах), вложенные объекты —
  вручную или через middleware `immer`.
- Действия лежат в том же сторе — отдельные action-типы и редьюсеры не нужны.

## Селекторы и лишние ререндеры

```js
const items = useCartStore((state) => state.items);  // подписка на items
const add = useCartStore((state) => state.add);      // функции стабильны
const store = useCartStore();                         // подписка на ВСЁ — ререндер на любое изменение
```

Zustand перерисовывает компонент, когда **результат селектора** изменился по `Object.is`.
Поэтому:

- выбирайте минимально нужное;
- селектор, возвращающий новый объект, будит компонент на каждое изменение стора —
  используйте `useShallow`:

```js
import { useShallow } from 'zustand/react/shallow';
const { items, add } = useCartStore(useShallow((s) => ({ items: s.items, add: s.add })));
```

- производные значения вычисляйте в селекторе (`s => s.items.length`) — компонент
  перерисуется только при изменении результата.

## Middleware: persist, devtools, immer

```js
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useSettings = create(
  devtools(
    persist(
      immer((set) => ({
        theme: 'light',
        toggle: () => set((state) => { state.theme = state.theme === 'light' ? 'dark' : 'light'; }),
      })),
      { name: 'settings' },     // ключ в localStorage
    ),
  ),
);
```

- `persist` — сохранение в localStorage (или другое хранилище), версии и миграции,
  `partialize` — что сохранять;
- `devtools` — Redux DevTools;
- `immer` — «мутирующий» синтаксис в `set`.

## Стор вне компонентов

```js
useCartStore.getState().add(item);                     // в обработчике, утилите, интерсепторе
const unsubscribe = useCartStore.subscribe((state) => console.log(state.items.length));
```

Удобно для интеграции с не-React кодом (interceptor HTTP-клиента берёт токен из стора).
Но в рендере используйте хук — `getState()` не подписывает компонент на изменения.

Внутри Zustand использует `useSyncExternalStore`, поэтому корректно работает с concurrent
rendering (без tearing).

Минус синглтона — состояние **общее** для всего процесса: в SSR это утечка между
запросами, в тестах — между тестами. Для этого есть паттерн «стор в контексте»
(`createStore` + провайдер) и сброс состояния в `beforeEach`.

## Сравнение с Redux Toolkit

| | Zustand | Redux Toolkit |
| --- | --- | --- |
| шаблонный код | минимум | слайсы, экшены, стор |
| провайдер | не нужен | нужен |
| действия | методы стора | action + reducer |
| DevTools | через middleware | из коробки, time travel |
| серверные данные | нет (берут TanStack Query) | RTK Query |
| структура | на усмотрение команды | строгие соглашения |

Zustand — для небольших и средних приложений и локальных «сторов фич». RTK — когда
большая команда, сложная доменная логика, важен журнал событий и единые правила.

## Как это спрашивают

- «Как избежать лишних ререндеров в Zustand?» — селекторы, `useShallow`.
- «Почему Zustand не нужен провайдер? Какие у этого минусы?» — синглтон, SSR, тесты.
- «Как сохранить стор в localStorage?» — `persist`.
- «Zustand или Redux Toolkit — что выберете и почему?»
