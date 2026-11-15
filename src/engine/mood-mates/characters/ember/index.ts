import type { EyePair, Point } from '../../geometry';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedEyeRing, traceFit, traceView } from '../traced';
import { EMBER_EYES } from './eyes';
import { EMBER_RADII } from './radii';

const UNIT = 100;
const FRAME: TraceFrame = { origin: [98.265, 120.849], reach: 69.667, center: [120.3, 125.7], scale: 94 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const BODY = rimSpec({
  ring: tracedBodyRing(EMBER_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 6,
  edge: 0,
  tint: { top: ['#FFFFFF', 0.25], bottom: ['#4B22C8', 0.3] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const [LEFT, RIGHT] = EMBER_EYES.map((eye) => view(eye.x, eye.y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: 12 * FIT,
  ry: 24 * FIT,
  scale: 0.5,
  spread: 0.65,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 30,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EMBER_EYES.map((eye) => normalizeRing(tracedEyeRing(eye, FRAME), 192, false)) as EyePair,
};

export const ember = rimCharacter({
  id: 'ember',
  name: 'Ember',
  desc: 'A violet flame with three curled tips and two tall notched eyes, built as a solid that turns in 3D',
  spec: BODY,
  palette: palette(
    '#9A6BF6',
    '#2B1065',
    { dim: '#7E5CD6', soft: '#B99DFA', blush: '#E39BE6', angry: '#F2708A', alert: '#7B8CFA', off: '#A59CC0' },
    '#C4B0FB',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
