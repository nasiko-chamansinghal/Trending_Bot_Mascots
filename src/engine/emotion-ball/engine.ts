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
import { clamp, type Ring, rand } from '../shared/util';
import { type BallHandle, createBall } from './ball';
import { EMOTION_GROUPS, EMOTION_SEED } from './emotions';
import { RINGS } from './rings';
import type { AnimSpec, EmotionGroup, EmotionRaw, Pose, PoseSpec, SequenceSpec } from './types';

const EXPR = RINGS.EXPRESSIONS;
const TAU = Math.PI * 2;
const FALLBACK_ID = '02';

const DEFAULT_BODY = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  color: '#F3F0EA',
  breathe: 0.01,
  ribbons: 0,
  confetti: 0,
  sketch: 0,
  zzz: 0,
  chill: 0,
  shiver: 0,
  orbit: 0,
};
const DEFAULT_EYE = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  open: 1,
  color: '#1A1A1A',
  lookX: 0,
  lookY: 0,
};

function defaultPose(): Pose {
  return {
    body: Object.assign({}, DEFAULT_BODY),
    left: Object.assign({}, DEFAULT_EYE),
    right: Object.assign({}, DEFAULT_EYE),
  };
}
function clonePose(p: Pose): Pose {
  return {
    body: Object.assign({}, p.body),
    left: Object.assign({}, p.left),
    right: Object.assign({}, p.right),
  };
}

