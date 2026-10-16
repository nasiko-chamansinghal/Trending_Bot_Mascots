import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimedState<T> {
  value: T | null;
  visible: boolean;
}

export function useTimed<T>(ms: number): [TimedState<T>, (value: T) => void] {
  const [state, setState] = useState<TimedState<T>>({ value: null, visible: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback(
    (value: T) => {
      clearTimeout(timer.current);
      setState({ value, visible: true });
      timer.current = setTimeout(() => setState((s) => ({ ...s, visible: false })), ms);
    },
    [ms],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return [state, show];
}
