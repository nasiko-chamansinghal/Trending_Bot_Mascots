import { clamp, type Point, type Ring } from './util';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export interface Spring {
  x: number;
  v: number;
  t: number;
}

export function spring(v0: number): Spring {
  return { x: v0, v: 0, t: v0 };
}

export function springStep(s: Spring, w: number, z: number, dt: number): void {
  s.v += (-2 * z * w * s.v - w * w * (s.x - s.t)) * dt;
  s.x += s.v * dt;
  if (!Number.isFinite(s.x) || !Number.isFinite(s.v)) {
    s.x = s.t;
    s.v = 0;
  }
}

export function lerpRing(a: Ring, b: Ring, t: number): Ring {
  const out: Ring = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    const pa = a[i] as Point;
    const pb = b[i] as Point;
    out[i] = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t];
  }
  return out;
}

export const BOUNCE_SEGS = [
  { h: 48, d: 0.5 },
  { h: 28, d: 0.382 },
  { h: 14, d: 0.27 },
  { h: 6, d: 0.177 },
];
export const BOUNCE_TOTAL = BOUNCE_SEGS.reduce((s, q) => s + q.d, 0);

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

export function lerpColor(a: string, b: string, t: number): string {
  if (a === b) return b;
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
