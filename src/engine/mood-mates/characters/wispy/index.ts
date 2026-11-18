import type { EyePair, Point } from '../../geometry';
import type { DecalSpec, ShadeSpec, SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { WISPY_RADII } from './radii';
import {
  WISPY_CRESCENT,
  WISPY_EYE_LEFT,
  WISPY_EYE_RIGHT,
  WISPY_FACE,
  WISPY_GLOSS,
  WISPY_HIGHLIGHT,
  WISPY_TAIL,
} from './shapes';

const UNIT = 100;
const SPOT_POINTS = 24;
const FRAME: TraceFrame = { origin: [221.5, 120], reach: 205, center: [126.9, 93], scale: 123 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const OUTLINE = 16;
const INK = '#050505';
const LEFT_EYE: Point = [243.03, 146.28];
const RIGHT_EYE: Point = [337.57, 153.97];
const SPOTS: Array<[number, number, number]> = [
  [150.5, 106.6, 8.1],
  [139.2, 122.8, 4.3],
  [153.5, 144.9, 3],
];

function disc([x, y, r]: [number, number, number]): number[] {
  return Array.from({ length: SPOT_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / SPOT_POINTS;
    return [x + r * Math.cos(t), y + r * Math.sin(t)];
  }).flat();
}

function decal(flat: number[], fill: string, opacity: number): DecalSpec {
  return { ring: tracedPolygon(flat, FRAME), fill, opacity };
}

const BODY = rimSpec({
  ring: tracedBodyRing(WISPY_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 3,
  edge: 0,
  tint: { top: ['#FFFFFF', 0.05], bottom: ['#9A9AA8', 0.08] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const OUTLINE_SHADE: ShadeSpec = {
  color: INK,
  tone: 'fixed',
  from: [0, 0],
  to: [0, 1],
  stops: [
    [0, 1],
    [1, 1],
  ],
  rim: { width: 2 * OUTLINE * FIT, blur: 0.35 },
};

const SPEC: SolidSpec = {
  ...BODY,
  decals: [
    decal(WISPY_FACE, '#FFFFFF', 0.52),
    decal(WISPY_TAIL, '#FFFFFF', 0.54),
    decal(WISPY_HIGHLIGHT, '#FFFFFF', 0.44),
    decal(WISPY_GLOSS, '#FFFFFF', 0.35),
    decal(WISPY_CRESCENT, '#000000', 0.17),
    ...SPOTS.map((spot) => decal(disc(spot), '#000000', 0.25)),
  ],
  shades: [OUTLINE_SHADE],
};

const [LEFT, RIGHT] = [LEFT_EYE, RIGHT_EYE].map((eye) => view(eye[0], eye[1])) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: 17,
  ry: 25,
  scale: 0.8,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 40,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: [WISPY_EYE_LEFT, WISPY_EYE_RIGHT].map((eye) =>
    normalizeRing(tracedPolygon(eye, FRAME), 192, false),
  ) as EyePair,
};

export const wispy = rimCharacter({
  id: 'wispy',
  name: 'Wispy',
  desc: 'A pale grey ghost with a swooping tail, a thick black outline and two big black eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#D9D9D9',
    INK,
    { dim: '#B8B8C0', soft: '#F2F2F2', blush: '#F4D3DA', angry: '#EBB5B5', alert: '#F0E2B0', off: '#C4C4C4' },
    '#9A9A9A',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
