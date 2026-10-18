import {
  BOUNCE_SEGS,
  BOUNCE_TOTAL,
  easeInOutCubic,
  lerp,
  lerpColor,
  lerpRing,
  type Spring,
  spring,
  springStep,
} from '../shared/math';
import { clamp, rand } from '../shared/util';
import { EMOTION_GROUPS, EMOTION_SEED } from './data/emotions';
import type { EyePair, Ring } from './geometry';
import * as GEO from './geometry';
import { getMaterial } from './materials';
import { type BallHandle, createBall } from './render';
import type {
  AnimSpec,
  BeatFrame,
  CelebrateBeat,
  CharacterEyeStyle,
  CharacterRaw,
  ClipDef,
  EmotionGroup,
  EmotionRaw,
  Palette,
  Pose,
  PoseSpec,
  ResolvedCharacter,
  SequenceSpec,
} from './types';

const TAU = Math.PI * 2;
const FALLBACK_ID = '02';

const characterMap = new Map<string, CharacterRaw>();
const charOrder: string[] = [];

const STATE_KEYS = ['base', 'dim', 'soft', 'blush', 'angry', 'alert', 'off'];

function resolveCharacter(raw: CharacterRaw): ResolvedCharacter {
  if (raw._resolved) return raw._resolved;
  const eyeStyle = Object.assign(
    { dx: 30, cy: 96, w: 26, h: 34, taper: 0.5, tilt: 0, bend: 0, highlight: null, pupil: null },
    raw.eyeStyle || {},
  ) as CharacterEyeStyle;
  const family = GEO.buildEyeFamily(eyeStyle);
  if (raw.eyeShapes) {
    for (const esk in raw.eyeShapes) {
      family[esk] = GEO.buildCustomEyePair(raw.eyeShapes[esk] as GEO.EyeShapeSpec, eyeStyle);
    }
  }
  const mouthBase = {
    w: (raw.features && typeof raw.features.mouth === 'object' && raw.features.mouth.w) || 26,
  };
  const mouthShapes: Record<string, Ring> = {};
  for (const slot of GEO.mouthSlots) {
    mouthShapes[slot] = GEO.buildMouth(slot, mouthBase);
  }
  if (raw.mouthShapes) {
    for (const msk in raw.mouthShapes) {
      mouthShapes[msk] = GEO.buildCustomMouth(Object.assign({ w: mouthBase.w }, raw.mouthShapes[msk]));
    }
  }
  const palette = Object.assign({ eye: '#233038', eyeHighlight: '#FFFFFF' }, raw.palette || {}) as Palette;
  palette.states = Object.assign({}, raw.palette?.states);
  for (const k of STATE_KEYS) {
    if (!palette.states[k]) palette.states[k] = palette.body;
  }

  const resolved: ResolvedCharacter = {
    id: raw.id,
    name: raw.name,
    en: raw.en || null,
    industry: raw.industry || 'general',
    desc: raw.desc || '',
    bodyRing: GEO.buildBody(raw.body),
    face: Object.assign({ x: 0, y: 0, sx: 1, sy: 1, eye: 1 }, raw.face || {}),
    palette,
    eyeStyle,
    eyeFamily: family,
    mouthShapes,
    defaultEyeRing: family.calm as EyePair,
    features: raw.features || {},
    fxSkin: raw.fxSkin || 'cloudpuff',
    material: raw.material || 'gloss',
    zzz: raw.zzz || null,
    props: raw.props || [],
    baseAnims: raw.baseAnims || [],
    clips: raw.clips || {},
    signatureClips: raw.signatureClips || [],
    celebrateBeat: raw.celebrateBeat || null,
    emotions: raw.emotions || null,
    raw,
  };
  raw._resolved = resolved;
  return resolved;
}

function resolveVariant(raw: CharacterRaw, vid?: string): ResolvedCharacter {
  const base = resolveCharacter(raw);
  if (!vid || !raw.variants?.[vid]) return base;
  raw._variantCache = raw._variantCache || {};
  if (!raw._variantCache[vid]) {
    const v = raw.variants[vid];
    raw._variantCache[vid] = Object.assign({}, base, {
      variant: vid,
      bodyRing: v?.body ? GEO.buildBody(v.body) : base.bodyRing,
      material: v?.material || base.material,
    });
  }
  return raw._variantCache[vid] as ResolvedCharacter;
}

export interface RegisterResult {
  ok: boolean;
  id?: string;
  errors?: string[];
}

export interface VariantInfo {
  id: string;
  name: string;
  en: { name?: string } | null;
}

export const characters = {
  register(raw: CharacterRaw): RegisterResult {
    if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) {
      return { ok: false, errors: ['Character is missing a valid id'] };
    }
    if (!raw.body?.type) {
      return { ok: false, id: raw.id, errors: ['Character is missing body.type (body generator)'] };
    }
    const unknownMaterials = [raw.material, ...Object.values(raw.variants || {}).map((v) => v.material)]
      .filter((m): m is string => !!m && !getMaterial(m))
      .map((m) => `Unknown material: ${m}`);
    if (unknownMaterials.length) return { ok: false, id: raw.id, errors: unknownMaterials };
    const groupKeys = (raw.emotionGroups || []).map((g) => g.key);
    const extraErrors = (raw.extraEmotions || []).flatMap((e) => {
      const errs = validate(e, groupKeys);
      if (config.getRaw(e.id)) errs.push('id collides with a built-in emotion');
      return errs.map((m) => `[${e?.id || '?'}] ${m}`);
    });
    if (extraErrors.length) return { ok: false, id: raw.id, errors: extraErrors };
    try {
      resolveCharacter(raw);
      if (raw.variants) {
        for (const vk in raw.variants) resolveVariant(raw, vk);
      }
    } catch (e) {
      return { ok: false, id: raw.id, errors: [(e as Error).message] };
    }
    if (!characterMap.has(raw.id)) charOrder.push(raw.id);
    characterMap.set(raw.id, raw);
    return { ok: true, id: raw.id };
  },
  get(id: string, variant?: string): ResolvedCharacter | null {
    const raw = characterMap.get(id);
    return raw ? resolveVariant(raw, variant) : null;
  },
  variants(id: string): VariantInfo[] {
    const raw = characterMap.get(id);
    if (!raw?.variants) return [];
    const variants = raw.variants;
    return Object.keys(variants).map((k) => {
      const v = variants[k] as NonNullable<CharacterRaw['variants']>[string];
      return { id: k, name: v.name || k, en: v.en || null };
    });
  },
  list(): ResolvedCharacter[] {
    return charOrder.map((id) => resolveCharacter(characterMap.get(id) as CharacterRaw));
  },
  defaultId(): string | null {
    return charOrder[0] || null;
  },
  emotionList(id: string, group?: string | null): EmotionRaw[] {
    const extras = characterMap.get(id)?.extraEmotions || [];
    return config.list(group).concat(extras.filter((e) => !group || e.group === group));
  },
  emotionGroups(id: string): EmotionGroup[] {
    const extra = characterMap.get(id)?.emotionGroups || [];
    const base = config.groups();
    return base.concat(extra.filter((g) => !base.some((b) => b.key === g.key)));
  },
  emotionDef(id: string, emotionId: string): EmotionRaw | null {
    return (
      config.getRaw(emotionId) || characterMap.get(id)?.extraEmotions?.find((e) => e.id === emotionId) || null
    );
  },
};

