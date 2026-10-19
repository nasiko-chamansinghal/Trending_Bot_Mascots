import type { EmotionRaw, PoseSpec, SequenceFrameSpec } from './types';

export type LoopPose = Required<Pick<PoseSpec, 'body' | 'eyes'>> & Pick<PoseSpec, 'props'>;

export interface LoopOptions {
  duration: number;
  poster: number;
  expr: string;
  pose: (t: number) => LoopPose;
  exprAt?: (t: number) => string;
  exprSpeed?: number;
  group?: string;
}

const STEP = 1000 / 30;

export function loopEmotion(
  meta: Pick<EmotionRaw, 'id' | 'name' | 'desc'>,
  options: LoopOptions,
): EmotionRaw {
  const count = Math.round(options.duration / STEP);
  const frames: SequenceFrameSpec[] = [];
  let slot = '';
  for (let i = 0; i <= count; i++) {
    const at = (options.duration * i) / count;
    const t = i === count ? 0 : at;
    const next = options.exprAt ? options.exprAt(t) : options.expr;
    const change = i === 0 || next !== slot;
    slot = next;
    frames.push({
      at,
      ...options.pose(t),
      ...(change ? { expr: next, exprSpeed: i === 0 ? 100 : (options.exprSpeed ?? 22) } : {}),
    });
  }
  const poster = options.pose(options.poster);
  const posterExpr = options.exprAt ? options.exprAt(options.poster) : options.expr;
  return {
    ...meta,
    group: options.group ?? 'video',
    bare: true,
    gaze: false,
    transition: 300,
    blinkMs: null,
    openness: 1,
    pool: [posterExpr],
    mouth: 'flat',
    body: { ...poster.body, breathe: 0 },
    eyes: poster.eyes,
    props: poster.props || {},
    sequence: { settle: 'hold', interp: 'linear', frames, loopFrom: 0 },
  };
}
