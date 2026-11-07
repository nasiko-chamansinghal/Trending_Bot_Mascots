import { useEffect, useRef, useState } from 'react';
import { createMascot } from '../characters';
import type { MascotEngine } from '../engine-types';
import { enqueue } from '../mountQueue';

interface MascotThumbProps {
  character: string;
  emotion: string;
  color: string | null;
  eyes: string | null;
  label: string;
}

export function MascotThumb({ character, emotion, color, eyes, label }: MascotThumbProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MascotEngine | null>(null);
  const latest = useRef({ character, emotion, color, eyes, label });
  const [visible, setVisible] = useState(false);
  latest.current = { character, emotion, color, eyes, label };

  useEffect(() => {
    const host = hostRef.current as HTMLDivElement;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: host.closest('.inspector'), rootMargin: '160px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const cancel = enqueue(() => {
      const host = hostRef.current;
      if (!host) return;
      const o = latest.current;
      engineRef.current = createMascot(host, {
        character: o.character,
        emotion: o.emotion,
        color: o.color,
        eyeColor: o.eyes,
        label: o.label,
        lite: true,
        autostart: false,
      });
    });
    return () => {
      cancel();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    engineRef.current?.setColor(color, eyes, true);
  }, [color, eyes]);

  return <div ref={hostRef} className="thumb" />;
}
