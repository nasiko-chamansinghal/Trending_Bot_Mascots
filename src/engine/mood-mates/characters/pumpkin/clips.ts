import { clamp01, easeInOutCubic } from '../../motion';
import type { ClipDef, ClipFrame } from '../../types';
import { FOLD_MS, UNFOLD_MS } from './eyes';
import { showDelta } from './show';

const SPIN = showDelta(189, 303);
const BLEND = 200;

export const jumpSpin: ClipDef = {
  duration: SPIN.duration,
  sample(t: number, strength: number): ClipFrame {
    const r = SPIN.at(t);
    const w = easeInOutCubic(clamp01(Math.min(t, SPIN.duration - t) / BLEND)) * strength;
    const turnW = clamp01(t / BLEND) * strength;
    return {
      dx: r[1] * w,
      dy: r[2] * w,
      rotate: r[3] * w,
      sx: 1 + (r[4] - 1) * w,
      sy: 1 + (r[5] - 1) * w,
      turn: r[6] * turnW,
      pitch: r[7] * w,
    };
  },
  expr: [
    { at: 0, expr: 'round', speed: 20 },
    { at: ((238 - 189) * 1000) / 60, expr: 'pill', speed: 100 },
  ],
};

const BOING: Array<[number, number, number]> = [
  [0, 1, 1],
  [420, 1, 1],
  [580, 1.12, 0.87],
  [790, 0.93, 1.08],
  [990, 1.04, 0.97],
  [1130, 1, 1],
];

export const joyFoldBoing: ClipDef = {
  duration: 1560,
  sample(t: number, strength: number): ClipFrame {
    for (let i = 0; i < BOING.length - 1; i++) {
      const [a, ax, ay] = BOING[i] as [number, number, number];
      const [b, bx, by] = BOING[i + 1] as [number, number, number];
      if (t >= a && t <= b) {
        const u = easeInOutCubic((t - a) / (b - a));
        return { sx: 1 + (ax + (bx - ax) * u - 1) * strength, sy: 1 + (ay + (by - ay) * u - 1) * strength };
      }
    }
    return {};
  },
  expr: [
    ...FOLD_MS.map((ms, i) => ({ at: ms, expr: `fold${i}`, speed: 100 })),
    { at: 260, expr: 'arc', speed: 100 },
    ...UNFOLD_MS.map((ms, i) => ({ at: 1230 + ms, expr: `unfold${i}`, speed: 100 })),
    { at: 1500, expr: 'pill', speed: 100 },
  ],
};
