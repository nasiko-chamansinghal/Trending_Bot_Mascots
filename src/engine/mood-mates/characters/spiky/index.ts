import type { EyePair, Point, Ring } from '../../geometry';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { SPIKY_RADII } from './radii';

const UNIT = 100;
const SCALE = 100;
const CENTER: [number, number] = [120, 120];
const ORIGIN = { x: 206.236, y: 119.578, reach: 118.179 };
const FIT = SCALE / ORIGIN.reach;
const EYES = {
  left: [208.39, 145.75] as Point,
  right: [249.77, 144.86] as Point,
  width: 31,
  length: 77,
  lean: (6 * Math.PI) / 180,
};
const CAPSULE_POINTS = 96;

function view(x: number, y: number): Point {
  return [CENTER[0] + (x - ORIGIN.x) * FIT, CENTER[1] + (y - ORIGIN.y) * FIT];
}

function bodyRing(): Ring {
  const n = SPIKY_RADII.length;
  return Array.from({ length: n }, (_, i): Point => {
    const r = SPIKY_RADII[(n - i) % n] as number;
    const a = (2 * Math.PI * (i + 0.37)) / n;
    return [Math.cos(a) * r * UNIT, Math.sin(a) * r * UNIT];
  });
}

function capsule(centre: Point): Ring {
  const [cx, cy] = view(centre[0], centre[1]);
  const radius = (EYES.width / 2) * FIT;
  const half = (EYES.length / 2) * FIT - radius;
  const side = 2 * half;
  const arc = Math.PI * radius;
  const perimeter = 2 * side + 2 * arc;
  const sin = Math.sin(EYES.lean);
  const cos = Math.cos(EYES.lean);
  return Array.from({ length: CAPSULE_POINTS }, (_, i): Point => {
    const s = (i / CAPSULE_POINTS) * perimeter;
    let x: number;
    let y: number;
    if (s < arc) {
      const t = Math.PI + (s / arc) * Math.PI;
      x = radius * Math.cos(t);
      y = -half + radius * Math.sin(t);
    } else if (s < arc + side) {
      x = radius;
      y = -half + (s - arc);
    } else if (s < 2 * arc + side) {
      const t = ((s - arc - side) / arc) * Math.PI;
      x = radius * Math.cos(t);
      y = half + radius * Math.sin(t);
    } else {
      x = -radius;
      y = half - (s - 2 * arc - side);
    }
    return [cx + x * cos - y * sin, cy + x * sin + y * cos];
  });
}

const BODY = rimSpec({
  ring: bodyRing(),
  unit: UNIT,
  depth: 0.7,
  puff: 1.8,
  sigma: 12,
  edge: 0,
  tint: { top: ['#F5694F', 0.25], bottom: ['#B8200F', 0.3] },
  scale: SCALE,
  center: CENTER,
});

const ANCHOR = view((EYES.left[0] + EYES.right[0]) / 2, (EYES.left[1] + EYES.right[1]) / 2);

const GROK = rimEyes({
  anchor: ANCHOR,
  half: ((EYES.right[0] - EYES.left[0]) / 2) * FIT,
  rx: (EYES.width / 2) * FIT,
  ry: (EYES.length / 2) * FIT,
  scale: 0.5,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 22,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: [normalizeRing(capsule(EYES.left), 192, false), normalizeRing(capsule(EYES.right), 192, false)],
};

export const spiky = rimCharacter({
  id: 'spiky',
  name: 'Spiky',
  desc: 'A red blob with a spiky crown, little side bumps and two tall tilted capsule eyes, built as a solid that turns in 3D',
  spec: BODY,
  palette: palette(
    '#EA3A24',
    '#FFFFFF',
    { dim: '#D0321F', soft: '#EF4A33', blush: '#F26B58', angry: '#C4200F', alert: '#F5502F', off: '#8A5A52' },
    '#F6A08F',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
