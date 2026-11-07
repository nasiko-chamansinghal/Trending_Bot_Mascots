import { Effects } from '../shared/effects';
import { easeOutQuint, Inertia, wrapDegrees } from '../shared/inertia';
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
import { MOTIONS } from '../shared/motions';
import { makeTheme, type Theme } from '../shared/theme';
import { clamp, rand } from '../shared/util';
import { EMOTION_GROUPS, EMOTION_SEED } from './data/emotions';
import type { EyePair, Ring } from './geometry';
import * as GEO from './geometry';
import { getMaterial } from './materials';
import { type BallHandle, createBall } from './render';
import type {
  AnimSpec,
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
  const family: Record<string, EyePair> = {};
  for (const slot in raw.eyeShapes) {
    family[slot] = GEO.buildEyePair(raw.eyeShapes[slot] as GEO.CutParams);
  }
  for (const slot in raw.eyeRings || {})
    family[slot] = (raw.eyeRings as Record<string, EyePair>)[slot] as EyePair;
  if (!family.calm) throw new Error('[MoodMates] Character needs a "calm" eye shape');
  const palette: Palette = { ...raw.palette, states: { ...raw.palette.states } };
  for (const k of STATE_KEYS) {
    if (!palette.states[k]) palette.states[k] = palette.body;
  }

  const resolved: ResolvedCharacter = {
    id: raw.id,
    name: raw.name,
    industry: raw.industry || 'general',
    desc: raw.desc || '',
    bodyRing: GEO.buildBody(raw.body),
    face: Object.assign({ x: 0, y: 0, sx: 1, sy: 1, eye: 1, contain: 14 }, raw.face || {}),
    palette,
    eyeFamily: family,
    defaultEyeRing: family.calm,
    fxSkin: raw.fxSkin || 'spark',
    material: raw.material || 'flat',
    zzz: raw.zzz || null,
    props: raw.props || [],
    baseAnims: raw.baseAnims || [],
    clips: raw.clips || {},
    signatureClips: raw.signatureClips || [],
    blink: raw.blink,
    backFace: raw.backFace || null,
    gazeRange: raw.gazeRange || [24, 15],
    emotions: raw.emotions || null,
    solid: raw.solid || null,
    blinkStyle: raw.blinkStyle || 'ring',
    poseDefaults: raw.poseDefaults || null,
    raw,
  };
  raw._resolved = resolved;
  return resolved;
}

export interface RegisterResult {
  ok: boolean;
  id?: string;
  errors?: string[];
}

function ownDesc(characterId: string, raw: EmotionRaw): EmotionRaw {
  const desc = characterMap.get(characterId)?.emotions?.[raw.id]?.desc;
  return typeof desc === 'string' ? { ...raw, desc } : raw;
}

export const characters = {
  register(raw: CharacterRaw): RegisterResult {
    if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) {
      return { ok: false, errors: ['Character is missing a valid id'] };
    }
    if (!raw.body?.type) {
      return { ok: false, id: raw.id, errors: ['Character is missing body.type (body generator)'] };
    }
    if (raw.material && !getMaterial(raw.material)) {
      return { ok: false, id: raw.id, errors: [`Unknown material: ${raw.material}`] };
    }
    const groupKeys = (raw.emotionGroups || []).map((g) => g.key);
    const extraErrors = (raw.extraEmotions || []).flatMap((e) => {
      const errs = validate(e, groupKeys);
      if (config.getRaw(e.id)) errs.push('id collides with a built-in emotion');
      return errs.map((m) => `[${e?.id || '?'}] ${m}`);
    });
    if (extraErrors.length) return { ok: false, id: raw.id, errors: extraErrors };
    try {
      resolveCharacter(raw);
    } catch (e) {
      return { ok: false, id: raw.id, errors: [(e as Error).message] };
    }
    if (!characterMap.has(raw.id)) charOrder.push(raw.id);
    characterMap.set(raw.id, raw);
    return { ok: true, id: raw.id };
  },
  get(id: string): ResolvedCharacter | null {
    const raw = characterMap.get(id);
    return raw ? resolveCharacter(raw) : null;
  },
  list(): ResolvedCharacter[] {
    return charOrder.map((id) => resolveCharacter(characterMap.get(id) as CharacterRaw));
  },
  defaultId(): string | null {
    return charOrder[0] || null;
  },
  emotionList(id: string, group?: string | null): EmotionRaw[] {
    const extras = characterMap.get(id)?.extraEmotions || [];
    return config
      .list(group)
      .map((raw) => ownDesc(id, raw))
      .concat(extras.filter((e) => !group || e.group === group));
  },
  emotionGroups(id: string): EmotionGroup[] {
    const extra = characterMap.get(id)?.emotionGroups || [];
    const base = config.groups();
    return base.concat(extra.filter((g) => !base.some((b) => b.key === g.key)));
  },
  emotionDef(id: string, emotionId: string): EmotionRaw | null {
    const raw = config.getRaw(emotionId);
    if (raw) return ownDesc(id, raw);
    return characterMap.get(id)?.extraEmotions?.find((e) => e.id === emotionId) || null;
  },
};

