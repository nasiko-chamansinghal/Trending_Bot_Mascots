import { easeOutQuint } from './inertia';
import { easeInOutCubic } from './math';

function clamp(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const PALETTE = ['#FF5A5F', '#FFB547', '#2DD4BF', '#3B82F6', '#A855F7', '#84CC16'];
const OUTLINE = 'rgba(16, 16, 18, 0.3)';
const LEAVE_MS = 240;
const EDGE_STEPS = 72;
const LEARN_SCALE = 0.9;

export interface Bounds {
  cx: number;
  cy: number;
  r: number;
  edge: (angle: number) => number;
}

interface Instance {
  frame(t: number, color: string): void;
}

interface EffectDef {
  duration: number;
  still: number;
  build(layer: SVGGElement, bounds: Bounds, behind: SVGGElement): Instance;
}

function node<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const key in attrs) el.setAttribute(key, String(attrs[key]));
  parent.appendChild(el);
  return el;
}

function fraction(i: number): number {
  return (i * 0.618033988749895) % 1;
}

function pulse(t: number, index: number): number {
  const p = ((((t - index * 0.5) / 1.5) % 1) + 1) % 1;
  if (p > 0.7) return 0;
  const rise = p < 0.25 ? easeOutQuint(p / 0.25) : 1;
  const fall = p > 0.5 ? 1 - easeInOutCubic((p - 0.5) / 0.2) : 1;
  return rise * fall;
}

const loading: EffectDef = {
  duration: 3,
  still: 1.2,
  build(layer, b) {
    const dots = [0, 1, 2].map(() => node('circle', { stroke: OUTLINE }, layer));
    return {
      frame(t, color) {
        const collapse = clamp((t - 0.3) / 0.3);
        const centre = clamp((t - 0.25) / 0.25);
        const emerge = easeOutQuint(clamp((t - 0.3) / 0.5));
        const settled = clamp((t - 0.7) / 0.3);
        dots.forEach((dot, i) => {
          const k = pulse(t, i) * settled;
          const middle = i === 1;
          const side = (i - 1) * b.r * 0.46 * emerge;
          dot.setAttribute('cx', String(b.cx + side));
          dot.setAttribute('cy', String(b.cy));
          dot.setAttribute('r', String(b.r * (middle ? 0.14 : 0.1 * emerge) * (1 + 0.5 * k)));
          dot.setAttribute('fill', color);
          dot.setAttribute('stroke-width', String(b.r * 0.012));
          dot.setAttribute('stroke-opacity', String(collapse));
          dot.setAttribute('opacity', String(middle ? centre : (0.55 + 0.45 * k) * emerge));
        });
      },
    };
  },
};

const alert: EffectDef = {
  duration: 2.4,
  still: 0.9,
  build(layer, b) {
    const glyph = node('g', { stroke: OUTLINE, 'stroke-width': 0.012 }, layer);
    const bar = node('rect', { x: -0.085, y: -0.36, width: 0.17, height: 0.46, rx: 0.085 }, glyph);
    const dot = node('circle', { cx: 0, cy: 0.24, r: 0.095 }, glyph);
    return {
      frame(t, color) {
        const entry = clamp((t - 0.12) / 0.4);
        const pop = easeOutQuint(entry) + 0.12 * Math.sin(Math.PI * entry);
        const out = clamp((2.4 - t) / 0.25);
        const travel = easeInOutCubic(clamp(t / 1.5));
        const back = t > 1.6 ? clamp((t - 1.6) / 0.4) : 0;
        const reach = travel * (1 - back);
        const buzz = Math.sin(t * 2.5 * TAU) * 0.012;
        const x = b.cx + b.r * (0.8 * reach - 0.12);
        const y = b.cy - b.r * (0.04 + buzz);
        const scale = b.r * 1.15 * pop * (0.85 + 0.15 * out);
        glyph.setAttribute('transform', `translate(${x} ${y}) rotate(17.7) scale(${scale})`);
        glyph.setAttribute('opacity', String(out * clamp((t - 0.12) / 0.25)));
        bar.setAttribute('fill', color);
        dot.setAttribute('fill', color);
      },
    };
  },
};

