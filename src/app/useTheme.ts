import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'mascot-studio.theme';
const REVEAL_MS = 720;
const REVEAL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function persist(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    return;
  }
}

export function useTheme(): [Theme, (origin: { x: number; y: number }) => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );

  const toggle = useCallback(
    (origin: { x: number; y: number }) => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      const apply = () => {
        document.documentElement.dataset.theme = next;
        flushSync(() => setTheme(next));
      };
      persist(next);

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduceMotion) {
        apply();
        return;
      }

      const transition = document.startViewTransition(apply);
      const radius = Math.hypot(
        Math.max(origin.x, window.innerWidth - origin.x),
        Math.max(origin.y, window.innerHeight - origin.y),
      );
      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          { duration: REVEAL_MS, easing: REVEAL_EASING, pseudoElement: '::view-transition-new(root)' },
        );
      });
    },
    [theme],
  );

  return [theme, toggle];
}
