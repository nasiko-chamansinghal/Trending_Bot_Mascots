import { clamp01 } from '../../motion';
import type { ClipDef, ClipFrame } from '../../types';
import { type BodyKey, type Key, monotone, track } from './curve';
import { FOLD_MS, UNFOLD_MS } from './eyes';
import { TRACE_SPEED } from './speeds';

const TAU = Math.PI * 2;

function around(base: number, k: number, s: number): number {
  return base + (k - base) * s;
}

function tracks<K extends string>(spec: Record<K, Key[]>): Record<K, (t: number) => number> {
  return Object.fromEntries(Object.entries<Key[]>(spec).map(([k, v]) => [k, monotone(v)])) as Record<
    K,
    (t: number) => number
  >;
}

function envelope(t: number, duration: number, inMs: number, outMs: number): number {
  return clamp01(Math.min(t / inMs, (duration - t) / outMs));
}

const BOING = tracks({
  sx: [
    [0, 1],
    [420, 1],
    [580, 1.12],
    [790, 0.93],
    [990, 1.04],
    [1130, 1],
  ],
  sy: [
    [0, 1],
    [420, 1],
    [580, 0.87],
    [790, 1.08],
    [990, 0.97],
    [1130, 1],
  ],
});

export const joyFoldBoing: ClipDef = {
  duration: 1560,
  sample(t: number, strength: number): ClipFrame {
    return { sx: around(1, BOING.sx(t), strength), sy: around(1, BOING.sy(t), strength) };
  },
  expr: [
    ...FOLD_MS.map((ms, i) => ({ at: ms, expr: `fold${i}`, speed: TRACE_SPEED })),
    { at: 260, expr: 'arc', speed: TRACE_SPEED },
    ...UNFOLD_MS.map((ms, i) => ({ at: 1230 + ms, expr: `unfold${i}`, speed: TRACE_SPEED })),
    { at: 1500, expr: 'pill', speed: TRACE_SPEED },
  ],
};

const D = Math.PI / 180;

const HOP_SPEED = 0.92;

function leap(at: number, side: 1 | -1): BodyKey[] {
  const m = (v: number): number => v * side;
  return [
    [at, { scaleX: 1.03, scaleY: 1.04, y: -2, x: 0 }],
    [at + 45, { scaleX: 0.985, scaleY: 1.09, y: -10, pitch: 7 * D, rotate: m(-4), turn: 0, x: m(-2) }],
    [at + 145, { scaleX: 1, scaleY: 1.06, y: -18, pitch: 17 * D, rotate: m(-8), turn: m(-2 * D), x: m(-5) }],
    [at + 265, { scaleY: 1, y: -16, pitch: 27 * D, rotate: m(-12), turn: m(-6 * D), x: m(-8) }],
    [at + 385, { y: -8 }],
    [at + 505, { y: 0, scaleX: 1, scaleY: 1, x: m(-7) }],
  ];
}

const HOP_KEYS: BodyKey[] = [
  [0, {}],
  [110, { scaleX: 1.097, scaleY: 0.943 }],
  [170, { scaleX: 1.1, scaleY: 0.94 }],
  ...leap(215, 1),
  [790, { scaleX: 1.1, scaleY: 0.92, y: 0, x: -2, rotate: 0, turn: 0, pitch: 8 * D }],
  ...leap(830, -1),
  [1385, { scaleX: 1.1, scaleY: 0.94, pitch: 28 * D }],
  [1435, { scaleX: 1.03, scaleY: 1.02, y: -6 }],
  [1485, { y: -8, pitch: 20 * D, rotate: 8, turn: 4 * D, x: 5 }],
  [1585, { y: -3, scaleX: 1, scaleY: 1, pitch: 8 * D, rotate: 3, turn: 1 * D, x: 2 }],
  [1685, { x: 0, y: 0, pitch: 0, rotate: 0, turn: 0 }],
];

const HOP_LAND = 1335 * HOP_SPEED;
const HOP_MS = Math.round(1820 * HOP_SPEED);
const HOPS = track([...HOP_KEYS.map(([at, b]) => [at * HOP_SPEED, b] as BodyKey), [HOP_MS, {}]]);

export const happyHop: ClipDef = {
  duration: HOP_MS,
  sample(t: number, s: number): ClipFrame {
    const b = HOPS(t);
    return {
      dx: b.x * s,
      dy: b.y * s,
      rotate: b.rotate * s,
      sx: around(1, b.scaleX, s),
      sy: around(1, b.scaleY, s),
      turn: b.turn * s,
      pitch: b.pitch * s,
    };
  },
  expr: [
    ...FOLD_MS.map((ms, i) => ({ at: ms, expr: `fold${i}`, speed: TRACE_SPEED })),
    { at: 260, expr: 'arc', speed: TRACE_SPEED },
    ...UNFOLD_MS.map((ms, i) => ({ at: HOP_LAND + 100 + ms, expr: `unfold${i}`, speed: TRACE_SPEED })),
    { at: HOP_LAND + 100 + 270, expr: 'pill', speed: TRACE_SPEED },
  ],
};

const BOOP = tracks({
  sx: [
    [0, 1],
    [90, 1.17],
    [210, 0.91],
    [340, 1.05],
    [480, 0.98],
    [620, 1],
    [1400, 1],
  ],
  sy: [
    [0, 1],
    [90, 0.8],
    [210, 1.12],
    [340, 0.95],
    [480, 1.03],
    [620, 1],
    [1400, 1],
  ],
  dy: [
    [0, 0],
    [90, 2],
    [230, -7],
    [380, 0],
    [1400, 0],
  ],
});

