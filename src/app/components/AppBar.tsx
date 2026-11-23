import { useEffect, useRef } from 'react';
import { GitHubLink } from './GitHubLink';
import { ThemeToggle } from './ThemeToggle';

export type Tab = 'customise' | 'design' | 'animation' | 'skill';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'customise', label: 'Customise' },
  { id: 'design', label: 'Design' },
  { id: 'animation', label: 'Animation' },
  { id: 'skill', label: 'Agent skill' },
];

interface AppBarProps {
  tab: Tab;
}

export function AppBar({ tab }: AppBarProps) {
  const navRef = useRef<HTMLElement>(null);

  // On narrow screens the tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    navRef.current
      ?.querySelector(`[href="#${tab}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tab]);

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
      <nav className="tabs" aria-label="Studio" ref={navRef}>
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
      <div className="appbar-actions">
        <ThemeToggle />
        <GitHubLink />
      </div>
    </header>
  );
}
