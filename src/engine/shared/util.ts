const SVGNS = 'http://www.w3.org/2000/svg';

export type Point = [number, number];
export type Ring = Point[];
export type Attrs = Record<string, string | number>;

export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, tag);
  for (const k in attrs) node.setAttribute(k, String(attrs[k]));
  return node;
}

export function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function shade(hex: string, amt: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = Number.parseInt(h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const target = amt < 0 ? 0 : 255;
  const a = Math.abs(amt);
  r = Math.round(r + (target - r) * a);
  g = Math.round(g + (target - g) * a);
  b = Math.round(b + (target - b) * a);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function centroid(ring: Ring): Point {
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i] as Point;
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
}
