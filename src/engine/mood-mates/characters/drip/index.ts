import type { SolidSpec } from '../../solid/spec';
import { palette, rimCharacter, rimEyes } from '../rim';
import { DRIP_RADII } from './radii';

const SCALE = 96;
const CENTER: [number, number] = [120, 114];
const FIT = SCALE / 107.535;
const EYES_X = 0.0016;
const EYES_Y = -0.22;
const KNOTS = 241;

function traced(degrees: number): number {
  const n = DRIP_RADII.length;
  const u = ((((degrees % 360) + 360) % 360) / 360) * n;
  const i = Math.floor(u);
  const t = u - i;
  return (DRIP_RADII[i % n] as number) * (1 - t) + (DRIP_RADII[(i + 1) % n] as number) * t;
}

const PROFILE = Array.from({ length: KNOTS }, (_, k) => {
  const degrees = (180 * k) / (KNOTS - 1);
  return (traced(90 - degrees) + traced(90 + degrees)) / 2;
});

const SPEC: SolidSpec = {
  body: {
    ribs: 4,
    sharp: [1, 1],
    radius: PROFILE,
    skirt: [0.0001, 0.0001],
    join: 1,
    depth: [0, 0],
  },
  tint: { top: ['#FFFFFF', 0.55], bottom: ['#A5F0CC', 0.6] },
  rest: { yaw: 0, pitch: 0.05, roll: 0 },
  scale: SCALE,
  stretch: [1, 1],
  center: CENTER,
  stemColor: '#000000',
  capColor: '#000000',
  edge: 0.06,
};

const RINGS = rimEyes({
  anchor: [CENTER[0] + EYES_X * SCALE, CENTER[1] + EYES_Y * SCALE],
  half: 14.2 * FIT,
  rx: 7.5 * FIT,
  ry: 12.5 * FIT,
  scale: 0.42,
  spread: 0.5,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 22,
  maxGrow: 1.25,
});

export const drip = rimCharacter({
  id: 'drip',
  name: 'Drip',
  desc: 'A pale mint bubble with two small oval eyes and a smooth drip tail hanging from its base, built as a soft solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#D4F8E7',
    '#0B0B0D',
    { dim: '#C2EBD9', soft: '#E6FBF2', blush: '#FBC9DA', angry: '#F5A3A3', alert: '#F7B4B4', off: '#B9CCC4' },
    '#7FCBA6',
  ),
  rings: RINGS,
});
