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

const AURA: Record<string, string> = {
  '05': 'swirl',
  '10': 'rainbow',
  '19': 'halo',
  '31': 'waves',
  '35': 'waves',
  '37': 'halo',
  '39': 'swirl',
  '40': 'scan',
};

function scalePart<T extends object>(part: T | undefined, motion: number): T | undefined {
  if (!part) return part;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(part)) {
    if (k === 'color' && typeof v === 'string')
      out[k] = BODY_COLORS[v.toUpperCase()] || (v === '#1A1A1A' ? '@eye' : v);
    else out[k] = typeof v === 'number' && SCALED.has(k) ? v * motion : v;
  }
  return out as T;
}

function scalePose(p: BallPose, motion: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.body) out.body = scalePart(p.body, motion);
  if (p.eyes) {
    out.eyes = {
      ...(p.eyes.both ? { both: scalePart(p.eyes.both, motion) } : {}),
      ...(p.eyes.left ? { left: scalePart(p.eyes.left, motion) } : {}),
      ...(p.eyes.right ? { right: scalePart(p.eyes.right, motion) } : {}),
    };
  }
  return out;
}

function scaleAnim(a: BallAnim, motion: number): AnimSpec {
  return SCALED.has(a.prop) && a.amp != null ? { ...a, amp: a.amp * motion } : { ...a };
}

function port(e: BallEmotion, motion: number): Record<string, unknown> {
  const out: Record<string, unknown> = {
    desc: e.desc,
    transition: e.transition,
    pool: (e.pool || [0, 8]).map((i) => `g${i}`),
    ...scalePose(e, motion),
  };
  const aura = AURA[e.id];
  if (aura) out.body = { ...(out.body as object | undefined), aura };
  if (e.gaze === false) out.gaze = false;
  if (e.poolMs) out.poolMs = e.poolMs;
  if (e.poolSpeed != null) out.poolSpeed = e.poolSpeed;
  if (e.blinkMs !== undefined) out.blinkMs = e.blinkMs;
  if (e.openness != null) out.openness = e.openness;
  if (e.antics) out.antics = true;
  if (e.anims) out.anims = e.anims.map((a) => scaleAnim(a, motion));
  if (e.sequence) {
    out.sequence = {
      ...(e.sequence.settle ? { settle: e.sequence.settle } : {}),
      frames: e.sequence.frames.map((f) => ({
        ...(f.at != null ? { at: f.at } : {}),
        ...scalePose(f, motion),
      })),
    };
  }
  return out;
}

export function grokEmotions(motion: number): Record<string, Record<string, unknown>> {
  return Object.fromEntries(EMOTION_SEED.map((e) => [e.id, port(e, motion)]));
}

export const PUMPKIN_GROK_EMOTIONS = grokEmotions(GROK_MOTION);
