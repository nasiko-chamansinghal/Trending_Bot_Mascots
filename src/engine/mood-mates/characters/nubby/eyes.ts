import type { CutArc, CutEye, CutParams } from '../../geometry';

type Side = 'left' | 'right';

const HOME: Record<Side, [number, number]> = { left: [-10.95, -37.45], right: [31.59, -37.45] };
const OPEN = { rx: 10.6, ry: 10.5 };

interface Look {
  dx?: number;
  dy?: number;
  rx?: number;
  ry?: number;
  lid?: number;
  lidR?: number;
  slant?: number;
  slantR?: number;
  floor?: number;
  floorSlant?: number;
  cap?: CutArc;
  arc?: CutArc;
}

interface PairLook extends Look {
  left?: Look;
  right?: Look;
}

function eye(side: Side, o: Look): CutEye {
  const [hx, hy] = HOME[side];
  const rx = o.rx ?? OPEN.rx;
  const ry = o.ry ?? OPEN.ry;
  const mirror = side === 'right' ? -1 : 1;
  const e: CutEye = {
    x: hx + (o.dx ?? 0),
    y: hy + (o.dy ?? 0),
    w: rx * 2,
    h: ry * 2,
    rTop: rx,
    rBot: rx,
    tilt: 0,
    ellipse: true,
  };
  const lid = side === 'right' && o.lidR != null ? o.lidR : o.lid;
  if (lid != null) {
    const slant = side === 'right' && o.slantR != null ? -o.slantR : mirror * (o.slant ?? 0);
    e.lid = { y: -lid, angle: slant };
  }
  if (o.floor != null) e.floor = { y: -o.floor, angle: mirror * (o.floorSlant ?? 0) };
  if (o.cap) e.cap = { ...o.cap, x: mirror * (o.cap.x ?? 0) };
  if (o.arc) e.arc = { ...o.arc, x: mirror * (o.arc.x ?? 0) };
  return e;
}

function pair(o: PairLook): CutParams {
  const { left, right, ...shared } = o;
  return {
    kind: 'cut',
    rot: 0,
    cx: 120,
    cy: 120,
    left: eye('left', { ...shared, ...left }),
    right: eye('right', { ...shared, ...right }),
  };
}

const HAPPY: CutArc = { y: 7.21, r: 12 };
const HAPPY_SOFT: CutArc = { y: 8, r: 12.2 };

export const NUBBY_EYE_SHAPES: Record<string, CutParams> = {
  calm: pair({}),
  calm2: pair({ rx: 10.4, ry: 10.8, dy: -0.3 }),
  wide: pair({ rx: 11.1, ry: 11.1, dy: -0.5 }),
  wide2: pair({ rx: 11.7, ry: 12.2, dy: -1.2 }),
  listen: pair({ rx: 10.1, ry: 11.1, dy: -0.6 }),
  listen2: pair({ rx: 10.3, ry: 10.9, dx: 2, dy: -1.2 }),
  lookUp: pair({ ry: 10.2, dx: 3, dy: -7 }),
  lookDown: pair({ rx: 10.8, ry: 9.9, dx: -1, dy: 4.5 }),
  lookLeft: pair({ dx: -10, dy: 2 }),
  lookRight: pair({ dx: 10, dy: 2 }),
  scan: pair({ rx: 10.8, ry: 9.6, dx: -9 }),
  scan2: pair({ rx: 10.8, ry: 9.6, dx: 9 }),
  scan3: pair({ rx: 10.9, ry: 9.3, dy: -4 }),
  sleepy: pair({ rx: 11.4, ry: 11.4, dy: 1.2, floor: 2.3 }),
  sleepy2: pair({ rx: 11, ry: 11, dy: 1.2, floor: 4.8 }),
  squint: pair({ rx: 11.6, ry: 6.6, lid: 4.6, slant: 6, dy: 1 }),
  squint2: pair({ rx: 11.8, ry: 5.2, dy: 1.5 }),
  smug: pair({ lid: 3.2, slant: 6, dx: 3, dy: 1 }),
  hold: pair({ lid: 4.6, slant: 10, dy: 1 }),
  angry: pair({ rx: 12.6, ry: 12.6, dy: 4, lid: 1.26, lidR: 0.27, slant: 17, slantR: 12.5 }),
  angry2: pair({ dy: 1.5, lid: 9, slant: 17 }),
  sad: pair({ lid: 5, slant: -14, dy: 3 }),
  shy: pair({ lid: 6, slant: -8, dx: 5, dy: 4 }),
  happy: pair({ rx: 9.74, ry: 9.74, dy: -1, arc: HAPPY }),
  happy2: pair({ rx: 9.9, ry: 9.9, dy: -1.5, arc: HAPPY_SOFT }),
  cosyLand: pair({ rx: 11.4, dy: 0.5, arc: { y: 4.2, r: 11.4 } }),
  cosyJump: pair({ rx: 10.2, ry: 11.2, dy: -2, arc: { y: 7, r: 13.5 } }),
  hopLand: pair({ rx: 11.5, ry: 8.8, dy: 1.6 }),
  squash: pair({ rx: 10.9, ry: 9, dy: 0.2 }),
  blinkHalf: pair({ rx: 10.9, ry: 5.3, dy: 0.4 }),
  closed: pair({ rx: 11.2, ry: 1.5, dy: 0.5 }),
  closed2: pair({ rx: 10.3, ry: 10.3, dy: 2, cap: { y: -4.8, r: 11.6 } }),
  bowl: pair({ rx: 9.6, ry: 9.6, dy: 2, lid: 0.6 }),
  wakeOval: pair({ rx: 10, ry: 7.7, dy: 1.6, lid: 6.8 }),
};
