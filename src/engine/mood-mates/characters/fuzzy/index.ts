import type { EyePair } from '../../geometry';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, traceFit, traceView } from '../traced';
import { FUZZY_RADII } from './radii';

const UNIT = 100;
const FRAME: TraceFrame = { origin: [347.96, 800.22], reach: 226.1, center: [119.5, 130.1], scale: 113.05 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const EYE_CENTRE = view(348.75, 773.25);
const EYE_HALF = 33.75 * FIT;

const BODY = rimSpec({
  ring: tracedBodyRing(FUZZY_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2.2,
  sigma: 4,
  edge: 0,
  tint: { top: ['#FF9A94', 0.2], bottom: ['#D92E2A', 0.3] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const GROK = rimEyes({
  anchor: EYE_CENTRE,
  half: EYE_HALF,
  rx: 7.5,
  ry: 11,
  scale: 0.45,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 24,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = GROK;

export const fuzzy = rimCharacter({
  id: 'fuzzy',
  name: 'Fuzzy',
  desc: 'A soft coral-red flame with a tall leaning tip, two shoulder lobes and a round belly, built as a solid that turns in 3D',
  spec: BODY,
  palette: palette(
    '#F85C57',
    '#151213',
    { dim: '#D9423F', soft: '#FF8A85', blush: '#FF9AA2', angry: '#D6202A', alert: '#FF9A3D', off: '#B58A88' },
    '#FFA3A0',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
