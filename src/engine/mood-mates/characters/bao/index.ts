import type { EyePair, Point } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { baoMouths } from './mouths';
import { BAO_RADII } from './radii';

const UNIT = 100;
const DISC_POINTS = 96;
const FRAME: TraceFrame = { origin: [124.49, 115.92], reach: 126.51, center: [120, 132], scale: 105 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const EYES: Array<[number, number, number]> = [
  [76, 124, 22],
  [173, 124, 22],
];

function disc([x, y, r]: [number, number, number]): number[] {
  return Array.from({ length: DISC_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / DISC_POINTS;
    return [x + r * Math.cos(t), y + r * Math.sin(t)];
  }).flat();
}

const SPEC: SolidSpec = {
  ...rimSpec({
    ring: tracedBodyRing(BAO_RADII, UNIT),
    unit: UNIT,
    depth: 0.8,
    puff: 2.2,
    sigma: 3,
    edge: 0,
    tint: { top: ['#3A2420', 0.12], bottom: ['#120605', 0.12] },
    scale: FRAME.scale,
    center: FRAME.center,
  }),
  shades: [
    {
      color: '#8E7D79',
      tone: 'fixed',
      from: [0, 0],
      to: [0, 1],
      stops: [
        [0, 0.55],
        [1, 0.3],
      ],
      rim: { width: 9 * FIT, blur: 0.9 },
    },
  ],
};

const [LEFT, RIGHT] = EYES.map(([x, y]) => view(x, y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: EYES[0][2] * FIT,
  ry: EYES[0][2] * FIT,
  scale: 0.55,
  spread: 1.15,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 24,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EYES.map((eye) => normalizeRing(tracedPolygon(disc(eye), FRAME), 192, false)) as EyePair,
};

export const bao = rimCharacter({
  id: 'bao',
  name: 'Bao',
  desc: 'A glossy black bun with a two-lobed top knot and two pale round eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#1E0C0A',
    '#E9E9E9',
    { dim: '#120605', soft: '#4A2E2A', blush: '#5A2E34', angry: '#7A1A1A', alert: '#E0A526', off: '#4A4040' },
    '#6A4A44',
  ),
  rings: FACE,
  mouths: baoMouths(FRAME),
  fear: [1.1, 1.1],
});
