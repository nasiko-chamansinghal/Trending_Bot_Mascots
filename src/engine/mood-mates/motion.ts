export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
export const smooth = (u: number): number => u * u * (3 - 2 * u);
export const frac = (v: number): number => ((v % 1) + 1) % 1;

export function easeOutBack(u: number): number {
  const c = 1.70158;
  const v = u - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
}

export function easeInOutCubic(u: number): number {
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}
