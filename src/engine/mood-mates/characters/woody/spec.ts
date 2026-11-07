import type { LimbSpec } from '../../solid/model';
import type { SolidSpec } from '../../solid/spec';

const HALF_HEIGHT = 1.37;
const CORNER = 0.17;
const DOME = 0.05;
const KNOTS = 61;
const SEARCH_STEPS = 40;
const ARM_RADIUS = 0.28;
const CAP_STEPS = 8;
const DEPTH = 0.62;

function inside(rho: number, y: number): boolean {
  const k = 1 + DOME * Math.max(0, 1 - rho * rho);
  const qx = Math.abs(rho) - (1 - CORNER);
  const qy = Math.abs(y / k) - (HALF_HEIGHT - CORNER);
  const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - CORNER;
  return distance <= 0;
}

function reach(theta: number): number {
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  let lo = 0;
  let hi = 3;
  for (let i = 0; i < SEARCH_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (inside(mid * sin, mid * cos)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function armRadius(length: number): Array<[number, number, number]> {
  const cap = ARM_RADIUS / length;
  const knots: Array<[number, number, number]> = [[0, ARM_RADIUS, ARM_RADIUS]];
  for (let k = 0; k <= CAP_STEPS; k++) {
    const u = k / CAP_STEPS;
    const r = ARM_RADIUS * Math.sqrt(Math.max(0, 1 - u * u));
    knots.push([1 - cap + cap * u, r, r]);
  }
  return knots;
}

function arm(side: 1 | -1, join: [number, number], angle: number, visible: number): LimbSpec {
  const inner = 0.55;
  const a = (angle * Math.PI) / 180;
  const dx = side * Math.cos(a);
  const dy = Math.sin(a);
  const length = inner + visible;
  return {
    side,
    base: [join[0] - inner * dx, join[1] - inner * dy, 0.12],
    length,
    angle,
    bend: 0.04,
    radius: armRadius(length),
  };
}

export const WOODY_SPEC: SolidSpec = {
  body: {
    ribs: 4,
    sharp: [1, 1],
    radius: Array.from({ length: KNOTS }, (_, i) => reach((Math.PI * i) / (KNOTS - 1))),
    skirt: [0.0001, 0.0001],
    join: 1,
    depth: [0, 0],
    flat: DEPTH,
  },
  limbs: [arm(-1, [-1, 0.23], 40, 0.9), arm(1, [1, -0.22], 36, 0.79)],
  rest: { yaw: 0, pitch: 0.05, roll: 0 },
  scale: 60,
  stretch: [1, 1],
  center: [120, 124],
  stemColor: '#000000',
  capColor: '#000000',
  edge: 0.06,
};