const DEFAULT_BODY = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  color: '@base',
  breathe: 0.01,
  spinFx: 0,
  confetti: 0,
  sketch: 0,
  zzz: 0,
  orbit: 0,
  scaleX: 1,
  scaleY: 1,
};
const DEFAULT_EYE = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  open: 1,
  color: '@eye',
  lookX: 0,
  lookY: 0,
};
const DEFAULT_FACE = {
  blush: 0,
  browVis: 0,
  browTilt: 0,
  browRaise: 0,
  mouthX: 0,
  mouthY: 0,
  mouthSX: 1,
  mouthSY: 1,
};

function defaultPose(): Pose {
  return {
    body: Object.assign({}, DEFAULT_BODY),
    left: Object.assign({}, DEFAULT_EYE),
    right: Object.assign({}, DEFAULT_EYE),
    face: Object.assign({}, DEFAULT_FACE),
    props: {},
  };
}
function clonePose(p: Pose): Pose {
  return {
    body: Object.assign({}, p.body),
    left: Object.assign({}, p.left),
    right: Object.assign({}, p.right),
    face: Object.assign({}, p.face),
    props: Object.assign({}, p.props),
  };
}

function applySpec(pose: Pose, spec: PoseSpec | undefined): Pose {
  if (!spec) return pose;
  if (spec.body) Object.assign(pose.body, spec.body);
  if (spec.face) Object.assign(pose.face, spec.face);
  if (spec.props) Object.assign(pose.props, spec.props);
  const e = spec.eyes;
  if (e) {
    if (e.both) {
      Object.assign(pose.left, e.both);
      Object.assign(pose.right, e.both);
    }
    if (e.left) Object.assign(pose.left, e.left);
    if (e.right) Object.assign(pose.right, e.right);
  }
  return pose;
}

const POSE_PARTS = ['body', 'left', 'right', 'face'] as const;

function propRest(key: string, other: number): number {
  return key.endsWith('O') ? 0 : other;
}

function lerpProps(a: Record<string, number>, b: Record<string, number>, t: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k in b) {
    const vb = b[k] as number;
    out[k] = lerp(a[k] != null ? (a[k] as number) : propRest(k, vb), vb, t);
  }
  for (const k in a) {
    if (!(k in b)) {
      const va = a[k] as number;
      out[k] = lerp(va, propRest(k, va), t);
    }
  }
  return out;
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = defaultPose();
  out.props = lerpProps(a.props, b.props, t);
  for (const part of POSE_PARTS) {
    const pa = a[part] as unknown as Record<string, unknown>;
    const pb = b[part] as unknown as Record<string, unknown>;
    const po = out[part] as unknown as Record<string, unknown>;
    for (const k in pb) {
      const vb = pb[k];
      if (typeof vb === 'number') po[k] = lerp(pa[k] != null ? (pa[k] as number) : vb, vb, t);
      else if (k === 'color') po[k] = lerpColor((pa[k] as string) || (vb as string), vb as string, t);
      else po[k] = vb;
    }
  }
  return out;
}

interface PoseFrame {
  at: number;
  pose: Pose;
  expr?: string;
  exprSpeed?: number;
}

function sampleFrameList(frames: PoseFrame[], t: number, linear = false): Pose | null {
  if (!frames.length) return null;
  const first = frames[0] as PoseFrame;
  if (t <= first.at) return clonePose(first.pose);
  const last = frames[frames.length - 1] as PoseFrame;
  if (t >= last.at) return clonePose(last.pose);
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i] as PoseFrame;
    const b = frames[i + 1] as PoseFrame;
    if (t >= a.at && t < b.at) {
      const u = (t - a.at) / (b.at - a.at);
      return lerpPose(a.pose, b.pose, linear ? u : easeInOutCubic(u));
    }
  }
  return clonePose(last.pose);
}

type AnimFn = (a: AnimSpec, t: number, eng?: EmotionEngine) => number;

const ANIM_TYPES: Record<string, AnimFn> = {
  sine: (a, t) => (a.amp as number) * Math.sin((TAU * t) / (a.period || 2000) + (a.phase || 0)),
  pulse: (a, t) => (a.amp as number) * 0.5 * (1 - Math.cos((TAU * t) / (a.period || 1000) + (a.phase || 0))),
  jitter: (a, t, eng) => {
    const seed = (eng as EmotionEngine).seed;
    const s = (t / 1000) * (a.speed || 8);
    let v =
      ((Math.sin(s * 3.1 + seed) + Math.sin(s * 5.7 + seed * 2.3) + Math.sin(s * 9.3 + seed * 4.1)) / 3) *
      (a.amp as number);
    if (a.decay) v *= clamp(1 - t / a.decay, 0, 1);
    return v;
  },
  scan: (a, t) => {
    const per = a.period || 800;
    const p = ((t + (a.phaseMs || 0)) % per) / per;
    const tri = p < 0.5 ? p * 4 - 1 : 3 - p * 4;
    return (a.amp as number) * tri;
  },
  glance: (a, t) => {
    const per = a.period || 3600;
    const ph = TAU * (((t + (a.phaseMs || 0)) % per) / per) + (a.phase || 0);
    return (a.amp as number) * Math.tanh(2.8 * Math.sin(ph));
  },
  blink: (a, t, eng) => {
    const interval = a.interval || 3800;
    const dur = a.dur || 200;
    const p = (t + (a.phaseMs || 0) + (eng ? eng.seed * 97 : 0)) % interval;
    if (p >= dur) return 0;
    return -(a.depth == null ? 1 : a.depth) * Math.sin(Math.PI * (p / dur));
  },
};

