import type { EyePair, Point } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { tiltEyes } from '../tilt';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { HEADSET_LEFT, HEADSET_MIC, HEADSET_RIGHT, HEADSET_WHOLE } from './shapes';

const UNIT = 100;
const BALL_POINTS = 720;
const CAPSULE_ARC = 24;
const FRAME: TraceFrame = { origin: [168.34, 133.13], reach: 75.45, center: [120, 138], scale: 84 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);
const HEADSET_GREEN = '#0AA064';

const EYES: Array<[number, number]> = [
  [174.4, 116.8],
  [211.7, 104.6],
];
const EYE_HALF_LENGTH = 20.3;
const EYE_HALF_WIDTH = 8.6;
const EYE_LEAN = (67.6 * Math.PI) / 180;
const MID: Point = [(EYES[0][0] + EYES[1][0]) / 2, (EYES[0][1] + EYES[1][1]) / 2];
const SPAN: Point = [EYES[1][0] - EYES[0][0], EYES[1][1] - EYES[0][1]];
const TILT = Math.atan2(SPAN[1], SPAN[0]);

function capsule([cx, cy]: [number, number]): number[] {
  const straight = EYE_HALF_LENGTH - EYE_HALF_WIDTH;
  const dx = Math.cos(EYE_LEAN);
  const dy = Math.sin(EYE_LEAN);
  const points: number[] = [];
  for (const [end, from] of [
    [1, -Math.PI / 2],
    [-1, Math.PI / 2],
  ] as const) {
    const ox = cx + dx * straight * end;
    const oy = cy + dy * straight * end;
    for (let i = 0; i <= CAPSULE_ARC; i++) {
      const t = from + (Math.PI * i) / CAPSULE_ARC + EYE_LEAN;
      points.push(ox + EYE_HALF_WIDTH * Math.cos(t), oy + EYE_HALF_WIDTH * Math.sin(t));
    }
  }
  return points;
}

const BODY = rimSpec({
  ring: tracedBodyRing(
    Array.from({ length: BALL_POINTS }, () => 1),
    UNIT,
  ),
  unit: UNIT,
  depth: 0.8,
  puff: 2,
  sigma: 3,
  edge: 0,
  tint: { top: ['#2B2B2B', 0.12], bottom: ['#000000', 0.2] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const anchor = view(MID[0], MID[1]);

const REST_YAW = 0.38;
const MIC_DEPTH = 0.7;
const MIC_FROM = (view(98, 0)[0] - FRAME.center[0]) / FRAME.scale;
const MIC_TO = (view(150, 0)[0] - FRAME.center[0]) / FRAME.scale;

function micDepth(x: number): number {
  const u = Math.min(1, Math.max(0, (x - MIC_FROM) / (MIC_TO - MIC_FROM)));
  return MIC_DEPTH * u * u * (3 - 2 * u);
}

const SPEC: SolidSpec = {
  ...BODY,
  topper: {
    ring: tracedPolygon(HEADSET_WHOLE, FRAME),
    sway: 0,
    thin: 0.9,
    fill: HEADSET_GREEN,
    rig: {
      rest: REST_YAW,
      share: 0.75,
      follow: { anchor, gain: 1, lean: 0, limit: [0.6, 0.45, 0] },
      pieces: [
        { ring: tracedPolygon(HEADSET_LEFT, FRAME), fill: HEADSET_GREEN },
        { ring: tracedPolygon(HEADSET_RIGHT, FRAME), fill: HEADSET_GREEN },
        { ring: tracedPolygon(HEADSET_MIC, FRAME), fill: HEADSET_GREEN, lift: micDepth },
      ],
    },
  },
};

const GROK = rimEyes({
  anchor,
  half: (Math.hypot(SPAN[0], SPAN[1]) / 2) * FIT,
  rx: EYE_HALF_WIDTH * FIT,
  ry: EYE_HALF_LENGTH * FIT,
  scale: 0.45,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 24,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...tiltEyes(GROK, anchor, TILT),
  calm: EYES.map((eye) => normalizeRing(tracedPolygon(capsule(eye), FRAME), 192, false)) as EyePair,
};

export const grokky = rimCharacter({
  id: 'grokky',
  name: 'Grokky',
  desc: 'A round black bot in a green headset with a boom microphone and two slanted white pill eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#0B0B0B',
    '#F6F6F3',
    { dim: '#050505', soft: '#2A2A2A', blush: '#3A2A30', angry: '#7A1F1F', alert: '#D9A526', off: '#3A3A3A' },
    '#7C8B85',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
