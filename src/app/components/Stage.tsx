import { useEffect, useRef } from 'react';
import { createMascot } from '../characters';
import type { MascotEngine } from '../engine-types';
import { ExportMenu } from './ExportMenu';
import { Mascot } from './Mascot';

const IDLE = { standbyAfter: 60000, sleepAfter: 180000 };

interface StageProps {
  character: string;
  emotion: string;
  emotionName: string;
  /** Name used for exported files; defaults to the character id. */
  exportName?: string;
  color: string | null;
  eyes: string | null;
  idle?: boolean;
  exportable?: boolean;
  clickable?: boolean;
  onEmotionChange: (id: string) => void;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function Stage({
  character,
  emotion,
  emotionName,
  exportName,
  color,
  eyes,
  idle = true,
  exportable = true,
  clickable = true,
  onEmotionChange,
}: StageProps) {
  const engineRef = useRef<MascotEngine | null>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const emotionRef = useRef(emotion);
  const colorRef = useRef(color);
  const eyesRef = useRef(eyes);
  const onChangeRef = useRef(onEmotionChange);
  emotionRef.current = emotion;
  colorRef.current = color;
  eyesRef.current = eyes;
  onChangeRef.current = onEmotionChange;

  useEffect(() => {
    const engine = engineRef.current;
    if (engine && engine.emotionId !== emotion) engine.setEmotion(emotion);
  }, [emotion]);

  useEffect(() => {
    engineRef.current?.setColor(color, eyes);
  }, [color, eyes]);

  return (
    <section className="stage" aria-label="Preview">
      <div className="stage-art" ref={artRef}>
        <Mascot
          key={character}
          className="stage-mascot"
          data-static={clickable ? undefined : ''}
          gaze
          engineRef={engineRef}
          onEngine={(engine) => {
            engine.on('change', ({ id }) => onChangeRef.current(id));
          }}
          onClick={
            clickable
              ? () => {
                  const engine = engineRef.current;
                  if (engine && !engine.signature?.(0.8)) engine.spin(1);
                }
              : undefined
          }
          create={(el) =>
            createMascot(el, {
              character,
              emotion: emotionRef.current,
              color: colorRef.current,
              eyeColor: eyesRef.current,
              idle: idle ? IDLE : undefined,
              label: 'Character preview',
            })
          }
        />
      </div>
      {exportable ? (
        <div className="stage-actions">
          <ExportMenu
            getSvg={() => artRef.current?.querySelector('svg') ?? null}
            baseName={`mascot-${slug(exportName ?? character)}-${slug(emotionName)}`}
          />
        </div>
      ) : null}
    </section>
  );
}
