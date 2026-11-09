import { type Point, roundedOutline } from '../../geometry';
import { palette, rimCharacter, rimEyes, rimSpec } from '../rim';

const UNIT = 100;
const SQUASH = 0.94;
const TILT = (-7 * Math.PI) / 180;
const CORNER = 0.3;

function outline(): Point[] {
  const corners = Array.from({ length: 6 }, (_, i): Point => {
    const a = (Math.PI / 3) * i;
    const x = Math.cos(a);
    const y = Math.sin(a) * SQUASH;
    return [
      (x * Math.cos(TILT) - y * Math.sin(TILT)) * UNIT,
      (x * Math.sin(TILT) + y * Math.cos(TILT)) * UNIT,
    ];
  });
  return roundedOutline(corners, CORNER * UNIT, 14, 2);
}

const SPEC = rimSpec({
  ring: outline(),
  unit: UNIT,
  depth: 0.8,
  puff: 2.3,
  sigma: 28,
  edge: 4,
  tint: { top: ['#5B5E7E', 0.55], bottom: ['#0A0A12', 0.6] },
  scale: 66,
  center: [120, 124],
});

const RINGS = rimEyes({
  anchor: [121, 120],
  half: 17,
  rx: 9,
  ry: 14,
  scale: 0.62,
  spread: 0.7,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 32,
});

export const hexo = rimCharacter({
  id: 'hexo',
  name: 'Hexo',
  desc: 'A glossy dark rounded hexagon with two bright eyes, built as a chunky solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#2E3040',
    '#F4F0E8',
    { dim: '#1F2030', soft: '#3E4158', blush: '#4B3546', angry: '#5C2228', alert: '#6E1F2C', off: '#4A4B56' },
    '#6B6E8C',
  ),
  rings: RINGS,
});
