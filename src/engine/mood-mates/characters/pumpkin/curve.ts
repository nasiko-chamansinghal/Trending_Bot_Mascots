export type Key = [number, number];

export function monotone(keys: Key[]): (t: number) => number {
  const n = keys.length;
  const ts = keys.map((k) => k[0]);
  const vs = keys.map((k) => k[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = (ts[i + 1] as number) - (ts[i] as number);
    d.push(h > 0 ? ((vs[i + 1] as number) - (vs[i] as number)) / h : 0);
  }
  const m: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const a = d[i - 1] as number;
    const b = d[i] as number;
    if (a * b <= 0) continue;
    const h0 = (ts[i] as number) - (ts[i - 1] as number);
    const h1 = (ts[i + 1] as number) - (ts[i] as number);
    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / a + w2 / b);
  }
  return (t: number) => {
    if (t <= (ts[0] as number)) return vs[0] as number;
    if (t >= (ts[n - 1] as number)) return vs[n - 1] as number;
    let i = 0;
    while (i < n - 2 && t > (ts[i + 1] as number)) i++;
    const t0 = ts[i] as number;
    const h = (ts[i + 1] as number) - t0;
    const u = h > 0 ? (t - t0) / h : 1;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * (vs[i] as number) +
      (u3 - 2 * u2 + u) * h * (m[i] as number) +
      (-2 * u3 + 3 * u2) * (vs[i + 1] as number) +
      (u3 - u2) * h * (m[i + 1] as number)
    );
  };
}

export interface Body {
  x: number;
  y: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  turn: number;
  pitch: number;
}

export type BodyKey = [number, Partial<Body>];

const REST: Body = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, turn: 0, pitch: 0 };

export function track(keys: BodyKey[]): (t: number) => Body {
  const full: Body[] = [];
  let cur = { ...REST };
  for (const [, b] of keys) {
    cur = { ...cur, ...b };
    full.push(cur);
  }
  const props = Object.keys(REST) as Array<keyof Body>;
  const curves = props.map((k) => [k, monotone(keys.map(([at], i) => [at, (full[i] as Body)[k]]))] as const);
  return (t: number) => {
    const o = { ...REST };
    for (const [k, f] of curves) o[k] = f(t);
    return o;
  };
}
