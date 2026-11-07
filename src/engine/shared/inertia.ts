const DURATION_MS = 480;
const EPSILON = 1e-4;
const PARTS = ['body', 'left', 'right'] as const;

interface PoseLike {
  body: object;
  left: object;
  right: object;
  props?: Record<string, number>;
}

type Entry = [part: string, key: string, delta: number];

export function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5;
}

export function wrapDegrees(delta: number): number {
  return ((((delta + 180) % 360) + 360) % 360) - 180;
}

function numbers(part: object): Record<string, unknown> {
  return part as Record<string, unknown>;
}

function capture(from: PoseLike, to: PoseLike): Entry[] {
  const entries: Entry[] = [];
  for (const part of PARTS) {
    const a = numbers(from[part]);
    const b = numbers(to[part]);
    for (const key in b) {
      const next = b[key];
      const prev = a[key];
      if (typeof next !== 'number' || typeof prev !== 'number') continue;
      let delta = prev - next;
      if (key === 'turn') delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      else if (key === 'rotate') delta = wrapDegrees(delta);
      if (Math.abs(delta) > EPSILON) entries.push([part, key, delta]);
    }
  }
  const prevProps = from.props ?? {};
  const nextProps = to.props;
  if (nextProps) {
    for (const key of new Set([...Object.keys(prevProps), ...Object.keys(nextProps)])) {
      const delta = (prevProps[key] ?? 0) - (nextProps[key] ?? 0);
      if (Math.abs(delta) > EPSILON) entries.push(['props', key, delta]);
    }
  }
  return entries;
}

export class Inertia {
  private from: PoseLike | null = null;
  private entries: Entry[] = [];
  private startedAt = 0;

  begin(from: PoseLike | null): void {
    this.from = from;
  }

  apply(pose: PoseLike, now: number): void {
    if (this.from) {
      this.entries = capture(this.from, pose);
      this.startedAt = now;
      this.from = null;
    }
    if (!this.entries.length) return;
    const t = (now - this.startedAt) / DURATION_MS;
    if (t >= 1) {
      this.entries = [];
      return;
    }
    const remaining = 1 - easeOutQuint(t);
    for (const [part, key, delta] of this.entries) {
      const target = part === 'props' ? pose.props : numbers(pose[part as (typeof PARTS)[number]]);
      if (!target) continue;
      const bag = target as Record<string, number>;
      bag[key] = (bag[key] ?? 0) + delta * remaining;
    }
  }
}
