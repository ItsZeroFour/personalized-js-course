# Типизация React-компонентов и хуков

## Пропсы: type или interface

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled = false }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}
```

`interface` расширяется через `extends` и поддерживает declaration merging,
`type` умеет union, intersection и mapped types. Для пропсов годится и то и другое;
главное — единообразие в проекте.

## React.FC: почему от него отказались

```tsx
const Button: React.FC<ButtonProps> = ({ label }) => <button>{label}</button>;
```

Минусы: раньше он неявно добавлял `children` (в React 18 типах это убрали),
плохо работает с дженериками и мешает `defaultProps`. Современная практика —
обычная функция с типизированными пропсами. `React.FC` в коде — повод для вопроса
на собеседовании.

## children

```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;        // всё, что React умеет отрендерить
}

// эквивалент
type CardProps = React.PropsWithChildren<{ title: string }>;
```

Различайте типы:

- `ReactNode` — любой валидный child: элемент, строка, число, массив, `null`, `false`;
- `ReactElement` — конкретно результат JSX;
- `JSX.Element` — то же, что `ReactElement<unknown, never>`;
- `ComponentType<P>` — сам компонент (функция или класс), а не его результат.

```tsx
interface Props {
  icon: React.ReactNode;              // <Icon />
  renderRow: (item: Item) => React.ReactNode;  // render prop
  Component: React.ComponentType<RowProps>;    // сам компонент, рендерим как <Component />
}
```

## Наследование пропсов DOM-элемента

```tsx
interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary';
}

function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return <button className={`${variant} ${className ?? ''}`} {...rest} />;
}
```

Так компонент сразу принимает `onClick`, `type`, `aria-label` и всё остальное
с правильными типами. `ComponentPropsWithRef<'button'>` — вариант с `ref`.

Взять пропсы чужого компонента:

```tsx
type LinkProps = React.ComponentProps<typeof Link>;
```

## События

```tsx
function Form() {
  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log(event.submitter);      // кнопка, которой отправили форму
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log(event.target.value);   // string, потому что указан HTMLInputElement
  };

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    console.log(event.currentTarget.name);
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

`currentTarget` типизирован точно (элемент с обработчиком), `target` — шире.

В свежих версиях `@types/react` тип `FormEvent` помечен устаревшим — такого события в DOM
нет. Для `onSubmit` — `SubmitEvent`, для `onChange` — `ChangeEvent`, для `onInput` — `InputEvent`.
В старых кодовых базах `React.FormEvent` встречается повсеместно — это не ошибка, просто
менее точный тип.
Если обработчик пишется прямо в JSX, тип события выводится сам — аннотация не нужна.

## useState

```tsx
const [count, setCount] = useState(0);              // number выведен
const [user, setUser] = useState<User | null>(null); // без аннотации было бы null
const [items, setItems] = useState<Item[]>([]);      // без аннотации never[]
```

Ленивая инициализация типизируется так же:

```tsx
const [state, setState] = useState<State>(() => computeExpensiveInitial());
```

Тип сеттера — `React.Dispatch<React.SetStateAction<T>>`, где
`SetStateAction<T> = T | ((prev: T) => T)`.

## useRef: три разных случая

```tsx
// 1. Ref на DOM-элемент: инициализируем null, тип элемента в дженерике
const inputRef = useRef<HTMLInputElement>(null);   // RefObject, current только для чтения
inputRef.current?.focus();

// 2. Изменяемое значение (не DOM)
const timerRef = useRef<number | null>(null);      // MutableRefObject, current можно писать
timerRef.current = window.setTimeout(() => {}, 100);

// 3. Ref, который передаётся дальше
const ref = useRef<HTMLDivElement | null>(null);
```

Разница между первым и вторым — в перегрузках: `useRef<T>(null)` возвращает
`RefObject<T>` с `readonly current`, а `useRef<T | null>(null)` — изменяемый.

## useReducer

```tsx
type State = { count: number; status: 'idle' | 'busy' };

type Action =
  | { type: 'increment'; by: number }
  | { type: 'reset' }
  | { type: 'setStatus'; status: State['status'] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + action.by };
    case 'reset':
      return { ...state, count: 0 };
    case 'setStatus':
      return { ...state, status: action.status };
    default: {
      const never: never = action;    // защита от забытой ветки
      return never;
    }
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0, status: 'idle' });
```

Discriminated union для экшенов — главный приём: `dispatch({ type: 'increment' })`
без `by` не скомпилируется.

## Кастомные хуки

```tsx
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle] as const;     // [boolean, () => void]
}
```

Без `as const` вернётся `(boolean | (() => void))[]` и деструктуризация сломается.
Для трёх и более значений лучше объект — не нужно помнить порядок.

Хук с дженериком и отменой:

```tsx
function useFetch<T>(url: string) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }
  >({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch(url, { signal: controller.signal })
      .then((response) => response.json() as Promise<T>)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setState({ status: 'error', error: error as Error });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
```

Обратите внимание: `response.json()` возвращает `Promise<any>` — это дыра в типах,
которую в продакшене закрывают валидацией схемой (Zod, Valibot), а не приведением.

## Context

```tsx
interface AuthContextValue {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth должен вызываться внутри AuthProvider');
  }
  return context;
}
```

Приём с `null` по умолчанию и проверкой в хуке решает две задачи сразу: убирает
`| null` из типа у всех потребителей и ловит использование вне провайдера.

## Дженерик-компоненты и полиморфизм

```tsx
function List<T>({ items, renderItem }: { items: T[]; renderItem: (item: T) => React.ReactNode }) {
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item)}</li>)}</ul>;
}
```

Полиморфный компонент (проп `as`) — частая задача на middle+:

```tsx
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'children'>;

function Text<E extends React.ElementType = 'span'>({ as, ...rest }: PolymorphicProps<E>) {
  const Component = as ?? 'span';
  return <Component {...rest} />;
}

<Text as="a" href="/about">О нас</Text>;   // href разрешён только при as="a"
```

## Частые ошибки

```tsx
useState([]);                      // never[] — задайте тип явно
const ref = useRef();              // undefined — задайте тип или начальное значение
onChange={(e: any) => {}}          // any убивает смысл типизации
props as ButtonProps               // as вместо честного описания типа
```

## Как это спрашивают

- «Как типизировать пропсы с children?» — `ReactNode` и `PropsWithChildren`.
- «Чем `ReactNode` отличается от `ReactElement`?»
- «Как унаследовать пропсы обычного `<button>`?» — `ComponentPropsWithoutRef`.
- «Как типизировать `useReducer`?» — discriminated union + exhaustive check.
- «Почему кастомный хук возвращает `as const`?»
- «Как сделать компонент с пропом `as`?» — дженерик по `React.ElementType`.
- «Что вернёт `response.json()` и почему это опасно?»
