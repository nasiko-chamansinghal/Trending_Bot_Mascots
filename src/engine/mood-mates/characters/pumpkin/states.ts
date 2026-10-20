import { easeInOutCubic } from '../../motion';
import type { EmotionGroup, EmotionRaw, SequenceFrameSpec } from '../../types';
import { FOLD_MS, UNFOLD_MS } from './eyes';

const D = Math.PI / 180;
const STEP = 1000 / 30;

export const PUMPKIN_GROUPS: EmotionGroup[] = [
  { key: 'pumpkin', name: 'Pumpkin Video' },
  { key: 'happy', name: 'Happy Moves' },
];

interface Body {
  x: number;
  y: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  turn: number;
  pitch: number;
}

type Key = [number, Partial<Body>];
type ExprEvent = [number, string, number];

const REST: Body = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, turn: 0, pitch: 0 };

function track(keys: Key[]): (t: number) => Body {
  const full: Array<[number, Body]> = [];
  let cur = { ...REST };
  for (const [at, b] of keys) {
    cur = { ...cur, ...b };
    full.push([at, cur]);
  }
  return (t: number) => {
    if (t <= (full[0] as [number, Body])[0]) return (full[0] as [number, Body])[1];
    for (let i = 0; i < full.length - 1; i++) {
      const [a, pa] = full[i] as [number, Body];
      const [b, pb] = full[i + 1] as [number, Body];
      if (t >= a && t <= b) {
        const u = b > a ? easeInOutCubic((t - a) / (b - a)) : 1;
        const o = { ...pa };
        for (const k of Object.keys(pa) as Array<keyof Body>) o[k] = pa[k] + (pb[k] - pa[k]) * u;
        return o;
      }
    }
    return (full[full.length - 1] as [number, Body])[1];
  };
}

function fold(at: number): ExprEvent[] {
  return FOLD_MS.map((ms, i) => [at + ms, `fold${i}`, 100] as ExprEvent).concat([[at + 260, 'arc', 100]]);
}

function unfold(at: number): ExprEvent[] {
  return UNFOLD_MS.map((ms, i) => [at + ms, `unfold${i}`, 100] as ExprEvent).concat([
    [at + 270, 'pill', 100],
  ]);
}

function keyed(
  meta: Pick<EmotionRaw, 'id' | 'name' | 'desc'>,
  duration: number,
  keys: Key[],
  exprs: ExprEvent[],
  start = 'pill',
): EmotionRaw {
  const body = track(keys);
  const times = new Set<number>();
  for (let t = 0; t <= duration; t += STEP) times.add(Math.round(t));
  times.add(duration);
  for (const [at] of keys) if (at <= duration) times.add(Math.round(at));
  for (const [at] of exprs) times.add(Math.round(at));
  const sorted = [...times].sort((a, b) => a - b);
  const frames: SequenceFrameSpec[] = sorted.map((at) => {
    const e = exprs.find((x) => Math.round(x[0]) === at);
    return { at, body: { ...body(at), breathe: 0 }, ...(e ? { expr: e[1], exprSpeed: e[2] } : {}) };
  });
  const first = frames[0] as SequenceFrameSpec;
  if (!first.expr) {
    first.expr = start;
    first.exprSpeed = 14;
  }
  return {
    ...meta,
    group: 'happy',
    bare: true,
    gaze: false,
    transition: 300,
    blinkMs: null,
    pool: [start],
    body: { ...body(0), breathe: 0 },
    sequence: { settle: 'hold', interp: 'linear', frames, loopFrom: 0 },
  };
}

const INHALE: Key[] = [
  [0, { scale: 1 }],
  [550, { scale: 1.05 }],
];

