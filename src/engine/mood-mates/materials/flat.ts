import { el, ringPath, shade } from '../util';
import type { Material, MaterialContext, MaterialInstance } from './types';

export const flat: Material = {
  create(ctx: MaterialContext): MaterialInstance {
    const head = el('path', { d: ringPath(ctx.headRing), stroke: 'none', 'stroke-width': '2' });
    let curColor = '';
    let sketching = false;

    function setColor(color: string): void {
      curColor = color;
      if (!sketching) head.setAttribute('fill', color);
    }

    function setSketch(on: boolean, color: string): void {
      sketching = on;
      if (on) {
        head.setAttribute('fill', 'none');
        head.style.stroke = `var(--sketch-ink, ${shade(color, -0.6)})`;
        head.setAttribute('stroke-opacity', '0.85');
      } else {
        head.setAttribute('fill', curColor || color);
        head.style.stroke = '';
        head.removeAttribute('stroke-opacity');
      }
    }

    return { setColor, setSketch, body: () => [head] };
  },
};
