import { type BodyShape, limbGrid, type StemShape, type Vec2, type Vec3 } from '../solid/model';

export const ROOT_PASSES = 8;
export const FUR_HALF = 40;
export const PILE_REACH = 4;
export const CORE_SHARE = 0.94;
const ROOT_DENSITY = 3.3;
const ROWS = 200;
const RIM_COLUMNS = 176;
const RIB_COLUMNS = 48;
const SEED = 51821;
const LENS_ROWS = 90;
const LENS_COLUMNS = 120;
const LENS_RIM_SAMPLES = 360;
const TUBE_ROWS = 48;
const MIN_TUBE = 0.03;
const TUBE_COLUMNS = 20;

export interface FurMesh {
  vertices: Float32Array;
  indices: Uint32Array;
  roots: Float32Array;
  radius: number;
}

export interface FurBody {
  mesh: FurMesh;
  unit: number;
}

export function rootsIn(total: number, passes: number): number {
  let count = 0;
  for (let pass = 0; pass < passes; pass++) count += Math.ceil((total - pass) / ROOT_PASSES);
  return count;
}

function randomFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function scatterRoots(vertices: Float32Array, indices: Uint32Array, seed = SEED): Float32Array {
  const random = randomFrom(seed);
  const roots: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = (indices[i] as number) * 6;
    const b = (indices[i + 1] as number) * 6;
    const c = (indices[i + 2] as number) * 6;
    const abx = (vertices[b] as number) - (vertices[a] as number);
    const aby = (vertices[b + 1] as number) - (vertices[a + 1] as number);
    const abz = (vertices[b + 2] as number) - (vertices[a + 2] as number);
    const acx = (vertices[c] as number) - (vertices[a] as number);
    const acy = (vertices[c + 1] as number) - (vertices[a + 1] as number);
    const acz = (vertices[c + 2] as number) - (vertices[a + 2] as number);
    const area = 0.5 * Math.hypot(aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx);
    const count = Math.floor(area * ROOT_DENSITY + random());
    for (let n = 0; n < count; n++) {
      const u = Math.sqrt(random());
      const v = u * random();
      for (let k = 0; k < 6; k++) {
        roots.push(
          (1 - u) * (vertices[a + k] as number) +
            (u - v) * (vertices[b + k] as number) +
            v * (vertices[c + k] as number),
        );
      }
      roots.push(random(), random());
    }
  }
  const total = roots.length / 8;
  const ordered = new Float32Array(roots.length);
  let at = 0;
  for (let pass = 0; pass < ROOT_PASSES; pass++) {
    for (let i = pass; i < total; i += ROOT_PASSES) {
      for (let k = 0; k < 8; k++) ordered[at++] = roots[8 * i + k] as number;
    }
  }
  return ordered;
}

interface Grid {
  rows: number;
  columns: number;
  p: ArrayLike<number>;
  n: ArrayLike<number>;
}

function meshOf(grid: Grid, unit: number, offset: Vec3, seed: number): FurMesh {
  const { rows, columns } = grid;
  const count = (rows + 1) * columns;
  const vertices = new Float32Array(count * 6);
  let radius = 0;
  for (let k = 0; k < count; k++) {
    const x = ((grid.p[k * 3] as number) + offset[0]) * unit;
    const y = -((grid.p[k * 3 + 1] as number) + offset[1]) * unit;
    const z = ((grid.p[k * 3 + 2] as number) + offset[2]) * unit;
    vertices.set(
      [x, y, z, grid.n[k * 3] as number, -(grid.n[k * 3 + 1] as number), grid.n[k * 3 + 2] as number],
      k * 6,
    );
    radius = Math.max(radius, Math.hypot(x, y, z));
  }
  const indices = new Uint32Array(rows * columns * 6);
  let at = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const k00 = i * columns + j;
      const k01 = i * columns + ((j + 1) % columns);
      const k10 = k00 + columns;
      const k11 = k01 + columns;
      indices.set([k00, k10, k01, k01, k10, k11], at);
      at += 6;
    }
  }
  return { vertices, indices, roots: scatterRoots(vertices, indices, seed), radius };
}