function applyAnim(pose: Pose, a: AnimSpec, t: number, eng: EmotionEngine): void {
  const fn = ANIM_TYPES[a.type];
  if (!fn) return;
  const v = fn(a, t, eng);
  const targets: Array<Record<string, unknown>> = (a.target === 'eyes'
    ? [pose.left, pose.right]
    : a.target === 'body'
      ? [pose.body]
      : a.target === 'face'
        ? [pose.face]
        : a.target === 'left'
          ? [pose.left]
          : a.target === 'right'
            ? [pose.right]
            : []) as unknown as Array<Record<string, unknown>>;
  for (let i = 0; i < targets.length; i++) {
    const tg = targets[i] as Record<string, number>;
    if (a.prop === 'scale') {
      if ((tg as unknown) === (pose.body as unknown)) tg.scale = (tg.scale as number) + v;
      else {
        tg.scaleX = (tg.scaleX as number) + v;
        tg.scaleY = (tg.scaleY as number) + v;
      }
    } else if (a.prop in tg) {
      tg[a.prop] = (tg[a.prop] as number) + v;
    }
  }
}

interface EmotionDef {
  id: string;
  name: string;
  group: string;
  desc: string;
  gaze: boolean;
  transition: number;
  pool: string[];
  poolMs: [number, number];
  poolSpeed: number;
  blinkMs: [number, number] | null;
  openness: number;
  antics: boolean;
  mouth: string;
  base: Pose;
  anims: AnimSpec[];
  life: AnimSpec[];
  sequence: {
    frames: PoseFrame[];
    settle: SequenceSpec['settle'];
    linear: boolean;
    loopFrom: number | null;
  } | null;
  raw: EmotionRaw;
}

const GROUPS: EmotionGroup[] = EMOTION_GROUPS.slice();

const registry = new Map<string, EmotionRaw>();
const order: string[] = [];
let configVersion = 0;

function knownGroup(g: string): boolean {
  return GROUPS.some((x) => x.key === g);
}

function validate(raw: EmotionRaw, extraGroups: string[] = []): string[] {
  const errs: string[] = [];
  if (!raw || typeof raw !== 'object') {
    errs.push('Config must be an object');
    return errs;
  }
  if (typeof raw.id !== 'string' || !raw.id.trim()) errs.push('Missing a valid string id');
  if (typeof raw.name !== 'string' || !raw.name.trim()) errs.push('Missing name');
  if (!knownGroup(raw.group) && !extraGroups.includes(raw.group)) errs.push(`Invalid group: ${raw.group}`);
  if (raw.pool != null) {
    if (!Array.isArray(raw.pool)) errs.push('pool must be an array of eye slot names');
    else
      raw.pool.forEach((s, i) => {
        if (typeof s !== 'string') errs.push(`pool[${i}] must be an eye slot name string`);
      });
  }
  if (raw.mouth != null && typeof raw.mouth !== 'string') {
    errs.push('mouth must be a mouth slot name string');
  }
  if (raw.anims != null) {
    if (!Array.isArray(raw.anims)) errs.push('anims must be an array');
    else
      raw.anims.forEach((a, i) => {
        if (!a || !ANIM_TYPES[a.type]) errs.push(`anims[${i}] unknown animation type: ${a?.type}`);
      });
  }
  if (raw.sequence != null && !Array.isArray(raw.sequence.frames)) {
    errs.push('sequence.frames must be an array');
  }
  return errs;
}

function register(raw: EmotionRaw): RegisterResult {
  const errs = validate(raw);
  if (errs.length) return { ok: false, id: raw?.id, errors: errs };
  if (!registry.has(raw.id)) order.push(raw.id);
  registry.set(raw.id, raw);
  configVersion++;
  return { ok: true, id: raw.id };
}

function mergeRaw(base: EmotionRaw, over: Record<string, unknown> | null | undefined): EmotionRaw {
  if (!over) return base;
  const o = over as Partial<EmotionRaw>;
  const out: EmotionRaw = Object.assign({}, base, o);
  if (base.body || o.body) out.body = Object.assign({}, base.body, o.body);
  if (base.face || o.face) out.face = Object.assign({}, base.face, o.face);
  if (base.eyes || o.eyes) {
    out.eyes = {};
    for (const k of ['both', 'left', 'right'] as const) {
      if (base.eyes?.[k] || o.eyes?.[k]) {
        (out.eyes as NonNullable<PoseSpec['eyes']>)[k] = Object.assign({}, base.eyes?.[k], o.eyes?.[k]);
      }
    }
  }
  return out;
}

function resolveColor(v: string, ch: ResolvedCharacter): string {
  if (typeof v !== 'string' || v.charAt(0) !== '@') return v;
  const key = v.slice(1);
  if (key === 'eye') return ch.palette.eye;
  return ch.palette.states[key] || ch.palette.body;
}
function resolvePoseColors(pose: Pose, ch: ResolvedCharacter): Pose {
  pose.body.color = resolveColor(pose.body.color, ch);
  pose.left.color = resolveColor(pose.left.color, ch);
  pose.right.color = resolveColor(pose.right.color, ch);
  return pose;
}

function normalizeFor(rawIn: EmotionRaw, ch: ResolvedCharacter): EmotionDef {
  const raw = mergeRaw(rawIn, ch.emotions?.[rawIn.id]);
  const base = resolvePoseColors(applySpec(defaultPose(), raw), ch);
  let pool = (raw.pool || ['calm', 'calm2']).filter((s) => ch.eyeFamily[s]);
  if (!pool.length) pool = ['calm'];
  const def: EmotionDef = {
    id: raw.id,
    name: raw.name,
    group: raw.group,
    desc: raw.desc || '',
    gaze: raw.gaze !== false,
    transition: raw.transition != null ? raw.transition : 500,
    pool,
    poolMs: raw.poolMs || [9000, 16000],
    poolSpeed: raw.poolSpeed || 6,
    blinkMs: raw.blinkMs !== undefined ? raw.blinkMs : [6000, 14000],
    openness: raw.openness != null ? raw.openness : 1,
    antics: !!raw.antics,
    mouth: raw.mouth && ch.mouthShapes[raw.mouth] ? raw.mouth : 'flat',
    base,
    anims: [...(raw.bare ? [] : ch.baseAnims), ...(raw.anims || [])].map((a) => Object.assign({}, a)),
    life: raw.bare ? ch.baseAnims.map((a) => Object.assign({}, a)) : [],
    sequence: null,
    raw,
  };
  if (raw.sequence) {
    const frames = raw.sequence.frames
      .map((f) => ({
        at: f.at || 0,
        pose: resolvePoseColors(applySpec(clonePose(base), f), ch),
        expr: f.expr,
        exprSpeed: f.exprSpeed,
      }))
      .sort((x, y) => x.at - y.at);
    def.sequence = {
      frames,
      settle: raw.sequence.settle || 'base',
      linear: raw.sequence.interp === 'linear',
      loopFrom: raw.sequence.loopFrom != null ? raw.sequence.loopFrom : null,
    };
  }
  return def;
}

