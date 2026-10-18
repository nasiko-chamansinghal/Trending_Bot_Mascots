import { lerp } from '../../../../shared/math';
import type { EmotionRaw, PoseSpec, SequenceFrameSpec } from '../../../types';
import { CENTER, easeInOutCubic, easeOutBack, frac, smooth, span } from './layout';

type Pose = Required<Pick<PoseSpec, 'body' | 'eyes'>> & Pick<PoseSpec, 'props'>;

interface LoopOptions {
  duration: number;
  poster: number;
  expr: string;
  pose: (t: number) => Pose;
}

const STEP = 1000 / 30;

function loopEmotion(meta: Pick<EmotionRaw, 'id' | 'name' | 'desc'>, options: LoopOptions): EmotionRaw {
  const count = Math.round(options.duration / STEP);
  const frames: SequenceFrameSpec[] = [];
  for (let i = 0; i <= count; i++) {
    const at = (options.duration * i) / count;
    frames.push({
      at,
      ...options.pose(i === count ? 0 : at),
      ...(i === 0 ? { expr: options.expr, exprSpeed: 100 } : {}),
    });
  }
  const poster = options.pose(options.poster);
  return {
    ...meta,
    group: 'video',
    bare: true,
    gaze: false,
    transition: 300,
    blinkMs: null,
    openness: 1,
    pool: [options.expr],
    mouth: 'flat',
    body: { ...poster.body, breathe: 0 },
    eyes: poster.eyes,
    props: poster.props || {},
    sequence: { settle: 'hold', interp: 'linear', frames, loopFrom: 0 },
  };
}

const BODY = '@base';
const EYE = '@eye';

const SNOOZE_MS = 3600;

function snoozing(t: number): Pose {
  const breath = (1 - Math.cos((2 * Math.PI * t) / SNOOZE_MS)) / 2;
  const props: Record<string, number> = {};
  ['zA', 'zB', 'zC'].forEach((id, i) => {
    const u = frac(t / SNOOZE_MS - i / 3);
    props[`${id}X`] = lerp(172, 210, u) + 3 * Math.sin(2 * Math.PI * u * 1.2 + i);
    props[`${id}Y`] = lerp(46, 18, u);
    props[`${id}S`] = lerp(9, 22, smooth(u));
    props[`${id}A`] = lerp(-14, 8, u);
    props[`${id}O`] = smooth(span(u, 0, 0.16)) * (1 - smooth(span(u, 0.7, 1)));
  });
  return {
    body: { color: BODY, y: 5, rotate: -1.5, scaleX: 1.03 + 0.012 * breath, scaleY: 0.965 - 0.022 * breath },
    eyes: { both: { y: 6 + 0.6 * breath, color: EYE } },
    props,
  };
}

const TYPING_MS = 4400;

function bump(t: number, start: number, period: number, offset: number): number {
  if (t < start) return 0;
  const q = frac((t - start - offset) / period);
  return q < 0.45 ? Math.sin((Math.PI * q) / 0.45) : 0;
}

function typing(t: number): Pose {
  const look = smooth(span(t, 450, 900)) * (1 - smooth(span(t, 3650, 4050)));
  const blink = 1 - 0.92 * Math.sin(Math.PI * span(t, 2300, 2460));
  const size = t < 3450 ? easeOutBack(span(t, 1000, 1300)) : 1 - span(t, 3450, 3650) ** 2;
  const w = 58 * size;
  const props: Record<string, number> = {
    bubbleX: 196,
    bubbleY: 26,
    bubbleW: w,
    bubbleH: 40 * size,
    bubbleO: size > 0.01 ? 1 : 0,
    bubbleR: 3.8 * size,
  };
  for (let i = 0; i < 3; i++) {
    const b = t < 3450 ? bump(t, 1300, 840, i * 140) : 0;
    props[`bubbleD${i}`] = -3 * b * size;
    props[`bubbleP${i}`] = 0.35 + 0.65 * b;
  }
  const breath = Math.sin((4 * Math.PI * t) / TYPING_MS);
  return {
    body: { color: BODY, x: look, rotate: 1.2 * look, scaleY: 1 + 0.01 * breath, scaleX: 1 - 0.006 * breath },
    eyes: { both: { x: 5 * look, y: -8 * look, scaleY: blink, color: EYE } },
    props,
  };
}