const exclaim: EffectDef = {
  duration: Number.POSITIVE_INFINITY,
  still: 1,
  build(layer, b) {
    const glyph = node('g', { stroke: OUTLINE, 'stroke-width': 0.012 }, layer);
    const bar = node('rect', { x: -0.085, y: -0.4, width: 0.17, height: 0.5, rx: 0.085 }, glyph);
    const dot = node('circle', { cx: 0, cy: 0.27, r: 0.1 }, glyph);
    return {
      frame(t, color) {
        const entry = clamp((t - 0.1) / 0.4);
        const pop = easeOutQuint(entry) + 0.1 * Math.sin(Math.PI * entry);
        glyph.setAttribute('transform', `translate(${b.cx} ${b.cy - b.r * 0.04}) scale(${b.r * 1.15 * pop})`);
        glyph.setAttribute('opacity', String(clamp((t - 0.1) / 0.25)));
        bar.setAttribute('fill', color);
        dot.setAttribute('fill', color);
      },
    };
  },
};

const notify: EffectDef = {
  duration: 2.2,
  still: 0.6,
  build(layer, b) {
    const badge = node('circle', { fill: '#2F7BFF', style: 'stroke: var(--ground, #ffffff)' }, layer);
    const angle = (-42 * Math.PI) / 180;
    const reach = b.edge(angle) * 0.97;
    return {
      frame(t) {
        const p = clamp(t / 0.45);
        const pop = 1 + 0.14 * Math.sin(p * Math.PI) * (1 - p * 0.35);
        const enter = easeOutQuint(clamp(t / 0.2));
        const out = clamp((2.2 - t) / 0.2);
        badge.setAttribute('cx', String(b.cx + Math.cos(angle) * reach));
        badge.setAttribute('cy', String(b.cy + Math.sin(angle) * reach));
        badge.setAttribute('r', String(b.r * 0.15 * pop * enter));
        badge.setAttribute('stroke-width', String(b.r * 0.065));
        badge.setAttribute('opacity', String(out));
      },
    };
  },
};

interface ArcSeed {
  a: number;
  k: number;
  tilt: number;
  speed: number;
  phase: number;
  sweep: number;
  hue: number;
  hueSpan: number;
  width: number;
  cy: number;
}

const ARC_POINTS = 64;
const rnd = (n: number): number => fraction(n * 7 + 3);
const wheel = (hue: number): string => `hsl(${((hue % 360) + 360) % 360} 90% 58%)`;

const RING_SEEDS: ArcSeed[] = Array.from({ length: 6 }, (_, i) => ({
  a: 1.3 + rnd(i) * 0.1,
  k: 0.05 + rnd(i + 10) * 0.4,
  tilt: (i / 6) * Math.PI + rnd(i + 20) * 0.5,
  speed: 3 + rnd(i + 30) * 0.7,
  phase: rnd(i + 40) * TAU,
  sweep: 0.6 + rnd(i + 50) * 0.25,
  hue: (i * 360) / 6 + rnd(i + 60) * 30,
  hueSpan: 60 + rnd(i + 70) * 60,
  width: 0.05 + rnd(i + 80) * 0.012,
  cy: 0.1,
}));

const COMET_SEEDS: ArcSeed[] = Array.from({ length: 4 }, (_, i) => {
  const d = i - 1.5;
  return {
    a: 0.85 * (1 + d * 0.03),
    k: (0.15 / 0.85) * (1 + d * 0.16),
    tilt: (34 * Math.PI) / 180 + d * 0.035,
    speed: 210 / 360,
    phase: -i * 0.045 + rnd(i + 90) * 0.012,
    sweep: 0.34,
    hue: i * 85 + rnd(i + 100) * 20,
    hueSpan: 80,
    width: 0.095,
    cy: 0,
  };
});

