import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { characterName, DEFAULT_EMOTION, emotionsOf } from '../characters';
import { CLIP_MS, type Clip, makeClip, mmss, playheadX, slotWidth } from '../clips';
import { AnimationPicker } from './AnimationPicker';
import { Stage } from './Stage';
import { Timeline } from './Timeline';

interface AnimationViewProps {
  character: string;
  color: string | null;
  eyes: string | null;
  clips: Clip[];
  onClipsChange: (clips: Clip[]) => void;
}

const noop = () => undefined;

export function AnimationView({ character, color, eyes, clips, onClipsChange }: AnimationViewProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [preview, setPreview] = useState(false);
  const slot = slotWidth(zoom);
  const positionRef = useRef(0);
  const startRef = useRef(0);
  const indexRef = useRef(0);
  const playheadRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const clipCount = clips.length;
  const total = clipCount * CLIP_MS;

  const names = useMemo(() => new Map(emotionsOf(character).map((def) => [def.id, def.name])), [character]);
  const positions = useMemo(() => new Map(clips.map((clip, i) => [clip.emotion, i + 1])), [clips]);
  const max = names.size;

  const current = clips[index]?.emotion ?? DEFAULT_EMOTION;

  const paint = useCallback(
    (position: number) => {
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${playheadX(position, slot)}px)`;
      }
      if (timeRef.current) timeRef.current.textContent = mmss(position);
    },
    [slot],
  );

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const openPreview = () => {
    setPreview(true);
    if (!playing && clipCount > 0) {
      startRef.current = performance.now() - positionRef.current;
      setPlaying(true);
    }
  };

  const goTo = useCallback((next: number) => {
    indexRef.current = next;
    positionRef.current = next * CLIP_MS;
    startRef.current = performance.now() - positionRef.current;
    setIndex(next);
  }, []);

  useEffect(() => {
    if (playing) return;
    paint(Math.min(Math.max(positionRef.current, index * CLIP_MS), clipCount * CLIP_MS));
  }, [playing, paint, index, clipCount]);

  useEffect(() => {
    if (!playing || clipCount === 0) return;
    const span = clipCount * CLIP_MS;
    startRef.current = performance.now() - (positionRef.current % span);
    let frame = 0;
    const tick = (now: number) => {
      const position = (now - startRef.current) % span;
      positionRef.current = position;
      const next = Math.min(clipCount - 1, Math.floor(position / CLIP_MS));
      if (next !== indexRef.current) {
        indexRef.current = next;
        setIndex(next);
      }
      paint(position);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, clipCount, paint]);

  useEffect(() => {
    if (clipCount === 0 && playing) setPlaying(false);
  }, [clipCount, playing]);

  const onAdd = (emotion: string) => {
    const existing = positions.get(emotion);
    if (existing) {
      goTo(existing - 1);
      return;
    }
    const next = [...clips, makeClip(emotion)];
    onClipsChange(next);
    if (!playing) goTo(next.length - 1);
  };

  const onScrub = (ms: number) => {
    if (clipCount === 0) return;
    const position = Math.min(Math.max(ms, 0), total - 1);
    const next = Math.floor(position / CLIP_MS);
    positionRef.current = position;
    startRef.current = performance.now() - position;
    paint(position);
    if (next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
    }
  };

  const onRemove = (removed: number) => {
    const next = clips.filter((_, i) => i !== removed);
    onClipsChange(next);
    if (next.length === 0) {
      goTo(0);
      return;
    }
    const shift =
      removed < indexRef.current ? indexRef.current - 1 : Math.min(indexRef.current, next.length - 1);
    if (playing && removed !== indexRef.current) {
      const offset = positionRef.current - indexRef.current * CLIP_MS;
      indexRef.current = shift;
      positionRef.current = shift * CLIP_MS + offset;
      startRef.current = performance.now() - positionRef.current;
      setIndex(shift);
    } else {
      goTo(shift);
    }
  };

  const onToggle = () => {
    if (clipCount === 0) return;
    if (!playing) startRef.current = performance.now() - positionRef.current;
    setPlaying(!playing);
  };

  return (
    <div className="animation" data-preview={preview || undefined}>
      <div className="stage-column">
        <div className="title-row">
          <h1>Animation</h1>
          <p>
            {characterName(character)} ·{' '}
            {clipCount === 0 ? 'No clips yet' : `${clipCount} clips, ${mmss(total)}`}
          </p>
        </div>
        <Stage
          character={character}
          emotion={current}
          emotionName={names.get(current) ?? current}
          color={color}
          eyes={eyes}
          idle={false}
          exportable={false}
          clickable={false}
          onEmotionChange={noop}
        />
        <Timeline
          character={character}
          color={color}
          eyes={eyes}
          clips={clips}
          names={names}
          index={index}
          playing={playing}
          playheadRef={playheadRef}
          timeRef={timeRef}
          max={max}
          slot={slot}
          zoom={zoom}
          onZoom={setZoom}
          onPreview={openPreview}
          onToggle={onToggle}
          onSeek={goTo}
          onScrub={onScrub}
          onRemove={onRemove}
        />
      </div>
      <aside className="inspector" aria-label="Animations">
        <section className="inspector-section">
          <div className="section-head">
            <h2>Animations</h2>
            <span className="meta">{clipCount >= max ? 'All added' : `${max - clipCount} left`}</span>
          </div>
          <AnimationPicker
            character={character}
            active={clips[index]?.emotion ?? null}
            color={color}
            eyes={eyes}
            positions={positions}
            onAdd={onAdd}
          />
        </section>
      </aside>
      {preview ? (
        <button type="button" className="preview-exit" onClick={() => setPreview(false)}>
          Exit preview
          <kbd>Esc</kbd>
        </button>
      ) : null}
    </div>
  );
}
