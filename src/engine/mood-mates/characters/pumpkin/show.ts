import { easeInOutCubic } from '../../motion';
import type { EmotionRaw, SequenceFrameSpec } from '../../types';
import SHOW from './data/show.json';
import { ENTER_SPEED, TRACE_SPEED } from './speeds';

type Row = [number, number, number, number, number, number, number, number, string | null];

const ROWS = SHOW.frames as Row[];
const FRAME = 1000 / SHOW.fps;
const STEP = 1000 / 30;
const TAU = Math.PI * 2;

export const SHOW_SLOTS = SHOW.slots as unknown as Record<string, [number[][], number[][]]>;

export type Part =
  | { from: number; to: number }
  | { hold: number }
  | { ease: number; to: number; expr?: string; exprSpeed?: number };

interface Out {
  at: number;
  row: Row;
  expr?: string;
  exprSpeed?: number;
}

function exprAt(i: number): string {
  for (let k = i; k >= 0; k--) {
    const e = (ROWS[k] as Row)[8];
    if (e) return e;
  }
  return 'pill';
}

function mix(a: Row, b: Row, t: number): Row {
  const out = a.slice() as Row;
  for (let k = 1; k <= 7; k++) out[k] = (a[k] as number) + ((b[k] as number) - (a[k] as number)) * t;
  out[8] = null;
  return out;
}

function nearTurn(target: Row, from: Row): Row {
  const r = target.slice() as Row;
  r[6] = (r[6] as number) + TAU * Math.round(((from[6] as number) - (r[6] as number)) / TAU);
  return r;
}

function body(r: Row): Record<string, number> {
  return { x: r[1], y: r[2], rotate: r[3], scaleX: r[4], scaleY: r[5], turn: r[6], pitch: r[7], breathe: 0 };
}

export function replay(
  meta: Pick<EmotionRaw, 'id' | 'name' | 'desc'>,
  start: number,
  parts: Part[],
): EmotionRaw {
  const out: Out[] = [{ at: 0, row: ROWS[start] as Row, expr: exprAt(start), exprSpeed: ENTER_SPEED }];
  let t = 0;
  let last = ROWS[start] as Row;
  for (const part of parts) {
    if ('from' in part) {
      const dir = part.to >= part.from ? 1 : -1;
      for (let i = part.from + dir; dir > 0 ? i <= part.to : i >= part.to; i += dir) {
        t += FRAME;
        const row = nearTurn(ROWS[i] as Row, last);
        const e = dir > 0 ? (ROWS[i] as Row)[8] : exprAt(i);
        out.push({ at: t, row, ...(e ? { expr: e, exprSpeed: TRACE_SPEED } : {}) });
        last = row;
      }
    } else if ('hold' in part) {
      t += part.hold;
      out.push({ at: t, row: last });
    } else {
      const target = nearTurn(ROWS[part.to] as Row, last);
      const n = Math.max(1, Math.round(part.ease / STEP));
      for (let k = 1; k <= n; k++) {
        const row = mix(last, target, easeInOutCubic(k / n));
        out.push({
          at: t + (part.ease * k) / n,
          row,
          ...(k === 1 && part.expr ? { expr: part.expr, exprSpeed: part.exprSpeed ?? 12 } : {}),
        });
      }
      t += part.ease;
      last = target;
    }
  }
  const frames: SequenceFrameSpec[] = out.map((o) => ({
    at: Math.round(o.at),
    body: body(o.row),
    ...(o.expr ? { expr: o.expr, exprSpeed: o.exprSpeed } : {}),
  }));
  const first = out[0] as Out;
  return {
    ...meta,
    group: 'pumpkin',
    bare: true,
    gaze: false,
    transition: 300,
    blinkMs: null,
    pool: [first.expr as string],
    body: body(first.row),
    sequence: { settle: 'hold', interp: 'linear', frames, loopFrom: 0 },
  };
}

export const PUMPKIN_SHOW: EmotionRaw[] = [
  replay(
    {
      id: '42',
      name: 'Curious Peek',
      desc: 'Tips its whole head sideways and peers down-left with shrunken pill eyes, then gathers itself back up',
    },
    0,
    [{ from: 0, to: 80 }, { ease: 500, to: 0, expr: 'pill', exprSpeed: 14 }, { hold: 700 }],
  ),
  replay(
    {
      id: '43',
      name: 'Wow Look-Up',
      desc: 'Pops tall, the pills spin outward and inflate into round eyes, and the whole head tips back to look up',
    },
    0,
    [
      { hold: 300 },
      { ease: 250, to: 76, expr: 'v76', exprSpeed: 20 },
      { from: 76, to: 111 },
      { hold: 900 },
      { ease: 650, to: 0, expr: 'pill', exprSpeed: 10 },
      { hold: 400 },
    ],
  ),
  replay(
    {
      id: '44',
      name: 'Giggle',
      desc: 'Looking up with round eyes, it giggles in six quick squashes that speed up, feet planted',
    },
    112,
    [
      { from: 112, to: 188 },
      { ease: 120, to: 112 },
    ],
  ),
  replay(
    {
      id: '45',
      name: 'Big Stretch',
      desc: 'Stretches up to its tallest, head tipped far back, then sinks back down',
    },
    182,
    [{ from: 182, to: 200 }, { from: 200, to: 182 }, { hold: 300 }],
  ),
  replay(
    {
      id: '46',
      name: 'Jump Spin',
      desc: 'Crouches and turns away, leaps and spins a full turn with its eyes sweeping round the back, lands with a squash and settles',
    },
    0,
    [
      { hold: 400 },
      { ease: 450, to: 189, expr: 'round', exprSpeed: 12 },
      { from: 189, to: 303 },
      { ease: 300, to: 0 },
      { hold: 700 },
    ],
  ),
  replay(
    {
      id: '47',
      name: 'Pumpy Show',
      desc: 'The whole Pumpy routine: peek, pop, giggle, stretch, jump spin and settle, frame for frame',
    },
    0,
    [{ from: 0, to: 353 }],
  ),
];
