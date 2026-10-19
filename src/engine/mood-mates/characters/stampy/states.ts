import { lerp, lerpColor } from '../../../shared/math';
import { type LoopPose, loopEmotion } from '../../loop';
import { easeOutBack, frac, smooth, span } from '../../motion';
import type { EmotionGroup, EmotionRaw, PropDef } from '../../types';
import { STAMPY_PALETTE } from './palette';

const C = STAMPY_PALETTE.states;
const FEET = 100;
const EYE = '@eye';

export const STATE_GROUPS: EmotionGroup[] = [{ key: 'video', name: 'Video States' }];

export const STATE_PROPS: PropDef[] = [
  { id: 'box1', kind: 'box', color: 'body', radius: 0.12 },
  { id: 'dA', kind: 'box', color: '#8F9A8C', radius: 0.5 },
  { id: 'dB', kind: 'box', color: '#8F9A8C', radius: 0.5 },
  { id: 'dC', kind: 'box', color: '#8F9A8C', radius: 0.5 },
  { id: 'bubble', kind: 'bubble', color: 'body', dotColor: 'eye' },
  { id: 'zA', kind: 'glyph', text: 'Z', color: 'eye' },
  { id: 'zB', kind: 'glyph', text: 'Z', color: 'eye' },
  { id: 'zC', kind: 'glyph', text: 'Z', color: 'eye' },
];

function hop(t: number, period: number, height: number) {
  const u = frac(t / period);
  if (u < 0.14) {
    const k = Math.sin((u / 0.14) * Math.PI);
    return { y: 0, sx: 1 + 0.07 * k, sy: 1 - 0.09 * k, air: 0, phase: u };
  }
  const a = (u - 0.14) / 0.86;
  const up = 4 * a * (1 - a);
  const stretch = Math.max(0, 1 - a * 3) * 0.05 + Math.max(0, a * 3 - 2) * 0.03;
  return { y: -height * up, sx: 1 - stretch, sy: 1 + stretch, air: up, phase: u };
}

function cycleColor(t: number, period: number): string {
  const u = frac(t / period);
  const stops = [C.base, '#A9C495', C.mauve, C.blush, C.blush, '#BED69C', C.base];
  const pos = u * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  return lerpColor(stops[i] as string, stops[i + 1] as string, smooth(pos - i));
}

const CYCLE_MS = 2000;
const HOP_SCALE = 0.86;

function colourCycle(t: number): LoopPose {
  const h = hop(t, CYCLE_MS / 3, 26);
  return {
    body: {
      color: cycleColor(t, CYCLE_MS),
      scale: HOP_SCALE,
      y: FEET * (1 - HOP_SCALE) + h.y,
      scaleX: h.sx,
      scaleY: h.sy,
    },
    eyes: { both: { color: EYE } },
  };
}

function colourCycleExpr(t: number): string {
  const second = t >= CYCLE_MS / 3 && t < (2 * CYCLE_MS) / 3;
  const u = frac(t / (CYCLE_MS / 3));
  if (second && u > 0.48 && u < 0.53) return 'lidDrop';
  if (second && u >= 0.53 && u < 0.58) return 'closed';
  if (second && u >= 0.58 && u < 0.63) return 'squash';
  return 'calm';
}

const GLARE_MS = 2600;

function glare(t: number): LoopPose {
  const breath = Math.sin((2 * Math.PI * t) / GLARE_MS);
  return {
    body: { color: '@base', scaleY: 1 + 0.008 * breath, scaleX: 1 - 0.005 * breath },
    eyes: { both: { color: EYE } },
  };
}

function glareExpr(t: number): string {
  if (t < 260) return 'angry2';
  if (t >= 1600 && t < 1640) return 'lidDrop';
  if (t >= 1640 && t < 1690) return 'closed';
  if (t >= 1690 && t < 1740) return 'squash';
  return 'angry';
}

const PUSH_MS = 1400;
const PUSH_SCALE = 0.7;

function pusher(t: number): LoopPose {
  const u = frac(t / PUSH_MS);
  const shove = u < 0.35 ? smooth(u / 0.35) : 1 - smooth((u - 0.35) / 0.65);
  const s = PUSH_SCALE;
  const x = -30 + 5 * shove;
  const props: Record<string, number> = {
    box1X: 186 + 6 * shove,
    box1Y: 120 + FEET - 25,
    box1W: 50,
    box1H: 50,
    box1O: 1,
  };
  ['dA', 'dB', 'dC'].forEach((id, i) => {
    const p = frac(u - i / 3);
    props[`${id}X`] = 52 - 26 * p;
    props[`${id}Y`] = 120 + FEET - 6 - 18 * p;
    props[`${id}W`] = 7 + 9 * p;
    props[`${id}H`] = 7 + 9 * p;
    props[`${id}O`] = 0.75 * Math.sin(Math.PI * p);
  });
  return {
    body: {
      color: '@base',
      scale: s,
      x,
      y: FEET * (1 - s),
      rotate: 10 + 3 * shove,
      scaleX: 1 + 0.03 * shove,
      scaleY: 1 - 0.03 * shove,
    },
    eyes: { both: { color: EYE } },
    props,
  };
}

const TYPE_MS = 3200;
const TYPE_SCALE = 0.8;

