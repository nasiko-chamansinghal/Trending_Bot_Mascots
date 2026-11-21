import type { EyePair, Point } from '../../geometry';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { tiltEyes } from '../tilt';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { BUNNI_RADII } from './radii';

const UNIT = 100;
const DISC_POINTS = 64;
const FRAME: TraceFrame = { origin: [225.5, 212.3], reach: 182.62, center: [120, 130], scale: 112 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const MIRROR_AXIS = 2 * FRAME.origin[0];

const EYES: Array<[number, number, number]> = [
  [MIRROR_AXIS - 197.2, 277.9, 16.6],
  [MIRROR_AXIS - 132.7, 254.2, 16.6],
];
const RADII = BUNNI_RADII.map((_, j, all) => all[(all.length / 2 - j + all.length) % all.length] as number);
const SPAN: Point = [EYES[1][0] - EYES[0][0], EYES[1][1] - EYES[0][1]];
const MID: Point = [(EYES[0][0] + EYES[1][0]) / 2, (EYES[0][1] + EYES[1][1]) / 2];
const TILT = Math.atan2(SPAN[1], SPAN[0]);

function disc([x, y, r]: [number, number, number]): number[] {
  return Array.from({ length: DISC_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / DISC_POINTS;
    return [x + r * Math.cos(t), y + r * Math.sin(t)];
  }).flat();
}

const BODY = rimSpec({
  ring: tracedBodyRing(RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 3,
  edge: 0,
  tint: { top: ['#FF7AD5', 0.25], bottom: ['#C0239A', 0.25] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const anchor = view(MID[0], MID[1]);

const GROK = rimEyes({
  anchor,
  half: (Math.hypot(SPAN[0], SPAN[1]) / 2) * FIT,
  rx: EYES[0][2] * FIT,
  ry: EYES[0][2] * FIT,
  scale: 0.45,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 24,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...tiltEyes(GROK, anchor, TILT),
  calm: EYES.map((eye) => normalizeRing(tracedPolygon(disc(eye), FRAME), 192, false)) as EyePair,
};

export const bunni = rimCharacter({
  id: 'bunni',
  name: 'Bunni',
  desc: 'A magenta bunny head facing right, with two tall ears and two small white dot eyes, built as a solid that turns in 3D',
  spec: BODY,
  palette: palette(
    '#E23FB5',
    '#FFFFFF',
    { dim: '#B82E94', soft: '#FF8AD8', blush: '#FFA3E0', angry: '#D6202A', alert: '#FFC52A', off: '#B896B0' },
    '#FFB0E6',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
