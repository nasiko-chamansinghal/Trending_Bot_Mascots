import { palette, radialRing, rimCharacter, rimEyes, rimSpec } from '../rim';
import { GHOSTY_RADII } from './radii';

const UNIT = 100;
const SCALE = 80;
const CENTER: [number, number] = [121, 125];
const EYES_X = 0.27;
const EYES_Y = 0.24;
const HEAD_WINDOWS: Array<[number, number]> = [
  [10, 38],
  [62, 118],
];
const HEAD_PASSES = 80;

function inWindow(i: number): number {
  for (const [from, to] of HEAD_WINDOWS) {
    if (i > from && i < to) return Math.sin((Math.PI * (i - from)) / (to - from)) ** 2;
  }
  return 0;
}

function smoothHead(radii: number[]): number[] {
  const n = radii.length;
  let cur = radii;
  for (let pass = 0; pass < HEAD_PASSES; pass++) {
    const prev = cur;
    cur = prev.map((r, i) => {
      const w = inWindow(i);
      if (w === 0) return r;
      const avg = 0.25 * (prev[(i + n - 1) % n] as number) + 0.5 * r + 0.25 * (prev[(i + 1) % n] as number);
      return r + (avg - r) * w;
    });
  }
  return cur;
}

const RADII = smoothHead(GHOSTY_RADII);

const SPEC = rimSpec({
  ring: radialRing(RADII, UNIT),
  unit: UNIT,
  depth: 0.72,
  puff: 2.4,
  sigma: 40,
  edge: 16,
  tint: { top: ['#F3EFFF', 0.5], bottom: ['#A592EE', 0.6] },
  scale: SCALE,
  center: CENTER,
});

const RINGS = rimEyes({
  anchor: [CENTER[0] + EYES_X * SCALE, CENTER[1] - EYES_Y * SCALE],
  half: 11,
  rx: 8.5,
  ry: 13,
  scale: 0.52,
  spread: 0.52,
  reach: 0.1,
  aspect: 0.55,
  minHeight: 28,
  maxGrow: 1.25,
});

export const ghosty = rimCharacter({
  id: 'ghosty',
  name: 'Ghosty',
  desc: 'A white-and-lavender ghost leaning like a tilted teardrop, with a head at the upper right, a tail that sweeps into three soft lobes and two small round eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#D9CEF6',
    '#2C2358',
    { dim: '#C2B5EA', soft: '#E8E1FB', blush: '#F4BFD8', angry: '#F59AA8', alert: '#F07F8E', off: '#A9A2C0' },
    '#C9BFF2',
  ),
  rings: RINGS,
});
