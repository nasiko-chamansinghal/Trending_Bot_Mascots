import type { PropDef } from './types';
import { el, r2, shade } from './util';

export interface PropPaint {
  body: string;
  eye: string;
  sketch: boolean;
}

export interface PropsLayer {
  apply: (values: Record<string, number>, paint: PropPaint) => void;
}

interface PropNode {
  def: PropDef;
  node: SVGGElement;
  update: (v: Record<string, number>, id: string, paint: PropPaint) => void;
}

const SKETCH_WIDTH = '2.4';

function resolveColor(color: string | undefined, paint: PropPaint, fallback: string): string {
  if (color === 'body') return paint.body;
  if (color === 'eye') return paint.eye;
  return color || fallback;
}

function sketchInk(color: string): string {
  return `var(--sketch-ink, ${shade(color, -0.6)})`;
}

function paintShape(shape: SVGElement, color: string, sketch: boolean): void {
  if (sketch) {
    shape.setAttribute('fill', 'none');
    shape.style.stroke = sketchInk(color);
    shape.setAttribute('stroke-width', SKETCH_WIDTH);
  } else {
    shape.setAttribute('fill', color);
    shape.style.stroke = '';
    shape.removeAttribute('stroke-width');
  }
}

function dotRow(node: SVGGElement) {
  const dots = [0, 1, 2].map(() => el('circle', {}));
  for (const d of dots) node.appendChild(d);
  return (v: Record<string, number>, id: string, w: number, color: string, sketch: boolean) => {
    const r = v[`${id}R`] || 0;
    const gap = v[`${id}G`] ?? w * 0.23;
    dots.forEach((d, i) => {
      d.setAttribute('cx', String(r2((i - 1) * gap)));
      d.setAttribute('cy', String(r2(v[`${id}D${i}`] || 0)));
      d.setAttribute('r', String(r2(r)));
      d.setAttribute('opacity', String(r2(v[`${id}P${i}`] ?? 1)));
      paintShape(d, color, sketch);
    });
  };
}

function box(def: PropDef): PropNode {
  const rect = el('rect', {});
  const node = el('g', { opacity: '0' });
  node.appendChild(rect);
  return {
    def,
    node,
    update(v, id, paint) {
      const w = v[`${id}W`] || 0;
      const h = v[`${id}H`] || 0;
      rect.setAttribute('x', String(r2(-w / 2)));
      rect.setAttribute('y', String(r2(-h / 2)));
      rect.setAttribute('width', String(r2(w)));
      rect.setAttribute('height', String(r2(h)));
      rect.setAttribute('rx', String(r2(Math.min(w, h) * (v[`${id}C`] ?? def.radius ?? 0.18))));
      const color = resolveColor(def.color, paint, '#050505');
      const dark = v[`${id}L`] || 0;
      paintShape(rect, dark > 0 ? shade(color, -dark) : color, paint.sketch);
    },
  };
}

function glyph(def: PropDef): PropNode {
  const text = el('text', {
    'stroke-linejoin': 'round',
    'font-family': "'Space Grotesk', 'Noto Sans SC', sans-serif",
    'font-weight': def.weight || '800',
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
  });
  text.textContent = def.text || 'Z';
  const node = el('g', { opacity: '0' });
  node.appendChild(text);
  return {
    def,
    node,
    update(v, id, paint) {
      const size = v[`${id}S`] || 0;
      const color = resolveColor(def.color, paint, '#050505');
      text.setAttribute('font-size', String(r2(size)));
      text.setAttribute('fill', paint.sketch ? 'none' : color);
      text.style.stroke = paint.sketch ? sketchInk(color) : color;
      text.setAttribute('stroke-width', String(r2(paint.sketch ? size * 0.05 : size * 0.07)));
    },
  };
}

function bubble(def: PropDef): PropNode {
  const body = el('path', {});
  const node = el('g', { opacity: '0' });
  node.appendChild(body);
  const dots = dotRow(node);
  return {
    def,
    node,
    update(v, id, paint) {
      const w = v[`${id}W`] || 0;
      const h = v[`${id}H`] || 0;
      const r = Math.min(w, h) * 0.3;
      const x0 = -w / 2;
      const y0 = -h / 2;
      const tail = h * 0.2;
      const tx = x0 + w * 0.16;
      body.setAttribute(
        'd',
        `M${r2(x0 + r)} ${r2(y0)}H${r2(x0 + w - r)}Q${r2(x0 + w)} ${r2(y0)} ${r2(x0 + w)} ${r2(y0 + r)}V${r2(y0 + h - r)}Q${r2(x0 + w)} ${r2(y0 + h)} ${r2(x0 + w - r)} ${r2(y0 + h)}H${r2(tx + tail * 0.9)}L${r2(tx - tail * 0.1)} ${r2(y0 + h + tail)}L${r2(tx)} ${r2(y0 + h)}H${r2(x0 + r)}Q${r2(x0)} ${r2(y0 + h)} ${r2(x0)} ${r2(y0 + h - r)}V${r2(y0 + r)}Q${r2(x0)} ${r2(y0)} ${r2(x0 + r)} ${r2(y0)}Z`,
      );
      const color = resolveColor(def.color, paint, '#0d0d0d');
      paintShape(body, color, paint.sketch);
      dots(v, id, w, resolveColor(def.dotColor, paint, '#FFFFFF'), paint.sketch);
    },
  };
}

const BUILDERS: Record<string, (def: PropDef) => PropNode> = { box, glyph, bubble };

export function createProps(defs: PropDef[], layer: SVGGElement): PropsLayer {
  const nodes: PropNode[] = [];
  for (const def of defs) {
    const builder = BUILDERS[def.kind];
    if (!builder) continue;
    const built = builder(def);
    layer.appendChild(built.node);
    nodes.push(built);
  }
  return {
    apply(values, paint) {
      for (const n of nodes) {
        const id = n.def.id;
        const op = values[`${id}O`] || 0;
        if (op <= 0.001) {
          if (n.node.getAttribute('opacity') !== '0') n.node.setAttribute('opacity', '0');
          continue;
        }
        n.node.setAttribute('opacity', String(r2(op)));
        n.node.setAttribute(
          'transform',
          `translate(${r2(values[`${id}X`] || 0)} ${r2(values[`${id}Y`] || 0)})${values[`${id}A`] ? ` rotate(${r2(values[`${id}A`] as number)})` : ''}`,
        );
        n.update(values, id, paint);
      }
    },
  };
}
