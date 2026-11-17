import type { Point, Ring } from '../geometry';

export interface TracedEye {
  x: number;
  y: number;
  radii: number[];
}

export interface TraceFrame {
  origin: Point;
  reach: number;
  center: Point;
  scale: number;
}

const VERTEX_SKEW = 0.37;

export function traceFit(frame: TraceFrame): number {
  return frame.scale / frame.reach;
}

export function traceView(frame: TraceFrame): (x: number, y: number) => Point {
  const fit = traceFit(frame);
  return (x, y) => [
    frame.center[0] + (x - frame.origin[0]) * fit,
    frame.center[1] + (y - frame.origin[1]) * fit,
  ];
}

function radiusAt(radii: number[], u: number): number {
  const n = radii.length;
  const k = Math.floor(u);
  const lo = radii[((k % n) + n) % n] as number;
  const hi = radii[(((k + 1) % n) + n) % n] as number;
  return lo + (hi - lo) * (u - k);
}

export function tracedBodyRing(radii: number[], unit: number): Ring {
  const n = radii.length;
  return Array.from({ length: n }, (_, i): Point => {
    const r = radiusAt(radii, n - i - VERTEX_SKEW);
    const a = (2 * Math.PI * (i + VERTEX_SKEW)) / n;
    return [Math.cos(a) * r * unit, Math.sin(a) * r * unit];
  });
}

export function tracedPolygon(flat: number[], frame: TraceFrame, at: Point = [0, 0]): Ring {
  const view = traceView(frame);
  return Array.from({ length: flat.length / 2 }, (_, i): Point => {
    return view((flat[2 * i] as number) + at[0], (flat[2 * i + 1] as number) + at[1]);
  });
}

export function tracedEyeRing(eye: TracedEye, frame: TraceFrame): Ring {
  const fit = traceFit(frame);
  const [cx, cy] = traceView(frame)(eye.x, eye.y);
  return eye.radii.map((r, i): Point => {
    const a = (2 * Math.PI * i) / eye.radii.length;
    return [cx + Math.cos(a) * r * fit, cy + Math.sin(a) * r * fit];
  });
}
