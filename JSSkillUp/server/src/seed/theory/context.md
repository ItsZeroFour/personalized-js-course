# Context и производительность

## Что такое Context

Context — механизм **передачи значения вниз по дереву** без пробрасывания пропсов через
каждый уровень (prop drilling).

```jsx
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={theme}>
      <Page />
    </ThemeContext.Provider>
  );
}

function Button() {
  const theme = useContext(ThemeContext); // ближайший провайдер выше по дереву
  return <button className={theme}>OK</button>;
}
```

В React 19 провайдером можно использовать сам контекст: `<ThemeContext value={theme}>`,
а читать можно и через `use(ThemeContext)` — в том числе условно.

Значение по умолчанию из `createContext(default)` используется, **только если выше нет
провайдера**. Частая практика — `createContext(null)` и хук-страж:

```jsx
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme используется вне ThemeProvider');
  return ctx;
}
```

## Кто перерисовывается при изменении value

React сравнивает `value` провайдера с прошлым через `Object.is`. Если изменилось —
перерисуются **все компоненты, которые читают этот контекст**:

- даже обёрнутые в `memo` — подписка на контекст пробивает мемоизацию;
- даже если компонент использует неизменившуюся часть объекта — **селекторов у Context нет**.

При этом **не** перерисовываются компоненты между провайдером и потребителями,
если они сами не читают контекст и не перерисованы по другим причинам.

## Ловушка: новый объект на каждый рендер

```jsx
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={{ user, login, logout }}> {/* новый объект! */}
      {children}
    </AuthContext.Provider>
  );
}
```

Любой рендер `AuthProvider` (например, из-за родителя) создаёт новый `value` — и все
потребители перерисуются, хотя `user` не менялся. Решение — мемоизация:

```jsx
const login = useCallback(async (credentials) => { … }, []);
const logout = useCallback(() => setUser(null), []);
const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
```

## Разделение контекстов

Один «божественный» контекст на всё приложение будит всех при любом изменении.
Правила:

1. **По смыслу**: тема отдельно, пользователь отдельно, корзина отдельно.
2. **По частоте изменений**: редко меняющееся не смешивать с часто меняющимся.
3. **State и actions — в разные контексты.** Компонентам, которые только вызывают
   действия (кнопка «Выйти»), не нужно перерисовываться при изменении данных:

```jsx
const CartStateContext = createContext(null);
const CartActionsContext = createContext(null);

function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  return (
    <CartActionsContext.Provider value={dispatch}>  {/* dispatch стабилен */}
      <CartStateContext.Provider value={items}>{children}</CartStateContext.Provider>
    </CartActionsContext.Provider>
  );
}
```

## Почему children спасают

```jsx
<AuthProvider>
  <App />
</AuthProvider>
```

`<App />` создан **вне** провайдера. Когда state провайдера меняется, `children` — тот же
элемент, поэтому React не перерисовывает `App` целиком — только потребителей контекста.
Если бы провайдер сам рендерил `<App />` внутри своего JSX, перерисовалось бы всё дерево.

## Когда Context не замена state manager

Context — транспорт, а не хранилище: состояние всё равно живёт в `useState`/`useReducer`
провайдера. Он хорош для **редко меняющихся** данных, нужных многим: тема, локаль,
текущий пользователь, feature flags, зависимости (API-клиент, логгер).

Для часто меняющегося состояния, которое читают многие компоненты по частям (фильтры
большой таблицы, редактор, корзина с частыми обновлениями), нужен стор с **селекторами**:
Zustand, Redux, Jotai или `use-context-selector`. Компонент подписывается на свой срез
и перерисовывается только при его изменении.

## Как это спрашивают

- «Кто перерисуется при изменении значения контекста? Поможет ли `memo`?»
- «Что не так с `value={{ user, setUser }}`?»
- «Как бы вы организовали контексты для темы, пользователя и корзины?»
- «Является ли Context стейт-менеджером? Когда его недостаточно?»
- «Когда используется значение по умолчанию из `createContext`?»
