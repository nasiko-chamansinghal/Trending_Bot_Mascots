import type { EyePair, Point } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec, smoothContour } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { BLAZE_RADII } from './radii';
import { BLAZE_TIPS } from './shapes';

const UNIT = 100;
const OVAL_POINTS = 96;
const FRAME: TraceFrame = { origin: [86.22, 118.76], reach: 75.11, center: [120.3, 163.5], scale: 87.6 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const EYE_CENTRES: Point[] = [
  [71.14, 119.38],
  [100.46, 119.37],
];
const EYE_SEMI: Point = [9.25, 18.8];
const TIP_TOP = 24;
const FLOOR = 151;
const TIP_SMOOTH = 2;

function oval(c: Point): number[] {
  return Array.from({ length: OVAL_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / OVAL_POINTS;
    return [c[0] + EYE_SEMI[0] * Math.cos(t), c[1] + EYE_SEMI[1] * Math.sin(t)];
  }).flat();
}

const BODY = rimSpec({
  ring: tracedBodyRing(BLAZE_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 6,
  edge: 8,
  tint: { top: ['#97AEF0', 1], bottom: ['#4338C8', 1] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const SPEC: SolidSpec = {
  ...BODY,
  tintSpan: [view(0, TIP_TOP)[1], view(0, FLOOR)[1]],
  topper: { ring: smoothContour(tracedPolygon(BLAZE_TIPS, FRAME), TIP_SMOOTH), sway: 0, thin: 0.8 },
};

const [LEFT, RIGHT] = EYE_CENTRES.map((c) => view(c[0], c[1])) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: EYE_SEMI[0] * FIT,
  ry: EYE_SEMI[1] * FIT,
  scale: 0.5,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 30,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EYE_CENTRES.map((c) => normalizeRing(tracedPolygon(oval(c), FRAME), 192, false)) as EyePair,
};

export const blaze = rimCharacter({
  id: 'blaze',
  name: 'Blaze',
  desc: 'An indigo flame with three sharp tips that fades from sky blue to deep indigo, with two tall white eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#6A6ADA',
    '#F6F4F0',
    { dim: '#5253C0', soft: '#8F95E8', blush: '#C9A0E8', angry: '#D9605F', alert: '#7FB6F0', off: '#9A9CC4' },
    '#A9B1F0',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
