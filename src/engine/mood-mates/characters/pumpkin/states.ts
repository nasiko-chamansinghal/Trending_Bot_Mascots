import type { EmotionGroup, EmotionRaw, SequenceFrameSpec } from '../../types';
import { type BodyKey as Key, track } from './curve';
import { FOLD_MS, UNFOLD_MS } from './eyes';
import { TRACE_SPEED } from './speeds';

const D = Math.PI / 180;
const STEP = 1000 / 30;

export const PUMPKIN_GROUPS: EmotionGroup[] = [
  { key: 'pumpkin', name: 'Pumpy Video' },
  { key: 'happy', name: 'Happy Moves' },
];

type ExprEvent = [number, string, number];

function fold(at: number): ExprEvent[] {
  return FOLD_MS.map((ms, i) => [at + ms, `fold${i}`, TRACE_SPEED] as ExprEvent).concat([
    [at + 260, 'arc', TRACE_SPEED],
  ]);
}

function unfold(at: number): ExprEvent[] {
  return UNFOLD_MS.map((ms, i) => [at + ms, `unfold${i}`, TRACE_SPEED] as ExprEvent).concat([
    [at + 270, 'pill', TRACE_SPEED],
  ]);
}

function keyed(
  { aura, ...meta }: Pick<EmotionRaw, 'id' | 'name' | 'desc'> & { aura?: string },
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
    body: { ...body(0), breathe: 0, ...(aura ? { aura } : {}) },
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
      id: '48',
      aura: 'rainbow',
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
      id: '49',
      aura: 'rainbow',
      name: 'Happy Look-Around',
      desc: 'Breathes in, folds into happy arcs, glances up-left, sweeps across to up-right, then unfolds back to the front',
    },
    3400,
    [
      ...INHALE,
      [800, { scale: 1 }],
      [1000, {}],
      [1290, { turn: -7 * D, pitch: 32 * D, rotate: -10, x: -8.5, y: -10.2 }],
      [1560, {}],
      [1700, { turn: 3 * D, pitch: 33 * D, rotate: -3, x: 0, y: -11.8 }],
      [1860, { turn: 17 * D, pitch: 30 * D, rotate: 4.5, x: 8.4, y: -12.4 }],
      [2160, {}],
      [2520, { turn: 0, pitch: 0, rotate: 0, x: 0, y: 0 }],
      [3400, {}],
    ],
    [...fold(600), ...unfold(2200)],
  ),
  keyed(
    {
      id: '50',
      aura: 'swirl',
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
      id: '51',
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
      id: '52',
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
      id: '53',
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