export function buildFurBody(body: BodyShape): FurBody {
  const columns = body.rim ? RIM_COLUMNS : Math.max(64, body.ribs * RIB_COLUMNS);
  const grid = limbGrid(body, ROWS, columns);
  const count = (ROWS + 1) * columns;
  let reach = 0;
  for (let k = 0; k < count; k++) {
    reach = Math.max(reach, Math.hypot(grid.p[k * 3] as number, grid.p[k * 3 + 1] as number));
  }
  const unit = (CORE_SHARE * FUR_HALF) / reach;
  return { mesh: meshOf({ rows: ROWS, columns, p: grid.p, n: grid.n }, unit, [0, 0, 0], SEED), unit };
}

export function rayReach(ring: Vec2[], angle: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i] as Vec2;
    const [bx, by] = ring[(i + 1) % ring.length] as Vec2;
    const ex = bx - ax;
    const ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = (ax * ey - ay * ex) / den;
    const s = (ax * dy - ay * dx) / den;
    if (t > best && s >= 0 && s <= 1) best = t;
  }
  return best;
}

export function lensMesh(ring: Vec2[], thickness: number, z: number, unit: number, seed: number): FurMesh {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of ring) {
    cx += x;
    cy += y;
  }
  cx /= ring.length;
  cy /= ring.length;
  const local = ring.map(([x, y]): Vec2 => [x - cx, y - cy]);
  const rim = Array.from({ length: LENS_RIM_SAMPLES }, (_, i) =>
    rayReach(local, -Math.PI + (2 * Math.PI * (i + 0.5)) / LENS_RIM_SAMPLES),
  );
  const shape: BodyShape = {
    ribs: 4,
    sharp: [1, 1],
    radius: [1, 1],
    skirt: [0, 0],
    join: 1,
    depth: [0, 0],
    rim,
    puff: 2,
    flat: thickness,
  };
  const grid = limbGrid(shape, LENS_ROWS, LENS_COLUMNS);
  return meshOf({ rows: LENS_ROWS, columns: LENS_COLUMNS, p: grid.p, n: grid.n }, unit, [cx, cy, z], seed);
}

export function discMesh(
  center: Vec3,
  radius: number,
  thickness: number,
  unit: number,
  seed: number,
): FurMesh {
  const ring = Array.from(
    { length: 48 },
    (_, i): Vec2 => [
      center[0] + radius * Math.cos((2 * Math.PI * i) / 48),
      center[1] + radius * Math.sin((2 * Math.PI * i) / 48),
    ],
  );
  return lensMesh(ring, thickness, center[2], unit, seed);
}

function bezier(s: StemShape, t: number): Vec3 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * s.base[0] + b * s.c1[0] + c * s.c2[0] + d * s.tip[0],
    a * s.base[1] + b * s.c1[1] + c * s.c2[1] + d * s.tip[1],
    a * s.base[2] + b * s.c1[2] + c * s.c2[2] + d * s.tip[2],
  ];
}

function radiusAlong(s: StemShape, t: number): number {
  const knots = s.radius;
  let prev = knots[0] as [number, number, number];
  if (t <= prev[0]) return (prev[1] + prev[2]) / 2;
  for (const knot of knots) {
    if (t <= knot[0]) {
      const k = (t - prev[0]) / Math.max(1e-6, knot[0] - prev[0]);
      return ((prev[1] + prev[2]) / 2) * (1 - k) + ((knot[1] + knot[2]) / 2) * k;
    }
    prev = knot;
  }
  return (prev[1] + prev[2]) / 2;
}

export function tubeMesh(stem: StemShape, unit: number, seed: number): FurMesh {
  const rows = TUBE_ROWS;
  const columns = TUBE_COLUMNS;
  const p = new Float64Array((rows + 1) * columns * 3);
  const n = new Float64Array((rows + 1) * columns * 3);
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const a = bezier(stem, Math.max(0, t - 0.01));
    const b = bezier(stem, Math.min(1, t + 0.01));
    const c = bezier(stem, t);
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const side: Vec2 = [-ty, tx];
    const cap = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 16));
    const r = Math.max(radiusAlong(stem, t), MIN_TUBE) * Math.max(0.12, cap);
    for (let j = 0; j < columns; j++) {
      const phi = (2 * Math.PI * j) / columns;
      const nx = Math.cos(phi) * side[0];
      const ny = Math.cos(phi) * side[1];
      const nz = Math.sin(phi);
      const k = (i * columns + j) * 3;
      p[k] = c[0] + r * nx;
      p[k + 1] = c[1] + r * ny;
      p[k + 2] = c[2] + r * nz;
      n[k] = nx;
      n[k + 1] = ny;
      n[k + 2] = nz;
    }
  }
  return meshOf({ rows, columns, p, n }, unit, [0, 0, 0], seed);
}
