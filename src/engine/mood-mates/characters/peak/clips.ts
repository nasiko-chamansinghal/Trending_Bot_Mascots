import { clamp01 } from '../../motion';
import type { ClipDef, ClipFrame } from '../../types';
import { type Key, monotone } from '../pumpkin/curve';

const TAU = Math.PI * 2;

function tracks<K extends string>(spec: Record<K, Key[]>): Record<K, (t: number) => number> {
  return Object.fromEntries(Object.entries<Key[]>(spec).map(([k, v]) => [k, monotone(v)])) as Record<
    K,
    (t: number) => number
  >;
}

function around(base: number, k: number, s: number): number {
  return base + (k - base) * s;
}

function span(t: number, from: number, rise: number, until: number, fall: number): number {
  return clamp01(Math.min((t - from) / rise, (until - t) / fall));
}

const RUMBLE_MS = 3000;

const RUMBLE = tracks({
  shake: [
    [0, 0],
    [750, 1],
    [1150, 1],
    [1500, 0.25],
    [1900, 0.12],
    [2300, 0],
    [RUMBLE_MS, 0],
  ],
  sy: [
    [0, 1],
    [1000, 1],
    [1350, 1.2],
    [1900, 1.2],
    [2200, 0.95],
    [2450, 1.025],
    [2700, 1],
    [RUMBLE_MS, 1],
  ],
  sx: [
    [0, 1],
    [1000, 1],
    [1350, 0.89],
    [1900, 0.89],
    [2200, 1.05],
    [2450, 0.99],
    [2700, 1],
    [RUMBLE_MS, 1],
  ],
  crown: [
    [0, 0],
    [1100, 0],
    [1700, 0.34],
    [2300, 0],
    [RUMBLE_MS, 0],
  ],
});

export const rumble: ClipDef = {
  duration: RUMBLE_MS,
  sample(t: number, s: number): ClipFrame {
    const k = RUMBLE.shake(t);
    return {
      rotate: 2.1 * k * Math.sin((TAU * t) / 92) * s,
      dx: 1.5 * k * Math.sin((TAU * t) / 61 + 1.3) * s,
      turn: (0.045 * k * Math.sin((TAU * t) / 130) + RUMBLE.crown(t)) * s,
      sx: around(1, RUMBLE.sx(t), s),
      sy: around(1, RUMBLE.sy(t), s),
      eyeSx: around(1, 1 + 0.05 * k * Math.sin((TAU * t) / 92), s),
    };
  },
  expr: [
    { at: 0, expr: 'g7', speed: 22 },
    { at: 1000, expr: 'g3', speed: 20 },
    { at: 2200, expr: 'g19', speed: 14 },
    { at: 2750, expr: 'calm', speed: 10 },
  ],
};

const SURVEY_MS = 4200;

const SURVEY = tracks({
  turn: [
    [0, 0],
    [500, -0.12],
    [1250, 0.78],
    [1750, 0.78],
    [2550, -0.78],
    [3050, -0.78],
    [3550, 0.06],
    [3900, 0],
    [SURVEY_MS, 0],
  ],
  pitch: [
    [0, 0],
    [550, -0.3],
    [1250, -0.3],
    [3050, -0.3],
    [3450, 0.22],
    [3800, -0.03],
    [SURVEY_MS, 0],
  ],
  lean: [
    [0, 0],
    [600, -2],
    [1250, 2.4],
    [1750, 2.4],
    [2550, -2.4],
    [3050, -2.4],
    [3550, 0],
    [SURVEY_MS, 0],
  ],
  rise: [
    [0, 1],
    [600, 1.045],
    [3050, 1.045],
    [3450, 0.97],
    [3800, 1.005],
    [SURVEY_MS, 1],
  ],
});

export const survey: ClipDef = {
  duration: SURVEY_MS,
  sample(t: number, s: number): ClipFrame {
    const rise = SURVEY.rise(t) + span(t, 600, 400, 3000, 400) * 0.006 * Math.sin((TAU * t) / 900);
    return {
      turn: SURVEY.turn(t) * s,
      pitch: SURVEY.pitch(t) * s,
      rotate: SURVEY.lean(t) * s,
      sy: around(1, rise, s),
      sx: around(1, 1 - (rise - 1) * 0.5, s),
    };
  },
  expr: [
    { at: 0, expr: 'g8', speed: 14 },
    { at: 1100, expr: 'g16', speed: 12 },
    { at: 2400, expr: 'g16', speed: 12 },
    { at: 3350, expr: 'g19', speed: 14 },
    { at: 3950, expr: 'calm', speed: 10 },
  ],
};

const WRING_MS = 2700;
const WRING_PERIOD = 640;

const WRING = tracks({
  wind: [
    [0, 0],
    [180, -0.34],
    [300, -0.3],
    [WRING_MS, -0.3],
  ],
});

export const wring: ClipDef = {
  duration: WRING_MS,
  sample(t: number, s: number): ClipFrame {
    const release = clamp01((t - 200) / 20);
    const decay = Math.exp(-(t - 200) / 720) * clamp01((WRING_MS - t) / 500);
    const swing = release * 1.55 * decay * Math.sin((TAU * (t - 200)) / WRING_PERIOD);
    const turn = t < 200 ? WRING.wind(t) : swing;
    const twist = Math.abs(Math.sin((TAU * (t - 200)) / WRING_PERIOD));
    return {
      turn: turn * s,
      rotate: -3.2 * release * decay * Math.sin((TAU * (t - 200)) / WRING_PERIOD) * s,
      sx: around(1, 1 - 0.05 * release * decay * twist, s),
      sy: around(1, 1 + 0.035 * release * decay * twist, s),
    };
  },
  expr: [
    { at: 0, expr: 'g3', speed: 26 },
    { at: 900, expr: 'g12', speed: 12 },
    { at: 1800, expr: 'g19', speed: 12 },
    { at: 2500, expr: 'calm', speed: 10 },
  ],
};
