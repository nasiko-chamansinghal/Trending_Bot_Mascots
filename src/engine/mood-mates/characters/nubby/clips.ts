import { easeInOutCubic, easeOutBack, smooth, span } from '../../motion';
import type { ClipDef } from '../../types';

const C = 120;
const RAD = Math.PI / 180;
const PIVOT_RIGHT: [number, number] = [198, 214.5];
const PIVOT_LEFT: [number, number] = [41.5, 213.5];

const easeIn = (u: number) => u * u * u;
const easeOut = (u: number) => 1 - (1 - u) ** 3;

function dip(t: number, start: number, length: number, depth: number): number {
  return t > start && t < start + length ? depth * Math.sin(Math.PI * ((t - start) / length) ** 0.6) : 0;
}

function tipAbout(deg: number): { dx: number; dy: number; rotate: number } {
  const [px, py] = deg >= 0 ? PIVOT_RIGHT : PIVOT_LEFT;
  const a = deg * RAD;
  const ox = px - C;
  const oy = py - C;
  return {
    dx: ox - (ox * Math.cos(a) - oy * Math.sin(a)),
    dy: oy - (ox * Math.sin(a) + oy * Math.cos(a)),
    rotate: deg,
  };
}

const TILT = 9;
const T_THUD = 2350;
const MARBLE_MS = 2900;

function tilt(t: number): number {
  if (t < 160) return 0;
  if (t < 560) return TILT * easeInOutCubic(span(t, 160, 560));
  if (t < 1000) return TILT;
  if (t < 1650) return TILT * (1 - 2 * easeInOutCubic(span(t, 1000, 1650)));
  if (t < 2050) return -TILT;
  if (t < T_THUD) return -TILT * (1 - easeIn(span(t, 2050, T_THUD)));
  return 0;
}

const WALL_LEFT = -38;
const WALL_RIGHT = 16;
const TOUCH = -18.8;
const GRAVITY = 2600;
const FRICTION = 1.2;
const BOUNCE = 0.35;

interface MarbleTrack {
  left: Float32Array;
  right: Float32Array;
  squish: Float32Array;
}

function simulateMarbles(): MarbleTrack {
  const n = T_THUD + 1;
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const squish = new Float32Array(n);
  let xl = 0;
  let xr = 0;
  let vl = 0;
  let vr = 0;
  let hit = 0;
  const dt = 0.001;
  for (let i = 0; i < n; i++) {
    const g = GRAVITY * Math.sin(tilt(i) * RAD);
    vl += (g - FRICTION * vl) * dt;
    vr += (g - FRICTION * vr) * dt;
    xl += vl * dt;
    xr += vr * dt;
    if (xl < WALL_LEFT) {
      hit = Math.max(hit, Math.abs(vl));
      xl = WALL_LEFT;
      vl = -vl * BOUNCE;
    }
    if (xr > WALL_RIGHT) {
      hit = Math.max(hit, Math.abs(vr));
      xr = WALL_RIGHT;
      vr = -vr * BOUNCE;
    }
    if (xr - xl < TOUCH) {
      const mid = (xl + xr) / 2;
      xl = mid - TOUCH / 2;
      xr = mid + TOUCH / 2;
      const rel = vl - vr;
      if (rel > 0) {
        hit = Math.max(hit, rel);
        const avg = (vl + vr) / 2;
        vl = avg - (BOUNCE * rel) / 2;
        vr = avg + (BOUNCE * rel) / 2;
      }
    }
    hit *= Math.exp(-dt / 0.08);
    left[i] = xl;
    right[i] = xr;
    squish[i] = Math.min(0.22, hit / 700);
  }
  return { left, right, squish };
}

const MARBLES = simulateMarbles();

