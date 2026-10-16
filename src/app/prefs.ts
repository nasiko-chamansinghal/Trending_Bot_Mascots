import { useCallback, useEffect, useRef, useState } from 'react';

function load<T extends object>(key: string, defaults: T): T {
  const merged = { ...defaults };
  try {
    Object.assign(merged, JSON.parse(localStorage.getItem(key) || '{}'));
  } catch {
    return merged;
  }
  return merged;
}

function save<T extends object>(key: string, prefs: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    return;
  }
}

export function usePrefs<T extends object>(
  key: string,
  defaults: T,
  sanitize: (prefs: T) => T,
): [T, (patch: Partial<T>) => T, { current: T }] {
  const [prefs, setPrefs] = useState<T>(() => {
    const initial = sanitize(load(key, defaults));
    delete (initial as { lang?: unknown }).lang;
    return initial;
  });
  const ref = useRef(prefs);
  useEffect(() => {
    save(key, ref.current);
  }, [key]);
  const update = useCallback(
    (patch: Partial<T>): T => {
      const next = { ...ref.current, ...patch };
      ref.current = next;
      save(key, next);
      setPrefs(next);
      return next;
    },
    [key],
  );
  return [prefs, update, ref];
}