export interface ImportResult {
  ok: boolean;
  added: number;
  errors: string[];
}

export const config = {
  register,
  getRaw(id: string): EmotionRaw | null {
    return registry.get(id) || null;
  },
  list(group?: string | null): EmotionRaw[] {
    return order.map((id) => registry.get(id) as EmotionRaw).filter((d) => !group || d.group === group);
  },
  groups(): EmotionGroup[] {
    return GROUPS.map((g) => ({ key: g.key, name: g.name }));
  },
  version(): number {
    return configVersion;
  },
  exportConfig(): string {
    return JSON.stringify(
      order.map((id) => registry.get(id)),
      null,
      2,
    );
  },
  importConfig(json: unknown): ImportResult {
    let data: unknown;
    try {
      data = typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
      return { ok: false, added: 0, errors: [`JSON parse failed: ${(e as Error).message}`] };
    }
    const arr = (Array.isArray(data) ? data : [data]) as EmotionRaw[];
    let added = 0;
    const errors: string[] = [];
    for (const raw of arr) {
      const r = register(raw);
      if (r.ok) added++;
      else errors.push(`[${raw?.id || '?'}] ${(r.errors as string[]).join('; ')}`);
    }
    return { ok: errors.length === 0, added, errors };
  },
};

const ticker = {
  set: new Set<EmotionEngine>(),
  raf: 0,
  add(e: EmotionEngine): void {
    this.set.add(e);
    if (!this.raf) this.raf = requestAnimationFrame(ticker.loop);
  },
  remove(e: EmotionEngine): void {
    this.set.delete(e);
  },
  loop(now: number): void {
    ticker.raf = 0;
    ticker.set.forEach((e) => {
      e.tick(now);
    });
    if (ticker.set.size) ticker.raf = requestAnimationFrame(ticker.loop);
  },
};

export interface IdleConfig {
  standbyAfter: number;
  sleepAfter: number;
  standbyId: string;
  sleepId: string;
}

export interface EngineOptions {
  character?: string;
  variant?: string;
  emotion?: string;
  material?: string;
  idle?: boolean | Partial<IdleConfig>;
  label?: string;
  lite?: boolean;
  autostart?: boolean;
  color?: string;
  eyeColor?: string;
  eyeScale?: number;
  fallbackId?: string;
}

export interface ChangeEvent {
  id: string;
  def: EmotionDef;
  auto: boolean;
}
export interface TipsEvent {
  text: string;
}
export interface ErrorEvent {
  message: string;
  id?: string;
  raw?: unknown;
}
type EventPayloads = { change: ChangeEvent; tips: TipsEvent; error: ErrorEvent };
type EventName = keyof EventPayloads;

interface ActiveClip {
  def: ClipDef;
  start: number;
  strength: number;
  exprIdx: number;
  burstIdx: number;
}

interface ClickSeq {
  start: number;
  frames: PoseFrame[];
  fade: number;
}

interface SeqState {
  frames: PoseFrame[];
  settle: SequenceSpec['settle'];
  done: boolean;
  doneAt: number;
  linear: boolean;
  loopFrom: number | null;
}

export class EmotionEngine {
  character: ResolvedCharacter;
  ball: BallHandle;
  seed: number;
  private events: Record<string, Array<(payload: never) => void>> = {};
  private gaze = { x: 0, y: 0, tx: 0, ty: 0 };
  private style = { sketch: 0 };
  private theme: { body: string; eyes: string } | null;
  private eyeScale: number;
  private lastTick = 0;
  private spinState: Spring | null = null;
  private defs = new Map<string, EmotionDef>();
  private defsVersion = -1;
  private ringSrc: [Ring, Ring];
  private ringDst: [Ring, Ring];
  private ringCur: [Ring, Ring];
  private ringSpring: Spring;
  private ringSpeed = 7;
  private exprSlot = 'calm';
  private poolPos = 0;
  private poolNext = 0;
  private mouthSrc: Ring;
  private mouthDst: Ring;
  private mouthCur: Ring;
  private mouthSpring: Spring;
  private mouthSlot = 'flat';
  private mouthHoldUntil = 0;
  private openSpring: Spring;
  private blinkQ: Array<{ at: number; v: number }> = [];
  private blinkNext = Number.POSITIVE_INFINITY;
  private anticNext = 0;
  private bounceAt = -1;
  private def: EmotionDef | null = null;
  private lastPose: Pose | null = null;
  private prevPose: Pose | null = null;
  private transStart = 0;
  private transDur = 0;
  private emoStart = 0;
  private seq: SeqState | null = null;
  private clickSeq: ClickSeq | null = null;
  private clip: ActiveClip | null = null;
  private lastClip = '';
  private seqExprIdx = 0;
  private seqCycle = 0;
  private active = false;
  private isTouring = false;
  private tourTimer: ReturnType<typeof setInterval> | 0 = 0;
  private fallbackId: string;
  private lastActivity: number;
  private idle: IdleConfig | null;
  private dt = 0;

  constructor(target: string | HTMLElement, opts: EngineOptions = {}) {
    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (!el) throw new Error('MoodMates.create: container element not found');

    const chId = opts.character || (characters.defaultId() as string);
    const ch = characters.get(chId, opts.variant);
    if (!ch) throw new Error('MoodMates.create: no character registered (register a character first)');
    this.character = ch;

    this.ball = createBall(el, {
      ...opts,
      character: ch,
      lite: opts.lite != null ? opts.lite : opts.autostart === false,
    });
    this.seed = Math.random() * 100;
    this.theme = opts.color ? { body: opts.color, eyes: opts.eyeColor || '#FFFFFF' } : null;
    this.eyeScale = opts.eyeScale || 1;

    const calm = ch.eyeFamily.calm as EyePair;
    this.ringSrc = [calm[0], calm[1]];
    this.ringDst = [calm[0], calm[1]];
    this.ringCur = this.ringDst;
    this.ringSpring = spring(1);

    const flat = ch.mouthShapes.flat as Ring;
    this.mouthSrc = flat;
    this.mouthDst = flat;
    this.mouthCur = flat;
    this.mouthSpring = spring(1);

    this.openSpring = spring(1);

    this.fallbackId = opts.fallbackId || FALLBACK_ID;
    this.lastActivity = performance.now();

    if (opts.idle) {
      this.idle = Object.assign(
        { standbyAfter: 60000, sleepAfter: 180000, standbyId: '02', sleepId: '00' },
        opts.idle === true ? {} : opts.idle,
      );
    } else {
      this.idle = null;
    }

    this.setEmotion(opts.emotion || this.fallbackId, { auto: true });
    if (opts.autostart !== false) this.setActive(true);
    else this.renderStatic();
  }

