import { clamp01 } from '../../motion';
import type { ClipDef, ClipFrame } from '../../types';
import { type Key, monotone } from '../pumpkin/curve';

const D = Math.PI / 180;
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

function envelope(t: number, from: number, rise: number, until: number, fall: number): number {
  return clamp01(Math.min((t - from) / rise, (until - t) / fall));
}

const WAVE_MS = 2300;
const WAVE_FROM = 400;
const WAVE_BEAT = 330;

const WAVE = tracks({
  armR: [
    [0, 0],
    [110, -14],
    [400, 56],
    [1850, 56],
    [2050, -4],
    [WAVE_MS, 0],
  ],
  armL: [
    [0, 0],
    [380, 9],
    [1850, 9],
    [WAVE_MS, 0],
  ],
  lean: [
    [0, 0],
    [300, -4],
    [1900, -3],
    [WAVE_MS, 0],
  ],
});

export const wave: ClipDef = {
  duration: WAVE_MS,
  sample(t: number, s: number): ClipFrame {
    const e = envelope(t, WAVE_FROM, 160, 1950, 200);
    const phase = (TAU * (t - WAVE_FROM)) / WAVE_BEAT;
    const hop = e * Math.abs(Math.sin(phase / 2));
    return {
      armR: (WAVE.armR(t) + 22 * e * Math.sin(phase)) * s,
      armL: (WAVE.armL(t) + 5 * e * Math.sin(phase + Math.PI)) * s,
      rotate: (WAVE.lean(t) + 2.2 * e * Math.sin(phase)) * s,
      dy: -3.2 * hop * s,
      sx: around(1, 1 - 0.018 * (hop - 0.5) * e, s),
      sy: around(1, 1 + 0.024 * (hop - 0.5) * e, s),
    };
  },
  expr: [
    { at: 40, expr: 'g2', speed: 16 },
    { at: 2050, expr: 'calm', speed: 10 },
  ],
};

const CHEER_MS = 2100;

const CHEER = tracks({
  dy: [
    [0, 0],
    [110, 4],
    [300, 6],
    [470, -30],
    [640, -38],
    [760, -36],
    [960, -6],
    [1090, 0],
    [1160, 5],
    [1260, 0],
    [1380, -9],
    [1500, 0],
    [CHEER_MS, 0],
  ],
  sx: [
    [0, 1],
    [300, 1.07],
    [420, 0.96],
    [640, 0.95],
    [960, 1],
    [1090, 1.1],
    [1170, 1.12],
    [1300, 0.98],
    [1500, 1.02],
    [1700, 1],
    [CHEER_MS, 1],
  ],
  sy: [
    [0, 1],
    [300, 0.9],
    [420, 1.1],
    [640, 1.06],
    [960, 1.02],
    [1090, 0.9],
    [1170, 0.86],
    [1300, 1.05],
    [1500, 0.98],
    [1700, 1],
    [CHEER_MS, 1],
  ],
  arm: [
    [0, 0],
    [120, -30],
    [300, -48],
    [430, 38],
    [560, 62],
    [960, 62],
    [1090, 30],
    [1170, -22],
    [1300, 12],
    [1500, -4],
    [1700, 0],
    [CHEER_MS, 0],
  ],
  tilt: [
    [0, 0],
    [300, -2],
    [560, 3],
    [760, -3],
    [960, 2],
    [1160, -2],
    [1500, 1],
    [1800, 0],
    [CHEER_MS, 0],
  ],
});

export const cheer: ClipDef = {
  duration: CHEER_MS,
  sample(t: number, s: number): ClipFrame {
    const flap = envelope(t, 560, 90, 1000, 120) * Math.sin((TAU * t) / 190);
    return {
      dy: CHEER.dy(t) * s,
      rotate: CHEER.tilt(t) * s,
      sx: around(1, CHEER.sx(t), s),
      sy: around(1, CHEER.sy(t), s),
      armL: (CHEER.arm(t) + 10 * flap) * s,
      armR: (CHEER.arm(t) - 10 * flap) * s,
    };
  },
  expr: [
    { at: 0, expr: 'g13', speed: 24 },
    { at: 430, expr: 'g21', speed: 22 },
    { at: 1090, expr: 'g13', speed: 30 },
    { at: 1250, expr: 'g2', speed: 16 },
    { at: 1900, expr: 'calm', speed: 10 },
  ],
};

const TIMBER_MS = 3500;
const TIMBER_DX = 28;
const TIMBER_DY = 22;

const TIMBER = tracks({
  rotate: [
    [0, 0],
    [120, -3],
    [300, -7],
    [480, -10],
    [560, -9],
    [700, 1],
    [820, 25.6],
    [920, 57],
    [1000, 90],
    [1090, 82],
    [1190, 90],
    [1260, 87.5],
    [1330, 90],
    [2150, 90],
    [2350, 98],
    [2550, 95],
    [2700, 40],
    [2850, -7],
    [2950, 3],
    [3050, -1],
    [3150, 0],
    [TIMBER_MS, 0],
  ],
  hop: [
    [0, 0],
    [1000, 0],
    [1090, -6],
    [1190, 0],
    [1260, -2.5],
    [1330, 0],
    [2550, 0],
    [2700, -4],
    [2830, -16],
    [2960, 0],
    [TIMBER_MS, 0],
  ],
  arm: [
    [0, 0],
    [480, 0],
    [620, 50],
    [1000, 55],
    [1100, -30],
    [1250, -10],
    [2150, -18],
    [2350, -40],
    [2700, 30],
    [2850, 60],
    [3000, 25],
    [3250, 0],
    [TIMBER_MS, 0],
  ],
});

export const timber: ClipDef = {
  duration: TIMBER_MS,
  sample(t: number): ClipFrame {
    const theta = TIMBER.rotate(t);
    const flail = envelope(t, 0, 380, 560, 60) * Math.sin((TAU * t) / 220);
    const flutter = envelope(t, 620, 60, 1000, 40) * Math.sin((TAU * t) / 150);
    const twitch = envelope(t, 1550, 90, 2000, 120) * Math.sin((TAU * t) / 150);
    const groan = envelope(t, 1400, 200, 2100, 150) * Math.sin((TAU * t) / 600);
    return {
      dx: TIMBER_DX * Math.sin(theta * D),
      dy: TIMBER_DY * (1 - Math.cos(theta * D)) + TIMBER.hop(t),
      rotate: theta + 1.6 * groan,
      armL: TIMBER.arm(t) + 26 * flail + 9 * flutter + 8 * twitch,
      armR: TIMBER.arm(t) - 26 * flail - 9 * flutter - 8 * twitch,
    };
  },
  expr: [
    { at: 0, expr: 'g21', speed: 20 },
    { at: 1000, expr: 'g13', speed: 30 },
    { at: 1700, expr: 'g4', speed: 14 },
    { at: 2500, expr: 'g21', speed: 22 },
    { at: 2850, expr: 'g2', speed: 18 },
    { at: 3300, expr: 'calm', speed: 10 },
  ],
};
