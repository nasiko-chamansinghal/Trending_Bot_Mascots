import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import type { EmotionEngine } from '../../engine/mood-mates';
import { emotionsOf } from '../characters';
import { standaloneSvg } from '../exportImage';
import { MoodMates } from '../kits';

/**
 * Offline renders of a Mood Mates character. Each export drives its own hidden engine
 * with a synthetic clock, so frames are evenly spaced and nothing on screen is disturbed.
 */

export type Backdrop = 'white' | 'dark' | 'transparent';

export const BACKDROPS: Array<{ id: Backdrop; name: string }> = [
  { id: 'white', name: 'White' },
  { id: 'dark', name: 'Dark' },
  { id: 'transparent', name: 'Transparent' },
];

const FILL: Record<Backdrop, string | null> = { white: '#FFFFFF', dark: '#131315', transparent: null };
const INK: Record<Backdrop, [string, string]> = {
  white: ['#101012', '#5B5B63'],
  dark: ['#F4F4F5', '#A1A1AA'],
  transparent: ['#101012', '#5B5B63'],
};

const TICK_MS = 1000 / 60;
const GIF_FRAME_MS = 40;
const GIF_WARMUP_MS = 400;
const DITHER = 7;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const FONT = 'Figtree, system-ui, -apple-system, "Segoe UI", sans-serif';

export type Progress = (done: number) => void;

interface Rig {
  engine: EmotionEngine;
  svg: SVGSVGElement;
  clock: number;
  dispose(): void;
}

function rig(character: string, emotion: string): Rig {
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
  const engine = MoodMates.create(host, { character, emotion, autostart: false, lite: false });
  const svg = host.querySelector('svg');
  if (!svg) {
    engine.destroy();
    host.remove();
    throw new Error('The mascot did not render');
  }
  return {
    engine,
    svg,
    clock: performance.now(),
    dispose() {
      engine.destroy();
      host.remove();
    },
  };
}

/** Steps the engine forward on its own clock in small ticks so springs stay smooth. */
function advance(r: Rig, ms: number): void {
  const end = r.clock + ms;
  while (r.clock < end) {
    r.clock = Math.min(end, r.clock + TICK_MS);
    r.engine.tick(r.clock);
  }
}

async function draw(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  x: number,
  y: number,
  size: number,
): Promise<void> {
  const url = URL.createObjectURL(new Blob([standaloneSvg(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    ctx.drawImage(image, x, y, size, size);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available');
  return [canvas, ctx];
}

function paint(ctx: CanvasRenderingContext2D, backdrop: Backdrop, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const fill = FILL[backdrop];
  if (!fill) return;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
}

/** Ordered dithering hides the banding a 256-colour palette leaves in soft gradients. */
function dither(data: Uint8ClampedArray, width: number): void {
  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    if ((data[i + 3] as number) < 128) continue;
    const x = p % width;
    const y = (p - x) / width;
    const offset = ((BAYER[(y & 3) * 4 + (x & 3)] as number) / 15 - 0.5) * DITHER;
    data[i] = (data[i] as number) + offset;
    data[i + 1] = (data[i + 1] as number) + offset;
    data[i + 2] = (data[i + 2] as number) + offset;
  }
}

const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export interface GifOptions {
  character: string;
  emotion: string;
  seconds: number;
  size: number;
  backdrop: Backdrop;
  onProgress?: Progress;
}

/** Records one emotion as a looping GIF at 25 fps. */
export async function renderGif(o: GifOptions): Promise<Blob> {
  const r = rig(o.character, o.emotion);
  try {
    const [, ctx] = canvasOf(o.size, o.size);
    const gif = GIFEncoder();
    const frames = Math.round((o.seconds * 1000) / GIF_FRAME_MS);
    const clear = o.backdrop === 'transparent';
    advance(r, GIF_WARMUP_MS);
    for (let i = 0; i < frames; i++) {
      if (i > 0) advance(r, GIF_FRAME_MS);
      paint(ctx, o.backdrop, o.size, o.size);
      await draw(ctx, r.svg, 0, 0, o.size);
      const { data } = ctx.getImageData(0, 0, o.size, o.size);
      dither(data, o.size);
      if (clear) {
        const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
        const index = applyPalette(data, palette, 'rgba4444');
        const transparentIndex = palette.findIndex((c) => c[3] === 0);
        gif.writeFrame(index, o.size, o.size, {
          palette,
          delay: GIF_FRAME_MS,
          transparent: transparentIndex >= 0,
          transparentIndex: Math.max(0, transparentIndex),
          dispose: 2,
        });
      } else {
        const palette = quantize(data, 256);
        gif.writeFrame(applyPalette(data, palette), o.size, o.size, { palette, delay: GIF_FRAME_MS });
      }
      o.onProgress?.((i + 1) / frames);
      await nextFrame();
    }
    gif.finish();
    return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
  } finally {
    r.dispose();
  }
}

export interface SheetOptions {
  character: string;
  name: string;
  backdrop: Backdrop;
  onProgress?: Progress;
}

const COLS = 6;
const CELL = 220;
const LABEL = 46;
const GAP = 12;
const PAD = 40;
const HEADER = 96;

function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png');
  });
}

/** Every emotion of a character on one labelled PNG contact sheet. */
export async function renderSheet(o: SheetOptions): Promise<Blob> {
  const emotions = emotionsOf(o.character);
  const rows = Math.ceil(emotions.length / COLS);
  const width = PAD * 2 + COLS * CELL + (COLS - 1) * GAP;
  const height = PAD * 2 + HEADER + rows * (CELL + LABEL) + (rows - 1) * GAP;
  const [canvas, ctx] = canvasOf(width, height);
  const [ink, muted] = INK[o.backdrop];
  paint(ctx, o.backdrop, width, height);
  await document.fonts?.ready;

  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText(o.name, PAD, PAD + 44);
  ctx.fillStyle = muted;
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText(`${emotions.length} emotions · made in Mascot Studio`, PAD, PAD + 76);

  ctx.textAlign = 'center';
  for (let i = 0; i < emotions.length; i++) {
    const def = emotions[i];
    if (!def) continue;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (CELL + GAP);
    const y = PAD + HEADER + row * (CELL + LABEL + GAP);
    // A paused engine renders each emotion's designed still pose, the same one the studio's thumbnails use.
    const r = rig(o.character, def.id);
    try {
      await draw(ctx, r.svg, x, y, CELL);
    } finally {
      r.dispose();
    }
    ctx.fillStyle = ink;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(def.name, x + CELL / 2, y + CELL + 18, CELL - 8);
    ctx.fillStyle = muted;
    ctx.font = `500 13px ${FONT}`;
    ctx.fillText(`#${def.id}`, x + CELL / 2, y + CELL + 37);
    o.onProgress?.((i + 1) / emotions.length);
    await nextFrame();
  }
  return encodePng(canvas);
}
