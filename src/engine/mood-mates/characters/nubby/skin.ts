import type { Skin } from '../../fx';
import { el } from '../../util';

function block(color: string): SVGElement {
  return el('rect', { x: -1, y: -1, width: 2, height: 2, rx: 0.42, fill: color, class: 'mm-spark' });
}

export const blockpop: Skin = {
  colors: ['#488A51', '#6FBD7B', '#F2FAF3', '#D781CB'],
  orbitSize: [2.6, 4.2],
  burstSize: [3, 5.6],
  makeOrbitNode: block,
  makeBurstNode: block,
};
