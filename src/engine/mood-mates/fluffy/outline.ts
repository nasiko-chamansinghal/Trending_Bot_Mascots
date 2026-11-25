import type { Point } from '../geometry';
import type { SolidSpec } from '../solid/spec';
import { rayReach } from './mesh';

const RIM_POINTS = 360;
const DEPTH = 0.8;
const specs = new WeakMap<object, SolidSpec>();

export function furSpecOfRing(ring: Point[]): SolidSpec {
  const known = specs.get(ring);
  if (known) return known;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of ring) {
    cx += x;
    cy += y;
  }
  cx /= ring.length;
  cy /= ring.length;
  const up = ring.map(([x, y]): [number, number] => [x - cx, -(y - cy)]);
  const reach = Array.from({ length: RIM_POINTS }, (_, i) =>
    rayReach(up, -Math.PI + (2 * Math.PI * i) / RIM_POINTS),
  );
  const unit = Math.max(...reach);
  const rim = reach.map((r) => r / unit);
  const spec: SolidSpec = {
    body: {
      ribs: 4,
      sharp: [1, 1],
      radius: [1, 1],
      rim,
      rimSoft: rim,
      puff: 2,
      skirt: [0, 0],
      join: 1,
      depth: [0, 0],
      flat: DEPTH,
    },
    rest: { yaw: 0, pitch: 0, roll: 0 },
    scale: unit,
    stretch: [1, 1],
    center: [cx, cy],
    stemColor: '#000000',
    capColor: '#000000',
    edge: 0,
  };
  specs.set(ring, spec);
  return spec;
}
