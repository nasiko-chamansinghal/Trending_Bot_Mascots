import type { EyePair, Point } from '../../geometry';
import { normalizeRing } from '../grok-rings';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { type TraceFrame, tracedBodyRing, tracedPolygon, traceFit, traceView } from '../traced';
import { LIMEY_RADII } from './radii';

const UNIT = 100;
const ARC_POINTS = 32;
const WALL_POINTS = 24;
const FRAME: TraceFrame = { origin: [223, 197.5], reach: 182.2, center: [120, 130], scale: 112 };
const FIT = traceFit(FRAME);
const view = traceView(FRAME);

const EYE_CENTRES: Array<[number, number]> = [
  [219.4, 173.5],
  [292.7, 173.5],
];
const EYE_HALF_WIDTH = 26.3;
const EYE_HALF_HEIGHT = 56;
const NOTCH_TOP = -18.5;
const NOTCH_BOTTOM = -0.5;
const NOTCH_APEX: [number, number] = [4.5, -9.5];

function notchedPill([cx, cy]: [number, number]): number[] {
  const rx = EYE_HALF_WIDTH;
  const straight = EYE_HALF_HEIGHT - rx;
  const points: Array<[number, number]> = [];
  const arc = (centreY: number, from: number, to: number) => {
    for (let i = 0; i < ARC_POINTS; i++) {
      const t = from + ((to - from) * i) / ARC_POINTS;
      points.push([cx + rx * Math.cos(t), centreY + rx * Math.sin(t)]);
    }
  };
  const wall = (x: number, from: number, to: number) => {
    for (let i = 0; i < WALL_POINTS; i++) {
      points.push([x, cy + from + ((to - from) * i) / WALL_POINTS]);
    }
  };
  arc(cy + straight, 0, Math.PI);
  wall(cx - rx, straight, NOTCH_BOTTOM);
  points.push(
    [cx - rx, cy + NOTCH_BOTTOM],
    [cx + NOTCH_APEX[0], cy + NOTCH_APEX[1]],
    [cx - rx, cy + NOTCH_TOP],
  );
  wall(cx - rx, NOTCH_TOP, -straight);
  arc(cy - straight, Math.PI, 2 * Math.PI);
  return points.flat();
}

const BODY = rimSpec({
  ring: tracedBodyRing(LIMEY_RADII, UNIT),
  unit: UNIT,
  depth: 0.8,
  puff: 2.2,
  sigma: 3,
  edge: 0,
  tint: { top: ['#E2FF9E', 0.25], bottom: ['#5FA318', 0.3] },
  scale: FRAME.scale,
  center: FRAME.center,
});

const [LEFT, RIGHT] = EYE_CENTRES.map(([x, y]) => view(x, y)) as [Point, Point];

const GROK = rimEyes({
  anchor: [(LEFT[0] + RIGHT[0]) / 2, (LEFT[1] + RIGHT[1]) / 2],
  half: (RIGHT[0] - LEFT[0]) / 2,
  rx: EYE_HALF_WIDTH * FIT,
  ry: EYE_HALF_HEIGHT * FIT,
  scale: 0.45,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 24,
  maxGrow: 1.25,
});

const FACE: Record<string, EyePair> = {
  ...GROK,
  calm: EYE_CENTRES.map((eye) =>
    normalizeRing(tracedPolygon(notchedPill(eye), FRAME), 192, false),
  ) as EyePair,
};

export const limey = rimCharacter({
  id: 'limey',
  name: 'Limey',
  desc: 'A glowing lime-green ghost with a round head, a zigzag sawtooth hem and two tall pill eyes, built as a solid that turns in 3D',
  spec: BODY,
  palette: palette(
    '#A6EE4C',
    '#07150A',
    { dim: '#86C23C', soft: '#C6F680', blush: '#E4F28A', angry: '#E2553A', alert: '#F5C842', off: '#8FA37C' },
    '#D4FA90',
  ),
  rings: FACE,
  fear: [1.1, 1.1],
});
