# SOLID во фронтенде

Принципы SOLID сформулированы для ООП, но во фронтенде хорошо переносятся на компоненты,
хуки и модули. На интервью ждут не определения, а **примеры из React**.

## S — Single Responsibility

Модуль должен иметь **одну причину для изменения**.

```jsx
// нарушение: запрос, преобразование данных, фильтрация, вёрстка и аналитика в одном месте
function ProductsPage() {
  const [products, setProducts] = useState([]);
  useEffect(() => { fetch('/api/products').then(…).then((raw) => setProducts(raw.map(…))) }, []);
  // 300 строк фильтров, сортировки, модалок и разметки
}
```

Разделение:

- данные — хук `useProducts()` (TanStack Query + маппинг в модель);
- логика фильтров — чистые функции `filterProducts(products, filters)`;
- отображение — `ProductList`, `ProductFilters` принимают данные пропсами.

Признаки нарушения: компонент на сотни строк, десятки `useState`, имя с «And»
(`UserProfileAndSettings`), правки дизайна задевают логику и наоборот.

## O — Open/Closed

Открыт для расширения, закрыт для изменения. Во фронтенде — **композиция вместо условий**.

```jsx
// нарушение: каждый новый вариант — новая ветка и новый проп
<Button isPrimary isDanger withIcon iconLeft="…" isLoading isSmall />

function Alert({ type }) {
  if (type === 'success') return …;
  if (type === 'error') return …;
  if (type === 'promo') return …; // правим компонент на каждый новый тип
}
```

```jsx
// расширение без изменения
const ALERT_TONES = {
  success: { icon: <CheckIcon />, className: 'bg-green' },
  error: { icon: <ErrorIcon />, className: 'bg-red' },
};

function Alert({ tone, icon, title, children, action }) {
  const preset = ALERT_TONES[tone];
  return (
    <div className={preset.className}>
      {icon ?? preset.icon}
      <strong>{title}</strong>
      {children}
      {action}
    </div>
  );
}
```

Инструменты: `children` и слоты-пропсы (`header`, `footer`, `action`), compound components,
render props, карта конфигураций вместо `if`.

## L — Liskov Substitution

Подтип должен быть заменяем там, где ожидается базовый тип. Во фронтенде — **компоненты
с одинаковым контрактом взаимозаменяемы**.

- Своя `TextInput` должна вести себя как `<input>`: принимать `value`, `onChange`, `disabled`,
  `aria-*`, пробрасывать `ref` и остальные атрибуты (`...rest`). Если «обёртка» ломает
  `onChange` (передаёт строку вместо события) или игнорирует `disabled`, её нельзя
  подставить вместо нативного поля.
- Реализации одного интерфейса (`storage: { get, set }` для localStorage и памяти) не должны
  требовать проверок «а какая это реализация».

## I — Interface Segregation

Не заставлять зависеть от того, что не используется. В React — **узкие пропсы**.

```tsx
// компоненту нужны имя и аватар, а он зависит от всего User (30 полей)
function Avatar({ user }: { user: User }) { … }

// лучше
function Avatar({ name, src }: { name: string; src: string }) { … }
```

Плюсы: компонент переиспользуем в других контекстах, проще тесты и Storybook,
изменения в `User` его не задевают, `memo` работает лучше (меньше пропсов меняется).

## D — Dependency Inversion

Модули верхнего уровня не зависят от деталей; зависимость — от абстракции.

```jsx
// жёсткая зависимость: компонент сам импортирует конкретный клиент
import { axiosClient } from '@/shared/api';

// инверсия: зависимость приходит снаружи
const ApiContext = createContext<ApiClient | null>(null);
function useApi() { … }
```

Практика: API-клиент, логгер, аналитика, хранилище передаются через контекст или
параметры и легко подменяются в тестах, Storybook и при смене реализации. Хуки вроде
`useProducts()` скрывают, откуда берутся данные: REST, GraphQL или кеш.

## Не переусердствовать

SOLID — эвристики, а не законы. Преждевременная абстракция «на будущее» так же вредна,
как её отсутствие: три слоя обёрток над одной кнопкой хуже одного `if`. Правило трёх:
выносить общее, когда повторение появилось в третий раз и стало понятно, что именно общее.

## Как это спрашивают

- «Как SOLID применяется во фронтенде? Приведите примеры из React.»
- «Компонент на 800 строк — как бы вы его разделили?»
- «Как сделать компонент расширяемым без добавления новых пропсов?»
- «Почему лучше передавать `name` и `src`, а не весь `user`?»