  on<E extends EventName>(evt: E, cb: (payload: EventPayloads[E]) => void): this {
    const list = this.events[evt] || [];
    this.events[evt] = list;
    list.push(cb as (payload: never) => void);
    return this;
  }

  off<E extends EventName>(evt: E, cb: (payload: EventPayloads[E]) => void): this {
    const list = this.events[evt];
    if (list) {
      const i = list.indexOf(cb as (payload: never) => void);
      if (i >= 0) list.splice(i, 1);
    }
    return this;
  }

  private emit<E extends EventName>(evt: E, payload: EventPayloads[E]): void {
    (this.events[evt] || []).slice().forEach((cb) => {
      try {
        (cb as (payload: EventPayloads[E]) => void)(payload);
      } catch (e) {
        console.error(e);
      }
    });
  }

  get emotionId(): string | null {
    return this.def ? this.def.id : null;
  }

  get touring(): boolean {
    return this.isTouring;
  }

  private getDef(id: string): EmotionDef | null {
    if (this.defsVersion !== config.version()) {
      this.defs.clear();
      this.defsVersion = config.version();
    }
    if (this.defs.has(id)) return this.defs.get(id) as EmotionDef;
    const raw = config.getRaw(id) || this.character.raw.extraEmotions?.find((e) => e.id === id);
    if (!raw) return null;
    const def = normalizeFor(raw, this.character);
    this.defs.set(id, def);
    return def;
  }

  setEmotion(id: string, o: { auto?: boolean } = {}): boolean {
    let def = this.getDef(id);
    if (!def) {
      console.warn(`[MoodMates] Unknown emotion ID "${id}", falling back to idle (${this.fallbackId})`);
      this.emit('error', { message: `Unknown emotion ID "${id}", fell back to idle`, id });
      def = this.getDef(this.fallbackId);
      if (!def) return false;
    }
    const now = performance.now();
    this.clickSeq = null;
    const prevId = this.def ? this.def.id : null;
    this.prevPose = this.lastPose ? clonePose(this.lastPose) : null;
    this.def = def;
    this.emoStart = now;
    this.transStart = now;
    this.transDur = this.prevPose ? def.transition : 0;
    this.seq = def.sequence
      ? {
          frames: def.sequence.frames,
          settle: def.sequence.settle,
          done: false,
          doneAt: 0,
          linear: def.sequence.linear,
          loopFrom: def.sequence.loopFrom,
        }
      : null;
    this.seqExprIdx = 0;
    this.seqCycle = 0;
    if (!o.auto) this.lastActivity = now;

    this.poolPos = 0;
    this.mouthHoldUntil = 0;
    this.setExpr(def.pool[0] as string, def.poolSpeed >= 10 ? 10 : 8);
    this.setMouth(def.mouth, 8);
    this.poolNext = now + rand(def.poolMs[0], def.poolMs[1]);
    if (prevId !== null && prevId !== def.id && def.blinkMs) this.blinkNow(now);
    this.blinkNext = def.blinkMs ? now + rand(def.blinkMs[0], def.blinkMs[1]) : Number.POSITIVE_INFINITY;
    this.anticNext = now + rand(2500, 5000);

    this.emit('change', { id: def.id, def, auto: !!o.auto });
    if (this.active) {
      const fx = def.base.body;
      let signed = false;
      if (fx.spinFx > 0) {
        signed = this.signature(fx.spinFx >= 1 ? 1 : 0.7);
        if (!signed) this.spin(fx.spinFx >= 1 ? 2 : 1);
      }
      if (fx.confetti > 0 && !(signed && this.ball.signatureComplete)) this.burst(20);
    }
    if (!this.active) this.renderStatic();
    return true;
  }

  handleAIMessage(msg: unknown): boolean {
    let obj = msg as { emotionId?: unknown; tips?: unknown } | null;
    if (typeof msg === 'string') {
      try {
        obj = JSON.parse(msg);
      } catch {
        this.emit('error', { message: 'Failed to parse AI message JSON, fell back to idle', raw: msg });
        this.setEmotion(this.fallbackId);
        return false;
      }
    }
    if (!obj || typeof obj !== 'object' || typeof obj.emotionId !== 'string') {
      this.emit('error', {
        message: 'AI message is missing the emotionId field, fell back to idle',
        raw: msg,
      });
      this.setEmotion(this.fallbackId);
      return false;
    }
    const ok = this.setEmotion(obj.emotionId);
    if (obj.tips) this.emit('tips', { text: String(obj.tips) });
    return ok;
  }

  startTour(ids: string[], interval?: number): void {
    this.stopTour();
    if (!ids?.length) return;
    const ms = interval || 2500;
    this.isTouring = true;
    let i = 0;
    this.setEmotion(ids[0] as string, { auto: true });
    this.tourTimer = setInterval(() => {
      i = (i + 1) % ids.length;
      this.setEmotion(ids[i] as string, { auto: true });
    }, ms);
  }

  stopTour(): void {
    if (this.tourTimer) {
      clearInterval(this.tourTimer);
      this.tourTimer = 0;
    }
    this.isTouring = false;
    this.lastActivity = performance.now();
  }

  resetIdle(): void {
    this.lastActivity = performance.now();
  }

  setGaze(nx: number, ny: number): this {
    this.gaze.tx = clamp(nx, -1, 1) * 24;
    this.gaze.ty = clamp(ny, -1, 1) * 15;
    return this;
  }

  clearGaze(): this {
    this.gaze.tx = 0;
    this.gaze.ty = 0;
    return this;
  }

  setStyle(style?: { sketch?: number }): this {
    Object.assign(this.style, style || {});
    if (!this.active) this.renderStatic();
    return this;
  }

  spin(turns?: number, dir?: number): this {
    if (this.spinState) return this;
    const d = dir || (Math.random() < 0.5 ? -1 : 1);
    this.spinState = { x: 0, v: 0, t: Math.max(1, Math.round(turns || 1)) * TAU * d };
    return this;
  }

