# Дженерики

## Зачем они

Дженерик — это **параметр типа**: способ описать связь между входом и выходом,
не фиксируя конкретный тип.

```ts
function identity(value: any): any {}      // связь потеряна: вход any, выход any
function identity<T>(value: T): T {}       // связь сохранена
```

```ts
const a = identity('строка');   // a: string
const b = identity(42);         // b: number
```

Практический критерий: дженерик нужен, когда тип результата **зависит** от типа аргумента.
Если не зависит — дженерик лишний.

```ts
// Дженерик бесполезен: T используется один раз
function log<T>(value: T): void {}
function log(value: unknown): void {}       // то же самое, но честнее
```

## Вывод и явное указание

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

first([1, 2, 3]);           // T выведен как number
first<string>(['a']);       // указан явно
```

Указывать явно нужно, когда вывести не из чего:

```ts
const response = await request<User[]>('/api/users');
```

## Ограничения через extends

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest('abc', 'de');        // OK
longest([1, 2], [3]);        // OK
longest(1, 2);               // Error: number не имеет length
```

Ограничение — это одновременно и проверка, и разрешение пользоваться свойствами.
Без `extends` внутри функции `T` — практически `unknown`.

## keyof, typeof и индексный доступ

```ts
interface User {
  id: string;
  name: string;
  age: number;
}

type UserKeys = keyof User;            // 'id' | 'name' | 'age'
type Age = User['age'];                // number
type Values = User[keyof User];        // string | number
```

`typeof` в позиции типа берёт тип существующего значения:

```ts
const defaults = { retries: 3, timeout: 1000 };
type Defaults = typeof defaults;       // { retries: number; timeout: number }
```

Классическая типобезопасная функция доступа:

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { id: '1', name: 'Аня', age: 25 };
getProperty(user, 'age');     // number
getProperty(user, 'email');   // Error: 'email' не ключ User
```

Это одна из самых частых задач на собеседовании по TypeScript.

## Значения по умолчанию

```ts
interface ApiResponse<TData = unknown, TError = Error> {
  data: TData | null;
  error: TError | null;
}

type Plain = ApiResponse;              // data: unknown | null
type Users = ApiResponse<User[]>;
```

## Несколько параметров и связь между ними

```ts
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) result[key] = obj[key];
  return result;
}

pick(user, ['id', 'name']);   // { id: string; name: string }
```

Обратите внимание: `Pick<T, K>` здесь возвращает **точный** тип, а не `Partial<T>` —
именно ради этого нужен второй параметр.

## Дженерики в интерфейсах и классах

```ts
interface Repository<T extends { id: string }> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
}

class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private items = new Map<string, T>();

  async getAll(): Promise<T[]> {
    return [...this.items.values()];
  }
  async getById(id: string): Promise<T | null> {
    return this.items.get(id) ?? null;
  }
  async save(entity: T): Promise<void> {
    this.items.set(entity.id, entity);
  }
}
```

## Дженерик-функция против дженерик-типа

```ts
type Mapper = <T, U>(items: T[], fn: (item: T) => U) => U[];  // параметры у функции
type Mapper2<T, U> = (items: T[], fn: (item: T) => U) => U[]; // параметры у типа
```

В первом случае тип конкретизируется в момент **вызова**, во втором — в момент
**объявления переменной**. Первый вариант гибче.

## Дженерик-компоненты в React

```tsx
interface SelectProps<T> {
  items: T[];
  value: T | null;
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  onChange: (item: T) => void;
}

function Select<T>({ items, value, getKey, renderItem, onChange }: SelectProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)} onClick={() => onChange(item)}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

<Select
  items={users}
  value={selected}
  getKey={(user) => user.id}       // user выведен как User
  renderItem={(user) => user.name}
  onChange={setSelected}
/>
```

Тип выводится из `items`, и все колбэки получают правильный тип автоматически.

В `.tsx` стрелочная дженерик-функция конфликтует с JSX:

```tsx
const f = <T>(x: T) => x;     // Error: T разобрано как JSX-тег
const f = <T,>(x: T) => x;    // запятая снимает неоднозначность
```

Проще объявлять такие компоненты через `function`.

## Дженерики в хуках

```ts
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initial;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;   // as const даёт кортеж, а не массив union
}
```

`as const` в возврате — важная деталь: без него тип будет
`(T | Dispatch<SetStateAction<T>>)[]`, и деструктуризация сломается.

## Частые ошибки

```ts
// 1. Дженерик там, где нужен union
function handle<T extends 'a' | 'b'>(kind: T) {}   // избыточно
function handle(kind: 'a' | 'b') {}                // достаточно

// 2. Попытка создать значение типа T внутри функции
function make<T>(): T {
  return {} as T;      // ложь: T может быть чем угодно
}

// 3. Ограничение вместо конкретного типа
function f<T extends string>(s: T) {}   // почти всегда достаточно (s: string)
```

## Как это спрашивают

- «Зачем нужны дженерики?» — связь типов входа и выхода.
- «Напишите типобезопасный `get(obj, key)`» — `K extends keyof T` и `T[K]`.
- «Что такое `keyof` и `typeof` в типах?»
- «Как типизировать компонент, который работает с любыми элементами списка?»
- «Почему из хука возвращают `as const`?»
- «Когда дженерик избыточен?» — хороший вопрос на зрелость.
