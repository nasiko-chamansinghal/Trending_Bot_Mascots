import type { EyePair, Point } from '../../geometry';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { BLOBBY_RADII } from './radii';

const UNIT = 100;
const EYE_POINTS = 96;
const FRAME: TraceFrame = { origin: [97, 158], reach: 54.03, center: [121, 131.7], scale: 103 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const EYES: Array<[number, number, number]> = [
  [95.04, 127.57, 6.41],
  [113.9, 125.6, 6.21],
];

function disc([x, y, r]: [number, number, number]): number[] {
  return Array.from({ length: EYE_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / EYE_POINTS;
    return [x + r * Math.cos(t), y + r * Math.sin(t)];
  }).flat();
}

const BODY = rimSpec({
  ring: tracedBodyRing(BLOBBY_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 3,
  edge: 0,
  tint: { top: ['#FFFFFF', 0], bottom: ['#B8431A', 0.05] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const [LEFT, RIGHT] = EYES.map(([x, y]) => view(x, y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: 6.3 * FIT,
  ry: 6.3 * FIT,
  scale: 0.45,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 24,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EYES.map((eye) => normalizeRing(tracedPolygon(disc(eye), FRAME), 192, false)) as EyePair,
};

export const blobby = rimCharacter({
  id: 'blobby',
  name: 'Blobby',
  desc: 'A round orange blob with little arm bumps, two stubby feet and two small white eyes, built as a solid that turns in 3D',
  spec: BODY,
  palette: palette(
    '#ED7937',
    '#FFFBF2',
    { dim: '#D5622A', soft: '#F79A66', blush: '#F59A7C', angry: '#D9402A', alert: '#F5A623', off: '#B89A8A' },
    '#F5A77A',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