  burst(count?: number): this {
    if (this.ball.burst) this.ball.burst(count);
    return this;
  }

  playClip(name: string, strength?: number): boolean {
    const def = this.character.clips[name];
    if (!def) return false;
    this.lastClip = name;
    this.clip = {
      def,
      start: performance.now(),
      strength: strength == null ? 1 : strength,
      exprIdx: 0,
      burstIdx: 0,
    };
    return true;
  }

  private playSignatureClip(strength?: number): boolean {
    if (this.clip) return true;
    const names = this.character.signatureClips;
    if (!names.length) return false;
    const pool = names.length > 1 ? names.filter((n) => n !== this.lastClip) : names;
    return this.playClip(pool[Math.floor(Math.random() * pool.length)] as string, strength);
  }

  signature(strength?: number): boolean {
    if (this.playSignatureClip(strength)) return true;
    const ok = this.ball.signature ? !!this.ball.signature(strength) : false;
    if (ok && this.ball.signatureMouth) {
      this.mouthHoldUntil = performance.now() + (this.ball.signatureMouthMs || 1400);
      this.setMouth(this.ball.signatureMouth, 10);
    }
    return ok;
  }

  celebrate(strength?: number): this {
    const s = strength == null ? 1 : strength;
    this.playCelebrateBeat();
    const signed = this.signature(s);
    if (signed && (this.ball.signatureComplete || this.clip)) return this;
    const r = Math.random();
    if (r < 0.5) this.spin(1);
    else if (r < 0.85) this.bounce();
    this.burst(Math.round(10 + 8 * s));
    return this;
  }

  private playCelebrateBeat(): void {
    const beat: CelebrateBeat | null | undefined = this.character?.celebrateBeat;
    if (!beat?.frames?.length) return;
    const ch = this.character;
    const frames = beat.frames
      .map((f: BeatFrame) => ({ at: f.at || 0, pose: resolvePoseColors(applySpec(defaultPose(), f), ch) }))
      .sort((x, y) => x.at - y.at);
    const now = performance.now();
    this.clickSeq = { start: now, frames, fade: beat.fade != null ? beat.fade : 280 };
    const expr = beat.expr && ch.eyeFamily[beat.expr] ? beat.expr : 'happy';
    const mouth = beat.mouth && ch.mouthShapes[beat.mouth] ? beat.mouth : 'grin';
    this.setExpr(expr, 10);
    this.setMouth(mouth, 10);
    this.mouthHoldUntil = now + (frames[frames.length - 1] as PoseFrame).at + this.clickSeq.fade;
  }

  private applyClickBeat(basePose: Pose, now: number): Pose | null {
    const seq = this.clickSeq;
    if (!seq) return null;
    const t = now - seq.start;
    const frames = seq.frames;
    const last = frames[frames.length - 1] as PoseFrame;
    const fade = seq.fade;
    if (t >= last.at + fade) {
      this.clickSeq = null;
      if (this.def) {
        this.setMouth(this.def.mouth, 8);
        this.setExpr((this.def.pool[this.poolPos] || this.def.pool[0]) as string, 8);
      }
      return null;
    }
    const beat = (t >= last.at ? last.pose : sampleFrameList(frames, t)) as Pose;
    const out = t >= last.at ? lerpPose(beat, basePose, easeInOutCubic((t - last.at) / fade)) : beat;
    out.left.ring = basePose.left.ring;
    out.right.ring = basePose.right.ring;
    out.face.mouthRing = basePose.face.mouthRing;
    return out;
  }

  bounce(): this {
    if (this.bounceAt < 0) this.bounceAt = performance.now();
    return this;
  }

  private setExpr(slot: string, speed?: number): void {
    if (slot === this.exprSlot && this.ringSpring.x >= 0.999) return;
    const pair = this.character.eyeFamily[slot];
    if (!pair) return;
    const s = clamp(this.ringSpring.x, 0, 1);
    this.ringSrc = [
      lerpRing(this.ringSrc[0], this.ringDst[0], s),
      lerpRing(this.ringSrc[1], this.ringDst[1], s),
    ];
    this.ringDst = [pair[0], pair[1]];
    this.ringSpring.x = 0;
    this.ringSpring.v = 0;
    this.ringSpring.t = 1;
    this.ringSpeed = speed || 7;
    this.exprSlot = slot;
    if (speed != null && speed >= 60) {
      this.ringSrc = [pair[0], pair[1]];
      this.ringSpring.x = 1;
    }
  }

  private setMouth(slot: string, _speed?: number): void {
    if (slot === this.mouthSlot && this.mouthSpring.x >= 0.999) return;
    const ring = this.character.mouthShapes[slot];
    if (!ring) return;
    const s = clamp(this.mouthSpring.x, 0, 1);
    this.mouthSrc = lerpRing(this.mouthSrc, this.mouthDst, s);
    this.mouthDst = ring;
    this.mouthSpring.x = 0;
    this.mouthSpring.v = 0;
    this.mouthSpring.t = 1;
    this.mouthSlot = slot;
  }

  private blinkNow(t: number): void {
    this.blinkQ.push(
      { at: t, v: 0.05 },
      { at: t + 70, v: 0.05 },
      { at: t + 150, v: 1.08 },
      { at: t + 300, v: 1 },
    );
    if (Math.random() < 0.14) {
      this.blinkQ.push({ at: t + 370, v: 0.05 }, { at: t + 480, v: 1 });
    }
  }

  registerEmotion(raw: EmotionRaw): RegisterResult {
    return config.register(raw);
  }

  setActive(on: boolean): void {
    if (on === this.active) return;
    this.active = on;
    if (on) ticker.add(this);
    else ticker.remove(this);
  }

  replay(): void {
    if (this.def) this.setEmotion(this.def.id, { auto: true });
  }

  renderStatic(): void {
    this.transDur = 0;
    this.ringSpring.x = 1;
    this.ringSpring.v = 0;
    this.mouthSpring.x = 1;
    this.mouthSpring.v = 0;
    this.openSpring.x = this.def ? this.def.openness : 1;
    this.openSpring.v = 0;
    const seq = this.seq;
    this.seq = null;
    this.tick(performance.now());
    this.seq = seq;
  }

  destroy(): void {
    this.stopTour();
    this.setActive(false);
    this.events = {};
    this.ball.destroy();
  }

  tick(now: number): void {
    this.dt = this.lastTick ? clamp((now - this.lastTick) / 1000, 0.001, 0.05) : 1 / 60;
    this.lastTick = now;
    if (this.idle && !this.isTouring) this.checkIdle(now);
    const pose = this.compose(now, 0);
    this.ball.applyPose(pose);
    this.lastPose = pose;
  }

