import { useTheme } from '../useTheme';

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-state={theme}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
    >
      <svg
        className="icon-sun"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="10" cy="10" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="icon-moon"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M16.2 11.6A6.6 6.6 0 0 1 8.4 3.8a6.6 6.6 0 1 0 7.8 7.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
