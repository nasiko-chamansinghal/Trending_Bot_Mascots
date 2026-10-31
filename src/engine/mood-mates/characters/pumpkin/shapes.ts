import type { EyePair, Point, Ring } from '../../geometry';

const SAMPLES = 192;
const LEFT: Point = [97.8, 153.8];
const RIGHT: Point = [148.6, 153.8];

function heart([cx, cy]: Point, width: number): Ring {
  const k = width / 32;
  const out: Ring = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    out.push([cx + x * k, cy - y * k + 1.5 * k]);
  }
  return out;
}

function stroke(path: Point[], half: number): Ring {
  const n = path.length;
  const normals: Point[] = path.map((_, i) => {
    const a = path[Math.max(0, i - 1)] as Point;
    const b = path[Math.min(n - 1, i + 1)] as Point;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
  const side = (sign: number): Ring =>
    path.map((p, i) => {
      const nm = normals[i] as Point;
      return [p[0] + nm[0] * half * sign, p[1] + nm[1] * half * sign];
    });
  const cap = (p: Point, nm: Point, from: number): Ring => {
    const out: Ring = [];
    const base = Math.atan2(nm[1], nm[0]);
    for (let k = 1; k < 16; k++) {
      const a = base + from - (k / 16) * Math.PI;
      out.push([p[0] + Math.cos(a) * half, p[1] + Math.sin(a) * half]);
    }
    return out;
  };
  const end = path[n - 1] as Point;
  const start = path[0] as Point;
  return [
    ...side(1),
    ...cap(end, normals[n - 1] as Point, 0),
    ...side(-1).reverse(),
    ...cap(start, normals[0] as Point, Math.PI),
  ];
}

function chevron([cx, cy]: Point, dir: 1 | -1): Ring {
  const path: Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const y = (u - 0.5) * 22;
    const x = dir * (23.1 - 25.4 * Math.sqrt(4 * (u - 0.5) ** 2 + 0.4));
    path.push([cx + x, cy + y]);
  }
  return stroke(path, 2.8);
}

function closedArc([cx, cy]: Point): Ring {
  const path: Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24 - 0.5) * 22;
    path.push([cx + x, cy + 3 - 0.028 * (121 - x * x)]);
  }
  return stroke(path, 2.8);
}

export function eyeShapes(pill: EyePair): Record<string, EyePair> {
  return {
    heart: [heart(LEFT, 33), heart(RIGHT, 33)],
    squint: [chevron(LEFT, 1), chevron(RIGHT, -1)],
    wink: [pill[0], closedArc(RIGHT)],
  };
}
