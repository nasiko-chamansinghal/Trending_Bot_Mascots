import type { EyePair, Point } from '../../geometry';
import type { DecalSpec, SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { seatEyes } from '../seat';
import { tiltEyes } from '../tilt';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { EAR_LEFT, EAR_RIGHT, EYE_LEFT, EYE_RIGHT, FACE_ORIGIN, FACE_RADII, NOSE } from './parts';
import { CHIMPY_RADII } from './radii';

const UNIT = 100;
const FRAME: TraceFrame = { origin: [59.96, 58.27], reach: 51.78, center: [120, 128], scale: 105 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const INK = '#111111';
const WHITE = '#FFFFFF';
const LOBE_RADIUS = 14;
const MARGIN = 2;
const HOLD = 0.4;

function middle(flat: number[]): Point {
  const n = flat.length / 2;
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += flat[2 * i] as number;
    y += flat[2 * i + 1] as number;
  }
  return [x / n, y / n];
}

function face(): number[] {
  return FACE_RADII.flatMap((r, i) => {
    const t = (2 * Math.PI * i) / FACE_RADII.length;
    return [FACE_ORIGIN[0] + r * Math.cos(t), FACE_ORIGIN[1] + r * Math.sin(t)];
  });
}

const DECALS: DecalSpec[] = [
  ...[EAR_LEFT, EAR_RIGHT].map((ring): DecalSpec => ({ ring: tracedPolygon(ring, FRAME), fill: WHITE })),
  { ring: tracedPolygon(NOSE, FRAME), fill: INK, front: true, follow: true },
];

const CALM = [EYE_LEFT, EYE_RIGHT];
const [LEFT, RIGHT] = CALM.map((eye) => middle(eye)) as [Point, Point];
const SPAN: Point = [RIGHT[0] - LEFT[0], RIGHT[1] - LEFT[1]];
const TILT = Math.atan2(SPAN[1], SPAN[0]);
const ANCHOR = view((LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2);

const BODY = rimSpec({
  ring: tracedBodyRing(CHIMPY_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 3,
  edge: 0,
  tint: { top: ['#2B2B2B', 0.12], bottom: ['#000000', 0.2] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const SPEC: SolidSpec = {
  ...BODY,
  rest: { yaw: 0, pitch: 0, roll: 0 },
  plate: {
    ring: tracedPolygon(face(), FRAME),
    top: WHITE,
    bottom: '#EEEEF0',
    follow: { anchor: ANCHOR, gain: 1, lean: 0, limit: [0.26, 0.19, 0] },
  },
  decals: DECALS,
};

const GROK = rimEyes({
  anchor: ANCHOR,
  half: (Math.hypot(SPAN[0], SPAN[1]) / 2) * FIT,
  rx: 9.5 * FIT,
  ry: 5 * FIT,
  scale: 0.5,
  spread: 1,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 20,
  maxGrow: 1.25,
});

const lobe = (centre: Point) => ({ centre: view(centre[0], centre[1]), radius: LOBE_RADIUS * FIT });

const SEATED = seatEyes(tiltEyes(GROK, ANCHOR, TILT), [lobe(LEFT), lobe(RIGHT)], {
  margin: MARGIN,
  hold: HOLD,
});

const FACE: Record<string, EyePair> = {
  ...SEATED,
  calm: CALM.map((eye) => normalizeRing(tracedPolygon(eye, FRAME), 192, false)) as EyePair,
};

export const chimpy = rimCharacter({
  id: 'chimpy',
  name: 'Chimpy',
  desc: 'A black monkey with a swept hair tuft, round ears with pale insides, a white face mask and two sleepy half-lidded eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#0B0B0B',
    INK,
    { dim: '#050505', soft: '#2A2A2A', blush: '#4A2A3E', angry: '#7A1F1F', alert: '#D9A526', off: '#3A3A3A' },
    '#9A7A92',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
