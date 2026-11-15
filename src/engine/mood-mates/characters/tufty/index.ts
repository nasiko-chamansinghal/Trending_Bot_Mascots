import type { EyePair, Point } from '../../geometry';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedEyeRing, traceFit, traceView } from '../traced';
import { TUFTY_EYES } from './eyes';
import { TUFTY_RADII } from './radii';

const UNIT = 100;
const FRAME: TraceFrame = { origin: [92.379, 94.996], reach: 69.063, center: [119.3, 122.7], scale: 92 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const BODY = rimSpec({
  ring: tracedBodyRing(TUFTY_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 6,
  edge: 0,
  tint: { top: ['#FFFFFF', 0.28], bottom: ['#E58A00', 0.32] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const [LEFT, RIGHT] = TUFTY_EYES.map((eye) => view(eye.x, eye.y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: 19.3 * FIT,
  ry: 15.5 * FIT,
  scale: 0.5,
  spread: 0.75,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 30,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: TUFTY_EYES.map((eye) => normalizeRing(tracedEyeRing(eye, FRAME), 192, false)) as EyePair,
};

export const tufty = rimCharacter({
  id: 'tufty',
  name: 'Tufty',
  desc: 'A sunny yellow boxy head with a spiky tuft, two little fangs and sleepy half-moon eyes, built as a solid that turns in 3D',
  spec: BODY,
  palette: palette(
    '#FFD23F',
    '#4A2C00',
    { dim: '#E2B52C', soft: '#FFE585', blush: '#FFB09A', angry: '#FF8452', alert: '#FFC247', off: '#C9BE9A' },
    '#F2C94C',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
