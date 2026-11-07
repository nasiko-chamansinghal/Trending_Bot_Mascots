import { ThemeToggle } from './ThemeToggle';

export type Tab = 'customise' | 'animation';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'customise', label: 'Customise' },
  { id: 'animation', label: 'Animation' },
];

interface AppBarProps {
  tab: Tab;
}

export function AppBar({ tab }: AppBarProps) {
  return (
    <header className="appbar">
      <a className="brand" href="#customise" aria-label="Mascot Studio home">
        <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" focusable="false">
          <circle cx="14" cy="14" r="14" fill="var(--text)" />
          <rect x="7.8" y="10" width="3.6" height="8" rx="1.8" fill="var(--surface)" />
          <rect x="16.6" y="10" width="3.6" height="8" rx="1.8" fill="var(--surface)" />
        </svg>
        <span className="brand-name">Mascot Studio</span>
      </a>
      <nav className="tabs" aria-label="Studio">
        {TABS.map((item) => (
          <a
            key={item.id}
            className="tab"
            href={`#${item.id}`}
            aria-current={item.id === tab ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
