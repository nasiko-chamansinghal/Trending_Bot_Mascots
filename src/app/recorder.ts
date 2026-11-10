import { createMascot } from './characters';
import type { MascotEngine } from './engine-types';
import { standaloneSvg } from './exportImage';

/**
 * Off-screen rendering shared by the video, GIF and emotion sheet exports. Each export drives its
 * own hidden engine (Ball or Mood Mates) on a synthetic clock, so frames are evenly spaced whatever
 * the display does, and the live preview on screen is never touched.
 */

export type Backdrop = 'white' | 'dark' | 'transparent';

const FILL: Record<Backdrop, string | null> = { white: '#FFFFFF', dark: '#131315', transparent: null };

const TICK_MS = 1000 / 60;
const WARMUP_MS = 400;

export interface Look {
  character: string;
  color?: string | null;
  eyeColor?: string | null;
}

export interface Segment {
  emotion: string;
  ms: number;
}

/** The theme the studio is showing, so an export matches what the user sees. */
export function themeBackdrop(): 'white' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'white';
}

/**
 * The engines read performance.now() inside setEmotion and friends. Pinning it to the synthetic
 * clock for the length of one synchronous engine call keeps transitions and effects in step with
 * the frames being recorded, without affecting anything else on the page.
 */
function at<T>(time: number, fn: () => T): T {
  const perf = performance as { now: () => number };
  const own = Object.hasOwn(perf, 'now');
  const previous = perf.now;
  Object.defineProperty(perf, 'now', { value: () => time, configurable: true, writable: true });
  try {
    return fn();
  } finally {
    if (own) Object.defineProperty(perf, 'now', { value: previous, configurable: true, writable: true });
    else delete (perf as { now?: unknown }).now;
  }
}

export interface Rig {
  engine: MascotEngine;
  svg: SVGSVGElement;
  clock: number;
  dispose(): void;
}

/** A paused, hidden copy of the mascot. Freshly created, it shows the emotion's designed still pose. */
export function rig(look: Look, emotion: string): Rig {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '240px',
    height: '240px',
    pointerEvents: 'none',
  });
  document.body.appendChild(host);
  const clock = performance.now();
  const engine = at(clock, () =>
    createMascot(host, {
      character: look.character,
      emotion,
      color: look.color ?? null,
      eyeColor: look.eyeColor ?? null,
      autostart: false,
      lite: false,
    }),
  );
  const svg = host.querySelector('svg');
  if (!svg) {
    engine.destroy();
    host.remove();
    throw new Error('The mascot did not render');
  }
  return {
    engine,
    svg,
    clock,
    dispose() {
      engine.destroy();
      host.remove();
    },
  };
}

/** Switches emotion the way the live stage does, including the burst effects only active engines play. */
function play(r: Rig, emotion: string, replay = false): void {
  at(r.clock, () => {
    r.engine.setActive(true);
    if (replay) r.engine.replay();
    else r.engine.setEmotion(emotion);
    r.engine.setActive(false);
  });
}

/** Steps the engine forward on its own clock in small ticks so springs stay smooth. */
function advance(r: Rig, ms: number): void {
  const end = r.clock + ms;
  while (r.clock < end) {
    r.clock = Math.min(end, r.clock + TICK_MS);
    at(r.clock, () => r.engine.tick(r.clock));
  }
}

/** readBack keeps the canvas on the CPU, which is faster when pixels are read back every frame. */
export function makeCanvas(
  width: number,
  height: number,
  readBack = true,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: readBack });
  if (!ctx) throw new Error('Canvas is not available');
  ctx.imageSmoothingQuality = 'high';
  return [canvas, ctx];
}

/** Clears the canvas and fills it with the backdrop colour, or leaves it clear for transparency. */
export function paint(ctx: CanvasRenderingContext2D, backdrop: Backdrop, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const fill = FILL[backdrop];
  if (!fill) return;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
}

/** Draws the mascot's current frame, with the same padding as the PNG export, rendered at the target size. */
export async function drawFrame(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  x: number,
  y: number,
  size: number,
): Promise<void> {
  const url = URL.createObjectURL(
    new Blob([standaloneSvg(svg, size)], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    ctx.drawImage(image, x, y, size, size);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const yieldToPage = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Plays a timeline on a hidden engine and calls onFrame once per frame, already advanced to that
 * frame's time. Recording starts after a short warm-up so loops do not flash the pre-emotion colour.
 */
export async function recordTimeline(
  look: Look,
  timeline: Segment[],
  frameMs: number,
  onFrame: (svg: SVGSVGElement, index: number, frames: number) => Promise<void>,
): Promise<void> {
  const first = timeline[0];
  if (!first) throw new Error('Nothing to record');
  const r = rig(look, first.emotion);
  try {
    const total = timeline.reduce((sum, s) => sum + s.ms, 0);
    const frames = Math.max(1, Math.round(total / frameMs));
    const starts: number[] = [];
    timeline.reduce((t, s) => {
      starts.push(t);
      return t + s.ms;
    }, 0);
    play(r, first.emotion, true);
    advance(r, WARMUP_MS);
    let segment = 0;
    for (let i = 0; i < frames; i++) {
      const time = i * frameMs;
      if (i > 0) advance(r, frameMs);
      while (segment + 1 < timeline.length && time >= (starts[segment + 1] as number)) {
        segment += 1;
        play(r, (timeline[segment] as Segment).emotion);
      }
      await onFrame(r.svg, i, frames);
      await yieldToPage();
    }
  } finally {
    r.dispose();
  }
}