const DEFAULT_BODY = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  color: '@base',
  breathe: 0.01,
  sketch: 0,
  zzz: 0,
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
function defaultPose(): Pose {
  return {
    body: Object.assign({}, DEFAULT_BODY),
    left: Object.assign({}, DEFAULT_EYE),
    right: Object.assign({}, DEFAULT_EYE),
    props: {},
  };
}
function clonePose(p: Pose): Pose {
  return {
    body: Object.assign({}, p.body),
    left: Object.assign({}, p.left),
    right: Object.assign({}, p.right),
    props: Object.assign({}, p.props),
  };
}

function applySpec(pose: Pose, spec: PoseSpec | undefined): Pose {
  if (!spec) return pose;
  if (spec.body) Object.assign(pose.body, spec.body);
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

const POSE_PARTS = ['body', 'left', 'right'] as const;

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

type AnimFn = (a: AnimSpec, t: number, eng?: EmotionEngine) => number;

const ANIM_TYPES: Record<string, AnimFn> = {
  ...MOTIONS,
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
  base: Pose;
  anims: AnimSpec[];
  life: AnimSpec[];
  openness: number;
  antics: boolean;
  follow: number;
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
  const over = ch.emotions?.[rawIn.id];
  const raw = over
    ? ({
        id: rawIn.id,
        name: rawIn.name,
        group: rawIn.group,
        desc: rawIn.desc,
        effect: rawIn.effect,
        ...over,
      } as EmotionRaw)
    : rawIn;
  const base = resolvePoseColors(applySpec(applySpec(defaultPose(), ch.poseDefaults || undefined), raw), ch);
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
    base,
    anims: [...(raw.bare ? [] : ch.baseAnims), ...(raw.anims || [])].map((a) => Object.assign({}, a)),
    life: raw.bare ? ch.baseAnims.map((a) => Object.assign({}, a)) : [],
    openness: raw.openness != null ? raw.openness : 1,
    antics: !!raw.antics,
    follow: raw.follow || 0,
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

const THEME_FADE_MS = 360;

export interface EngineOptions {
  character?: string;
  emotion?: string;
  material?: string;
  idle?: boolean | Partial<IdleConfig>;
  label?: string;
  lite?: boolean;
  autostart?: boolean;
  color?: string;
  eyeColor?: string | null;
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
  private effects: Effects;
  seed: number;
  private events: Record<string, Array<(payload: never) => void>> = {};
  private gaze = { x: 0, y: 0, tx: 0, ty: 0 };
  private style = { sketch: 0 };
  private theme: Theme | null;
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
  private ringBlinkQ: Array<{ at: number; slot: string; speed: number }> = [];
  private openQ: Array<{ at: number; v: number }> = [];
  private openSpring: Spring = spring(1);
  private anticNext = Number.POSITIVE_INFINITY;
  private blinkNext = Number.POSITIVE_INFINITY;
  private bounceAt = -1;
  private def: EmotionDef | null = null;
  private lastPose: Pose | null = null;
  private prevPose: Pose | null = null;
  private inertia = new Inertia();
  private themeFade: { at: number; body: string; eyes: string } | null = null;
  private transStart = 0;
  private transDur = 0;
  private emoStart = 0;
  private seq: SeqState | null = null;
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
    const ch = characters.get(chId);
    if (!ch) throw new Error('MoodMates.create: no character registered (register a character first)');
    this.character = ch;

    this.ball = createBall(el, {
      ...opts,
      character: ch,
      lite: opts.lite != null ? opts.lite : opts.autostart === false,
    });
    this.effects = new Effects(this.ball.svg, ch.id);
    this.seed = Math.random() * 100;
    this.theme = makeTheme(opts.color, opts.eyeColor);
    this.eyeScale = opts.eyeScale || 1;

    const calm = ch.eyeFamily.calm as EyePair;
    this.ringSrc = [calm[0], calm[1]];
    this.ringDst = [calm[0], calm[1]];
    this.ringCur = this.ringDst;
    this.ringSpring = spring(1);

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
    const prevId = this.def ? this.def.id : null;
    this.prevPose = this.lastPose ? clonePose(this.lastPose) : null;
    this.inertia.begin(this.lastPose);
    const prevTurn = this.prevPose?.body.turn;
    if (this.prevPose && prevTurn != null) {
      const target = def.base.body.turn || 0;
      this.prevPose.body.turn = target + Math.atan2(Math.sin(prevTurn - target), Math.cos(prevTurn - target));
    }
    if (this.prevPose) {
      const restRotate = def.base.body.rotate || 0;
      this.prevPose.body.rotate = restRotate + wrapDegrees(this.prevPose.body.rotate - restRotate);
    }
    this.def = def;
    this.effects.play(def.raw.effect, now);
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
    this.ringBlinkQ = [];
    this.openQ = [];
    this.setExpr(def.pool[0] as string, def.poolSpeed >= 10 ? 10 : 8);
    this.poolNext = now + rand(def.poolMs[0], def.poolMs[1]);
    if (prevId !== null && prevId !== def.id && def.blinkMs) this.blinkNow(now);
    this.blinkNext = def.blinkMs ? now + rand(def.blinkMs[0], def.blinkMs[1]) : Number.POSITIVE_INFINITY;
    this.anticNext = def.antics ? now + rand(2500, 5000) : Number.POSITIVE_INFINITY;

    this.emit('change', { id: def.id, def, auto: !!o.auto });
    if (this.active) {
      const fx = def.base.body;
      if ((fx.ribbons || 0) > 0) this.spin((fx.ribbons as number) >= 1 ? 2 : 1);
      if ((fx.confetti || 0) > 0) this.burst(20);
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
    this.gaze.tx = clamp(nx, -1, 1) * this.character.gazeRange[0];
    this.gaze.ty = clamp(ny, -1, 1) * this.character.gazeRange[1];
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

  setColor(body: string | null, eyes?: string | null, instant = false): this {
    const from = this.lastPose;
    this.theme = makeTheme(body, eyes);
    this.themeFade =
      !instant && from ? { at: performance.now(), body: from.body.color, eyes: from.left.color } : null;
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
    return this.playSignatureClip(strength);
  }

  celebrate(strength?: number): this {
    if (!this.signature(strength == null ? 1 : strength)) this.spin(1);
    return this;
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

  private blinkNow(t: number): void {
    if (this.character.blinkStyle === 'open') {
      this.openQ.push(
        { at: t, v: 0.05 },
        { at: t + 70, v: 0.05 },
        { at: t + 150, v: 1.08 },
        { at: t + 300, v: 1 },
      );
      if (Math.random() < 0.14) this.openQ.push({ at: t + 370, v: 0.05 }, { at: t + 480, v: 1 });
      return;
    }
    if (this.ringBlinkQ.length) return;
    const back = this.exprSlot;
    let at = t;
    for (const s of this.character.blink) {
      this.ringBlinkQ.push({ at, slot: s.slot, speed: 34 });
      at += s.ms;
    }
    this.ringBlinkQ.push({ at, slot: back, speed: 14 });
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
    this.openSpring.x = this.def ? this.def.openness : 1;
    this.openSpring.v = 0;
    const seq = this.seq;
    this.seq = null;
    this.tick(performance.now());
    this.effects.still(this.lastPose?.body.color ?? '#FFFFFF', this.lastPose?.body.scale ?? 1);
    this.seq = seq;
  }

  destroy(): void {
    this.stopTour();
    this.setActive(false);
    this.events = {};
    this.effects.destroy();
    this.ball.destroy();
  }

  tick(now: number): void {
    this.dt = this.lastTick ? clamp((now - this.lastTick) / 1000, 0.001, 0.05) : 1 / 60;
    this.lastTick = now;
    if (this.idle && !this.isTouring) this.checkIdle(now);
    const pose = this.compose(now, 0);
    this.inertia.apply(pose, now);
    this.ball.applyPose(pose);
    this.effects.frame(now, pose.body.color, pose.body.scale);
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
        const pending = this.ringBlinkQ[this.ringBlinkQ.length - 1];
        if (pending) pending.slot = def.pool[this.poolPos] as string;
        else this.setExpr(def.pool[this.poolPos] as string, def.poolSpeed);
      }
      this.poolNext = now + rand(def.poolMs[0], def.poolMs[1]);
    }

    if (this.active && def.blinkMs && now >= this.blinkNext) {
      this.blinkNow(now);
      this.blinkNext = now + rand(def.blinkMs[0], def.blinkMs[1]);
    }
    while (this.ringBlinkQ.length && now >= (this.ringBlinkQ[0] as { at: number }).at) {
      const step = this.ringBlinkQ.shift() as { slot: string; speed: number };
      this.setExpr(step.slot, step.speed);
    }
    const openStyle = this.character.blinkStyle === 'open';
    if (openStyle) {
      let openKey: number | null = null;
      while (this.openQ.length && now >= (this.openQ[0] as { at: number }).at) {
        openKey = (this.openQ.shift() as { v: number }).v;
      }
      this.openSpring.t = openKey != null ? openKey : this.openQ.length ? this.openSpring.t : def.openness;
    }

    if (this.active && def.antics && now >= this.anticNext) {
      if (!this.spinState && this.bounceAt < 0) {
        const pick = Math.random();
        if (pick < 0.45) this.spin(1);
        else if (pick < 0.8) this.bounce();
        else this.blinkNow(now);
      }
      this.anticNext = now + rand(9000, 18000);
    }

    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const j = dt / steps;
    for (let si = 0; si < steps; si++) {
      springStep(this.ringSpring, this.ringSpeed, 1, j);
      if (openStyle) springStep(this.openSpring, 26, 1, j);
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
        pose.body.y += -4 * seg.h * bn * (1 - bn) * (this.character.raw.bounceScale ?? 1);
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
    if (def.follow) pose.body.x += ((pose.left.lookX + pose.right.lookX) / 2) * def.follow;

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
    }

    if (this.theme) {
      if (this.theme.body) pose.body.color = this.theme.body;
      const chEye = this.character.palette.eye;
      const eyeTint = this.theme.eyes;
      if (eyeTint && pose.left.color === chEye) pose.left.color = eyeTint;
      if (eyeTint && pose.right.color === chEye) pose.right.color = eyeTint;
    }
    if (this.themeFade) {
      const k = easeOutQuint(clamp((now - this.themeFade.at) / THEME_FADE_MS, 0, 1));
      if (k >= 1) {
        this.themeFade = null;
      } else {
        pose.body.color = lerpColor(this.themeFade.body, pose.body.color, k);
        pose.left.color = lerpColor(this.themeFade.eyes, pose.left.color, k);
        pose.right.color = lerpColor(this.themeFade.eyes, pose.right.color, k);
      }
    }

    const openS = openStyle ? clamp(this.openSpring.x, 0.02, 1.5) : 1;
    pose.left.open = clamp(pose.left.open, 0, 1.3) * openS;
    pose.right.open = clamp(pose.right.open, 0, 1.3) * openS;
    pose.left.scaleX = Math.max(pose.left.scaleX, 0.05);
    pose.left.scaleY = Math.max(pose.left.scaleY, 0.05);
    pose.right.scaleX = Math.max(pose.right.scaleX, 0.05);
    pose.right.scaleY = Math.max(pose.right.scaleY, 0.05);

    const tt = now - this.transStart;
    if (this.transDur > 0 && tt < this.transDur && this.prevPose) {
      pose = lerpPose(this.prevPose, pose, easeInOutCubic(tt / this.transDur));
      pose.left.ring = this.ringCur[0];
      pose.right.ring = this.ringCur[1];
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
    if (f.eyeX || f.eyeY) {
      const hold = 1 - clamp(Math.min(t / 180, (def.duration - t) / 240), 0, 1);
      for (const eye of [pose.left, pose.right]) {
        eye.lookX *= hold;
        eye.lookY *= hold;
      }
    }
    if (f.eyeX) {
      pose.left.x += f.eyeX[0];
      pose.right.x += f.eyeX[1];
    }
    if (f.eyeY) {
      pose.left.y += f.eyeY[0];
      pose.right.y += f.eyeY[1];
    }
    if (f.turn) pose.body.turn = (pose.body.turn || 0) + f.turn;
    if (f.pitch) pose.body.pitch = (pose.body.pitch || 0) + f.pitch;
    if (f.yaw) pose.body.yaw = (pose.body.yaw || 0) + f.yaw;
    if (f.peel != null) pose.body.peel = f.peel;
    if (f.flip != null) pose.body.flip = f.flip;
    if (f.sink != null) pose.body.sink = f.sink;
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
          this.inertia.begin(this.lastPose);
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
