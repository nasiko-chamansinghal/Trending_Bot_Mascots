import { easeOutQuint } from './inertia';
import { easeInOutCubic } from './math';

interface MotionSpec {
  amp?: number;
  period?: number;
  speed?: number;
}

function unit(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export const MOTIONS: Record<string, (spec: MotionSpec, t: number) => number> = {
  spin: (spec, t) => ((spec.amp ?? 0) * t) / 1000,
  turns: (spec, t) => {
    const cycle = spec.period || 3400;
    const span = spec.speed || 1700;
    return (spec.amp ?? 0) * easeInOutCubic(unit((t % cycle) / span));
  },
  arch: (spec, t) => {
    const cycle = spec.period || 2600;
    return (spec.amp ?? 0) * Math.sin(Math.PI * ((t % cycle) / cycle));
  },
  dip: (spec, t) => {
    const cycle = spec.period || 2400;
    const p = (t % cycle) / cycle;
    return (spec.amp ?? 0) * easeOutQuint(unit(p / 0.23)) * (1 - easeOutQuint(unit((p - 0.77) / 0.23)));
  },
};
