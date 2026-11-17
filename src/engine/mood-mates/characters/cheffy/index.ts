import type { EyePair } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceView } from '../traced';
import { CHEFFY_BAND, CHEFFY_EYE_LEFT, CHEFFY_EYE_RIGHT, CHEFFY_HAT } from './shapes';

const UNIT = 100;
const DOME = 300;
const BASE = 170;
const RADII_POINTS = 360;
const FRAME: TraceFrame = { origin: [468, 698], reach: DOME, center: [122.6, 175], scale: 72 };
const view = traceView(FRAME);

const RADII = Array.from({ length: RADII_POINTS }, (_, i) => {
  const a = (2 * Math.PI * i) / RADII_POINTS;
  const sin = Math.sin(a);
  return sin <= 0 ? 1 : BASE / DOME / Math.hypot((BASE / DOME) * Math.cos(a), sin);
});

const BODY = rimSpec({
  ring: tracedBodyRing(RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 6,
  edge: 0,
  tint: { top: ['#FFFFFF', 0.22], bottom: ['#0B8F86', 0.3] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const SPEC: SolidSpec = {
  ...BODY,
  topper: {
    ring: tracedPolygon(CHEFFY_HAT, FRAME),
    sway: 0,
    thin: 0.8,
    fill: '#FFFFFF',
    edge: '#D8D5E0',
    accent: { ring: tracedPolygon(CHEFFY_BAND, FRAME), fill: '#EFEFEF' },
  },
};

const LEFT = tracedPolygon(CHEFFY_EYE_LEFT, FRAME);
const RIGHT = tracedPolygon(CHEFFY_EYE_RIGHT, FRAME);
const EYE_CENTRE = view(496, 590);
const SPAN = view(587.3, 565.7)[0] - view(404.6, 612.7)[0];

const GROK = rimEyes({
  anchor: EYE_CENTRE,
  half: SPAN / 2,
  rx: 12,
  ry: 12,
  scale: 0.5,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 26,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: [normalizeRing(LEFT, 192, false), normalizeRing(RIGHT, 192, false)] as EyePair,
};

export const cheffy = rimCharacter({
  id: 'cheffy',
  name: 'Cheffy',
  desc: 'A round teal mound in a tall white chef hat with two closed, content eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#2BB5A4',
    '#151012',
    { dim: '#1F9588', soft: '#6FD5C8', blush: '#F2A48F', angry: '#E8684F', alert: '#F1C24A', off: '#9DB5B1' },
    '#8FDDD2',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
