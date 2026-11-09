import { type Point, roundedOutline } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';

const UNIT = 100;
const RIM_POINTS = 1440;
const DEPTH = 0.62;
const PUFF = 2.6;
const SOFT_SIGMA = 56;

const CORNERS: Array<[number, number, number]> = [
  [-1, -1.103, 0.3],
  [-0.482, 0.85, 0.07],
  [-0.178, 0.66, 0.02],
  [0.068, 1.091, 0.075],
  [0.299, 0.723, 0.02],
  [0.725, 1.149, 0.045],
  [1, -1.103, 0.3],
];

const RING = roundedOutline(
  CORNERS.map(([x, y]): Point => [x * UNIT, y * UNIT]),
  CORNERS.map(([, , r]) => r * UNIT),
  10,
  2,
);

function reach(dx: number, dy: number): number {
  let best = 0;
  for (let i = 0; i < RING.length; i++) {
    const a = RING[i] as Point;
    const b = RING[(i + 1) % RING.length] as Point;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-12) continue;
    const t = (a[0] * ey - a[1] * ex) / denom;
    const u = (a[0] * dy - a[1] * dx) / denom;
    if (t > best && u >= 0 && u <= 1) best = t;
  }
  return best / UNIT;
}

function rim(): number[] {
  return Array.from({ length: RIM_POINTS }, (_, i) => {
    const angle = -Math.PI + (2 * Math.PI * i) / RIM_POINTS;
    return reach(Math.cos(angle), Math.sin(angle));
  });
}

function soften(table: number[], sigma: number): number[] {
  const n = table.length;
  const reach = Math.ceil(sigma * 3);
  const weights = Array.from({ length: 2 * reach + 1 }, (_, k) =>
    Math.exp(-((k - reach) ** 2) / (2 * sigma * sigma)),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  return table.map((_, i) => {
    let sum = 0;
    for (let k = -reach; k <= reach; k++)
      sum += (table[(i + k + n) % n] as number) * (weights[k + reach] as number);
    return sum / total;
  });
}

const RIM = rim();

export const PEAK_SPEC: SolidSpec = {
  body: {
    ribs: 4,
    sharp: [1, 1],
    radius: [1, 1],
    rim: RIM,
    rimSoft: soften(RIM, SOFT_SIGMA),
    puff: PUFF,
    skirt: [0, 0],
    join: 1,
    depth: [0, 0],
    flat: DEPTH,
  },
  tint: { top: ['#FFDCC2', 0.55], bottom: ['#E060C4', 0.55] },
  rest: { yaw: 0, pitch: 0.05, roll: 0 },
  scale: 64,
  stretch: [1, 1],
  center: [120, 124],
  stemColor: '#000000',
  capColor: '#000000',
  edge: 0.06,
};
