import { hexToRgb, lerpColor, rgbToHex } from '../shared/math';
import { clamp, el } from './util';

export interface BodyTint {
  top: [string, number];
  bottom: [string, number];
}

type Hsl = [number, number, number];

interface Shift {
  hue: number;
  sat: number;
  light: number;
}

const HUE_REACH = 15;
const SAT_FULL = 0.3;

function toHsl(hex: string): Hsl {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const sector = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [sector * 60, s, l];
}

function fromHsl([h, s, l]: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const channel = (n: number): number => {
    const k = (n + h / 30) % 12;
    return 255 * (l - (c / 2) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return rgbToHex(channel(0), channel(8), channel(4));
}

function hueGap(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function shiftOf(base: Hsl, target: Hsl): Shift {
  return { hue: hueGap(target[0], base[0]), sat: target[1] - base[1], light: target[2] - base[2] };
}

export function createTint(
  id: string,
  defs: SVGElement,
  tint: BodyTint | null | undefined,
  base: string,
  span?: [number, number],
): (color: string) => string {
  if (!tint) return (color) => color;
  const home = toHsl(base);
  const shifts = [tint.top, tint.bottom].map(([target, amount]) =>
    shiftOf(home, toHsl(lerpColor(base, target, amount))),
  ) as [Shift, Shift];
  const stops = ['0%', '100%'].map((offset) => el('stop', { offset })) as [SVGStopElement, SVGStopElement];
  const gradient = el(
    'linearGradient',
    span
      ? {
          id: `${id}body`,
          gradientUnits: 'userSpaceOnUse',
          x1: '0',
          y1: String(span[0]),
          x2: '0',
          y2: String(span[1]),
        }
      : { id: `${id}body`, x1: '0', y1: '0', x2: '0', y2: '1' },
  );
  for (const stop of stops) gradient.appendChild(stop);
  defs.appendChild(gradient);

  function tone(color: Hsl, shift: Shift): string {
    const near = Math.max(0, 1 - Math.abs(hueGap(color[0], home[0])) / HUE_REACH);
    const w = near * Math.min(1, color[1] / SAT_FULL);
    return fromHsl([
      (color[0] + shift.hue * w + 360) % 360,
      clamp(color[1] + shift.sat * w, 0, 1),
      clamp(color[2] + shift.light, 0, 1),
    ]);
  }

  let painted = '';
  return (color) => {
    if (color !== painted) {
      painted = color;
      const hsl = toHsl(color);
      stops[0].setAttribute('stop-color', tone(hsl, shifts[0]));
      stops[1].setAttribute('stop-color', tone(hsl, shifts[1]));
    }
    return `url(#${id}body)`;
  };
}
