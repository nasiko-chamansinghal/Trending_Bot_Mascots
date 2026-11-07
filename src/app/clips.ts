export const CLIP_MS = 2000;
export const SLOT_PX = 112;
export const MIN_ZOOM = 0.45;
export const MAX_ZOOM = 2.4;

const TICK_SPACING = 52;
const TICK_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60];
const MAX_TICKS = 2000;

export interface Clip {
  uid: number;
  emotion: string;
}

export interface Tick {
  t: number;
  major: boolean;
}

let counter = 0;

export function makeClip(emotion: string): Clip {
  counter += 1;
  return { uid: counter, emotion };
}

export function mmss(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function slotWidth(zoom: number): number {
  return Math.round(SLOT_PX * zoom);
}

export function playheadX(ms: number, slot: number): number {
  return (ms / CLIP_MS) * slot;
}

export function percent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

export function tickLabel(seconds: number): string {
  return seconds < 60 ? `${seconds}s` : mmss(seconds * 1000);
}

export function ticksFor(totalSeconds: number, pxPerSecond: number): Tick[] {
  const major = TICK_STEPS.find((step) => step * pxPerSecond >= TICK_SPACING) ?? 60;
  const step = (major / 5) * pxPerSecond >= 7 ? major / 5 : major;
  const out: Tick[] = [];
  for (let i = 0; i * step <= totalSeconds + 1e-6 && out.length < MAX_TICKS; i += 1) {
    const t = i * step;
    out.push({ t, major: Math.abs(t / major - Math.round(t / major)) < 1e-6 });
  }
  return out;
}
