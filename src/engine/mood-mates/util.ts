import type { Point, Ring } from '../shared/util';

export { type Attrs, centroid, clamp, el, r2, shade } from '../shared/util';

export function ringPath(ring: Ring): string {
  const n = ring.length;
  if (n < 3) return 'M0 0Z';
  const first = ring[0] as Point;
  let s = `M${first[0].toFixed(2)} ${first[1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = ring[(i - 1 + n) % n] as Point;
    const p1 = ring[i] as Point;
    const p2 = ring[(i + 1) % n] as Point;
    const p3 = ring[(i + 2) % n] as Point;
    s += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(
      p2[0] - (p3[0] - p1[0]) / 6
    ).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${s}Z`;
}
