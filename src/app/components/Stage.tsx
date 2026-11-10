import { useEffect, useRef } from 'react';
import { createMascot, emotionsOf } from '../characters';
import { mmss } from '../clips';
import type { MascotEngine } from '../engine-types';
import { GIF_SECONDS } from '../mediaExport';
import { EMOTION_VIDEO_MS, type Segment } from '../videoExport';
import { ExportActions } from './ExportActions';
import { type AnimationSource, ExportMenu } from './ExportMenu';
import { Mascot } from './Mascot';

const IDLE = { standbyAfter: 60000, sleepAfter: 180000 };

interface StageProps {
  character: string;
  emotion: string;
  /** Name used for exported files; defaults to the character id. */
  exportName?: string;
  color: string | null;
  eyes: string | null;
  idle?: boolean;
  exportable?: boolean;
  timeline?: Segment[];
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
  exportName,
  color,
  eyes,
  idle = true,
  exportable = true,
  timeline,
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

  const look = { character, color, eyeColor: eyes };
  const emotionName = emotionsOf(character).find((def) => def.id === emotion)?.name ?? emotion;
  // The Animation tab records its whole timeline; everywhere else, and an empty timeline, loops the current emotion.
  const gifSource: AnimationSource = timeline?.length
    ? {
        look,
        timeline,
        summary: `${timeline.length} ${timeline.length === 1 ? 'clip' : 'clips'}, ${mmss(
          timeline.reduce((sum, s) => sum + s.ms, 0),
        )}`,
      }
    : { look, timeline: [{ emotion, ms: GIF_SECONDS * 1000 }], summary: `${GIF_SECONDS} s loop` };

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
          <ExportActions
            look={look}
            timeline={timeline ?? [{ emotion, ms: EMOTION_VIDEO_MS }]}
            baseName={`mascot-${slug(exportName ?? character)}`}
            leading={
              <ExportMenu
                getSvg={() => artRef.current?.querySelector('svg') ?? null}
                baseName={`mascot-${slug(exportName ?? character)}-${slug(timeline?.length ? 'animation' : emotionName)}`}
                primary={timeline ? 'gif' : 'png'}
                animation={gifSource}
              />
            }
          />
        </div>
      ) : null}
    </section>
  );
}