  private checkIdle(now: number): void {
    const idle = this.idle as IdleConfig;
    const elapsed = now - this.lastActivity;
    const cur = this.emotionId;
    if (elapsed >= idle.sleepAfter) {
      if (cur !== idle.sleepId) this.setEmotion(idle.sleepId, { auto: true });
    } else if (elapsed >= idle.standbyAfter) {
      if (cur !== idle.standbyId && cur !== idle.sleepId) {
        this.setEmotion(idle.standbyId, { auto: true });
      }
    }
  }

  private compose(now: number, depth: number): Pose {
    const def = this.def as EmotionDef;
    const t = now - this.emoStart;
    let pose: Pose;

    if (this.seq) {
      const res = this.seqPose(t, now);
      if (res === 'switch') {
        return depth < 4 ? this.compose(now, depth + 1) : clonePose((this.def as EmotionDef).base);
      }
      pose = res || clonePose(def.base);
    } else {
      pose = clonePose(def.base);
    }

    const br = pose.body.breathe || 0;
    if (br) {
      const ph = (TAU * now) / 3600;
      pose.body.scale += br * Math.sin(ph);
      pose.body.y += br * 55 * Math.sin(ph + 0.6);
    }

    for (let i = 0; i < def.anims.length; i++) applyAnim(pose, def.anims[i] as AnimSpec, t, this);
    if (def.life.length && (!this.seq || this.seq.done)) {
      const k = this.seq ? clamp((now - this.seq.doneAt) / 400, 0, 1) : 1;
      for (let i = 0; i < def.life.length; i++) {
        const a = def.life[i] as AnimSpec;
        applyAnim(pose, { ...a, amp: (a.amp || 0) * k }, t, this);
      }
    }

    const dt = this.dt || 1 / 60;

    if (this.active && now >= this.poolNext) {
      if (def.pool.length > 1) {
        this.poolPos = (this.poolPos + 1 + Math.floor(rand(0, def.pool.length - 1))) % def.pool.length;
        this.setExpr(def.pool[this.poolPos] as string, def.poolSpeed);
      }
      this.poolNext = now + rand(def.poolMs[0], def.poolMs[1]);
    }

    if (this.active && def.blinkMs && now >= this.blinkNext) {
      this.blinkNow(now);
      this.blinkNext = now + rand(def.blinkMs[0], def.blinkMs[1]);
    }
    let openKey: number | null = null;
    while (this.blinkQ.length && now >= (this.blinkQ[0] as { at: number; v: number }).at) {
      openKey = (this.blinkQ[0] as { at: number; v: number }).v;
      this.blinkQ.shift();
    }
    this.openSpring.t = openKey != null ? openKey : this.blinkQ.length ? this.openSpring.t : def.openness;

    if (this.active && def.antics && now >= this.anticNext) {
      if (!this.spinState && this.bounceAt < 0) {
        const pick = Math.random();
        if (pick < 0.45) {
          if (!this.signature(0.55)) this.spin(1);
        } else if (pick < 0.8) this.bounce();
        else this.blinkNow(now);
      }
      this.anticNext = now + rand(9000, 18000);
    }

    if (this.mouthHoldUntil && now >= this.mouthHoldUntil) {
      this.mouthHoldUntil = 0;
      this.setMouth(def.mouth, 8);
    }

    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const j = dt / steps;
    for (let si = 0; si < steps; si++) {
      springStep(this.ringSpring, this.ringSpeed, 1, j);
      springStep(this.mouthSpring, 9, 1, j);
      springStep(this.openSpring, 26, 1, j);
      if (this.spinState) {
        springStep(this.spinState, 6.2, 1, j);
        if (Math.abs(this.spinState.t - this.spinState.x) < 0.01 && Math.abs(this.spinState.v) < 0.05) {
          this.spinState = null;
        }
      }
    }
    pose.body.yaw = this.spinState ? this.spinState.x : 0;

    if (this.bounceAt >= 0) {
      const be = (now - this.bounceAt) / 1000;
      if (be >= BOUNCE_TOTAL) {
        this.bounceAt = -1;
      } else {
        let acc = 0;
        let bi = 0;
        while (bi < BOUNCE_SEGS.length && be >= acc + (BOUNCE_SEGS[bi] as { h: number; d: number }).d) {
          acc += (BOUNCE_SEGS[bi] as { h: number; d: number }).d;
          bi++;
        }
        const seg = BOUNCE_SEGS[Math.min(bi, BOUNCE_SEGS.length - 1)] as { h: number; d: number };
        const bn = (be - acc) / seg.d;
        pose.body.y += -4 * seg.h * bn * (1 - bn);
      }
    }

    if (this.ringSpring.x < 0.999 || this.ringSpring.v > 0.001 || this.ringSpring.v < -0.001) {
      const rs = clamp(this.ringSpring.x, 0, 1.35);
      this.ringCur = [
        lerpRing(this.ringSrc[0], this.ringDst[0], rs),
        lerpRing(this.ringSrc[1], this.ringDst[1], rs),
      ];
    } else if (this.ringCur !== this.ringDst) {
      this.ringCur = this.ringDst;
    }
    pose.left.ring = this.ringCur[0];
    pose.right.ring = this.ringCur[1];

    if (this.mouthSpring.x < 0.999 || Math.abs(this.mouthSpring.v) > 0.001) {
      const ms = clamp(this.mouthSpring.x, 0, 1.25);
      this.mouthCur = lerpRing(this.mouthSrc, this.mouthDst, ms);
    } else if (this.mouthCur !== this.mouthDst) {
      this.mouthCur = this.mouthDst;
    }
    pose.face.mouthRing = this.mouthCur;

    const k = 1 - Math.exp(-5.66 * dt);
    const gazeOn = def.gaze !== false || (def.raw.bare === true && (!this.seq || this.seq.done));
    const gx = gazeOn ? this.gaze.tx : 0;
    const gy = gazeOn ? this.gaze.ty : 0;
    this.gaze.x += (gx - this.gaze.x) * k;
    this.gaze.y += (gy - this.gaze.y) * k;
    pose.left.lookX += this.gaze.x;
    pose.right.lookX += this.gaze.x;
    pose.left.lookY += this.gaze.y;
    pose.right.lookY += this.gaze.y;
    pose.face.mouthX += this.gaze.x * 0.35;
    pose.face.mouthY += this.gaze.y * 0.28;

    if (gazeOn) {
      const w = now / 1000;
      pose.left.lookX += 1.4 * Math.sin(0.42 * w) + 0.5 * Math.sin(1.0 * w);
      pose.right.lookX += 1.4 * Math.sin(0.42 * w + 1) + 0.5 * Math.sin(1.0 * w + 2);
      pose.left.lookY += 0.9 * Math.sin(0.58 * w);
      pose.right.lookY += 0.9 * Math.sin(0.58 * w + 1);
    }

    if (this.eyeScale !== 1) {
      pose.left.scaleX *= this.eyeScale;
      pose.left.scaleY *= this.eyeScale;
      pose.right.scaleX *= this.eyeScale;
      pose.right.scaleY *= this.eyeScale;
      pose.face.mouthSX *= this.eyeScale;
      pose.face.mouthSY *= this.eyeScale;
    }

    if (this.theme) {
      pose.body.color = this.theme.body;
      const chEye = this.character.palette.eye;
      if (pose.left.color === chEye) pose.left.color = this.theme.eyes;
      if (pose.right.color === chEye) pose.right.color = this.theme.eyes;
    }

    const openS = clamp(this.openSpring.x, 0.02, 1.5);
    pose.left.open = clamp(pose.left.open, 0, 1.3) * openS;
    pose.right.open = clamp(pose.right.open, 0, 1.3) * openS;
    pose.left.scaleX = Math.max(pose.left.scaleX, 0.05);
    pose.left.scaleY = Math.max(pose.left.scaleY, 0.05);
    pose.right.scaleX = Math.max(pose.right.scaleX, 0.05);
    pose.right.scaleY = Math.max(pose.right.scaleY, 0.05);

    const tt = now - this.transStart;
    if (this.transDur > 0 && tt < this.transDur && this.prevPose) {
      const mouthRing = pose.face.mouthRing;
      pose = lerpPose(this.prevPose, pose, easeInOutCubic(tt / this.transDur));
      pose.face.mouthRing = mouthRing;
      pose.left.ring = this.ringCur[0];
      pose.right.ring = this.ringCur[1];
    }
    if (this.clickSeq) {
      const mixed = this.applyClickBeat(pose, now);
      if (mixed) pose = mixed;
    }
    if (this.clip) this.applyClip(pose, now);
    pose.body.sketch = this.style.sketch ? 1 : 0;
    return pose;
  }

