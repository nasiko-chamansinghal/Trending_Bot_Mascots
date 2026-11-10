export interface Petal {
  x: number;
  y: number;
  angle: number;
  length: number;
  halfWidth: number;
  shape: number;
  round: number;
}

export const HEAD = { cx: 209.49, cy: 140.45, a: 75.56, b: 66.27 };

export const PETALS: Petal[] = [
  { x: 183.26, y: 169.58, angle: 146.21, length: 62.56, halfWidth: 22.06, shape: 0.84, round: 0.657 },
  { x: 191.06, y: 174.19, angle: 125.86, length: 60.53, halfWidth: 16.7, shape: 0.887, round: 0.783 },
  { x: 212.3, y: 177.8, angle: 85.95, length: 54.76, halfWidth: 22.39, shape: 0.8, round: 0.577 },
  { x: 226.66, y: 177.24, angle: 44.99, length: 56.62, halfWidth: 15.4, shape: 0.944, round: 0.637 },
  { x: 234.34, y: 169.3, angle: 32.03, length: 63.27, halfWidth: 21.22, shape: 1.166, round: 0.678 },
];