function bump(t: number, start: number, period: number, offset: number): number {
  if (t < start) return 0;
  const q = frac((t - start - offset) / period);
  return q < 0.45 ? Math.sin((Math.PI * q) / 0.45) : 0;
}

function typing(t: number): LoopPose {
  const s = TYPE_SCALE;
  const lift = Math.sin(span(t, 1200, 2000) * Math.PI) * 4;
  const size = t < 2700 ? easeOutBack(span(t, 120, 420)) : 1 - span(t, 2700, 2900) ** 2;
  const props: Record<string, number> = {
    bubbleX: 196,
    bubbleY: 34,
    bubbleW: 60 * size,
    bubbleH: 40 * size,
    bubbleO: size > 0.01 ? 1 : 0,
    bubbleR: 3.8 * size,
  };
  for (let i = 0; i < 3; i++) {
    const b = t < 2700 ? bump(t, 420, 840, i * 140) : 0;
    props[`bubbleD${i}`] = -3 * b * size;
    props[`bubbleP${i}`] = 0.35 + 0.65 * b;
  }
  return {
    body: {
      color: '@base',
      scale: s,
      x: -14,
      y: FEET * (1 - s) - lift,
      rotate: -1.5 * Math.sin((2 * Math.PI * t) / TYPE_MS),
    },
    eyes: { both: { color: EYE } },
    props,
  };
}

function typingExpr(t: number): string {
  if (t > 600 && t < 2500) return 'lookUp';
  return 'calm';
}

const HOP_MS = 1300;

function hopper(t: number): LoopPose {
  const active = t < 800;
  const h = active ? hop(t, 400, 24) : { y: 0, sx: 1, sy: 1, air: 0, phase: 0 };
  return {
    body: { color: '@base', scale: HOP_SCALE, y: FEET * (1 - HOP_SCALE) + h.y, scaleX: h.sx, scaleY: h.sy },
    eyes: { both: { color: EYE } },
  };
}

function hopperExpr(t: number): string {
  if (t >= 800) return t < 950 ? 'hopLand' : 'calm';
  const u = frac(t / 400);
  if (u < 0.14) return 'cosyLand';
  if (u < 0.6) return 'cosyJump';
  return 'hopLand';
}

const SLEEP_MS = 1200;
const SLEEP_SCALE = 0.84;

function sleeper(t: number): LoopPose {
  const breath = (1 - Math.cos((2 * Math.PI * t) / SLEEP_MS)) / 2;
  const props: Record<string, number> = {};
  ['zA', 'zB', 'zC'].forEach((id, i) => {
    const u = frac(t / SLEEP_MS - i / 3);
    props[`${id}X`] = lerp(184, 216, u);
    props[`${id}Y`] = lerp(52, 16, u);
    props[`${id}S`] = lerp(10, 25, smooth(u));
    props[`${id}A`] = lerp(-12, 6, u);
    props[`${id}O`] = smooth(span(u, 0, 0.12)) * (1 - smooth(span(u, 0.62, 1)));
  });
  return {
    body: {
      color: '@base',
      scale: SLEEP_SCALE,
      x: -10,
      y: FEET * (1 - SLEEP_SCALE) + 2,
      rotate: -4,
      scaleX: 1.02 + 0.012 * breath,
      scaleY: 0.975 - 0.02 * breath,
    },
    eyes: { both: { color: EYE } },
    props,
  };
}

export const STAMPY_STATES: EmotionRaw[] = [
  loopEmotion(
    {
      id: '50',
      name: 'Colour Cycle',
      desc: 'Hops in place as its colour drifts green, grey, pink and back, blinking at the top of a hop',
    },
    {
      duration: CYCLE_MS,
      poster: 1000,
      expr: 'calm',
      pose: colourCycle,
      exprAt: colourCycleExpr,
      exprSpeed: 34,
    },
  ),
  loopEmotion(
    {
      id: '51',
      name: 'Glare',
      desc: 'Lids slam into a deep V glare and hold it, with one slow menacing blink',
    },
    { duration: GLARE_MS, poster: 900, expr: 'angry', pose: glare, exprAt: glareExpr, exprSpeed: 30 },
  ),
  loopEmotion(
    {
      id: '52',
      name: 'Pusher',
      desc: 'Leans in with a lopsided glare and shoves a box along, kicking up little dust puffs',
    },
    { duration: PUSH_MS, poster: 450, expr: 'push', pose: pusher },
  ),
  loopEmotion(
    {
      id: '53',
      name: 'Typing',
      desc: 'A speech bubble pops up with three bouncing dots while the eyes glance up at it',
    },
    { duration: TYPE_MS, poster: 1500, expr: 'calm', pose: typing, exprAt: typingExpr, exprSpeed: 10 },
  ),
  loopEmotion(
    {
      id: '54',
      name: 'Hopper',
      desc: 'Two quick hops with cosy squinting eyes that squash on every landing, then a little rest',
    },
    { duration: HOP_MS, poster: 120, expr: 'cosyJump', pose: hopper, exprAt: hopperExpr, exprSpeed: 26 },
  ),
  loopEmotion(
    {
      id: '55',
      name: 'Sleeper',
      desc: 'Dash eyes closed, a slow squashy breath and Zs that climb up and fade one after another',
    },
    { duration: SLEEP_MS, poster: 600, expr: 'closed2', pose: sleeper },
  ),
];
