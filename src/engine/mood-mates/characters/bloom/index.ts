import { palette, radialRing, rimCharacter, rimEyes, rimSpec, smoothContour } from '../rim';
import { BLOOM_RADII } from './radii';

const UNIT = 100;
const SCALE = 70;
const CENTER: [number, number] = [120, 124];
const VALLEY_FLOOR = 0.72;
const VALLEY_KEEP = 0.4;
const CONTOUR_SIGMA = 7;

const RADII = BLOOM_RADII.map((r, i) => {
  const side = Math.max(0, Math.cos((4 * Math.PI * i) / BLOOM_RADII.length)) ** 1.5;
  const lifted = r < VALLEY_FLOOR ? VALLEY_FLOOR - (VALLEY_FLOOR - r) * VALLEY_KEEP : r;
  return r + (lifted - r) * side;
});

const SPEC = rimSpec({
  ring: smoothContour(radialRing(RADII, UNIT), CONTOUR_SIGMA),
  unit: UNIT,
  depth: 0.62,
  puff: 2.2,
  sigma: 36,
  edge: 3,
  tint: { top: ['#FFA874', 0.5], bottom: ['#D2502A', 0.55] },
  scale: SCALE,
  center: CENTER,
});

const RINGS = rimEyes({
  anchor: [CENTER[0] - 0.016 * SCALE, CENTER[1]],
  half: 12,
  rx: 8.5,
  ry: 13,
  scale: 0.5,
  spread: 0.5,
  reach: 0.1,
  aspect: 0.55,
  minHeight: 26,
  maxGrow: 1.25,
});

export const bloom = rimCharacter({
  id: 'bloom',
  name: 'Bloom',
  desc: 'A cheerful orange flower with eight petals of different lengths, two tall ones leaning up, and two round eyes, built as a puffy solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#EE7C45',
    '#2A1710',
    { dim: '#D96A35', soft: '#F59460', blush: '#F2697A', angry: '#D8402A', alert: '#E23A34', off: '#A9755A' },
    '#F6B48E',
  ),
  rings: RINGS,
});
