import type { BodyPose } from '../../../types';
import { NUBBY_VERTICES } from '../shape';

export const CENTER = 120;
export const EDGE = 4;
export const VIEW = 240;

const xs = NUBBY_VERTICES.map((v) => v[0]);
const ys = NUBBY_VERTICES.map((v) => v[1]);

export const BODY_BOX = {
  x0: Math.min(...xs),
  x1: Math.max(...xs),
  y0: Math.min(...ys),
  y1: Math.max(...ys),
};

export const FEET = BODY_BOX.y1 - CENTER;

export type BodyFrame = Pick<BodyPose, 'scale' | 'scaleX' | 'scaleY' | 'rotate' | 'x' | 'y'>;

export function bodyCorners(b: BodyFrame): Array<[number, number]> {
  const rad = (b.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const lift = (1 - b.scaleY) * b.scale * FEET;
  const out: Array<[number, number]> = [];
  for (const px of [BODY_BOX.x0, BODY_BOX.x1]) {
    for (const py of [BODY_BOX.y0, BODY_BOX.y1]) {
      const dx = (px - CENTER) * b.scale * b.scaleX;
      const dy = (py - CENTER) * b.scale * b.scaleY;
      out.push([CENTER + b.x + dx * cos - dy * sin, CENTER + b.y + lift + dx * sin + dy * cos]);
    }
  }
  return out;
}

export function fitFactor(bodies: BodyFrame[]): number {
  const ax = CENTER;
  const ay = CENTER + FEET;
  let k = 1;
  for (const b of bodies) {
    for (const [x, y] of bodyCorners(b)) {
      const dx = x - ax;
      const dy = y - ay;
      if (dx > 0) k = Math.min(k, (VIEW - EDGE - ax) / dx);
      if (dx < 0) k = Math.min(k, (EDGE - ax) / dx);
      if (dy > 0) k = Math.min(k, (VIEW - EDGE - ay) / dy);
      if (dy < 0) k = Math.min(k, (EDGE - ay) / dy);
    }
  }
  return k;
}

export function scaleAboutFeet<T extends BodyFrame>(b: T, k: number): T {
  return { ...b, scale: b.scale * k, x: b.x * k, y: b.y * k + (1 - k) * FEET };
}

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
export const smooth = (u: number): number => u * u * (3 - 2 * u);
export const frac = (v: number): number => ((v % 1) + 1) % 1;

export function easeOutBack(u: number): number {
  const c = 1.70158;
  const v = u - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
}

export function easeInOutCubic(u: number): number {
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}
