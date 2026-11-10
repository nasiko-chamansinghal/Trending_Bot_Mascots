import type { Point, Ring } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { FLAME_RADII, PLATE_RADII } from './radii';

const UNIT = 100;
const SCALE = 105.9;
const CENTER: [number, number] = [120, 136];
const FLAME = { x: 135.99, y: 143.36, reach: 97.423 };
const PLATE = { x: 137.406, y: 167.408, reach: 42.422 };
const EYES = { x: 137, y: 164.5, half: 22, rx: 7, ry: 9.5 };
const FIT = SCALE / FLAME.reach;
const PLATE_POINTS = 120;

function view(x: number, y: number): Point {
  return [CENTER[0] + (x - FLAME.x) * FIT, CENTER[1] + (y - FLAME.y) * FIT];
}

function plateRing(): Ring {
  const step = PLATE_RADII.length / PLATE_POINTS;
  return Array.from({ length: PLATE_POINTS }, (_, i): Point => {
    const k = Math.round(i * step);
    const a = (2 * Math.PI * k) / PLATE_RADII.length;
    const r = (PLATE_RADII[k] as number) * PLATE.reach;
    return view(PLATE.x + Math.cos(a) * r, PLATE.y - Math.sin(a) * r);
  });
}

function flameRing(): Ring {
  const n = FLAME_RADII.length;
  return FLAME_RADII.map((r, i): Point => {
    const a = (2 * Math.PI * (i + 0.37)) / n;
    return [Math.cos(a) * r * UNIT, Math.sin(a) * r * UNIT];
  });
}

const EYE_CENTRE = view(EYES.x, EYES.y);

const BODY = rimSpec({
  ring: flameRing(),
  unit: UNIT,
  depth: 0.7,
  puff: 1.8,
  sigma: 12,
  edge: 0,
  tint: { top: ['#FFD060', 0.55], bottom: ['#E5361A', 0.6] },
  scale: SCALE,
  center: CENTER,
});

const SPEC: SolidSpec = {
  ...BODY,
  body: { ...BODY.body, ribs: 12 },
  plate: {
    ring: plateRing(),
    top: '#FFD24D',
    bottom: '#FFF5CF',
    inverse: { top: '#6B1F08', bottom: '#2E0D04' },
    follow: { anchor: EYE_CENTRE, gain: 1, lean: 0.3, limit: [0.26, 0.19, 0.28] },
  },
};

const FACE = rimEyes({
  anchor: EYE_CENTRE,
  half: EYES.half * FIT,
  rx: EYES.rx * FIT,
  ry: EYES.ry * FIT,
  scale: 0.44,
  spread: 0.55,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 20,
  maxGrow: 1.25,
});

export const flame = rimCharacter({
  id: 'flame',
  name: 'Flame',
  desc: 'A tilted J-curve flame in glowing orange with a bright yellow face area and two Grok-style capsule eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#FF8A1F',
    '#2B0E04',
    { dim: '#E5700F', soft: '#FFA94D', blush: '#FF7B6B', angry: '#E0301A', alert: '#FF4A2E', off: '#8F7A6E' },
    '#FFC37A',
  ),
  rings: FACE,
});
