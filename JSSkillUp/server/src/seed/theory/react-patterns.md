# Паттерны: compound components, render props, HOC

## Compound components

Набор компонентов, которые работают как одно целое и делят состояние через **неявный
контекст**:

```jsx
<Tabs defaultValue="js">
  <Tabs.List>
    <Tabs.Tab value="js">JavaScript</Tabs.Tab>
    <Tabs.Tab value="ts">TypeScript</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="js">…</Tabs.Panel>
  <Tabs.Panel value="ts">…</Tabs.Panel>
</Tabs>
```

Реализация:

```jsx
const TabsContext = createContext(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Компоненты Tabs используются только внутри <Tabs>');
  return ctx;
}

function Tabs({ defaultValue, children }) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>;
}

function Tab({ value, children }) {
  const tabs = useTabs();
  return (
    <button role="tab" aria-selected={tabs.value === value} onClick={() => tabs.setValue(value)}>
      {children}
    </button>
  );
}

Tabs.Tab = Tab;
```

Плюсы: потребитель свободно компонует разметку (иконки, разделители, обёртки,
порядок), логика и доступность — внутри. Так устроены Radix UI, Headless UI, Reach UI.

## Композиция против конфигурации

```jsx
// конфигурационный API
<Tabs items={[{ value: 'js', label: 'JS', content: … }]} />
```

Проще для типового случая, но каждая новая потребность — новый проп: `renderLabel`,
`tabClassName`, `showDivider`, `iconPosition`… Компонент обрастает десятками флагов.
Композиция (compound components, `children`, слоты-пропсы) масштабируется лучше:
расширение — без изменения исходного компонента (Open/Closed).

## Render props

Компонент принимает функцию и вызывает её со своим состоянием — потребитель решает,
что рисовать:

```jsx
<MousePosition>
  {({ x, y }) => <Tooltip style={{ left: x, top: y }} />}
</MousePosition>
```

До хуков это был основной способ переиспользовать логику с состоянием. Сейчас та же
задача решается хуком `useMousePosition()`. Render props остались там, где компоненту
нужно **управлять разметкой снаружи**: виртуализированные списки
(`renderItem`), таблицы (`cell: (row) => …`), `<Formik>{(form) => …}</Formik>`.

## HOC (Higher-Order Component)

Функция, принимающая компонент и возвращающая новый с дополнительным поведением:

```jsx
function withAuth(Component) {
  return function WithAuth(props) {
    const user = useUser();
    if (!user) return <Navigate to="/login" />;
    return <Component {...props} user={user} />;
  };
}
```

Минусы, из-за которых HOC почти вытеснены хуками:

- **wrapper hell**: `withRouter(withTheme(withAuth(Page)))` — глубокое дерево в DevTools;
- **коллизии пропсов**: два HOC передают проп `data`;
- **неявность**: непонятно, откуда пришёл проп;
- сложная типизация; нужно пробрасывать ref и копировать статические поля.

Где встречаются сейчас: `memo`, `forwardRef`, `lazy` — по сути HOC; обёртки для
сквозной функциональности (границы ошибок, аналитика, feature flags); старые кодовые базы
и библиотеки (`connect` из react-redux).

## Controlled и uncontrolled компоненты

**Controlled** — значение приходит пропсом, изменения сообщаются колбэком:

```jsx
<input value={text} onChange={(e) => setText(e.target.value)} />
<Tabs value={tab} onValueChange={setTab} />
```

Источник истины — родитель: можно валидировать, форматировать, синхронизировать с URL.

**Uncontrolled** — компонент хранит значение сам, снаружи задаётся только начальное:

```jsx
<input defaultValue="hi" ref={inputRef} />
<Tabs defaultValue="js" />
```

Хорошие компоненты поддерживают оба режима: `value !== undefined` → контролируемый,
иначе внутренний state. Переключаться между режимами на лету нельзя — React
предупреждает об этом для инпутов («A component is changing an uncontrolled input to
be controlled»), обычно из-за `value={undefined}` на первом рендере.

## Как это спрашивают

- «Какие паттерны переиспользования логики вы знаете? Чем хуки лучше HOC?»
- «Что такое compound components? Реализуйте Tabs / Accordion / Select» — live-coding.
- «Где сегодня уместны render props?»
- «Controlled или uncontrolled: что выберете для формы из 30 полей и почему?»
