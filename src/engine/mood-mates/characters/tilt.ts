import type { EyePair, Point, Ring } from '../geometry';

function turn(ring: Ring, about: Point, angle: number): Ring {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return ring.map(([x, y]): Point => {
    const dx = x - about[0];
    const dy = y - about[1];
    return [about[0] + dx * cos - dy * sin, about[1] + dx * sin + dy * cos];
  });
}

export function tiltEyes(
  faces: Record<string, EyePair>,
  about: Point,
  angle: number,
): Record<string, EyePair> {
  return Object.fromEntries(
    Object.entries(faces).map(([slot, [first, second]]) => [
      slot,
      [turn(first, about, angle), turn(second, about, angle)] as EyePair,
    ]),
  );
}
