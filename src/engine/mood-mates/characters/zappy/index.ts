import type { EyePair, Point } from '../../geometry';
import type { ShadeSpec, SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { ZAPPY_MOUTH } from './mouth';
import { ZAPPY_RADII } from './radii';

const UNIT = 100;
const OVAL_POINTS = 96;
const FRAME: TraceFrame = { origin: [343.7, 326.6], reach: 326.7, center: [120.7, 130.8], scale: 101.5 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const OUTLINE = 39;
const FACE_X = 346;
const EYE_Y = 381.7;
const EYE_GAP = 88;
const EYE_SEMI: Point = [42, 80];
const MOUTH_Y = 458;
const INK = '#0D0B14';

function oval(cx: number, cy: number): number[] {
  return Array.from({ length: OVAL_POINTS }, (_, i) => {
    const t = (2 * Math.PI * i) / OVAL_POINTS;
    return [cx + EYE_SEMI[0] * Math.cos(t), cy + EYE_SEMI[1] * Math.sin(t)];
  }).flat();
}

const BODY = rimSpec({
  ring: tracedBodyRing(ZAPPY_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 6,
  edge: 0,
  tint: { top: ['#FFFFFF', 0.35], bottom: ['#E7C27D', 0.35] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const EYE_CENTRE = view(FACE_X, EYE_Y);

const OUTLINE_SHADE: ShadeSpec = {
  color: INK,
  tone: 'fixed',
  from: [0, 0],
  to: [0, 1],
  stops: [
    [0, 1],
    [1, 1],
  ],
  rim: { width: 2 * OUTLINE * FIT, blur: 0.35 },
};

const SPEC: SolidSpec = {
  ...BODY,
  shades: [OUTLINE_SHADE],
  plate: {
    ring: tracedPolygon(ZAPPY_MOUTH, FRAME, [FACE_X, MOUTH_Y]),
    top: INK,
    bottom: INK,
    follow: { anchor: EYE_CENTRE, gain: 1, lean: 0.3, limit: [0.26, 0.19, 0.28] },
  },
};

const GROK = rimEyes({
  anchor: EYE_CENTRE,
  half: EYE_GAP * FIT,
  rx: EYE_SEMI[0] * FIT,
  ry: EYE_SEMI[1] * FIT,
  scale: 0.5,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 30,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: [FACE_X - EYE_GAP, FACE_X + EYE_GAP].map((x) =>
    normalizeRing(tracedPolygon(oval(x, EYE_Y), FRAME), 192, false),
  ) as EyePair,
};

export const zappy = rimCharacter({
  id: 'zappy',
  name: 'Zappy',
  desc: 'A cream cat head with a thick black outline, two tall black eyes and a little zigzag mouth, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#FFF3D6',
    INK,
    { dim: '#E6D8B8', soft: '#FFF9EA', blush: '#FFD6C9', angry: '#FFB3A3', alert: '#FFE29A', off: '#CFC6B0' },
    '#C9B98F',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