const POWER_SEEDS: ArcSeed[] = Array.from({ length: 5 }, (_, i) => ({
  a: 1.25 + i * 0.08,
  k: 0.12 + (i % 2) * 0.15,
  tilt: (i * Math.PI) / 2.5,
  speed: 4.5,
  phase: i * 0.8,
  sweep: 0.45,
  hue: 45 + i * 15,
  hueSpan: 50,
  width: 0.06,
  cy: 0,
}));

const VORTEX_SEEDS: ArcSeed[] = RING_SEEDS.slice(0, 3).map((seed) => ({ ...seed, speed: 2.5 }));

let gradientId = 0;

function arcSet(layer: SVGGElement, behind: SVGGElement, b: Bounds, seeds: ArcSeed[]) {
  const defs = node('defs', {}, layer);
  const arcs = seeds.map((seed) => {
    const id = `fxarc${gradientId++}`;
    const reach = seed.a * b.r;
    const gx = Math.cos(seed.tilt) * reach;
    const gy = Math.sin(seed.tilt) * reach;
    const gradient = node(
      'linearGradient',
      {
        id,
        gradientUnits: 'userSpaceOnUse',
        x1: b.cx - gx,
        y1: b.cy + seed.cy * b.r - gy,
        x2: b.cx + gx,
        y2: b.cy + seed.cy * b.r + gy,
      },
      defs,
    );
    [0, 0.5, 1].forEach((stop) => {
      node('stop', { offset: stop, 'stop-color': wheel(seed.hue + seed.hueSpan * stop) }, gradient);
    });
    const style = {
      fill: 'none',
      stroke: `url(#${id})`,
      'stroke-width': seed.width * b.r,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    };
    return { front: node('path', style, layer), back: node('path', style, behind) };
  });
  return (t: number, alpha: (index: number) => number): void => {
    seeds.forEach((seed, i) => {
      const spin = seed.phase + t * seed.speed * TAU;
      const span = seed.sweep * TAU;
      const cu = Math.cos(seed.tilt);
      const su = Math.sin(seed.tilt);
      const kz = Math.sqrt(Math.max(0, 1 - seed.k * seed.k));
      let front = '';
      let back = '';
      let previous: boolean | null = null;
      for (let p = 0; p <= ARC_POINTS; p++) {
        const th = spin + (p / ARC_POINTS) * span;
        const ct = Math.cos(th);
        const st = Math.sin(th);
        const x = b.cx + seed.a * (ct * cu - st * su * seed.k) * b.r;
        const y = b.cy + (seed.a * (ct * su + st * cu * seed.k) + seed.cy) * b.r;
        const isBehind = seed.a * st * kz < 0;
        const command = isBehind !== previous ? 'M' : 'L';
        if (isBehind) back += `${command}${x.toFixed(1)} ${y.toFixed(1)}`;
        else front += `${command}${x.toFixed(1)} ${y.toFixed(1)}`;
        previous = isBehind;
      }
      const arc = arcs[i] as { front: SVGPathElement; back: SVGPathElement };
      const opacity = String(alpha(i));
      arc.front.setAttribute('d', front);
      arc.back.setAttribute('d', back);
      arc.front.setAttribute('opacity', opacity);
      arc.back.setAttribute('opacity', opacity);
    });
  };
}

const comet: EffectDef = {
  duration: 2.4,
  still: 0.9,
  build(layer, b, behind) {
    const draw = arcSet(layer, behind, b, COMET_SEEDS);
    return {
      frame(t) {
        const fade = clamp((t - 0.15) / 0.25) * clamp((1.95 - t) / 0.3);
        draw(t, () => fade);
      },
    };
  },
};

const orbit: EffectDef = {
  duration: 3.6,
  still: 0.9,
  build(layer, b, behind) {
    const draw = arcSet(layer, behind, b, RING_SEEDS);
    return {
      frame(t) {
        const fade = clamp(t / 0.8) * clamp((3.6 - t) / 0.9);
        draw(t, (i) => fade * clamp((t - i * 0.13) / 0.3));
      },
    };
  },
};

