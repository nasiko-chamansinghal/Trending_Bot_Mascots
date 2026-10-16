import type { ReactNode } from 'react';

interface TopbarProps {
  brandName: string;
  brand: ReactNode;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function Topbar({ brandName, brand, theme, onToggleTheme }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        {brand}
        <span className="brand-name">{brandName}</span>
      </div>
      <div className="top-actions">
        <button
          type="button"
          id="themeToggle"
          className="icon-btn"
          aria-label="Theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
        >
          <svg
            className="ico-moon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
          </svg>
          <svg
            className="ico-sun"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </button>
      </div>
    </header>
  );
}
