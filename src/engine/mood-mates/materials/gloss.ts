import { el, r2, ringPath, shade } from '../util';
import type { Material, MaterialContext, MaterialInstance } from './types';

export const gloss: Material = {
  create(ctx: MaterialContext): MaterialInstance {
    const { id, defs, headRing, palette, silMinY, silMaxY, silMaxW } = ctx;
    const C = 120;

    const grad = el('radialGradient', { id: `${id}g`, cx: '36%', cy: '26%', r: '86%' });
    const stops = [
      el('stop', { offset: '0%' }),
      el('stop', { offset: '38%' }),
      el('stop', { offset: '78%' }),
      el('stop', { offset: '100%' }),
    ] as [SVGStopElement, SVGStopElement, SVGStopElement, SVGStopElement];
    for (const s of stops) grad.appendChild(s);
    defs.appendChild(grad);

    const glossGrad = el('radialGradient', { id: `${id}gl`, cx: '50%', cy: '42%', r: '58%' });
    glossGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '0.9' }));
    glossGrad.appendChild(el('stop', { offset: '68%', 'stop-color': '#FFFFFF', 'stop-opacity': '0.22' }));
    glossGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#FFFFFF', 'stop-opacity': '0' }));
    defs.appendChild(glossGrad);

    const head = el('path', {
      d: ringPath(headRing),
      fill: `url(#${id}g)`,
      stroke: 'none',
      'stroke-width': '2',
    });

    const glossAmt = palette.gloss != null ? palette.gloss : 0.3;
    let glossWrap: SVGGElement | null = null;
    let gloss: SVGEllipseElement | null = null;
    let ao: SVGPathElement | null = null;
    let curColor: string | null = null;

    function setColor(color: string): void {
      if (color === curColor) return;
      curColor = color;
      stops[0].setAttribute('stop-color', shade(color, 0.42));
      stops[1].setAttribute('stop-color', shade(color, 0.14));
      stops[2].setAttribute('stop-color', color);
      stops[3].setAttribute('stop-color', shade(color, -0.22));
    }

    function setSketch(on: boolean, color: string): void {
      if (on) {
        head.setAttribute('fill', 'none');
        head.setAttribute('stroke', 'none');
        head.style.stroke = `var(--sketch-ink, ${shade(color, -0.6)})`;
        head.setAttribute('stroke-opacity', '0.85');
        if (gloss) gloss.style.display = 'none';
        if (ao) ao.style.display = 'none';
      } else {
        head.setAttribute('fill', `url(#${id}g)`);
        head.setAttribute('stroke', 'none');
        head.style.stroke = '';
        head.removeAttribute('stroke-opacity');
        if (gloss) gloss.style.display = '';
        if (ao) ao.style.display = '';
      }
    }

    function body(): SVGElement[] {
      const nodes: SVGElement[] = [head];
      if (glossAmt > 0) {
        const glossClip = el('clipPath', { id: `${id}bc`, clipPathUnits: 'userSpaceOnUse' });
        glossClip.appendChild(el('path', { d: ringPath(headRing) }));
        defs.appendChild(glossClip);
        glossWrap = el('g', { 'clip-path': `url(#${id}bc)`, 'pointer-events': 'none' });
        gloss = el('ellipse', {
          cx: r2(C - silMaxW * 0.17),
          cy: r2(silMinY + (silMaxY - silMinY) * 0.2),
          rx: r2(silMaxW * 0.15),
          ry: r2((silMaxY - silMinY) * 0.1),
          fill: `url(#${id}gl)`,
          opacity: String(glossAmt),
          transform: `rotate(-24 ${r2(C - silMaxW * 0.17)} ${r2(silMinY + (silMaxY - silMinY) * 0.2)})`,
        });
        glossWrap.appendChild(gloss);
        nodes.push(glossWrap);
      }
      const aoGrad = el('linearGradient', { id: `${id}ao`, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
      aoGrad.appendChild(el('stop', { offset: '58%', 'stop-color': '#000000', 'stop-opacity': '0' }));
      aoGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#000000', 'stop-opacity': '0.14' }));
      defs.appendChild(aoGrad);
      ao = el('path', { d: ringPath(headRing), fill: `url(#${id}ao)`, 'pointer-events': 'none' });
      nodes.push(ao);
      return nodes;
    }

    return { setColor, setSketch, body };
  },
};
