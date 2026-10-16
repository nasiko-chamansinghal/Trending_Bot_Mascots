import {
  createElement,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import type { MascotEngine } from '../engine-types';
import { unwatchGaze, watchGaze } from '../gaze';

type Host = 'div' | 'span' | 'button';

interface MascotProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  as?: Host;
  create: (el: HTMLElement) => MascotEngine;
  gaze?: boolean;
  engineRef?: MutableRefObject<MascotEngine | null>;
  onEngine?: (engine: MascotEngine) => void;
  children?: ReactNode;
}

export function Mascot({
  as = 'div',
  create,
  gaze = false,
  engineRef,
  onEngine,
  children,
  ...rest
}: MascotProps) {
  const hostRef = useRef<HTMLElement>(null);
  const createRef = useRef(create);
  const onEngineRef = useRef(onEngine);
  createRef.current = create;
  onEngineRef.current = onEngine;

  useEffect(() => {
    const el = hostRef.current as HTMLElement;
    const engine = createRef.current(el);
    if (engineRef) engineRef.current = engine;
    onEngineRef.current?.(engine);
    if (gaze) watchGaze(engine, el);
    return () => {
      if (gaze) unwatchGaze(el);
      engine.destroy();
      if (engineRef) engineRef.current = null;
    };
  }, [gaze, engineRef]);

  return createElement(as, { ref: hostRef, type: as === 'button' ? 'button' : undefined, ...rest }, children);
}
