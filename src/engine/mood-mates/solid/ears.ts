import { apply, type Mat3, type Vec2, type Vec3 } from './model';
import type { EarSpec } from './spec';

const STEPS = 48;
const FACE_MIN = 0.02;

export interface EarView {
  hull: Vec2[];
  cap: Vec2[];
  inner: Vec2[] | null;
  depth: number;
}

function circle(m: Mat3, cx: number, cy: number, z: number, radius: number, steps: number): Vec2[] {
  return Array.from({ length: steps }, (_, i): Vec2 => {
    const a = (2 * Math.PI * i) / steps;
    const p = apply(m, [cx + radius * Math.cos(a), cy + radius * Math.sin(a), z] as Vec3);
    return [p[0], -p[1]];
  });
}

function cross(o: Vec2, a: Vec2, b: Vec2): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(points: Vec2[]): Vec2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const chain = (pts: Vec2[]): Vec2[] => {
    const out: Vec2[] = [];
    for (const p of pts) {
      while (out.length >= 2) {
        const last = out[out.length - 1] as Vec2;
        const prev = out[out.length - 2] as Vec2;
        if (cross(prev, last, p) > 0) break;
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...chain(sorted), ...chain(sorted.reverse())];
}

export function projectEar(ear: EarSpec, m: Mat3, steps = STEPS): EarView {
  const [cx, cy, cz] = ear.center;
  const front = cz + ear.half;
  const back = cz - ear.half;
  const frontRim = circle(m, cx, cy, front, ear.radius, steps);
  const backRim = circle(m, cx, cy, back, ear.radius, steps);
  const forward = apply(m, [0, 0, 1])[2];
  return {
    hull: convexHull([...frontRim, ...backRim]),
    cap: forward > 0 ? frontRim : backRim,
    inner: forward > FACE_MIN ? circle(m, cx, cy, front, ear.inner.radius, steps) : null,
    depth: apply(m, ear.center)[2],
  };
}

export function hullReach(hull: Vec2[], angle: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i] as Vec2;
    const b = hull[(i + 1) % hull.length] as Vec2;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-12) continue;
    const t = (a[0] * ey - a[1] * ex) / denom;
    const u = (a[0] * dy - a[1] * dx) / denom;
    if (t > best && u >= 0 && u <= 1) best = t;
  }
  return best;
}