function applySpec(pose: Pose, spec: PoseSpec | undefined): Pose {
  if (!spec) return pose;
  if (spec.body) Object.assign(pose.body, spec.body);
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

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = defaultPose();
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
  const targets = (a.target === 'eyes'
    ? [pose.left, pose.right]
    : a.target === 'body'
      ? [pose.body]
      : a.target === 'left'
        ? [pose.left]
        : a.target === 'right'
          ? [pose.right]
          : []) as unknown as Array<Record<string, number>>;
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

const GROUPS: EmotionGroup[] = EMOTION_GROUPS.slice();

interface PoseFrame {
  at: number;
  pose: Pose;
}

export interface EmotionDef {
  id: string;
  name: string;
  group: string;
  desc: string;
  gaze: boolean;
  transition: number;
  pool: number[];
  poolMs: [number, number];
  poolSpeed: number;
  blinkMs: [number, number] | null;
  openness: number;
  antics: boolean;
  base: Pose;
  anims: AnimSpec[];
  sequence: { frames: PoseFrame[]; settle: SequenceSpec['settle']; linear: boolean } | null;
  raw: EmotionRaw;
}

const registry = new Map<string, EmotionDef>();
const order: string[] = [];

function knownGroup(g: string): boolean {
  return GROUPS.some((x) => x.key === g);
}

function validate(raw: EmotionRaw): string[] {
  const errs: string[] = [];
  if (!raw || typeof raw !== 'object') {
    errs.push('Config must be an object');
    return errs;
  }
  if (typeof raw.id !== 'string' || !raw.id.trim()) errs.push('Missing a valid string id');
  if (typeof raw.name !== 'string' || !raw.name.trim()) errs.push('Missing name');
  if (!knownGroup(raw.group)) errs.push(`Invalid group: ${raw.group}`);
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

function normalize(raw: EmotionRaw): EmotionDef {
  const base = applySpec(defaultPose(), raw);
  let pool = (raw.pool || [0, 8]).filter((i) => i >= 0 && i < EXPR.length);
  if (!pool.length) pool = [0];
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
    base,
    anims: (raw.anims || []).map((a) => Object.assign({}, a)),
    sequence: null,
    raw,
  };
  if (raw.sequence) {
    const frames = raw.sequence.frames
      .map((f) => ({ at: f.at || 0, pose: applySpec(clonePose(base), f) }))
      .sort((x, y) => x.at - y.at);
    def.sequence = {
      frames,
      settle: raw.sequence.settle || 'base',
      linear: raw.sequence.interp === 'linear',
    };
  }
  return def;
}

export interface RegisterResult {
  ok: boolean;
  id?: string;
  errors?: string[];
}

function register(raw: EmotionRaw): RegisterResult {
  const errs = validate(raw);
  if (errs.length) return { ok: false, id: raw?.id, errors: errs };
  const def = normalize(raw);
  if (!registry.has(def.id)) order.push(def.id);
  registry.set(def.id, def);
  return { ok: true, id: def.id };
}

export interface ImportResult {
  ok: boolean;
  added: number;
  errors: string[];
}

export const config = {
  register,
  get(id: string): EmotionDef | null {
    return registry.get(id) || null;
  },
  list(group?: string | null): EmotionDef[] {
    return order.map((id) => registry.get(id) as EmotionDef).filter((d) => !group || d.group === group);
  },
  groups(): EmotionGroup[] {
    return GROUPS.map((g) => ({ key: g.key, name: g.name }));
  },
  exportConfig(): string {
    return JSON.stringify(
      order.map((id) => (registry.get(id) as EmotionDef).raw),
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
  emotion?: string;
  shape?: string;
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

interface SeqState {
  frames: PoseFrame[];
  settle: SequenceSpec['settle'];
  linear: boolean;
  done: boolean;
}

export class EmotionEngine {
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
  private ringSrc: [Ring, Ring];
  private ringDst: [Ring, Ring];
  private ringCur: [Ring, Ring];
  private ringSpring: Spring;
  private ringSpeed = 7;
  private exprIdx = 0;
  private poolPos = 0;
  private poolNext = 0;
  private openSpring: Spring;
  private blinkQ: Array<{ at: number; v: number }> = [];
  private blinkNext = Number.POSITIVE_INFINITY;
  private anticNext = 0;
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
  private active = false;
  private isTouring = false;
  private tourTimer: ReturnType<typeof setInterval> | 0 = 0;
  private fallbackId: string;
  private lastActivity: number;
  private idle: IdleConfig | null;
  private dt = 0;

  constructor(target: string | HTMLElement, opts: EngineOptions = {}) {
    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (!el) throw new Error('EmotionBall.create: container element not found');

    this.ball = createBall(el, {
      ...opts,
      lite: opts.lite != null ? opts.lite : opts.autostart === false,
    });
    this.effects = new Effects(this.ball.svg, 'ball');
    this.seed = Math.random() * 100;
    this.theme = makeTheme(opts.color, opts.eyeColor);
    this.eyeScale = opts.eyeScale || 1;

    const first = EXPR[0] as [Ring, Ring];
    this.ringSrc = [first[0], first[1]];
    this.ringDst = [first[0], first[1]];
    this.ringCur = this.ringDst;
    this.ringSpring = spring(1);
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

  setEmotion(id: string, o: { auto?: boolean } = {}): boolean {
    let def = config.get(id);
    if (!def) {
      console.warn(`[EmotionBall] Unknown emotion ID "${id}", falling back to idle (${this.fallbackId})`);
      this.emit('error', { message: `Unknown emotion ID "${id}", fell back to idle`, id });
      def = config.get(this.fallbackId);
      if (!def) return false;
    }
    const now = performance.now();
    const prevId = this.def ? this.def.id : null;
    this.prevPose = this.lastPose ? clonePose(this.lastPose) : null;
    this.inertia.begin(this.lastPose);
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
          linear: def.sequence.linear,
          done: false,
        }
      : null;
    if (!o.auto) this.lastActivity = now;

    this.poolPos = 0;
    this.setExpr(def.pool[0] as number, def.poolSpeed >= 10 ? 10 : 8);
    this.poolNext = now + rand(def.poolMs[0], def.poolMs[1]);
    if (prevId !== null && prevId !== def.id && def.blinkMs) this.blinkNow(now);
    this.blinkNext = def.blinkMs ? now + rand(def.blinkMs[0], def.blinkMs[1]) : Number.POSITIVE_INFINITY;
    this.anticNext = now + rand(2500, 5000);

    this.emit('change', { id: def.id, def, auto: !!o.auto });
    if (this.active) {
      const fx = def.base.body;
      if (fx.ribbons > 0) this.spin(fx.ribbons >= 1 ? 2 : 1);
      if (fx.confetti > 0) this.burst(20);
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

  bounce(): this {
    if (this.bounceAt < 0) this.bounceAt = performance.now();
    return this;
  }

  private setExpr(idx: number, speed?: number): void {
    if (idx === this.exprIdx && this.ringSpring.x >= 0.999) return;
    const s = clamp(this.ringSpring.x, 0, 1);
    this.ringSrc = [
      lerpRing(this.ringSrc[0], this.ringDst[0], s),
      lerpRing(this.ringSrc[1], this.ringDst[1], s),
    ];
    const pair = EXPR[idx] as [Ring, Ring];
    this.ringDst = [pair[0], pair[1]];
    this.ringSpring.x = 0;
    this.ringSpring.v = 0;
    this.ringSpring.t = 1;
    this.ringSpeed = speed || 7;
    this.exprIdx = idx;
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

    pose.body.sketch = Math.max(pose.body.sketch || 0, this.style.sketch || 0);

    const dt = this.dt || 1 / 60;

    if (this.active && now >= this.poolNext) {
      if (def.pool.length > 1) {
        this.poolPos = (this.poolPos + 1 + Math.floor(rand(0, def.pool.length - 1))) % def.pool.length;
        this.setExpr(def.pool[this.poolPos] as number, def.poolSpeed);
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

    const k = 1 - Math.exp(-5.66 * dt);
    const gx = def.gaze !== false ? this.gaze.tx : 0;
    const gy = def.gaze !== false ? this.gaze.ty : 0;
    this.gaze.x += (gx - this.gaze.x) * k;
    this.gaze.y += (gy - this.gaze.y) * k;
    pose.left.lookX += this.gaze.x;
    pose.right.lookX += this.gaze.x;
    pose.left.lookY += this.gaze.y;
    pose.right.lookY += this.gaze.y;

    if (def.gaze !== false) {
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
      const eyeTint = this.theme.eyes;
      if (eyeTint && pose.left.color === DEFAULT_EYE.color) pose.left.color = eyeTint;
      if (eyeTint && pose.right.color === DEFAULT_EYE.color) pose.right.color = eyeTint;
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

    const openS = clamp(this.openSpring.x, 0.02, 1.5);
    pose.left.open = clamp(pose.left.open, 0, 1.3) * openS;
    pose.right.open = clamp(pose.right.open, 0, 1.3) * openS;
    pose.left.scaleX = Math.max(pose.left.scaleX, 0.05);
    pose.left.scaleY = Math.max(pose.left.scaleY, 0.05);
    pose.right.scaleX = Math.max(pose.right.scaleX, 0.05);
    pose.right.scaleY = Math.max(pose.right.scaleY, 0.05);

    const tt = now - this.transStart;
    if (this.transDur > 0 && tt < this.transDur && this.prevPose) {
      pose = lerpPose(this.prevPose, pose, easeInOutCubic(tt / this.transDur));
    }
    return pose;
  }

  private seqPose(t: number, now: number): Pose | 'switch' | null {
    const seq = this.seq as SeqState;
    const frames = seq.frames;
    const last = frames[frames.length - 1] as PoseFrame;

    if (t >= last.at) {
      if (!seq.done) {
        seq.done = true;
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
        const k = seq.linear ? u : easeInOutCubic(u);
        return lerpPose(a.pose, b.pose, k);
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
  if (!r.ok) console.warn('[EmotionBall] Invalid seed config:', r.id, r.errors);
}

export type { AnimSpec, EmotionGroup, EmotionRaw, SequenceFrameSpec, SequenceSpec } from './types';
