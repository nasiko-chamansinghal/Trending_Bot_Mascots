import type { LimbSpec } from '../../solid/model';
import type { SolidSpec } from '../../solid/spec';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';
import { HEAD, PETALS, type Petal } from './petals';

const UNIT = 100;
const SCALE = 74;
const CENTER: [number, number] = [120, 112.7];
const FIT = 0.98;
const PETAL_DEPTH = -0.35;
const PETAL_KNOTS = 64;
const EYES_X = 9;
const EYES_Y = -17.05;

function petalLimb(p: Petal): LimbSpec {
  const rad = (p.angle * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = -Math.sin(rad);
  const half = p.halfWidth / HEAD.a;
  const knots = Array.from({ length: PETAL_KNOTS + 1 }, (_, k): [number, number, number] => {
    const t = k / PETAL_KNOTS;
    const r = half * Math.sin(Math.PI * t ** p.shape) ** p.round;
    return [t, r, r];
  });
  return {
    side: ux < 0 ? -1 : 1,
    base: [(p.x - HEAD.cx) / HEAD.a, -(p.y - HEAD.cy) / HEAD.a, PETAL_DEPTH],
    length: p.length / HEAD.a,
    angle: (Math.atan2(uy, Math.abs(ux)) * 180) / Math.PI,
    bend: 0,
    radius: knots,
  };
}

const HEAD_RING = Array.from({ length: 241 }, (_, i): [number, number] => {
  const t = (2 * Math.PI * i) / 241;
  return [Math.cos(t) * UNIT, Math.sin(t) * UNIT * (HEAD.b / HEAD.a)];
});

const SPEC: SolidSpec = {
  ...rimSpec({
    ring: HEAD_RING,
    unit: UNIT,
    depth: 0.7,
    puff: 2.2,
    sigma: 28,
    edge: 0,
    tint: { top: ['#E6F5FF', 0.55], bottom: ['#1E7FE0', 0.55] },
    scale: SCALE,
    center: CENTER,
  }),
  limbs: PETALS.map(petalLimb),
};

const RINGS = rimEyes({
  anchor: [CENTER[0] + EYES_X * FIT, CENTER[1] + EYES_Y * FIT],
  half: 17,
  rx: 12.9,
  ry: 23,
  scale: 0.62,
  spread: 0.62,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 30,
  maxGrow: 1.25,
});

export const jelo = rimCharacter({
  id: 'jelo',
  name: 'Jelo',
  desc: 'A glossy blue jelly dome with two tall oval eyes and five leaf-shaped tentacles tucked behind it, built as a soft solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#5DB8F7',
    '#FFFFFF',
    { dim: '#4AA3E6', soft: '#8ACBFA', blush: '#F5A3C7', angry: '#E8607A', alert: '#E5546F', off: '#8FA6BC' },
    '#A9D8FB',
  ),
  rings: RINGS,
});
