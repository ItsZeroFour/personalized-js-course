# React Testing Library

## Философия

> Чем больше тесты похожи на то, как используется ваш софт, тем больше уверенности
> они дают.

Testing Library рендерит компонент в DOM (jsdom/happy-dom) и даёт искать элементы
**так, как их находит пользователь**: по роли, подписи, тексту. Доступа к state, пропсам
и экземплярам компонентов нет — и это намеренно.

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('добавляет задачу', async () => {
  const user = userEvent.setup();
  render(<TodoApp />);

  await user.type(screen.getByLabelText('Новая задача'), 'Купить молоко');
  await user.click(screen.getByRole('button', { name: 'Добавить' }));

  expect(screen.getByRole('listitem')).toHaveTextContent('Купить молоко');
});
```

## Приоритет запросов

1. **`getByRole`** с `name` — `getByRole('button', { name: 'Сохранить' })`. Проверяет
   ещё и доступность: у элемента есть роль и доступное имя.
2. **`getByLabelText`** — поля форм по `<label>`.
3. `getByPlaceholderText`, `getByText`, `getByDisplayValue`.
4. `getByAltText`, `getByTitle`.
5. **`getByTestId`** — последний вариант, когда нет семантики (canvas, сложный виджет).

`container.querySelector('.btn')` — антипаттерн: тест привязан к классам и структуре.

## getBy, queryBy, findBy

| Вариант | Нет элемента | Несколько | Асинхронный |
| --- | --- | --- | --- |
| `getBy…` | ошибка | ошибка | нет |
| `queryBy…` | `null` | ошибка | нет |
| `findBy…` | ошибка после таймаута | ошибка | да, промис |
| `getAllBy…` / `queryAllBy…` / `findAllBy…` | — | массив | — |

- `getBy` — элемент должен быть сейчас;
- `queryBy` — только для утверждений об **отсутствии**:
  `expect(screen.queryByRole('alert')).not.toBeInTheDocument()`;
- `findBy` — элемент **появится** (после запроса, таймера).

## userEvent против fireEvent

- **`fireEvent.click(el)`** — диспатчит одно событие.
- **`userEvent`** имитирует пользователя целиком: `user.type` — фокус, `keydown`,
  `keypress`, `input`, `keyup` на каждый символ; `user.click` — `pointerdown`, `mousedown`,
  фокус, `pointerup`, `mouseup`, `click`; учитывает `disabled` и `pointer-events: none`.

Предпочтительнее `userEvent` (все методы асинхронные — `await`). `fireEvent` — для событий,
которых нет в userEvent (`scroll`, кастомные).

## Асинхронность: findBy и waitFor

```jsx
render(<UserProfile id={1} />);
expect(screen.getByText('Загрузка…')).toBeInTheDocument();
expect(await screen.findByRole('heading', { name: 'Аня' })).toBeInTheDocument();
```

```js
await waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: 'Аня' }));
```

Правила `waitFor`:

- внутри — только **проверка**, без побочных эффектов (клик внутри `waitFor` выполнится
  много раз);
- одна проверка на `waitFor`;
- для появления элемента короче `findBy`.

Предупреждение «not wrapped in act(...)» обычно значит: тест закончился или проверил
результат раньше, чем завершилось асинхронное обновление. Лечится ожиданием результата
(`findBy`, `waitFor`), а не оборачиванием всего в `act`.

## Тестирование кастомных хуков

```js
import { renderHook, act } from '@testing-library/react';

test('useCounter', () => {
  const { result, rerender } = renderHook(({ step }) => useCounter(step), {
    initialProps: { step: 2 },
  });
  act(() => result.current.increment());
  expect(result.current.count).toBe(2);
});
```

`result.current` — возвращаемое значение последнего рендера. Действия, меняющие state,
оборачиваются в `act`. Провайдеры — через опцию `wrapper`. Если хук используется только
в одном компоненте, часто проще тестировать через компонент.

## Почему не тестируем внутренний стейт

- Тест на `state.isOpen` **ломается при рефакторинге** (переименовали state, перешли на
  `useReducer`), хотя поведение то же.
- Он **пропускает реальные баги**: state правильный, а кнопка не отображается.
- Пользователю важен результат: «после клика виден диалог».

Хороший тест: взаимодействие как у пользователя → проверка того, что он видит (текст,
роль, состояние `disabled`, `aria-*`) или что ушло наружу (вызов колбэка, запрос).
Для матчеров вроде `toBeInTheDocument`, `toHaveTextContent`, `toBeDisabled` подключают
`@testing-library/jest-dom`.

## Как это спрашивают

- «Какой запрос вы используете в первую очередь и почему?»
- «Чем отличаются getBy, queryBy, findBy?»
- «userEvent или fireEvent?»
- «Как протестировать компонент, который загружает данные?» — мок сети (MSW) + findBy.
- «Что значит “не тестировать детали реализации”?»