export const PUMPKIN_HAPPY: EmotionRaw[] = [
  keyed(
    {
      id: '56',
      name: 'Joy Fold',
      desc: 'Takes a breath, folds its pills over into happy ∩ arcs, bounces with a squash and stretch, then unfolds',
    },
    3200,
    [
      ...INHALE,
      [750, { scale: 1 }],
      [970, { scaleX: 1, scaleY: 1 }],
      [1130, { scaleX: 1.12, scaleY: 0.87 }],
      [1340, { scaleX: 0.93, scaleY: 1.08 }],
      [1540, { scaleX: 1.04, scaleY: 0.97 }],
      [1680, { scaleX: 1, scaleY: 1 }],
      [3200, {}],
    ],
    [...fold(550), ...unfold(1780)],
  ),
  keyed(
    {
      id: '57',
      name: 'Happy Hop',
      desc: 'Folds into happy arcs, crouches, hops up looking skyward with a little head roll, lands with a squash and a tiny rebound',
    },
    2600,
    [
      [0, {}],
      [280, { scaleX: 1, scaleY: 1 }],
      [390, { scaleX: 1.097, scaleY: 0.943 }],
      [450, { scaleX: 1.1, scaleY: 0.94 }],
      [495, { scaleX: 1.03, scaleY: 1.04, y: -2 }],
      [540, { scaleX: 0.985, scaleY: 1.09, y: -10, pitch: 7 * D, rotate: -4 }],
      [640, { scaleX: 1, scaleY: 1.06, y: -18, pitch: 17 * D, rotate: -8, turn: -2 * D }],
      [760, { scaleY: 1, y: -16, pitch: 27 * D, rotate: -12, turn: -6 * D }],
      [880, { y: -8 }],
      [1000, { y: 0, scaleX: 1, scaleY: 1 }],
      [1050, { scaleX: 1.1, scaleY: 0.94, pitch: 28 * D }],
      [1100, { scaleX: 1.03, scaleY: 1.02, y: -6 }],
      [1150, { y: -8, pitch: 20 * D, rotate: -8, turn: -4 * D }],
      [1250, { y: -3, scaleX: 1, scaleY: 1, pitch: 8 * D, rotate: -3, turn: -1 * D }],
      [1350, { y: 0, pitch: 0, rotate: 0, turn: 0 }],
      [2600, {}],
    ],
    [...fold(0), ...unfold(1150)],
  ),
  keyed(
    {
      id: '58',
      name: 'Happy Look-Around',
      desc: 'Breathes in, folds into happy arcs, glances up-left, sweeps across to up-right, then unfolds back to the front',
    },
    2800,
    [
      ...INHALE,
      [800, { scale: 1 }],
      [1000, {}],
      [1170, { turn: -7 * D, pitch: 32 * D, rotate: -10, x: -8.5, y: -10.2 }],
      [1430, {}],
      [1600, { turn: 17 * D, pitch: 30 * D, rotate: 4.5, x: 8.4, y: -12.4 }],
      [1800, {}],
      [2040, { turn: 0, pitch: 0, rotate: 0, x: 0, y: 0 }],
      [2800, {}],
    ],
    [...fold(600), ...unfold(1840)],
  ),
  keyed(
    {
      id: '59',
      name: 'Wide-Eyed Wonder',
      desc: 'Breathes in, pops its pills into big round eyes looking up-right, drifts its gaze across the sky, then settles with a tilt',
    },
    3600,
    [
      ...INHALE,
      [580, { scale: 1.02 }],
      [800, { scale: 1, turn: 19 * D, pitch: 25 * D }],
      [980, {}],
      [1450, { turn: 5 * D, pitch: 27 * D }],
      [1760, {}],
      [2100, { turn: 0, pitch: 0, rotate: -10 }],
      [2760, {}],
      [2990, {}],
      [3200, { rotate: 0 }],
      [3600, {}],
    ],
    [
      [580, 'round', 20],
      [1760, 'pill', 14],
    ],
  ),
  keyed(
    {
      id: '60',
      name: 'Startled Recoil',
      desc: 'Eyes go to small round dots, then it shrinks back and turns away, before springing back to full size',
    },
    2400,
    [
      [0, {}],
      [600, {}],
      [1080, { scale: 0.765, x: -5.2, turn: -22 * D, pitch: 14 * D }],
      [1200, {}],
      [1430, { scale: 1.03, x: 0, turn: 0, pitch: 0 }],
      [1520, { scale: 1 }],
      [2400, {}],
    ],
    [
      [0, 'dot', 14],
      [1200, 'pill', 12],
    ],
  ),
  keyed(
    {
      id: '61',
      name: 'Side Glance',
      desc: 'Glances left with its whole body following a little, then swings back past centre and settles',
    },
    2200,
    [
      [0, {}],
      [300, {}],
      [450, { turn: -20 * D, x: -8.1 }],
      [930, {}],
      [1080, { turn: 5 * D, x: 1.5 }],
      [1280, { turn: 0, x: 0 }],
      [2200, {}],
    ],
    [],
  ),
  keyed(
    {
      id: '62',
      name: 'Round-Eyed Attention',
      desc: 'Pills contract into round dots and it holds still, paying attention, breathing in now and then',
    },
    2400,
    [
      [0, {}],
      [1000, { scale: 1 }],
      [1550, { scale: 1.05 }],
      [1750, { scale: 1 }],
      [2400, {}],
    ],
    [],
    'dot',
  ),
];
