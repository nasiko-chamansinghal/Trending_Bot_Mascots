import type { EyePair, Point } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { PUFFY_RADII } from './radii';

const UNIT = 100;
const DISC_POINTS = 96;
const FRAME: TraceFrame = { origin: [226.79, 190.05], reach: 178.34, center: [120, 130], scale: 100 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const EYE_RADIUS = 17.8;
const EYES: Array<[number, number]> = [
  [188.78, 183.56],
  [248.19, 183.55],
];

function disc([x, y]: [number, number]): number[] {
  return Array.from({ length: DISC_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / DISC_POINTS;
    return [x + EYE_RADIUS * Math.cos(t), y + EYE_RADIUS * Math.sin(t)];
  }).flat();
}

const SPEC: SolidSpec = {
  ...rimSpec({
    ring: tracedBodyRing(PUFFY_RADII, UNIT),
    unit: UNIT,
    depth: 0.8,
    puff: 2.2,
    sigma: 3,
    edge: 0,
    tint: { top: ['#CBEBFE', 0.4], bottom: ['#6EC3F0', 0.3] },
    scale: FRAME.scale,
    center: FRAME.center,
  }),
  rest: { yaw: 0, pitch: 0, roll: 0 },
};

const [LEFT, RIGHT] = EYES.map(([x, y]) => view(x, y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: EYE_RADIUS * FIT,
  ry: EYE_RADIUS * FIT,
  scale: 0.3,
  spread: 0.9,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 20,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EYES.map((eye) => normalizeRing(tracedPolygon(disc(eye), FRAME), 192, false)) as EyePair,
};

export const puffy = rimCharacter({
  id: 'puffy',
  name: 'Puffy',
  desc: 'A soft light-blue cloud with two small round dark eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#8DD3F5',
    '#111111',
    { dim: '#6FB4DB', soft: '#B5E3FA', blush: '#B9C4F5', angry: '#E0705F', alert: '#F2B84B', off: '#8FA3B3' },
    '#9FCBEA',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
