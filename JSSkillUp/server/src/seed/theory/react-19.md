# React 19: actions, use, Server Components

React 19 (стабильный с декабря 2024) сместил акцент на работу с асинхронностью
и сервером. Middle-разработчик должен понимать модель и уметь пользоваться клиентскими API.

## Actions

**Action** — асинхронная функция, запущенная в transition. React сам ведёт её состояние:
pending, ошибки, оптимистичные обновления, сброс формы.

```jsx
const [isPending, startTransition] = useTransition();

function handleSave() {
  startTransition(async () => {
    const error = await updateName(name);
    if (error) setError(error);
  });
}
```

Формы принимают функцию в `action`:

```jsx
<form action={async (formData) => { await createTodo(formData.get('title')); }}>
  <input name="title" />
  <button>Добавить</button>
</form>
```

После успешного action неконтролируемые поля формы сбрасываются автоматически.

## useActionState

```jsx
const [state, formAction, isPending] = useActionState(
  async (previousState, formData) => {
    const error = await signUp(formData);
    return error ? { error } : { ok: true };
  },
  { error: null },
);

return (
  <form action={formAction}>
    <input name="email" />
    <button disabled={isPending}>Зарегистрироваться</button>
    {state.error && <p role="alert">{state.error}</p>}
  </form>
);
```

Хранит **результат последнего действия** (ошибки валидации, ответ сервера) и флаг
выполнения. Функция получает предыдущее состояние и данные формы.

## useFormStatus

```jsx
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Отправка…' : 'Отправить'}</button>;
}
```

Читает статус **родительской** `<form>` из вложенного компонента — без пробрасывания
пропсов. Работает только внутри формы (в компоненте-потомке, а не в том же, где `<form>`).

## useOptimistic

```jsx
const [optimisticTodos, addOptimistic] = useOptimistic(
  todos,
  (current, newTodo) => [...current, { ...newTodo, sending: true }],
);

async function add(formData) {
  const todo = { title: formData.get('title') };
  addOptimistic(todo);        // сразу видно в списке
  await saveTodo(todo);       // после завершения action — реальные данные
}
```

Показывает ожидаемый результат до ответа сервера. Когда action завершается,
оптимистичное значение заменяется реальным state; при ошибке — откатывается само.

## Хук use

```jsx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);   // приостановит компонент до выполнения
  return …;
}

function Heading({ show }) {
  if (show) {
    const theme = use(ThemeContext);      // условный вызов разрешён
  }
}
```

- читает **промис** (через Suspense и error boundary) или **контекст**;
- в отличие от остальных хуков, **можно вызывать условно** и в циклах;
- промис должен быть стабильным: созданным вне рендера или закешированным.

## Изменения API

- **`ref` как проп** в функциональных компонентах — `forwardRef` больше не нужен.
- **Cleanup у ref-колбэков**: `ref={(node) => { …; return () => … }}`.
- **`<Context>` как провайдер** вместо `<Context.Provider>`.
- **Метаданные документа**: `<title>`, `<meta>`, `<link>` внутри компонентов поднимаются
  в `<head>` автоматически.
- **Загрузка ресурсов**: `preload`, `preinit`, приоритеты стилей.
- Удалены устаревшие API: `propTypes` и `defaultProps` у функций, строковые ref,
  legacy context, `ReactDOM.render` (только `createRoot`).
- Улучшены сообщения о hydration-ошибках, `onCaughtError`/`onUncaughtError` у корня.

## Server Components

**React Server Components (RSC)** выполняются **только на сервере** и отправляют клиенту
не код, а сериализованный результат рендера.

```jsx
// Server Component (по умолчанию в Next.js App Router)
async function ProductPage({ id }) {
  const product = await db.product.findUnique({ where: { id } }); // прямо в компоненте
  return (
    <>
      <h1>{product.title}</h1>
      <AddToCartButton productId={id} />  {/* клиентский компонент */}
    </>
  );
}
```

```jsx
'use client';
export function AddToCartButton({ productId }) {
  const [pending, setPending] = useState(false);
  return <button onClick={…}>В корзину</button>;
}
```

Свойства серверных компонентов:

- код **не попадает в бандл** — можно использовать тяжёлые библиотеки, секреты, БД;
- могут быть **async**;
- **нет** state, эффектов, обработчиков событий, браузерных API.

Граница `'use client'` ставится на модуль: он и всё, что он импортирует, — клиентский код.
Серверный компонент может рендерить клиентский и передавать ему **сериализуемые** пропсы
(включая JSX как `children`). Импортировать серверный компонент в клиентский нельзя.

**Server Actions** (`'use server'`) — серверные функции, которые можно передать в `action`
формы или вызвать из клиентского кода как обычную async-функцию.

**Отличие от SSR**: SSR превращает в HTML **все** компоненты и затем гидрирует их на клиенте
(весь JS загружается). RSC определяют, **где живёт код**: серверные компоненты не
гидрируются вовсе. Они сочетаются со SSR и стримингом.

## React Compiler

Отдельный инструмент (стабилен с 2025 года): автоматическая мемоизация при сборке.
Снижает потребность в ручных `memo`/`useMemo`/`useCallback`, требует соблюдения правил React.

## Как это спрашивают

- «Что нового в React 19?» — Actions и хуки форм, `use`, ref как проп, RSC.
- «Чем `useActionState` отличается от `useFormStatus`?»
- «Чем хук `use` отличается от остальных хуков?»
- «Что такое Server Components? Чем они отличаются от SSR?»
- «Почему в серверном компоненте нельзя `useState` и `onClick`?»
