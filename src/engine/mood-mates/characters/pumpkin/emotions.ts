import { EMOTION_SEED } from '../../../emotion-ball/emotions';
import type {
  AnimSpec as BallAnim,
  EmotionRaw as BallEmotion,
  PoseSpec as BallPose,
} from '../../../emotion-ball/types';
import type { AnimSpec } from '../../types';

export const GROK_MOTION = 0.7036;

const BODY_COLORS: Record<string, string> = {
  '#F3F0EA': '@base',
  '#EEEBE4': '@dim',
  '#EBE8E1': '@dim',
  '#EDEAE3': '@dim',
  '#EFECE5': '@dim',
  '#EBE8E2': '@dim',
  '#EFE8E4': '@dim',
  '#F6EFE4': '@soft',
  '#F5EFE6': '@soft',
  '#F6F3EC': '@soft',
  '#F4D3D0': '@blush',
  '#E4574A': '@angry',
  '#E25B5B': '@alert',
  '#DE5555': '@alert',
};

const SCALED = new Set(['x', 'y', 'lookX', 'lookY']);

function scalePart<T extends object>(part: T | undefined): T | undefined {
  if (!part) return part;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(part)) {
    if (k === 'color' && typeof v === 'string')
      out[k] = BODY_COLORS[v.toUpperCase()] || (v === '#1A1A1A' ? '@eye' : v);
    else out[k] = typeof v === 'number' && SCALED.has(k) ? v * GROK_MOTION : v;
  }
  return out as T;
}

function scalePose(p: BallPose): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.body) out.body = scalePart(p.body);
  if (p.eyes) {
    out.eyes = {
      ...(p.eyes.both ? { both: scalePart(p.eyes.both) } : {}),
      ...(p.eyes.left ? { left: scalePart(p.eyes.left) } : {}),
      ...(p.eyes.right ? { right: scalePart(p.eyes.right) } : {}),
    };
  }
  return out;
}

function scaleAnim(a: BallAnim): AnimSpec {
  return SCALED.has(a.prop) && a.amp != null ? { ...a, amp: a.amp * GROK_MOTION } : { ...a };
}

function port(e: BallEmotion): Record<string, unknown> {
  const out: Record<string, unknown> = {
    desc: e.desc,
    transition: e.transition,
    pool: (e.pool || [0, 8]).map((i) => `g${i}`),
    ...scalePose(e),
  };
  if (e.gaze === false) out.gaze = false;
  if (e.poolMs) out.poolMs = e.poolMs;
  if (e.poolSpeed != null) out.poolSpeed = e.poolSpeed;
  if (e.blinkMs !== undefined) out.blinkMs = e.blinkMs;
  if (e.openness != null) out.openness = e.openness;
  if (e.antics) out.antics = true;
  if (e.anims) out.anims = e.anims.map(scaleAnim);
  if (e.sequence) {
    out.sequence = {
      ...(e.sequence.settle ? { settle: e.sequence.settle } : {}),
      frames: e.sequence.frames.map((f) => ({ ...(f.at != null ? { at: f.at } : {}), ...scalePose(f) })),
    };
  }
  return out;
}

export const PUMPKIN_GROK_EMOTIONS: Record<string, Record<string, unknown>> = Object.fromEntries(
  EMOTION_SEED.map((e) => [e.id, port(e)]),
);
