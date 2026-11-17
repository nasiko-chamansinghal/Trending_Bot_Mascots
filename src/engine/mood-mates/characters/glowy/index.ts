import type { EyePair, Point } from '../../geometry';
import type { HaloSpec, ShadeSpec, SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { GLOWY_RADII } from './radii';

const UNIT = 100;
const OVAL_POINTS = 96;
const FRAME: TraceFrame = { origin: [181.07, 193.11], reach: 147.48, center: [126.7, 137.5], scale: 103.2 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const EYE_SIZE = { major: 39.45, minor: 20.93 };
const EYES = [
  { ...EYE_SIZE, x: 162.62, y: 162.7, angle: 71.93 },
  { ...EYE_SIZE, x: 222.5, y: 149.76, angle: 81.97 },
];

function oval(eye: (typeof EYES)[number]): number[] {
  const phi = (eye.angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  return Array.from({ length: OVAL_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / OVAL_POINTS;
    const u = eye.major * Math.cos(t);
    const v = eye.minor * Math.sin(t);
    return [eye.x + u * cos - v * sin, eye.y + u * sin + v * cos];
  }).flat();
}

const BODY = rimSpec({
  ring: tracedBodyRing(GLOWY_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 3,
  edge: 0,
  tint: { top: ['#FFFFFF', 0.3], bottom: ['#F7DDFB', 0.5] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const HALO: HaloSpec = {
  color: '#6A3CF0',
  tone: 'vivid',
  hue: -35,
  amount: 0.5,
  blur: 16 * FIT,
  grow: 9 * FIT,
  stops: [
    [0, 0.12],
    [0.5, 0.45],
    [1, 1],
  ],
};

const SHADES: ShadeSpec[] = [
  {
    color: '#F08CF8',
    tone: 'vivid',
    hue: 5,
    amount: 0.74,
    from: [0, 0.2],
    to: [0, 1],
    stops: [
      [0, 0],
      [0.55, 0.35],
      [1, 1],
    ],
    rim: { width: 2 * 30 * FIT, blur: 13 * FIT },
  },
  {
    color: '#7048E6',
    tone: 'vivid',
    hue: -30,
    amount: 0.6,
    from: [0, 0],
    to: [0, 1],
    stops: [
      [0, 0],
      [0.7, 0.1],
      [1, 0.95],
    ],
    rim: { width: 2 * 14 * FIT, blur: 7 * FIT },
  },
  {
    color: '#7048E6',
    tone: 'vivid',
    hue: -30,
    amount: 0.6,
    from: [0, 0],
    to: [1, 0],
    stops: [
      [0, 0.05],
      [0.6, 0.3],
      [1, 0.95],
    ],
    rim: { width: 2 * 8 * FIT, blur: 3 * FIT },
  },
];

const SPEC: SolidSpec = { ...BODY, halo: HALO, shades: SHADES };

const [LEFT, RIGHT] = EYES.map((eye) => view(eye.x, eye.y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: EYE_SIZE.minor * FIT,
  ry: EYE_SIZE.major * FIT,
  scale: 0.5,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 30,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EYES.map((eye) => normalizeRing(tracedPolygon(oval(eye), FRAME), 192, false)) as EyePair,
};

export const glowy = rimCharacter({
  id: 'glowy',
  name: 'Glowy',
  desc: 'A pale neon ghost with a scooped top, a pink-to-violet glowing edge and two tall black eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#FDF1FE',
    '#0B0610',
    { dim: '#E3D3F0', soft: '#FFF6FF', blush: '#FFC9E4', angry: '#FF9EB0', alert: '#FFE3A8', off: '#CBBFD6' },
    '#C9A8F5',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
