import { emotionsOf } from './characters';
import {
  type Backdrop,
  drawFrame,
  type Look,
  makeCanvas,
  paint,
  recordTimeline,
  rig,
  type Segment,
  yieldToPage,
} from './recorder';

export { type Backdrop, type Look, type Segment, themeBackdrop } from './recorder';

export const BACKDROPS: Array<{ id: Backdrop; name: string }> = [
  { id: 'white', name: 'White' },
  { id: 'dark', name: 'Dark' },
  { id: 'transparent', name: 'Transparent' },
];

const INK: Record<Backdrop, [string, string]> = {
  white: ['#101012', '#5B5B63'],
  dark: ['#F4F4F5', '#A1A1AA'],
  transparent: ['#101012', '#5B5B63'],
};

const FRAME_MS = 40;
const DITHER = 7;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const FONT = 'Figtree, system-ui, -apple-system, "Segoe UI", sans-serif';

export const GIF_SIZE = 512;
export const GIF_SECONDS = 4;

export type Progress = (done: number) => void;

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

export interface GifOptions extends Look {
  /** Emotions in order with how long each plays. One segment records a single looping emotion. */
  timeline: Segment[];
  size?: number;
  backdrop: Backdrop;
  onProgress?: Progress;
}

/** Records a timeline of emotions as a looping GIF at 25 fps. */
export async function renderGif(o: GifOptions): Promise<Blob> {
  // The encoder loads only when someone exports a GIF, keeping it out of the studio's main bundle.
  const { applyPalette, GIFEncoder, quantize } = await import('gifenc');
  const size = o.size ?? GIF_SIZE;
  const [, ctx] = makeCanvas(size, size);
  const gif = GIFEncoder();
  const clear = o.backdrop === 'transparent';
  await recordTimeline(o, o.timeline, FRAME_MS, async (svg, i, frames) => {
    paint(ctx, o.backdrop, size, size);
    await drawFrame(ctx, svg, 0, 0, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    dither(data, size);
    if (clear) {
      const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
      const index = applyPalette(data, palette, 'rgba4444');
      const transparentIndex = palette.findIndex((c) => c[3] === 0);
      gif.writeFrame(index, size, size, {
        palette,
        delay: FRAME_MS,
        transparent: transparentIndex >= 0,
        transparentIndex: Math.max(0, transparentIndex),
        dispose: 2,
      });
    } else {
      const palette = quantize(data, 256);
      gif.writeFrame(applyPalette(data, palette), size, size, { palette, delay: FRAME_MS });
    }
    o.onProgress?.((i + 1) / frames);
  });
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
}

export interface SheetOptions extends Look {
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
  const [canvas, ctx] = makeCanvas(width, height);
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
    const r = rig(o, def.id);
    try {
      await drawFrame(ctx, r.svg, x, y, CELL);
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
    await yieldToPage();
  }
  return encodePng(canvas);
}
