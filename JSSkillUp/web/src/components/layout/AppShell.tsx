import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Дашборд', icon: '📊', end: true },
  { to: '/roadmap', label: 'Роадмап', icon: '🗺️' },
  { to: '/cards', label: 'Карточки', icon: '🃏' },
  { to: '/tasks', label: 'Задачи', icon: '⌨️' },
  { to: '/interview', label: 'Интервью', icon: '🎤' },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-9 items-center justify-center rounded-lg border border-line bg-panel text-base transition-colors hover:bg-panel-2"
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

export function AppShell() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-panel px-4 py-6 lg:flex">
        <div className="mb-8 px-2">
          <p className="text-lg font-semibold tracking-tight text-fg">
            JS<span className="text-accent">SkillUp</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">Подготовка к React Middle</p>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-panel-2 hover:text-fg',
                )
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-between px-1 pt-6">
          <span className="text-xs text-muted">Тема</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-panel px-6 py-3 lg:hidden">
          <p className="font-semibold text-fg">
            JS<span className="text-accent">SkillUp</span>
          </p>
          <ThemeToggle />
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-line bg-panel px-4 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-accent-soft text-accent' : 'text-muted',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
