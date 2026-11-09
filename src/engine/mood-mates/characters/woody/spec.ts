import type { LimbSpec } from '../../solid/model';
import type { SolidSpec } from '../../solid/spec';

const HALF_HEIGHT = 1.37;
const CORNER = 0.26;
const DOME = 0.08;
const KNOTS = 241;
const SEARCH_STEPS = 40;
const ARM_LIFT = 0.9;
const ARM_ROOT = 0.2;
const ARM_KNOTS = 200;
const ROOT_CAP = 0.3;
const HAND_CAP = 0.3;
const ARM_PROFILE: Array<[number, number]> = [
  [0, 0.33],
  [1, 0.3],
];
const DEPTH = 0.66;

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

function smoothstep(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

function limbWidth(s: number): number {
  for (let i = 1; i < ARM_PROFILE.length; i++) {
    const [s0, r0] = ARM_PROFILE[i - 1] as [number, number];
    const [s1, r1] = ARM_PROFILE[i] as [number, number];
    if (s <= s1) return r0 + (r1 - r0) * smoothstep((s - s0) / (s1 - s0));
  }
  return (ARM_PROFILE[ARM_PROFILE.length - 1] as [number, number])[1];
}

function armRadius(length: number, inner: number): Array<[number, number, number]> {
  const cap = HAND_CAP / length;
  const knots: Array<[number, number, number]> = [];
  for (let k = 0; k <= ARM_KNOTS; k++) {
    const t = k / ARM_KNOTS;
    const toEnd = Math.min(1, (1 - t) / cap);
    const fromStart = Math.min(1, t / (ROOT_CAP / length));
    const round =
      Math.sqrt(Math.max(0, 1 - (1 - toEnd) ** 2)) * Math.sqrt(Math.max(0, 1 - (1 - fromStart) ** 2));
    const r = limbWidth((t * length - inner) / (length - inner)) * round;
    knots.push([t, r, r]);
  }
  return knots;
}

function arm(side: 1 | -1, join: [number, number], angle: number, visible: number): LimbSpec {
  const inner = ARM_ROOT;
  const a = (angle * Math.PI) / 180;
  const dx = side * Math.cos(a);
  const dy = Math.sin(a);
  const length = inner + visible;
  return {
    side,
    base: [join[0] - inner * dx, join[1] - inner * dy, 0],
    length,
    angle,
    bend: 0.04,
    lift: ARM_LIFT,
    radius: armRadius(length, inner),
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
  tint: { top: ['#FFB56B', 0.5], bottom: ['#B8441A', 0.55] },
  limbs: [arm(-1, [-1, 0.23], 40, 0.9), arm(1, [1, -0.22], 36, 0.79)],
  rest: { yaw: 0, pitch: 0.05, roll: 0 },
  scale: 60,
  stretch: [1, 1],
  center: [120, 124],
  stemColor: '#000000',
  capColor: '#000000',
  edge: 0.06,
};
