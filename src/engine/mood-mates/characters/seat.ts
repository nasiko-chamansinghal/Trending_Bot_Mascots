import type { EyePair, Point, Ring } from '../geometry';
import { centroid } from '../util';

export interface Lobe {
  centre: Point;
  radius: number;
}

export interface Seating {
  margin: number;
  hold: number;
}

const FIT_STEPS = 24;

function reach(points: Ring, centre: Point): number {
  return Math.max(...points.map((p) => Math.hypot(p[0] - centre[0], p[1] - centre[1])));
}

function seat(ring: Ring, lobe: Lobe, inward: 1 | -1, o: Seating): Ring {
  const [cx, cy] = centroid(ring);
  const room = lobe.radius - o.margin;
  const shape = ring.map(([x, y]): Point => [x - cx, y - cy]);
  const size = reach(shape, [0, 0]);
  const k = size > room ? room / size : 1;
  const body = shape.map(([x, y]): Point => [x * k, y * k]);
  const dx = cx - lobe.centre[0];
  const dy = cy - lobe.centre[1];
  const want: Point = [dx * inward > 0 ? dx : dx * o.hold, dy];
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < FIT_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (reach(body, [-want[0] * mid, -want[1] * mid]) <= room) lo = mid;
    else hi = mid;
  }
  return body.map(([x, y]): Point => [lobe.centre[0] + want[0] * lo + x, lobe.centre[1] + want[1] * lo + y]);
}

export function seatEyes(
  faces: Record<string, EyePair>,
  lobes: [Lobe, Lobe],
  o: Seating,
): Record<string, EyePair> {
  return Object.fromEntries(
    Object.entries(faces).map(([slot, pair]) => {
      const [first, second] = pair;
      const swap = centroid(first)[0] > centroid(second)[0];
      const [left, right] = swap ? [second, first] : [first, second];
      const seated: [Ring, Ring] = [seat(left, lobes[0], 1, o), seat(right, lobes[1], -1, o)];
      return [slot, (swap ? [seated[1], seated[0]] : seated) as EyePair];
    }),
  );
}