const power: EffectDef = {
  duration: Number.POSITIVE_INFINITY,
  still: 0.5,
  build(layer, b, behind) {
    const draw = arcSet(layer, behind, b, POWER_SEEDS);
    return {
      frame(t) {
        draw(t, (i) => 0.85 + 0.15 * Math.sin(t * 10 + i));
      },
    };
  },
};

const vortex: EffectDef = {
  duration: Number.POSITIVE_INFINITY,
  still: 0.6,
  build(layer, b, behind) {
    const draw = arcSet(layer, behind, b, VORTEX_SEEDS);
    return {
      frame(t) {
        draw(t, () => 0.7);
      },
    };
  },
};

const FLAME = ['#ffffff', '#fbbf24', '#ef4444'];

const rocket: EffectDef = {
  duration: 2.6,
  still: 0.7,
  build(layer, b) {
    const puffs = Array.from({ length: 7 }, () => node('circle', {}, layer));
    return {
      frame(t) {
        const lift = -0.25 * b.r * Math.sin(Math.PI * (t / 2.6));
        puffs.forEach((puff, i) => {
          const phase = (t * 4 + i / 7) % 1;
          const x = Math.sin(i * 3 + t * 10) * 0.18 * (1 - phase * 0.4);
          puff.setAttribute('cx', String(b.cx + x * b.r));
          puff.setAttribute('cy', String(b.cy + lift + (1.1 + phase * 0.9) * b.r));
          puff.setAttribute('r', String(0.16 * (1 - phase * 0.7) * b.r));
          puff.setAttribute('fill', FLAME[phase < 0.3 ? 0 : phase < 0.6 ? 1 : 2] as string);
          puff.setAttribute('opacity', String(clamp((1 - phase) * 1.4)));
        });
      },
    };
  },
};

const BARS = 8;

const dj: EffectDef = {
  duration: Number.POSITIVE_INFINITY,
  still: 0.4,
  build(layer, b) {
    const bars = Array.from({ length: BARS }, () => node('rect', { rx: 0 }, layer));
    return {
      frame(t) {
        const width = b.r * 0.1;
        bars.forEach((bar, i) => {
          const x = ((i - (BARS - 1) / 2) / (BARS / 2)) * 0.8;
          const h = 0.2 + 0.4 * Math.abs(Math.sin(t * 6 + i * 1.2));
          const height = h * b.r * 0.7;
          bar.setAttribute('x', String(b.cx + x * b.r - width / 2));
          bar.setAttribute('y', String(b.cy + 1.32 * b.r - height));
          bar.setAttribute('width', String(width));
          bar.setAttribute('height', String(height));
          bar.setAttribute('rx', String(width / 2));
          bar.setAttribute('fill', wheel(i * 35 + t * 60));
        });
      },
    };
  },
};

const HEART =
  'M0,-0.3 C-0.3,-0.6 -0.6,-0.3 -0.6,0.05 C-0.6,0.45 0,0.8 0,0.9 C0,0.8 0.6,0.45 0.6,0.05 C0.6,-0.3 0.3,-0.6 0,-0.3 Z';
const HEARTS = 6;

const love: EffectDef = {
  duration: Number.POSITIVE_INFINITY,
  still: 0.5,
  build(layer, b) {
    const hearts = Array.from({ length: HEARTS }, (_, i) =>
      node('path', { d: HEART, fill: i % 2 === 0 ? '#ff2a6d' : '#ff758c' }, layer),
    );
    return {
      frame(t) {
        hearts.forEach((heart, i) => {
          const p = (t * 1.2 + i / HEARTS) % 1;
          const y = (1 - p * 2.2) * 0.8;
          const x = Math.sin(p * TAU * 1.5 + i) * 0.45 * (0.4 + 0.6 * p);
          const size = (0.12 + 0.04 * Math.sin(i * 2)) * b.r * 2;
          heart.setAttribute('transform', `translate(${b.cx + x * b.r} ${b.cy + y * b.r}) scale(${size})`);
          heart.setAttribute('opacity', String(clamp(Math.sin(p * Math.PI) * 1.5)));
        });
      },
    };
  },
};

const PARTICLES = 16;

