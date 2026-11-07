import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { CLIP_MS, type Clip, MAX_ZOOM, MIN_ZOOM, mmss, percent, tickLabel, ticksFor } from '../clips';
import { MascotThumb } from './MascotThumb';

const COMPACT_BELOW = 84;

interface TimelineProps {
  character: string;
  color: string | null;
  eyes: string | null;
  clips: Clip[];
  names: Map<string, string>;
  index: number;
  playing: boolean;
  playheadRef: RefObject<HTMLDivElement | null>;
  timeRef: RefObject<HTMLSpanElement | null>;
  max: number;
  slot: number;
  zoom: number;
  onZoom: (zoom: number) => void;
  onPreview: () => void;
  onToggle: () => void;
  onSeek: (index: number) => void;
  onScrub: (ms: number) => void;
  onRemove: (index: number) => void;
}

export function Timeline({
  character,
  color,
  eyes,
  clips,
  names,
  index,
  playing,
  playheadRef,
  timeRef,
  max,
  slot,
  zoom,
  onZoom,
  onPreview,
  onToggle,
  onSeek,
  onScrub,
  onRemove,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const empty = clips.length === 0;
  const total = clips.length * CLIP_MS;
  const pxPerSecond = slot / (CLIP_MS / 1000);
  const ticks = useMemo(() => ticksFor(total / 1000, pxPerSecond), [total, pxPerSecond]);

  const scrubTo = (event: PointerEvent<HTMLElement>) => {
    const scrub = scrubRef.current;
    const track = trackRef.current;
    if (!scrub || !track) return;
    onScrub((((event.clientX - scrub.getBoundingClientRect().left) / slot) * CLIP_MS) | 0);
    const view = track.getBoundingClientRect();
    if (event.clientX > view.right - 40) track.scrollLeft += 18;
    else if (event.clientX < view.left + 40) track.scrollLeft -= 18;
  };

  const scrubHandlers = {
    down: (event: PointerEvent<HTMLElement>) => {
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      scrubTo(event);
    },
    move: (event: PointerEvent<HTMLElement>) => {
      if (dragging.current) scrubTo(event);
    },
    up: (event: PointerEvent<HTMLElement>) => {
      dragging.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    key: (event: KeyboardEvent<HTMLElement>) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      onScrub((index + step) * CLIP_MS);
    },
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || empty) return;
    const left = index * slot;
    if (left < track.scrollLeft || left + slot > track.scrollLeft + track.clientWidth) {
      track.scrollTo({ left: Math.max(0, left - slot), behavior: 'smooth' });
    }
  }, [index, empty, slot]);

  return (
    <section
      className="timeline"
      aria-label="Timeline"
      data-compact={slot < COMPACT_BELOW || undefined}
      style={{ '--slot': `${slot}px` } as CSSProperties}
    >
      <div className="timeline-bar">
        <button
          type="button"
          className="play"
          onClick={onToggle}
          disabled={empty}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <rect x="5" y="4" width="5" height="16" rx="1.6" fill="currentColor" />
              <rect x="14" y="4" width="5" height="16" rx="1.6" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path
                d="M8 5.4v13.2a1 1 0 0 0 1.5.86l10.6-6.6a1 1 0 0 0 0-1.72L9.5 4.54A1 1 0 0 0 8 5.4Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
        <span className="meta timeline-count">
          {clips.length} / {max}
        </span>
      </div>
      <div className="track" ref={trackRef}>
        {empty ? (
          <p className="track-empty">Pick an animation on the right to add a 2-second clip.</p>
        ) : (
          <div className="track-inner" style={{ width: clips.length * slot }}>
            <div
              className="scrub"
              ref={scrubRef}
              role="slider"
              tabIndex={0}
              aria-label="Playback position"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={index * CLIP_MS}
              aria-valuetext={`Clip ${index + 1} of ${clips.length}`}
              onPointerDown={scrubHandlers.down}
              onPointerMove={scrubHandlers.move}
              onPointerUp={scrubHandlers.up}
              onPointerCancel={scrubHandlers.up}
              onKeyDown={scrubHandlers.key}
            >
              <div className="ruler" aria-hidden="true">
                {ticks.map((tick) => (
                  <span
                    key={tick.t}
                    className="tick"
                    data-major={tick.major || undefined}
                    style={{ left: tick.t * pxPerSecond }}
                  >
                    {tick.major ? <i>{tickLabel(tick.t)}</i> : null}
                  </span>
                ))}
              </div>
            </div>
            <ol className="clips">
              {clips.map((clip, i) => {
                const name = names.get(clip.emotion) ?? clip.emotion;
                return (
                  <li key={clip.uid} className="clip">
                    <button
                      type="button"
                      className="clip-card"
                      data-active={i === index || undefined}
                      onClick={() => onSeek(i)}
                      aria-label={`${name}, clip ${i + 1}`}
                    >
                      <span className="clip-art">
                        <MascotThumb
                          character={character}
                          emotion={clip.emotion}
                          color={color}
                          eyes={eyes}
                          label={name}
                        />
                      </span>
                      <span className="clip-name">{name}</span>
                      <span className="clip-length">{CLIP_MS / 1000} s</span>
                    </button>
                    <button
                      type="button"
                      className="clip-remove"
                      onClick={() => onRemove(i)}
                      aria-label={`Remove ${name}, clip ${i + 1}`}
                    >
                      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
                        <path
                          d="m4 4 8 8M12 4l-8 8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="playhead" ref={playheadRef} aria-hidden="true">
              <span
                className="playhead-knob"
                onPointerDown={scrubHandlers.down}
                onPointerMove={scrubHandlers.move}
                onPointerUp={scrubHandlers.up}
                onPointerCancel={scrubHandlers.up}
              />
            </div>
          </div>
        )}
      </div>
      <div className="timeline-tools">
        <label className="zoom">
          <span className="zoom-dot zoom-dot-small" aria-hidden="true" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            aria-label="Zoom"
            aria-valuetext={percent(zoom)}
            onChange={(event) => onZoom(Number(event.target.value))}
          />
          <span className="zoom-dot" aria-hidden="true" />
          <span className="zoom-value">{percent(zoom)}</span>
        </label>
        <p className="time" role="timer" aria-live="off">
          <span ref={timeRef}>0:00</span>
          <span className="time-total"> / {mmss(total)}</span>
        </p>
        <button type="button" className="icon-button" onClick={onPreview} aria-label="Preview full screen">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path
              d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