export const marbleEyes: ClipDef = {
  duration: MARBLE_MS,
  expr: [
    { at: 0, expr: 'calm', speed: 10 },
    { at: 160, expr: 'wide', speed: 12 },
    { at: T_THUD - 20, expr: 'hopLand', speed: 24 },
    { at: T_THUD + 170, expr: 'happy', speed: 12 },
    { at: MARBLE_MS - 120, expr: 'calm', speed: 8 },
  ],
  sample(t) {
    const tip = tipAbout(tilt(t));
    const thud = dip(t, T_THUD, 300, 0.07);
    const crouch = t < 160 ? Math.sin(Math.PI * span(t, 0, 160)) * 0.03 : 0;
    let xl: number;
    let xr: number;
    let sq: number;
    if (t <= T_THUD) {
      const i = Math.min(T_THUD, Math.max(0, Math.round(t)));
      xl = MARBLES.left[i] as number;
      xr = MARBLES.right[i] as number;
      sq = MARBLES.squish[i] as number;
    } else {
      const back = 1 - easeOutBack(span(t, T_THUD + 40, T_THUD + 460));
      xl = (MARBLES.left[T_THUD] as number) * back;
      xr = (MARBLES.right[T_THUD] as number) * back;
      sq = 0;
    }
    const slope = Math.tan(tilt(t) * RAD);
    return {
      ...tip,
      sx: 1 + crouch * 0.7 + thud * 0.8,
      sy: 1 - crouch - thud,
      eyeX: [xl, xr],
      eyeY: [xl * slope * 0.5, xr * slope * 0.5],
      eyeSx: 1 - sq,
      eyeSy: 1 + sq * 0.8,
    };
  },
};

const DEEP = 220;
const PEEK = 116;
const DUCK = 132;
const POP_START = 2200;
const POP_END = 2480;
const PEEK_MS = 2900;

function sinkDepth(t: number): number {
  if (t < 200) return 0;
  if (t < 620) return DEEP * easeIn(span(t, 200, 620));
  if (t < 950) return DEEP;
  if (t < 1250) return DEEP + (PEEK - DEEP) * easeOutBack(span(t, 950, 1250));
  if (t < 2050) return PEEK + 1.5 * Math.sin(((t - 1250) / 800) * Math.PI * 2);
  if (t < POP_START) return PEEK + (DUCK - PEEK) * easeInOutCubic(span(t, 2050, POP_START));
  if (t < POP_END) return DUCK * (1 - easeOut(span(t, POP_START, POP_END)));
  return 0;
}

function holeOpen(t: number): number {
  if (t < 200) return 0.35 * smooth(span(t, 0, 200));
  if (t < 620) return 0.35 + 0.65 * easeOut(span(t, 200, 620));
  if (t < 2420) return 1;
  return 1 - smooth(span(t, 2420, 2600));
}

export const peekabooPop: ClipDef = {
  duration: PEEK_MS,
  expr: [
    { at: 0, expr: 'hopLand', speed: 18 },
    { at: 240, expr: 'closed', speed: 22 },
    { at: 960, expr: 'wide', speed: 14 },
    { at: 1300, expr: 'lookLeft', speed: 9 },
    { at: 1600, expr: 'lookRight', speed: 9 },
    { at: 1900, expr: 'blinkHalf', speed: 34 },
    { at: 1934, expr: 'closed', speed: 34 },
    { at: 1974, expr: 'squash', speed: 30 },
    { at: 2014, expr: 'wide', speed: 16 },
    { at: POP_START, expr: 'wide2', speed: 16 },
    { at: POP_END - 10, expr: 'hopLand', speed: 24 },
    { at: POP_END + 100, expr: 'happy', speed: 12 },
    { at: PEEK_MS - 60, expr: 'calm', speed: 8 },
  ],
  sample(t) {
    let sx = 1;
    let sy = 1;
    if (t < 200) {
      const u = easeOut(span(t, 0, 200));
      sy = 1 - 0.1 * u;
      sx = 1 + 0.07 * u;
    } else if (t < 620) {
      const u = smooth(span(t, 200, 420));
      sy = 0.9 + 0.15 * u;
      sx = 1.07 - 0.11 * u;
    } else if (t < 950) {
      sy = 1.05;
      sx = 0.96;
    } else if (t < POP_START) {
      const u = smooth(span(t, 950, 1150));
      const duck = smooth(span(t, 2050, POP_START));
      sy = 1.05 - 0.05 * u - 0.04 * duck;
      sx = 0.96 + 0.04 * u + 0.03 * duck;
    } else if (t < POP_END) {
      const u = span(t, POP_START, POP_END);
      const stretch = Math.sin(Math.PI * Math.min(1, u * 1.1));
      sy = 0.96 + 0.04 * u + 0.07 * stretch;
      sx = 1.03 - 0.03 * u - 0.05 * stretch;
    } else {
      const land = dip(t, POP_END, 380, 0.07);
      sy = 1 - land;
      sx = 1 + land * 0.8;
    }
    return { dy: sinkDepth(t), sx, sy, sink: holeOpen(t) };
  },
};
