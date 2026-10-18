import type { LidEdge, LidParams } from '../../geometry';

function lid(rx: number, ry: number, top: LidEdge, bottom: LidEdge): LidParams {
  return { kind: 'lid', rx, ry, top, bottom };
}

const OPEN_TOP: LidEdge = { y: -1 };
const OPEN_BOTTOM: LidEdge = { y: 1 };

export const NUBBY_EYE_SHAPES: Record<string, LidParams> = {
  calm: lid(10.6, 10.5, OPEN_TOP, OPEN_BOTTOM),
  calm2: lid(10.8, 10, OPEN_TOP, OPEN_BOTTOM),
  wide: lid(10.8, 11.6, OPEN_TOP, OPEN_BOTTOM),
  wide2: lid(10.9, 12.6, OPEN_TOP, OPEN_BOTTOM),
  listen: lid(10.4, 11.3, OPEN_TOP, OPEN_BOTTOM),
  listen2: lid(10.5, 10.9, OPEN_TOP, OPEN_BOTTOM),
  sleepy: lid(11.8, 10.5, OPEN_TOP, { y: -0.2 }),
  squint: lid(11.4, 4.8, OPEN_TOP, OPEN_BOTTOM),
  squint2: lid(11, 5.4, { y: -0.7, angle: 6 }, OPEN_BOTTOM),
  closed: lid(11.3, 10.5, { y: 0.05, bow: -0.35 }, { y: 0.25, bow: -0.35 }),
  closed2: lid(11.2, 10.5, { y: -0.07 }, { y: 0.07 }),
  happy: lid(10.6, 10.5, { y: -0.55, bow: 0.55 }, { y: -0.2, bow: 0.55 }),
  happy2: lid(10.9, 10.5, { y: -0.5, bow: 0.45 }, { y: -0.15, bow: 0.45 }),
  angry: lid(14.3, 10.55, { y: -0.34, angle: 17 }, OPEN_BOTTOM),
  angry2: lid(13.6, 10.5, { y: -0.28, angle: 20 }, OPEN_BOTTOM),
  scan: lid(11.8, 6.4, OPEN_TOP, OPEN_BOTTOM),
  scan2: lid(11.5, 7.6, OPEN_TOP, OPEN_BOTTOM),
  scan3: lid(12, 4.8, OPEN_TOP, OPEN_BOTTOM),
  shy: lid(11, 10.5, { y: -0.9 }, { y: 0.3 }),
  sad: lid(10.8, 10.5, { y: -0.5, angle: -14 }, OPEN_BOTTOM),
};