export const boop: ClipDef = {
  duration: 1400,
  sample(t: number, s: number): ClipFrame {
    return {
      sx: around(1, BOOP.sx(t), s),
      sy: around(1, BOOP.sy(t), s),
      dy: BOOP.dy(t) * s,
    };
  },
  expr: [
    { at: 0, expr: 'squint', speed: 34 },
    { at: 430, expr: 'round', speed: 20 },
    { at: 1050, expr: 'pill', speed: 11 },
  ],
};

const HEART = tracks({
  rotate: [
    [0, 0],
    [320, -6],
    [700, 6],
    [1080, -4],
    [1460, 3],
    [1840, 0],
    [2300, 0],
  ],
  dy: [
    [0, 0],
    [200, -6],
    [420, 0],
    [640, -4],
    [860, 0],
    [2300, 0],
  ],
  pulse: [
    [0, 1],
    [500, 1],
    [580, 1.2],
    [700, 1],
    [780, 1.13],
    [900, 1],
    [1120, 1],
    [1200, 1.2],
    [1320, 1],
    [1400, 1.13],
    [1520, 1],
    [2300, 1],
  ],
});

export const heartEyes: ClipDef = {
  duration: 2300,
  sample(t: number, s: number): ClipFrame {
    const p = around(1, HEART.pulse(t), s);
    return { rotate: HEART.rotate(t) * s, dy: HEART.dy(t) * s, eyeSx: p, eyeSy: p };
  },
  expr: [
    { at: 60, expr: 'heart', speed: 13 },
    { at: 1820, expr: 'pill', speed: 10 },
  ],
};

const WINK = tracks({
  rotate: [
    [0, 0],
    [220, -8],
    [820, -8],
    [1150, 0],
    [1500, 0],
  ],
  dy: [
    [0, 0],
    [160, -5],
    [360, 0],
    [1500, 0],
  ],
  sy: [
    [0, 1],
    [160, 1.05],
    [320, 0.95],
    [470, 1],
    [1500, 1],
  ],
});

export const wink: ClipDef = {
  duration: 1500,
  sample(t: number, s: number): ClipFrame {
    const sy = around(1, WINK.sy(t), s);
    return { rotate: WINK.rotate(t) * s, dy: WINK.dy(t) * s, sy, sx: 1 / Math.sqrt(sy) };
  },
  expr: [
    { at: 110, expr: 'wink', speed: 24 },
    { at: 900, expr: 'pill', speed: 15 },
  ],
};

export const jelly: ClipDef = {
  duration: 1700,
  sample(t: number, s: number): ClipFrame {
    const env = Math.exp(-t / 430) * clamp01(t / 60) * envelope(t, 1700, 1, 260) * s;
    const w = Math.sin((TAU * t) / 290);
    const q = Math.sin((TAU * t) / 290 + 1.1);
    return {
      sx: 1 + 0.13 * w * env,
      sy: 1 - 0.13 * w * env,
      rotate: 3.2 * q * env,
      eyeSx: 1 - 0.09 * w * env,
      eyeSy: 1 + 0.12 * w * env,
    };
  },
  expr: [
    { at: 0, expr: 'dot', speed: 22 },
    { at: 1250, expr: 'pill', speed: 10 },
  ],
};

const PIROUETTE_MS = 2100;

const PIROUETTE = tracks({
  spin: [
    [0, 0],
    [180, -0.32],
    [330, -0.32],
    [1180, TAU + 0.12],
    [1420, TAU],
    [PIROUETTE_MS, TAU],
  ],
  dy: [
    [0, 0],
    [330, 3],
    [520, -24],
    [760, -30],
    [1000, -16],
    [1160, 0],
    [1260, 1.5],
    [1420, 0],
    [PIROUETTE_MS, 0],
  ],
  sx: [
    [0, 1],
    [330, 1.12],
    [470, 0.92],
    [760, 0.97],
    [1100, 1],
    [1180, 1.14],
    [1330, 0.95],
    [1480, 1.02],
    [1600, 1],
    [PIROUETTE_MS, 1],
  ],
  sy: [
    [0, 1],
    [330, 0.86],
    [470, 1.11],
    [760, 1.04],
    [1100, 1],
    [1180, 0.85],
    [1330, 1.06],
    [1480, 0.98],
    [1600, 1],
    [PIROUETTE_MS, 1],
  ],
  rotate: [
    [0, 0],
    [330, -5],
    [700, 7],
    [1100, -3],
    [1250, 0],
    [1550, 0],
    [1720, 9],
    [1950, 9],
    [PIROUETTE_MS, 0],
  ],
});

export const pirouette: ClipDef = {
  duration: PIROUETTE_MS,
  sample(t: number, s: number): ClipFrame {
    return {
      yaw: PIROUETTE.spin(t),
      dy: PIROUETTE.dy(t) * s,
      sx: around(1, PIROUETTE.sx(t), s),
      sy: around(1, PIROUETTE.sy(t), s),
      rotate: PIROUETTE.rotate(t) * s,
    };
  },
  expr: [
    { at: 120, expr: 'arc', speed: 16 },
    { at: 1700, expr: 'wink', speed: 20 },
    { at: 2000, expr: 'pill', speed: 12 },
  ],
};

export const giggle: ClipDef = {
  duration: 1650,
  sample(t: number, s: number): ClipFrame {
    const env = envelope(t, 1650, 180, 320) * s;
    const b = Math.abs(Math.sin((TAU * t) / 230));
    return {
      rotate: 4.2 * Math.sin((TAU * t) / 115) * env,
      dy: -4 * b * env,
      sy: 1 - 0.05 * (1 - b) * env,
      sx: 1 + 0.04 * (1 - b) * env,
    };
  },
  expr: [
    { at: 0, expr: 'arc', speed: 18 },
    { at: 1380, expr: 'pill', speed: 12 },
  ],
};