const LOADING_MS = 4800;
const SQUARE = 56;
const SPREAD = 72;
const SQUARE_CORNER = 0.18;
const CORE = { x0: 54, x1: 186, y0: 56, y1: 180 };
const FULL = { x0: 25, x1: 207, y0: 15, y1: 220 };
const FULL_W = FULL.x1 - FULL.x0;
const FULL_H = FULL.y1 - FULL.y0;
const FULL_CX = (FULL.x0 + FULL.x1) / 2;
const FULL_CY = (FULL.y0 + FULL.y1) / 2;
const SMALL = 0.98 * Math.min(SQUARE / FULL_W, SQUARE / FULL_H);

function phase(t: number, a: number, b: number, c: number, d: number, ease: (u: number) => number): number {
  return t < c ? ease(span(t, a, b)) : 1 - ease(span(t, c, d));
}

function loadingBlocks(t: number): Pose {
  const shrink = phase(t, 300, 850, 3900, 4450, easeInOutCubic);
  const spread = t < 3650 ? easeOutBack(span(t, 300, 850)) : 1 - easeInOutCubic(span(t, 3650, 3950));
  const spawn = phase(t, 300, 650, 3650, 3900, smooth);
  const fill = phase(t, 980, 1150, 3400, 3550, smooth);
  const square = phase(t, 1150, 1280, 3280, 3400, easeInOutCubic);
  const pulse = phase(t, 1300, 1450, 3100, 3250, smooth);
  const f = lerp(1, SMALL, shrink);
  const bx = lerp(FULL_CX, CENTER, shrink);
  const by = lerp(FULL_CY, CENTER, shrink);
  const rx0 = lerp(CORE.x0, FULL.x0, fill);
  const rx1 = lerp(CORE.x1, FULL.x1, fill);
  const ry0 = lerp(CORE.y0, FULL.y0, fill);
  const ry1 = lerp(CORE.y1, FULL.y1, fill);
  const meX = lerp(bx + f * ((rx0 + rx1) / 2 - FULL_CX), CENTER, square);
  const meY = lerp(by + f * ((ry0 + ry1) / 2 - FULL_CY), CENTER, square);
  const meW = lerp((rx1 - rx0) * f, SQUARE, square);
  const meH = lerp((ry1 - ry0) * f, SQUARE, square);
  const props: Record<string, number> = {};
  const squares = [
    ['box1', CENTER - SPREAD * spread, SQUARE * spawn, SQUARE * spawn, 0, t >= 300 && t < 3900],
    ['me', meX, meW, meH, 1, t >= 980 && t < 3550],
    ['box2', CENTER + SPREAD * spread, SQUARE * spawn, SQUARE * spawn, 2, t >= 300 && t < 3900],
  ] as const;
  for (const [id, x, w, h, i, shown] of squares) {
    const beat = bump(t, 1300, 900, i * 180);
    const grow = 1 + 0.14 * pulse * beat;
    props[`${id}X`] = x;
    props[`${id}Y`] = id === 'me' ? meY : CENTER;
    props[`${id}W`] = w * grow;
    props[`${id}H`] = h * grow;
    props[`${id}C`] = id === 'me' ? lerp(0.1, SQUARE_CORNER, square) : SQUARE_CORNER;
    props[`${id}L`] = 0.55 * pulse * (1 - beat);
    props[`${id}O`] = shown ? 1 : 0;
  }
  const closed = t < 3550 ? smooth(span(t, 900, 980)) : 1 - easeOutBack(span(t, 3550, 3720));
  return {
    body: {
      color: BODY,
      scale: f,
      x: bx - CENTER + f * (CENTER - FULL_CX),
      y: by - CENTER + f * (CENTER - FULL_CY),
    },
    eyes: { both: { scaleY: Math.max(0.06, 1 - 0.94 * closed), color: EYE } },
    props,
  };
}

export const SNOOZING = loopEmotion(
  {
    id: '52',
    name: 'Snoozing',
    desc: 'Fast asleep: eyes shut, a slow squashy breath, and bold Zs that float up one after another',
  },
  { duration: SNOOZE_MS, poster: 1500, expr: 'closed', pose: snoozing },
);

export const TYPING = loopEmotion(
  {
    id: '55',
    name: 'Typing',
    desc: 'Eyes glance up as a speech bubble pops in and its three dots bounce like someone typing, then it pops away',
  },
  { duration: TYPING_MS, poster: 2000, expr: 'calm', pose: typing },
);

export const LOADING_BLOCKS = loopEmotion(
  {
    id: '58',
    name: 'Loading Blocks',
    desc: 'Two squares slide out from behind it as it shrinks, it turns into a matching square, all three pulse in turn like loading dots, then it grows back into itself',
  },
  { duration: LOADING_MS, poster: 2000, expr: 'calm', pose: loadingBlocks },
);
