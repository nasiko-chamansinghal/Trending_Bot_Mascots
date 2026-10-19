import type { CutEye, CutParams } from '../../geometry';
import { BODY_ROT, SIDE } from './shape';

const S = SIDE;
const TILT = -12.4;
const AXIS: [number, number] = [-Math.sin((TILT * Math.PI) / 180), Math.cos((TILT * Math.PI) / 180)];
const OPEN = { w: 0.218, h: 0.362, r: 0.087 };
const HOME: Record<Side, [number, number]> = { left: [-0.086, -0.095], right: [0.199, -0.157] };

type Side = 'left' | 'right';

interface Look {
  dx?: number;
  dy?: number;
  w?: number;
  h?: number;
  r?: number;
  rTop?: number;
  anchor?: 'bottom' | 'top';
  lid?: number;
  lidR?: number;
  slant?: number;
  slantR?: number;
  arc?: { x: number; y: number; r: number };
}

interface PairLook extends Look {
  left?: Look;
  right?: Look;
}

function eye(side: Side, o: Look): CutEye {
  const [hx, hy] = HOME[side];
  const w = (o.w ?? OPEN.w) * S;
  const h = (o.h ?? OPEN.h) * S;
  const r = (o.r ?? OPEN.r) * S;
  let x = (hx + (o.dx ?? 0)) * S;
  let y = (hy + (o.dy ?? 0)) * S;
  const dh = (OPEN.h * S - h) / 2;
  if (o.anchor === 'bottom') {
    x += AXIS[0] * dh;
    y += AXIS[1] * dh;
  } else if (o.anchor === 'top') {
    x -= AXIS[0] * dh;
    y -= AXIS[1] * dh;
  }
  const e: CutEye = { x, y, w, h, rTop: o.rTop != null ? o.rTop * S : r, rBot: r, tilt: TILT };
  const k = h / 2 - w / 2;
  const lid = side === 'right' && o.lidR != null ? o.lidR : o.lid;
  if (lid != null) {
    const slant = side === 'right' ? (o.slantR ?? -(o.slant ?? 0)) : (o.slant ?? 0);
    const slope = Math.tan((slant * Math.PI) / 180);
    const ax = AXIS[0] * k;
    const ay = AXIS[1] * k;
    e.lid = { y: ay - lid * S - slope * ax, angle: slant };
  }
  if (o.arc) {
    e.arc = { x: -AXIS[0] * k + o.arc.x * S, y: -AXIS[1] * k + o.arc.y * S, r: o.arc.r * S };
  }
  return e;
}

function pair(o: PairLook): CutParams {
  const { left, right, ...shared } = o;
  return {
    kind: 'cut',
    rot: BODY_ROT,
    cx: 120,
    cy: 120,
    left: eye('left', { ...shared, ...left }),
    right: eye('right', { ...shared, ...right }),
  };
}

const SLIT = { w: 0.226, h: 0.026, r: 0.013, dx: 0.004, dy: 0.02 };
const DASH = { w: 0.215, h: 0.031, r: 0.0155, dx: 0.004, dy: 0.045 };

export const STAMPY_EYES: Record<string, CutParams> = {
  calm: pair({}),
  calm2: pair({ w: 0.212, h: 0.374, anchor: 'bottom' }),
  wide: pair({ w: 0.236, h: 0.394, dy: -0.012 }),
  wide2: pair({ w: 0.244, h: 0.41, dy: -0.016, r: 0.096 }),
  listen: pair({ w: 0.202, h: 0.384, anchor: 'bottom' }),
  listen2: pair({ w: 0.198, h: 0.372, dx: 0.02, dy: -0.012 }),
  lookUp: pair({ h: 0.336, dx: 0.012, dy: -0.034, anchor: 'top' }),
  lookDown: pair({ h: 0.344, dx: -0.004, dy: 0.03, anchor: 'bottom' }),
  lookLeft: pair({ dx: -0.058, h: 0.352 }),
  lookRight: pair({ dx: 0.058, h: 0.352 }),
  scan: pair({ dx: -0.052, h: 0.33, w: 0.222 }),
  scan2: pair({ dx: 0.052, h: 0.33, w: 0.222 }),
  scan3: pair({ dy: -0.026, h: 0.316, w: 0.226 }),
  smug: pair({ lid: 0.1, slant: 8, dx: 0.033, dy: 0.012 }),
  hold: pair({ lid: 0.07, slant: 11.5, dx: 0.02, dy: 0.01 }),
  squint: pair({ lid: 0.085, slant: 3, dy: 0.01, arc: { x: 0.05, y: 0.62, r: 0.36 } }),
  squint2: pair({ lid: 0.075, slant: 6, dx: 0.012, dy: 0.012 }),
  sleepy: pair({ lid: 0.055, slant: -3, dy: 0.02 }),
  angry: pair({ lid: 0.09, lidR: 0.12, slant: 26.5, dx: 0.005, dy: 0.023 }),
  angry2: pair({ lid: 0.13, lidR: 0.15, slant: 17.4, dx: 0.004, dy: 0.018 }),
  push: pair({ lid: 0.125, lidR: 0.123, slant: 14, slantR: -30.5, dx: 0.04, dy: 0.015 }),
  sad: pair({ lid: 0.11, slant: -17, dx: -0.01, dy: 0.02 }),
  shy: pair({ lid: 0.12, slant: -11, dx: 0.045, dy: 0.035 }),
  happy: pair({ dy: -0.018, arc: { x: 0.05, y: 0.4, r: 0.28 } }),
  happy2: pair({ dy: -0.02, arc: { x: 0.05, y: 0.3, r: 0.235 } }),
  cosyLand: pair({ dy: -0.022, arc: { x: 0.045, y: 0.235, r: 0.2 } }),
  cosyJump: pair({ dy: -0.016, arc: { x: 0.04, y: 0.48, r: 0.32 } }),
  hopLand: pair({ h: 0.24, w: 0.226, r: 0.1, anchor: 'top', dy: -0.02 }),
  lidDrop: pair({ lid: 0.035, slant: 2, dy: 0.012 }),
  closed: pair(SLIT),
  closed2: pair(DASH),
  squash: pair({ w: 0.227, h: 0.205, r: 0.066 }),
};
