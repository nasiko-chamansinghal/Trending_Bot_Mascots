import { lerp, lerpColor } from '../../../../shared/math';
import { easeInOutCubic } from '../../../motion';
import type { EmotionRaw, EyePose, SequenceFrameSpec } from '../../../types';
import { NUBBY_PALETTE } from '../palette';
import { type BodyFrame, fitFactor, scaleAboutFeet } from './layout';

type EyeKey = [number, number, number, number, number];
type Key = [
  number,
  string,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  EyeKey,
  EyeKey,
  string | null,
  Record<string, number> | null,
];

export interface VideoData {
  fps: number;
  loopFrom?: number;
  frames: Key[];
}

type BodySpec = BodyFrame & { color: string };
type EyeSpec = Pick<EyePose, 'x' | 'y' | 'scaleX' | 'scaleY' | 'rotate' | 'color'>;

interface Frame {
  at: number;
  body: BodySpec;
  left: EyeSpec;
  right: EyeSpec;
  expr?: string;
}

export interface VideoOptions {
  from?: number;
  zoomCap?: number;
  posterIndex: number;
  bodyColor?: (color: string, index: number) => string;
  loop?: { hold: number; back: number };
}

const VIDEO_SCALE = 0.92;
const RETURN_STEP = 1000 / 60;

function eye(e: EyeKey): EyeSpec {
  return { x: e[0], y: e[1], scaleX: e[2], scaleY: e[3], rotate: e[4], color: NUBBY_PALETTE.eye };
}

function decode(data: VideoData, options: VideoOptions): { frames: Frame[]; loopFrom: number } {
  const from = options.from ?? 0;
  const t0 = (data.frames[from] as Key)[0];
  let entryExpr = 'calm';
  for (let i = 0; i <= from; i++) entryExpr = (data.frames[i] as Key)[11] || entryExpr;
  const raw: Frame[] = data.frames.slice(from).map((k, j) => {
    const expr = j === 0 ? entryExpr : k[11];
    return {
      at: k[0] - t0,
      body: {
        color: options.bodyColor ? options.bodyColor(k[1], from + j) : k[1],
        scale: Math.min(k[3], options.zoomCap ?? k[3]) / VIDEO_SCALE,
        scaleX: k[4],
        scaleY: k[5],
        rotate: k[6],
        x: k[7] / VIDEO_SCALE,
        y: k[8] / VIDEO_SCALE,
      },
      left: eye(k[9]),
      right: eye(k[10]),
      ...(expr ? { expr } : {}),
    };
  });
  const k = fitFactor(raw.map((f) => f.body));
  return {
    frames: raw.map((f) => ({ ...f, body: scaleAboutFeet(f.body, k) })),
    loopFrom: Math.max(0, (data.loopFrom ?? 0) - t0),
  };
}

function mixEye(a: EyeSpec, b: EyeSpec, t: number): EyeSpec {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    scaleX: lerp(a.scaleX, b.scaleX, t),
    scaleY: lerp(a.scaleY, b.scaleY, t),
    rotate: lerp(a.rotate, b.rotate, t),
    color: lerpColor(a.color, b.color, t),
  };
}

function mixFrame(a: Frame, b: Frame, t: number, at: number): Frame {
  return {
    at,
    body: {
      color: lerpColor(a.body.color, b.body.color, t),
      scale: lerp(a.body.scale, b.body.scale, t),
      scaleX: lerp(a.body.scaleX, b.body.scaleX, t),
      scaleY: lerp(a.body.scaleY, b.body.scaleY, t),
      rotate: lerp(a.body.rotate, b.body.rotate, t),
      x: lerp(a.body.x, b.body.x, t),
      y: lerp(a.body.y, b.body.y, t),
    },
    left: mixEye(a.left, b.left, t),
    right: mixEye(a.right, b.right, t),
  };
}

function exprAt(frames: Frame[], index: number): string {
  let expr = 'calm';
  for (let i = 0; i <= index; i++) expr = (frames[i] as Frame).expr || expr;
  return expr;
}

function withReturn(frames: Frame[], hold: number, back: number): Frame[] {
  const first = frames[0] as Frame;
  const last = frames[frames.length - 1] as Frame;
  const start = last.at + hold;
  const out = [...frames, { ...mixFrame(last, last, 0, start), expr: exprAt(frames, 0) }];
  const steps = Math.max(1, Math.round(back / RETURN_STEP));
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    out.push(mixFrame(last, first, easeInOutCubic(u), start + back * u));
  }
  return out;
}

function toSpec(f: Frame, exprSpeed: number): SequenceFrameSpec {
  return {
    at: f.at,
    body: f.body,
    eyes: { left: f.left, right: f.right },
    ...(f.expr ? { expr: f.expr, exprSpeed } : {}),
  };
}

export function videoEmotion(
  meta: Pick<EmotionRaw, 'id' | 'name' | 'desc'>,
  data: VideoData,
  options: VideoOptions,
): EmotionRaw {
  const { frames: decoded, loopFrom } = decode(data, options);
  const frames = options.loop ? withReturn(decoded, options.loop.hold, options.loop.back) : decoded;
  const posterIndex = options.posterIndex - (options.from ?? 0);
  const poster = decoded[posterIndex] as Frame;
  const returnStart = decoded.length;
  return {
    ...meta,
    group: 'video',
    bare: true,
    gaze: false,
    transition: 300,
    blinkMs: null,
    pool: [exprAt(decoded, posterIndex)],
    body: { ...poster.body, breathe: 0 },
    eyes: { left: poster.left, right: poster.right },
    sequence: {
      settle: 'hold',
      interp: 'linear',
      frames: frames.map((f, i) => toSpec(f, i === returnStart ? 10 : 100)),
      loopFrom: options.loop ? 0 : loopFrom,
    },
  };
}