  private applyClip(pose: Pose, now: number): void {
    const clip = this.clip as ActiveClip;
    const t = now - clip.start;
    const def = clip.def;
    const exprs = def.expr || [];
    while (clip.exprIdx < exprs.length && (exprs[clip.exprIdx] as { at: number }).at <= t) {
      const e = exprs[clip.exprIdx] as { expr: string; speed?: number };
      this.setExpr(e.expr, e.speed || 10);
      clip.exprIdx++;
    }
    const bursts = def.burst || [];
    while (clip.burstIdx < bursts.length && (bursts[clip.burstIdx] as { at: number }).at <= t) {
      this.burst((bursts[clip.burstIdx] as { count: number }).count);
      clip.burstIdx++;
    }
    if (t >= def.duration) {
      this.clip = null;
      if (this.def) this.setExpr((this.def.pool[this.poolPos] || this.def.pool[0]) as string, 8);
      return;
    }
    const f = def.sample(t, clip.strength);
    pose.body.x += f.dx || 0;
    pose.body.y += f.dy || 0;
    pose.body.rotate += f.rotate || 0;
    pose.body.scaleX *= f.sx == null ? 1 : f.sx;
    pose.body.scaleY *= f.sy == null ? 1 : f.sy;
    for (const eye of [pose.left, pose.right]) {
      eye.scaleX *= f.eyeSx == null ? 1 : f.eyeSx;
      eye.scaleY *= f.eyeSy == null ? 1 : f.eyeSy;
    }
  }

  private fireSeqExpr(t: number): void {
    const frames = (this.seq as SeqState).frames;
    while (this.seqExprIdx < frames.length && (frames[this.seqExprIdx] as PoseFrame).at <= t) {
      const f = frames[this.seqExprIdx] as PoseFrame;
      if (f.expr) this.setExpr(f.expr, f.exprSpeed || 9);
      this.seqExprIdx++;
    }
  }

  private seqPose(t0: number, now: number): Pose | 'switch' | null {
    const seq = this.seq as SeqState;
    const frames = seq.frames;
    const last = frames[frames.length - 1] as PoseFrame;
    let t = t0;
    if (seq.loopFrom != null && t0 >= last.at) {
      const span = last.at - seq.loopFrom;
      t = seq.loopFrom + ((t0 - seq.loopFrom) % span);
      const cycle = Math.floor((t0 - seq.loopFrom) / span);
      if (cycle !== this.seqCycle) {
        this.seqCycle = cycle;
        this.seqExprIdx = Math.max(
          0,
          frames.findIndex((f) => f.at >= (seq.loopFrom as number)),
        );
      }
    }
    this.fireSeqExpr(t);

    if (seq.loopFrom == null && t >= last.at) {
      if (!seq.done) {
        seq.done = true;
        seq.doneAt = now;
        const s = seq.settle;
        if (s === 'base') {
          this.prevPose = this.lastPose ? clonePose(this.lastPose) : clonePose(last.pose);
          this.transStart = now;
          this.transDur = (this.def as EmotionDef).transition || 500;
          this.seq = null;
          return null;
        }
        if (s && typeof s === 'object' && s.next) {
          this.setEmotion(s.next, { auto: true });
          return 'switch';
        }
      }
      return clonePose(last.pose);
    }

    if (t <= (frames[0] as PoseFrame).at) return clonePose((frames[0] as PoseFrame).pose);
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i] as PoseFrame;
      const b = frames[i + 1] as PoseFrame;
      if (t >= a.at && t < b.at) {
        const u = (t - a.at) / (b.at - a.at);
        return lerpPose(a.pose, b.pose, seq.linear ? u : easeInOutCubic(u));
      }
    }
    return clonePose(last.pose);
  }
}

export function create(target: string | HTMLElement, opts?: EngineOptions): EmotionEngine {
  return new EmotionEngine(target, opts);
}

export const version = '1.0.0';

for (const raw of EMOTION_SEED) {
  const r = register(raw);
  if (!r.ok) console.warn('[MoodMates] Invalid seed config:', r.id, r.errors);
}

export type { AnimSpec, EmotionGroup, EmotionRaw, SequenceFrameSpec, SequenceSpec } from './types';
