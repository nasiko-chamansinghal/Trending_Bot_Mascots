import { clamp } from './util';

export interface Projected {
  x: number;
  cn: number;
}

export function projectOnBody(
  plane: boolean,
  C: number,
  sil: [number, number],
  ox: number,
  yaw: number,
): Projected | null {
  if (plane) {
    const cn = Math.cos(yaw);
    if (cn <= 0.02) return null;
    return { x: clamp(C + ox * cn, sil[0] + 4, sil[1] - 4), cn };
  }
  const cx0 = (sil[0] + sil[1]) / 2;
  const hw = Math.max((sil[1] - sil[0]) / 2, 12);
  const theta = clamp(ox / hw, -1.15, 1.15);
  const total = theta + yaw;
  const cn = Math.cos(total);
  if (cn <= 0.02) return null;
  return { x: cx0 + hw * Math.sin(total) * 0.985, cn };
}
