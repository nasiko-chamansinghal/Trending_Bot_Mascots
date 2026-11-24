import type { Point, Ring } from '../geometry';
import type { MouthShape } from '../types';
import { type TraceFrame, tracedPolygon, traceFit } from './traced';

const MOUTH_POINTS = 64;

export interface MouthLook {
  width: number;
  fill?: boolean;
  closed?: boolean;
}

function resample(points: Ring, n: number, closed: boolean): Ring {
  const path = closed ? [...points, points[0] as Point] : points;
  const lengths = [0];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] as Point;
    const b = path[i] as Point;
    lengths.push((lengths[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = lengths[lengths.length - 1] as number;
  const steps = closed ? n : n - 1;
  let segment = 0;
  return Array.from({ length: n }, (_, k): Point => {
    const d = (total * k) / steps;
    while (segment < path.length - 2 && (lengths[segment + 1] as number) < d) segment++;
    const a = path[segment] as Point;
    const b = path[segment + 1] as Point;
    const span = (lengths[segment + 1] as number) - (lengths[segment] as number);
    const u = span > 1e-9 ? (d - (lengths[segment] as number)) / span : 0;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  });
}

export function mouthShape(flat: number[], frame: TraceFrame, look: MouthLook): MouthShape {
  const closed = look.closed ?? false;
  return {
    points: resample(tracedPolygon(flat, frame), MOUTH_POINTS, closed),
    width: look.width * traceFit(frame),
    fill: look.fill ?? false,
    closed,
  };
}
