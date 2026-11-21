import type { EyePair, Point } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
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

const EYES: Array<[number, number, number]> = [
  [132.7, 254.2, 16.6],
  [197.2, 277.9, 16.6],
];
const SPAN: Point = [EYES[1][0] - EYES[0][0], EYES[1][1] - EYES[0][1]];
const MID: Point = [(EYES[0][0] + EYES[1][0]) / 2, (EYES[0][1] + EYES[1][1]) / 2];
const TILT = Math.atan2(SPAN[1], SPAN[0]);

function disc([x, y, r]: [number, number, number]): number[] {
  return Array.from({ length: DISC_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / DISC_POINTS;
    return [x + r * Math.cos(t), y + r * Math.sin(t)];
  }).flat();
}

const SPEC: SolidSpec = {
  ...rimSpec({
    ring: tracedBodyRing(BUNNI_RADII, UNIT),
    unit: UNIT,
    depth: 0.8,
    puff: 2,
    sigma: 3,
    edge: 0,
    tint: { top: ['#7B5BFF', 0.45], bottom: ['#52D0FF', 0.5] },
    scale: FRAME.scale,
    center: FRAME.center,
  }),
  shades: [
    {
      color: '#7B4DFF',
      tone: 'fixed',
      from: [0.6, 0.75],
      to: [0.6, 0.38],
      stops: [
        [0, 0],
        [1, 0.9],
      ],
    },
    {
      color: '#FFC52A',
      tone: 'fixed',
      from: [0.6, 0.5],
      to: [0.6, 0.08],
      stops: [
        [0, 0],
        [0.35, 0],
        [1, 0.92],
      ],
    },
  ],
};

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
  desc: 'A soft blue bunny head with two tall ears that fade from violet to gold and two small white dot eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#6B8CFF',
    '#FFFFFF',
    { dim: '#5671D6', soft: '#9DB4FF', blush: '#C79BFF', angry: '#E0559A', alert: '#FFC52A', off: '#9AA4C8' },
    '#B4C4FF',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
