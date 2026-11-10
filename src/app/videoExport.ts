import { createMascot } from './characters';
import type { MascotEngine } from './engine-types';

/**
 * Offline video of any mascot (Ball or Mood Mates). Each export drives its own hidden engine
 * on a synthetic clock, so frames are evenly spaced whatever the display does, and the live
 * preview on screen is never touched.
 */

export type Backdrop = 'white' | 'dark';

const FILL: Record<Backdrop, string> = { white: '#FFFFFF', dark: '#131315' };

const TICK_MS = 1000 / 60;
const FPS = 30;
const FRAME_MS = 1000 / FPS;
const WARMUP_MS = 400;
const PADDING = 0.12;

export const VIDEO_SIZE = 512;
export const EMOTION_VIDEO_MS = 4000;

export class VideoUnsupportedError extends Error {
  constructor() {
    super('This browser cannot record video');
  }
}

export interface Look {
  character: string;
  color?: string | null;
  eyeColor?: string | null;
}

export interface Segment {
  emotion: string;
  ms: number;
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

interface Rig {
  engine: MascotEngine;
  svg: SVGSVGElement;
  clock: number;
  dispose(): void;
}

function rig(look: Look, emotion: string): Rig {
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

function frameSvg(svg: SVGSVGElement, size: number): string {
  const { x, y, width, height } = svg.viewBox.baseVal;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute(
    'viewBox',
    `${x - width * PADDING} ${y - height * PADDING} ${width * (1 + PADDING * 2)} ${height * (1 + PADDING * 2)}`,
  );
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  return new XMLSerializer().serializeToString(clone).replace(/<!--[\s\S]*?-->/g, '');
}

async function draw(ctx: CanvasRenderingContext2D, svg: SVGSVGElement, size: number): Promise<void> {
  const url = URL.createObjectURL(new Blob([frameSvg(svg, size)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    ctx.drawImage(image, 0, 0, size, size);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const yieldToPage = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The theme the studio is showing, so a video matches what the user sees. */
export function themeBackdrop(): Backdrop {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'white';
}

export interface VideoOptions extends Look {
  /** Emotions in order with how long each plays. */
  timeline: Segment[];
  backdrop: Backdrop;
  onProgress?: (done: number) => void;
}

/** Records a timeline of emotions as an H.264 MP4 at 30 fps. */
export async function renderVideo(o: VideoOptions): Promise<Blob> {
  const first = o.timeline[0];
  if (!first) throw new Error('Nothing to record');
  const size = VIDEO_SIZE;
  const { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } =
    await import('mediabunny');
  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width: size, height: size });
  if (!codec) throw new VideoUnsupportedError();

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.imageSmoothingQuality = 'high';

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const source = new CanvasSource(canvas, { codec, quality: QUALITY_HIGH, keyFrameInterval: 1 });
  output.addVideoTrack(source, { frameRate: FPS });

  const r = rig(o, first.emotion);
  try {
    await output.start();
    const total = o.timeline.reduce((sum, s) => sum + s.ms, 0);
    const frames = Math.max(1, Math.round(total / FRAME_MS));
    const starts: number[] = [];
    o.timeline.reduce((t, s) => {
      starts.push(t);
      return t + s.ms;
    }, 0);
    play(r, first.emotion, true);
    advance(r, WARMUP_MS);
    let segment = 0;
    for (let i = 0; i < frames; i++) {
      const time = i * FRAME_MS;
      if (i > 0) advance(r, FRAME_MS);
      while (segment + 1 < o.timeline.length && time >= (starts[segment + 1] as number)) {
        segment += 1;
        play(r, (o.timeline[segment] as Segment).emotion);
      }
      ctx.fillStyle = FILL[o.backdrop];
      ctx.fillRect(0, 0, size, size);
      await draw(ctx, r.svg, size);
      await source.add(i / FPS, 1 / FPS);
      o.onProgress?.((i + 1) / frames);
      await yieldToPage();
    }
    await output.finalize();
    const buffer = target.buffer;
    if (!buffer) throw new Error('The video was empty');
    return new Blob([buffer], { type: 'video/mp4' });
  } catch (e) {
    await output.cancel().catch(() => undefined);
    throw e;
  } finally {
    r.dispose();
  }
}