const burst: EffectDef = {
  duration: 2.6,
  still: 0.45,
  build(layer, b) {
    const ring = node('circle', { fill: 'none', stroke: 'currentColor' }, layer);
    const sparks = Array.from({ length: PARTICLES }, (_, i) =>
      node('circle', { fill: PALETTE[i % PALETTE.length] as string }, layer),
    );
    return {
      frame(t) {
        const e = easeOutQuint(clamp(t / 0.9));
        const life = 1 - clamp((t - 0.4) / 1);
        const wave = clamp(t / 0.7);
        ring.setAttribute('cx', String(b.cx));
        ring.setAttribute('cy', String(b.cy));
        ring.setAttribute('r', String(b.r * (0.6 + easeOutQuint(wave))));
        ring.setAttribute('stroke-width', String(b.r * 0.03));
        ring.setAttribute('opacity', String(1 - wave));
        sparks.forEach((spark, i) => {
          const angle = (i / PARTICLES) * TAU + (i % 2) * 0.2;
          const speed = 0.8 + 0.6 * fraction(i + 1);
          const reach = b.r * (0.45 + 1.1 * speed * e);
          spark.setAttribute('cx', String(b.cx + Math.cos(angle) * reach));
          spark.setAttribute('cy', String(b.cy + Math.sin(angle) * reach));
          spark.setAttribute('r', String(b.r * 0.08 * life * (0.6 + 0.4 * fraction(i + 3))));
          spark.setAttribute('opacity', String(life));
        });
      },
    };
  },
};

const EFFECTS: Record<string, EffectDef> = {
  loading,
  alert,
  exclaim,
  notify,
  comet,
  burst,
  orbit,
  power,
  vortex,
  rocket,
  dj,
  love,
};

const SHAPES = 'path, circle, ellipse, rect, polygon';
const measured = new Map<string, Bounds>();

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function fallback(svg: SVGSVGElement): Bounds {
  const view = svg.viewBox.baseVal;
  const r = view.width * 0.3;
  return { cx: view.x + view.width / 2, cy: view.y + view.height / 2, r, edge: () => r };
}

function bodyShapes(svg: SVGSVGElement, ignored: Element[]): SVGGeometryElement[] {
  const candidates = [...svg.querySelectorAll<SVGGeometryElement>(SHAPES)].filter(
    (el) => !ignored.some((layer) => layer.contains(el)) && !el.closest('defs, clipPath, mask'),
  );
  const rects = candidates.map((el) => el.getBoundingClientRect());
  const tallest = Math.max(0, ...rects.map((r) => r.height));
  const largest = Math.max(0, ...rects.map((r) => r.width * r.height));
  return candidates.filter(
    (_, i) =>
      (rects[i] as DOMRect).height >= tallest * 0.3 &&
      (rects[i] as DOMRect).width * (rects[i] as DOMRect).height >= largest * 0.05,
  );
}

function measure(svg: SVGSVGElement, ignored: Element[]): Bounds | null {
  const shapes = bodyShapes(svg, ignored);
  const screen = svg.getScreenCTM();
  if (!shapes.length || !screen) return null;
  const toSvg = screen.inverse();
  const box: Box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (const el of shapes) {
    const rect = el.getBoundingClientRect();
    const a = new DOMPoint(rect.left, rect.top).matrixTransform(toSvg);
    const c = new DOMPoint(rect.right, rect.bottom).matrixTransform(toSvg);
    box.left = Math.min(box.left, a.x, c.x);
    box.top = Math.min(box.top, a.y, c.y);
    box.right = Math.max(box.right, a.x, c.x);
    box.bottom = Math.max(box.bottom, a.y, c.y);
  }
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  if (!(width > 0 && height > 0)) return null;
  const cx = box.left + width / 2;
  const cy = box.top + height / 2;
  const r = Math.min(width, height) / 2;
  const inside = (x: number, y: number): boolean =>
    shapes.some((el) => {
      const own = el.getScreenCTM();
      if (!own || typeof el.isPointInFill !== 'function') return false;
      return el.isPointInFill(new DOMPoint(x, y).matrixTransform(own.inverse().multiply(screen)));
    });
  const edges = Array.from({ length: EDGE_STEPS }, (_, i) => {
    const angle = (i / EDGE_STEPS) * TAU;
    for (let rho = Math.max(width, height) * 0.75; rho > r * 0.2; rho -= r * 0.02) {
      if (inside(cx + Math.cos(angle) * rho, cy + Math.sin(angle) * rho)) return rho;
    }
    return r;
  });
  const edge = (angle: number): number => {
    const turns = (((angle / TAU) % 1) + 1) % 1;
    return edges[Math.round(turns * EDGE_STEPS) % EDGE_STEPS] as number;
  };
  return { cx, cy, r, edge };
}

