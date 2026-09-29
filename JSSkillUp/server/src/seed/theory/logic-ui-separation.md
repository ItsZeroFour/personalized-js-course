# Разделение логики и UI

## Зачем

- **Тестируемость**: логику проверяют юнит-тестами без рендера, UI — отдельно.
- **Переиспользование**: одна логика — разные представления (мобильная и десктопная
  версии, виджет и страница).
- **Независимые изменения**: редизайн не трогает бизнес-правила, смена API не трогает вёрстку.
- **Читаемость**: компонент на 50 строк разметки понятнее компонента на 400 строк всего подряд.

## Презентационные и контейнерные компоненты

Классический паттерн (Дэн Абрамов, 2015):

- **презентационные** — получают данные и колбэки пропсами, не знают, откуда данные,
  не ходят в сеть и стор; легко показать в Storybook;
- **контейнерные** — достают данные, держат состояние, передают вниз.

```jsx
function CartContainer() {
  const { items, total, remove } = useCart();
  return <CartView items={items} total={total} onRemove={remove} />;
}

function CartView({ items, total, onRemove }) {
  return (…); // только разметка
}
```

Сам Абрамов позже отметил, что с хуками жёсткое разделение необязательно, — но идея
жива: **логика в хуках, разметка в компонентах**.

## Вынос логики в кастомные хуки

```jsx
function useCheckout() {
  const cart = useCart();
  const [promo, setPromo] = useState('');
  const discount = calculateDiscount(cart.items, promo);   // чистая функция
  const mutation = useMutation({ mutationFn: createOrder });

  return {
    items: cart.items,
    total: cart.total - discount,
    discount,
    promo,
    setPromo,
    submit: () => mutation.mutate({ items: cart.items, promo }),
    isSubmitting: mutation.isPending,
  };
}

function CheckoutPage() {
  const checkout = useCheckout();
  return <CheckoutForm {...checkout} />;
}
```

## Чистые функции и доменный слой

Бизнес-правила — в функциях без React: расчёт скидки, проверка доступности доставки,
валидация, форматирование, статусы заказа.

```ts
export function calculateDiscount(items: CartItem[], promo: string): number { … }
export function canCancelOrder(order: Order, now: Date): boolean { … }
```

Их легко покрыть тестами со всеми граничными случаями, переиспользовать на сервере
(общая валидация) и читать как спецификацию.

## Слой API и типизированные клиенты

Компоненты не должны знать URL, формат бэкенда и способ запроса:

```ts
// entities/order/api.ts
export async function fetchOrders(params: OrdersQuery, signal?: AbortSignal): Promise<Order[]> {
  const dto = await http.get<OrderDto[]>('/orders', { params, signal });
  return dto.map(toOrder);                 // маппинг DTO → модель приложения
}

// entities/order/queries.ts
export const useOrders = (params: OrdersQuery) =>
  useQuery({ queryKey: orderKeys.list(params), queryFn: ({ signal }) => fetchOrders(params, signal) });
```

- **маппинг DTO → модель**: `created_at` → `createdAt: Date`, копейки → рубли. Переименование
  поля на бэкенде правится в одной функции;
- типы из OpenAPI/GraphQL-схемы (генерация) или валидация ответов (Zod) на границе;
- единый HTTP-клиент: базовый URL, авторизация, нормализация ошибок, отмена.

## Headless-компоненты

Логика, состояние и доступность без разметки и стилей: Radix UI, Headless UI, React Aria,
TanStack Table, Downshift. Компонент или хук отдаёт состояние и пропсы для элементов
(`getToggleProps()`), а внешний вид полностью ваш. Это разделение логики и UI на уровне
библиотек.

## Границы ответственности

```
UI-компоненты       — разметка, стили, локальный UI-state (открыт/закрыт)
хуки фич            — оркестровка: данные + действия + состояние сценария
доменные функции    — бизнес-правила, без React и без сети
API-слой            — запросы, маппинг, ошибки
```

Не нужно выносить каждую строчку: компонент кнопки с `useState` для «открыто меню» —
нормален как есть. Разделение окупается там, где логика **сложная**, **повторяется** или
**часто меняется независимо** от вёрстки.

## Как это спрашивают

- «Как вы отделяете бизнес-логику от UI?»
- «Что такое container/presentational и актуально ли это с хуками?»
- «Где у вас живёт маппинг ответа API?»
- «Что такое headless-компоненты?»
- «Как бы вы отрефакторили компонент, который делает всё сам?»
