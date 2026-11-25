import { oklch, type Rgb, toOklch } from '../../shared/oklch';

export const DYE_RAMP_SIZE = 96;
export const DYE_RAMP_RANGE = 2.4;
const MAX_RAMPS = 64;

const ramps = new Map<number, Uint8Array<ArrayBuffer>>();

function shoulder(distance: number, room: number): number {
  const knee = room / 2;
  return distance <= knee ? distance : room - knee * Math.exp((knee - distance) / knee);
}

function smoothstep(low: number, high: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

export function dyeRamp(rgb: Rgb): Uint8Array<ArrayBuffer> {
  const key = ((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]) >>> 0;
  const cached = ramps.get(key);
  if (cached) return cached;
  const [lightness, chroma, hue] = toOklch(rgb);
  const yellow =
    (1 - smoothstep(22, 32, Math.abs(hue - 90))) *
    smoothstep(0.025, 0.085, chroma) *
    smoothstep(0.54, 0.75, lightness);
  const value = Math.max(...rgb);
  const dye = rgb.map((channel) => (value ? channel / value : 1));
  const weakest = Math.min(...dye);
  const peak = dye.map(
    (channel) => 255 * (channel + (1 - channel) * (0.16 + 0.84 * (channel - weakest))),
  ) as Rgb;
  const [peakLightness] = toOklch(peak);
  const mid = Math.max(0.16, Math.min(lightness, peakLightness - 0.025));
  const midChroma = chroma * Math.min(1, mid / Math.max(0.001, lightness));
  const headroom = peakLightness - mid;
  const row = new Uint8Array(DYE_RAMP_SIZE * 4);
  for (let i = 0; i < DYE_RAMP_SIZE; i++) {
    const exposure = ((i + 0.5) * DYE_RAMP_RANGE) / DYE_RAMP_SIZE;
    const delta = 0.82 * (Math.cbrt(exposure) - 1);
    const L = delta < 0 ? mid - shoulder(-delta, mid) : mid + shoulder(delta, headroom);
    const [r, g, b] = oklch(L, midChroma * Math.min(1, L / mid), hue);
    row.set([Math.round(r), Math.round(g), Math.round(b), Math.round(255 * yellow)], i * 4);
  }
  if (ramps.size >= MAX_RAMPS) ramps.delete(ramps.keys().next().value as number);
  ramps.set(key, row);
  return row;
}
