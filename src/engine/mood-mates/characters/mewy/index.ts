import type { EyePair, Point } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { MEWY_RADII } from './radii';

const UNIT = 100;
const OVAL_POINTS = 96;
const FRAME: TraceFrame = { origin: [148.5, 131.62], reach: 125.19, center: [120, 128], scale: 104 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const EYE = { rx: 25.5, ry: 38.3, y: 142.13 };
const EYE_X: [number, number] = [109.67, 184.32];

function oval(x: number): number[] {
  return Array.from({ length: OVAL_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / OVAL_POINTS;
    return [x + EYE.rx * Math.cos(t), EYE.y + EYE.ry * Math.sin(t)];
  }).flat();
}

const SPEC: SolidSpec = {
  ...rimSpec({
    ring: tracedBodyRing(MEWY_RADII, UNIT),
    unit: UNIT,
    depth: 0.8,
    puff: 2.2,
    sigma: 3,
    edge: 0,
    tint: { top: ['#FFFFFF', 0.1], bottom: ['#E9A6FC', 0.22] },
    scale: FRAME.scale,
    center: FRAME.center,
  }),
  rest: { yaw: 0, pitch: 0, roll: 0 },
  shades: [
    {
      color: '#D65CF5',
      tone: 'fixed',
      from: [0, 0],
      to: [0, 1],
      stops: [
        [0, 0.12],
        [0.55, 0.3],
        [1, 0.7],
      ],
      rim: { width: 16 * FIT, blur: 4 },
    },
  ],
};

const [LEFT, RIGHT] = EYE_X.map((x) => view(x, EYE.y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: EYE.rx * FIT,
  ry: EYE.ry * FIT,
  scale: 0.8,
  spread: 0.9,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 40,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EYE_X.map((x) => normalizeRing(tracedPolygon(oval(x), FRAME), 192, false)) as EyePair,
};

export const mewy = rimCharacter({
  id: 'mewy',
  name: 'Mewy',
  desc: 'A soft glowing white cat head with one pointed ear, a small ear on the other side and two big purple oval eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#FAF0F9',
    '#BF01FE',
    { dim: '#E4C6EB', soft: '#FFF4FD', blush: '#F6B6EC', angry: '#E36AA8', alert: '#F6C25A', off: '#C9B5D3' },
    '#C58AE8',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