interface Running {
  group: SVGGElement;
  behind: SVGGElement;
  instance: Instance;
  duration: number;
  startedAt: number;
  still: number;
}

interface Leaving {
  running: Running;
  leftAt: number;
}

export class Effects {
  private readonly svg: SVGSVGElement;
  private readonly key: string;
  private readonly layer: SVGGElement;
  private readonly behindLayer: SVGGElement;
  private pending: { id: string; startedAt: number } | null = null;
  private current: Running | null = null;
  private leaving: Leaving[] = [];

  constructor(svg: SVGSVGElement, key: string) {
    this.svg = svg;
    this.key = key;
    this.layer = document.createElementNS(NS, 'g');
    this.layer.setAttribute('pointer-events', 'none');
    this.behindLayer = document.createElementNS(NS, 'g');
    this.behindLayer.setAttribute('pointer-events', 'none');
    const defs = svg.querySelector(':scope > defs');
    svg.insertBefore(this.behindLayer, defs ? defs.nextSibling : svg.firstChild);
    svg.appendChild(this.layer);
  }

  play(id: string | undefined, now: number): void {
    if (this.current) this.leaving.push({ running: this.current, leftAt: now });
    this.current = null;
    this.pending = id && EFFECTS[id] ? { id, startedAt: now } : null;
  }

  frame(now: number, color: string, scale: number): void {
    this.learn(scale);
    this.build();
    if (this.current) {
      const seconds = (now - this.current.startedAt) / 1000;
      this.current.instance.frame(seconds % this.current.duration, color);
    }
    this.leaving = this.leaving.filter((item) => {
      const fade = clamp((now - item.leftAt) / LEAVE_MS);
      if (fade >= 1) {
        item.running.group.remove();
        item.running.behind.remove();
        return false;
      }
      const seconds = (now - item.running.startedAt) / 1000;
      item.running.instance.frame(seconds % item.running.duration, color);
      const opacity = String(1 - easeOutQuint(fade));
      item.running.group.setAttribute('opacity', opacity);
      item.running.behind.setAttribute('opacity', opacity);
      return true;
    });
  }

  still(color: string, scale: number): void {
    this.learn(scale);
    this.build();
    for (const item of this.leaving) {
      item.running.group.remove();
      item.running.behind.remove();
    }
    this.leaving = [];
    if (this.current) this.current.instance.frame(this.current.still, color);
  }

  destroy(): void {
    this.layer.remove();
    this.behindLayer.remove();
    this.current = null;
    this.leaving = [];
  }

  private learn(scale: number): void {
    if (measured.has(this.key) || scale < LEARN_SCALE) return;
    const found = measure(this.svg, [this.layer, this.behindLayer]);
    if (found) measured.set(this.key, found);
  }

  private build(): void {
    if (!this.pending) return;
    const def = EFFECTS[this.pending.id] as EffectDef;
    const group = document.createElementNS(NS, 'g');
    const behind = document.createElementNS(NS, 'g');
    this.layer.appendChild(group);
    this.behindLayer.appendChild(behind);
    this.current = {
      group,
      behind,
      instance: def.build(group, measured.get(this.key) ?? fallback(this.svg), behind),
      duration: def.duration,
      startedAt: this.pending.startedAt,
      still: def.still,
    };
    this.pending = null;
  }
}
