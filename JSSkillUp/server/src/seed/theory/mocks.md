# Моки и изоляция

## Мок, стаб, фейк, спай

- **Stub (заглушка)** — возвращает заранее заданный ответ, ничего не проверяет:
  `getUser = () => ({ name: 'Аня' })`.
- **Spy (шпион)** — записывает вызовы, чтобы потом проверить: сколько раз, с какими
  аргументами. Может оставить оригинальное поведение.
- **Mock** — заглушка с ожиданиями: проверяем, как именно её вызвали.
- **Fake** — рабочая упрощённая реализация: in-memory база, фейковые таймеры, MSW-сервер.

В Vitest/Jest почти всё это делает `vi.fn()`; терминология важна в разговоре.

## vi.fn, vi.spyOn, vi.mock

```js
// функция-заглушка: колбэки и зависимости, передаваемые явно
const onSubmit = vi.fn();
render(<Form onSubmit={onSubmit} />);
expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.ru' });

// шпион на существующий метод
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
// … в конце: errorSpy.mockRestore() или vi.restoreAllMocks() в afterEach

// подмена модуля целиком
vi.mock('./analytics', () => ({ track: vi.fn() }));
```

Детали:

- `vi.mock` **поднимается** (hoisting) в начало файла — действует на весь файл;
  переменные для фабрики мока — через `vi.hoisted`;
- `mockReturnValue`, `mockResolvedValue`, `mockImplementationOnce` — настройка ответов;
- сброс: `mockClear` (история вызовов), `mockReset` (+ реализация), `mockRestore`
  (вернуть оригинал для `spyOn`). Удобно включить `restoreMocks: true` в конфиге.

## MSW: мок сети на уровне запросов

```js
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Аня' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('ошибка сервера', async () => {
  server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
  render(<Profile id="1" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить');
});
```

Почему лучше, чем мокать `fetch`/axios/модуль API:

- тест не зависит от **способа** запроса — смена клиента не ломает тесты;
- проверяются URL, метод, тело, заголовки, обработка статусов;
- одни обработчики работают в тестах, Storybook и в браузере при разработке без бэкенда.

## Подмена Date и таймеров

```js
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-01-01T10:00:00Z'));
// … код, зависящий от «сейчас»
vi.useRealTimers();
```

Время, случайность (`Math.random`, `crypto.randomUUID`) и окружение (`matchMedia`,
`IntersectionObserver`, `ResizeObserver` — их нет в jsdom) — законные кандидаты на мок.

## Изоляция тестов

- моки восстанавливаются после каждого теста;
- MSW-обработчики сбрасываются (`resetHandlers`);
- **новый `QueryClient` на каждый тест** с `retry: false`, иначе кеш протекает между тестами,
  а ошибки ретраятся до таймаута;
- синглтон-сторы (Zustand) сбрасываются в `beforeEach`;
- никаких зависимостей от порядка тестов.

## Когда мок означает плохую архитектуру

Если для теста одного компонента нужно замокать десять модулей — компонент знает слишком
много: сам ходит в сеть, читает `localStorage`, дёргает аналитику и роутер. Признаки:

- `vi.mock` на внутренние модули проекта в каждом тесте;
- тест проверяет, что мок вызван, а не результат для пользователя;
- моки повторяют реализацию — тест ломается от любого рефакторинга.

Решения: вынести логику в чистые функции и хуки, передавать зависимости явно (пропсы,
контекст, параметры функций — dependency inversion), мокать на **границе** системы
(сеть через MSW, время, браузерные API), а не внутри.

## Как это спрашивают

- «Чем отличаются `vi.fn`, `vi.spyOn`, `vi.mock`?»
- «Как вы мокаете запросы в тестах?» — MSW и аргументы.
- «Как протестировать код, зависящий от текущей даты?»
- «Чем мок отличается от стаба и фейка?»
- «Что делать, если для теста приходится мокать половину проекта?»
