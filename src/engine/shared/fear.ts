import { hexToRgb, rgbToHex } from './math';
import { clamp, el, type Point, type Ring } from './util';

type Hsl = [number, number, number];

const TAU = Math.PI * 2;
const WASH_HSL: Hsl = [258, 0.52, 0.5];
const WASH_FLOOR = 0.42;
const WASH_STOPS = 9;
const WASH_REACH = 0.9;
const WASH_SOLID = 0.3;
const WASH_OPACITY = 0.96;
const NEUTRAL_SPREAD = 0.08;
const LINE_COLOR = '#8E87A6';
const WAVE_STEPS = 24;
const WAVE_TURNS = 2.5;
const BAND_SAMPLES = 12;
const LINES = [
  { gap: 0.045, from: 0.14, to: 0.46, phase: 0 },
  { gap: 0.1, from: 0.2, to: 0.52, phase: 2.1 },
];

function toHsl(hex: string): Hsl & { spread: number } {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return Object.assign([0, 0, l] as Hsl, { spread: 0 });
  const s = d / (1 - Math.abs(2 * l - 1));
  const sector = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Object.assign([sector * 60, s, l] as Hsl, { spread: d });
}

function fromHsl([h, s, l]: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const channel = (n: number): number => {
    const k = (n + h / 30) % 12;
    return 255 * (l - (c / 2) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return rgbToHex(channel(0), channel(8), channel(4));
}

function smooth(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function washColor(base: Hsl & { spread: number }, k: number): string {
  const [ph, ps, pl] = WASH_HSL;
  const hue = base.spread < NEUTRAL_SPREAD ? ph : base[0];
  const gap = ((((hue - ph) % 360) + 540) % 360) - 180;
  const sat = ps + (base[1] - ps) * k;
  return fromHsl([
    (ph + gap * k + 360) % 360,
    k < 0.9 ? Math.max(sat, WASH_FLOOR) : sat,
    pl + (base[2] - pl) * k,
  ]);
}

export interface Wash {
  fill: string;
  top: string;
  tint: (base: string) => void;
}

export function createWash(id: string, defs: SVGElement): Wash {
  const gradient = el('linearGradient', { id: `${id}fw`, x1: '0', y1: '0', x2: '0', y2: '1' });
  const stops = Array.from({ length: WASH_STOPS }, (_, i) => {
    const u = i / (WASH_STOPS - 1);
    const stop = el('stop', {
      offset: (u * WASH_REACH).toFixed(3),
      'stop-opacity': (WASH_OPACITY * (1 - smooth(WASH_SOLID, 1, u))).toFixed(3),
    });
    gradient.appendChild(stop);
    return { stop, k: smooth(0.2, 1, u) };
  });
  defs.appendChild(gradient);
  let last = '';
  return {
    fill: `url(#${id}fw)`,
    top: fromHsl(WASH_HSL),
    tint(base) {
      if (base === last) return;
      last = base;
      const hsl = toHsl(base);
      for (const { stop, k } of stops) stop.setAttribute('stop-color', washColor(hsl, k));
    },
  };
}

function leftEdge(ring: Ring, from: number, to: number): number {
  let edge = Number.POSITIVE_INFINITY;
  for (let s = 0; s <= BAND_SAMPLES; s++) {
    const y = from + ((to - from) * s) / BAND_SAMPLES;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i] as Point;
      const b = ring[(i + 1) % ring.length] as Point;
      if ((a[1] <= y && b[1] >= y) || (b[1] <= y && a[1] >= y)) {
        const t = b[1] === a[1] ? 0 : (y - a[1]) / (b[1] - a[1]);
        edge = Math.min(edge, a[0] + (b[0] - a[0]) * t);
      }
    }
  }
  return edge;
}

function wave(x: number, top: number, length: number, amp: number, phase: number): string {
  let d = '';
  for (let i = 0; i <= WAVE_STEPS; i++) {
    const t = i / WAVE_STEPS;
    const px = x + amp * Math.sin(t * WAVE_TURNS * TAU + phase);
    d += `${i ? 'L' : 'M'}${px.toFixed(1)} ${(top + t * length).toFixed(1)}`;
  }
  return d;
}

export function createShiver(host: SVGElement, outline: Ring): (amount: number, now: number) => void {
  const ys = outline.map((p) => p[1]);
  const bodyTop = Math.min(...ys);
  const height = Math.max(...ys) - bodyTop;
  const amp = height * 0.014;
  const lines = LINES.map((line) => {
    const top = bodyTop + height * line.from;
    const length = height * (line.to - line.from);
    const node = el('path', {
      fill: 'none',
      stroke: LINE_COLOR,
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: '0',
    });
    host.appendChild(node);
    return {
      node,
      top,
      length,
      x: leftEdge(outline, top, top + length) - height * line.gap,
      phase: line.phase,
    };
  });
  return (amount, now) => {
    for (const [i, line] of lines.entries()) {
      if (amount <= 0.001) {
        if (line.node.getAttribute('opacity') !== '0') line.node.setAttribute('opacity', '0');
        continue;
      }
      line.node.setAttribute('d', wave(line.x, line.top, line.length, amp, now * 0.012 + line.phase));
      line.node.setAttribute('opacity', (amount * (0.62 + 0.2 * Math.sin(now / 260 + i * 1.7))).toFixed(3));
    }
  };
}
