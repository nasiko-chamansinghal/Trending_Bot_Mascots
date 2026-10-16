import { buildBody, type Ring } from './geometry';
import type { Palette } from './types';
import { clamp, el, r2 } from './util';

const TAU = Math.PI * 2;

export interface Anchor {
  x: number;
  y: number;
}

export interface FxAnchors {
  mouth: Anchor;
  top: Anchor;
  bottom: Anchor;
  halfW: number;
}

export interface FxState {
  yaw: number;
  dYaw: number;
  vel: number;
  orbitWant: boolean;
  bodyX: number;
  bodyY: number;
}

export interface OrbitParams {
  lam: number;
  lamVel: number;
  tilt: number;
  roll: number;
  rad: number;
  radVel: number;
}

export interface OrbitPoint {
  x: number;
  y: number;
  z: number;
  l: number;
}

export interface Emit {
  node: SVGElement;
  x: number;
  y: number;
  born: number;
  life: number;
  max: number;
  step: (p: Emit, dt: number, u: number, life: number) => void;
  cleanup?: () => void;
}

export interface EmitConfig {
  delay?: number;
  x: number;
  y: number;
  max?: number;
  step: Emit['step'];
  cleanup?: () => void;
}

export interface EmitApi {
  C: number;
  defs: SVGDefsElement;
  anchors: FxAnchors;
  state: FxState;
  pick: () => string;
  orbitPoint: (o: OrbitParams, lam: number) => OrbitPoint;
  emit: (node: SVGElement, cfg: EmitConfig) => void;
}

export interface Skin {
  colors: string[];
  orbitSize: [number, number];
  burstSize: [number, number];
  makeOrbitNode: (c: string) => SVGElement;
  makeBurstNode: (c: string) => SVGElement;
  orbitSpecial?: {
    chance: number;
    make: (c: string) => SVGElement;
    size: [number, number];
  };
  signatureComplete?: boolean;
  signature?: (api: EmitApi, strength: number) => boolean;
  signatureMouth?: string;
  signatureMouthMs?: number;
}

export interface FxContext {
  defs: SVGDefsElement;
  back: SVGGElement;
  front: SVGGElement;
  C: number;
  skin: string;
  palette: Palette;
  anchors?: FxAnchors;
}

export interface FxHandle {
  update: (dt: number, now: number, state: FxState) => void;
  burst: (count?: number) => void;
  signature: (strength?: number) => boolean;
  destroy: () => void;
  signatureMouth: string | null;
  signatureMouthMs: number;
  signatureComplete: boolean;
}

interface Orbiter {
  node: SVGElement;
  inFront: boolean;
  mode: 'spin' | 'orbit';
  life: number;
  max: number;
  ret: number;
  size: number;
  rotSpd: number;
  rot: number;
  o: OrbitParams;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  rot: number;
  vr: number;
  el: SVGElement;
}

interface SpawnItem {
  at: number;
  dir: number;
  yaw: number;
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function ringD(ring: Ring): string {
  let s = 'M';
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i] as [number, number];
    s += `${i ? 'L' : ''}${r2(p[0])} ${r2(p[1])}`;
  }
  return `${s}Z`;
}

function cloudSilhouette(): string {
  return ringD(buildBody({ type: 'cloud', r: 0.2, lobes: 7, amp: 0.08, flat: 0.12, cx: 0, cy: 0 }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i] as T;
    a[i] = a[j] as T;
    a[j] = t;
  }
  return a;
}

const PUFF_SECTORS = [
  { mid: -0.28, spread: 0.5 },
  { mid: -1.05, spread: 0.48 },
  { mid: -1.85, spread: 0.5 },
  { mid: 0.22, spread: 0.36 },
  { mid: -2.45, spread: 0.4 },
  { mid: -1.45, spread: 0.36 },
];
const puffMem: { lastAt: number; queue: Array<{ mid: number; spread: number }> } = { lastAt: 0, queue: [] };

const SPARK_PATH =
  'M0 -1 C0.12 -0.22 0.22 -0.12 1 0 C0.22 0.12 0.12 0.22 0 1 C-0.12 0.22 -0.22 0.12 -1 0 C-0.22 -0.12 -0.12 -0.22 0 -1 Z';

const STAR_PATH = (() => {
  const pts: string[] = [];
  for (let e = 0; e < 10; e++) {
    const a = -Math.PI / 2 + (e * Math.PI) / 5;
    const r = e % 2 === 0 ? 1 : 0.42;
    pts.push(`${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
})();

const PENCIL_PATH =
  'M-1 -0.16 L0.5 -0.16 L1 0 L0.5 0.16 L-1 0.16 Z M-1 -0.16 L-0.78 -0.16 L-0.78 0.16 L-1 0.16 Z';

interface BubbleOpts {
  delay: number;
  ang: number;
  clear: number;
  travel: number;
  hang: number;
  size: number;
  drift: number;
  wx: number;
  wy: number;
  wp: number;
}

const SKINS: Record<string, Skin> = {
  cloudpuff: {
    colors: ['#C3D4F2', '#9FB3D6', '#F5D889', '#9A8AE8'],
    orbitSize: [2.8, 4.4],
    burstSize: [3, 5.4],
    makeOrbitNode: (c) => el('circle', { r: 1, fill: c, opacity: 0.9, class: 'mm-spark' }),
    makeBurstNode: (c) =>
      Math.random() < 0.3
        ? el('path', { d: SPARK_PATH, fill: c, class: 'mm-spark' })
        : el('circle', { r: 1, fill: c, opacity: 0.9, class: 'mm-spark' }),
    signatureComplete: true,
    signature(api, strength) {
      const full = strength >= 0.78;
      const C = api.C;
      const cloudD = cloudSilhouette();
      const mouth = api.anchors?.mouth;
      const x0 = mouth ? mouth.x + 6 : C + 10;
      const y0 = mouth ? mouth.y : C + 32;
      const halfW = api.anchors?.halfW || 104;
      const topSpan = api.anchors?.top ? C - api.anchors.top.y : 104;
      const bodyR = Math.max(halfW, topSpan);
      const now = performance.now();

      function easeOut(t: number): number {
        return 1 - (1 - t) ** 4;
      }

      function emitPop(delay: number, x: number, y: number): void {
        const ang = rand(-2.2, 0.4);
        api.emit(el('circle', { r: 1, class: 'mm-speck' }), {
          delay,
          x,
          y,
          max: 0.24,
          step(p, _dt, u) {
            const e = 1 - (1 - u) ** 3;
            const px = x + api.state.bodyX + Math.cos(ang) * 8 * e;
            const py = y + api.state.bodyY + Math.sin(ang) * 8 * e - 6 * u;
            p.node.setAttribute('opacity', ((1 - u) * 0.55).toFixed(3));
            p.node.setAttribute(
              'transform',
              `translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${(1.6 * (1 - 0.4 * u)).toFixed(2)})`,
            );
          },
        });
      }

      function emitBubble(opt: BubbleOpts): void {
        const destX = C + Math.cos(opt.ang) * (bodyR + opt.clear);
        const destY = C + Math.sin(opt.ang) * (bodyR + opt.clear);
        const travel = opt.travel;
        const hang = opt.hang;
        const pop = 0.26;
        const life = travel + hang + pop;
        const drift = opt.drift;
        const wx = opt.wx;
        const wy = opt.wy;
        const wp = opt.wp;
        const g = el('g', {});
        g.appendChild(el('path', { d: cloudD, class: 'mm-bubble' }));
        g.appendChild(
          el('ellipse', {
            cx: -5.2,
            cy: -7.4,
            rx: 3.1,
            ry: 2.1,
            class: 'mm-sheen',
          }),
        );
        api.emit(g, {
          delay: opt.delay,
          x: x0,
          y: y0,
          max: life,
          step(p, _dt, u) {
            const t = u * life;
            let x: number;
            let y: number;
            let s: number;
            let op: number;
            if (t < travel) {
              const k = easeOut(t / travel);
              x = x0 + (destX - x0) * k;
              y = y0 + (destY - y0) * k;
              const grow = Math.min(1, t / 0.1);
              s = 0.18 + 0.82 * grow;
              op = 0.82 * grow;
            } else if (t < travel + hang) {
              const h = (t - travel) / hang;
              x = destX + Math.sin(t * wx + wp) * 2.4;
              y = destY - h * drift + Math.sin(t * wy + wp) * 1.6;
              s = 1 + 0.04 * Math.sin(t * 7 + wp);
              op = 0.82;
            } else {
              const pk = (t - travel - hang) / pop;
              x = destX + Math.sin((travel + hang) * wx + wp) * 2.4;
              y = destY - drift + Math.sin((travel + hang) * wy + wp) * 1.6;
              s = pk < 0.34 ? 1 + 0.4 * (pk / 0.34) : 1.4 * Math.max(0, 1 - (pk - 0.34) / 0.66);
              op = pk < 0.22 ? 0.82 : 0.82 * Math.max(0, 1 - (pk - 0.22) / 0.78);
            }
            x += api.state.bodyX;
            y += api.state.bodyY;
            p.node.setAttribute('opacity', op.toFixed(3));
            p.node.setAttribute(
              'transform',
              `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(opt.size * s).toFixed(3)})`,
            );
          },
        });
        emitPop(opt.delay + (travel + hang) * 1000, destX, destY - drift * 0.65);
      }

      function emitBreath(sec: { mid: number; spread: number }, n: number): void {
        const slots =
          n >= 4 ? ['far', 'mid', 'far', 'near'] : n === 3 ? ['far', 'mid', 'near'] : ['mid', 'near'];
        const delays =
          n >= 4
            ? [0, rand(42, 78), rand(105, 160), rand(180, 255)]
            : n === 3
              ? [0, rand(50, 90), rand(130, 200)]
              : [0, rand(60, 110)];
        for (let i = 0; i < n; i++) {
          const kind = slots[i];
          let clear: number;
          let travel: number;
          let hang: number;
          let size: number;
          if (kind === 'far') {
            clear = rand(52, 72);
            travel = rand(0.48, 0.62);
            hang = rand(0.68, 0.92);
            size = rand(0.42, 0.54);
          } else if (kind === 'mid') {
            clear = rand(32, 46);
            travel = rand(0.3, 0.4);
            hang = rand(0.42, 0.6);
            size = rand(0.5, 0.62);
          } else {
            clear = rand(18, 28);
            travel = rand(0.18, 0.26);
            hang = rand(0.22, 0.36);
            size = rand(0.58, 0.72);
          }
          const bias = (i / Math.max(1, n - 1) - 0.5) * 1.15;
          emitBubble({
            delay: delays[i] as number,
            ang: sec.mid + bias * sec.spread + rand(-0.08, 0.08),
            clear,
            travel,
            hang,
            size,
            drift: kind === 'far' ? rand(10, 18) : kind === 'mid' ? rand(6, 11) : rand(3, 7),
            wx: rand(4.2, 7.5),
            wy: rand(3.4, 6.2),
            wp: rand(0, 6.3),
          });
        }
      }

      if (!full) {
        emitBreath(PUFF_SECTORS[(Math.random() * 3) | 0] as { mid: number; spread: number }, 2);
        return true;
      }

      if (now - puffMem.lastAt > 1200) puffMem.queue = [];
      puffMem.lastAt = now;
      if (!puffMem.queue.length) {
        puffMem.queue = [PUFF_SECTORS[0] as { mid: number; spread: number }].concat(
          shuffle(PUFF_SECTORS.slice(1)),
        );
      }
      emitBreath(puffMem.queue.shift() as { mid: number; spread: number }, 4);
      return true;
    },
  },

  stardust: {
    colors: ['#F5B840', '#F7D07A', '#F09A4E', '#FBE3A8'],
    orbitSize: [3.4, 5.6],
    burstSize: [3, 6.4],
    makeOrbitNode: (c) => el('path', { d: SPARK_PATH, fill: c, class: 'mm-spark' }),
    makeBurstNode: (c) =>
      Math.random() < 0.4
        ? el('path', { d: STAR_PATH, fill: c, class: 'mm-spark' })
        : el('path', { d: SPARK_PATH, fill: c, class: 'mm-spark' }),
    orbitSpecial: {
      chance: 0.3,
      make() {
        const g = el('g', {});
        g.appendChild(el('path', { d: PENCIL_PATH, fill: '#E8A64C' }));
        g.appendChild(el('path', { d: 'M0.5 -0.16 L1 0 L0.5 0.16 Z', fill: '#5C4632' }));
        return g;
      },
      size: [5, 6.5],
    },
    signature(api, strength) {
      const n = Math.round(10 * strength);
      for (let i = 0; i < n; i++) {
        const ang = (TAU * i) / n + rand(-0.2, 0.2);
        const rr = rand(96, 126);
        const x0 = api.C + api.state.bodyX + Math.cos(ang) * rr;
        const y0 = api.C + api.state.bodyY + Math.sin(ang) * rr * 0.92;
        const size = rand(3.4, 6.2);
        const spin = rand(-140, 140);
        const big = Math.random() < 0.45;
        api.emit(el('path', { d: big ? STAR_PATH : SPARK_PATH, fill: api.pick(), class: 'mm-spark' }), {
          delay: i * 55,
          x: x0,
          y: y0,
          max: rand(0.75, 1.15),
          step(p, dt, u) {
            p.y -= 14 * dt;
            const s = u < 0.22 ? size * (u / 0.22) * 1.25 : size * (1 - (0.35 * (u - 0.22)) / 0.78);
            const tw = 0.75 + 0.25 * Math.sin(u * 26 + i);
            p.node.setAttribute('opacity', ((1 - u ** 2.2) * tw).toFixed(3));
            p.node.setAttribute(
              'transform',
              `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(spin * u).toFixed(1)}) scale(${s.toFixed(3)})`,
            );
          },
        });
      }
      return true;
    },
  },
};

export function registerSkin(name: string, def: Skin): void {
  SKINS[name] = def;
}

export function listSkins(): string[] {
  return Object.keys(SKINS);
}

export function createFx(ctx: FxContext): FxHandle {
  const C = ctx.C;
  const skin = SKINS[ctx.skin] || (SKINS.cloudpuff as Skin);
  const colors = ctx.palette?.fx || skin.colors;
  const back = ctx.back;
  const front = ctx.front;
  const anchors: FxAnchors = ctx.anchors || {
    mouth: { x: C, y: C + 36 },
    top: { x: C, y: C - 104 },
    bottom: { x: C, y: C + 104 },
    halfW: 104,
  };

  const orbiters: Orbiter[] = [];
  const pieces: Piece[] = [];
  const emits: Emit[] = [];
  let wasFast = false;
  let spawnAt: SpawnItem[] = [];
  let spinPlane: { tilt: number; roll: number } | null = null;
  let orbitNextAt = 0;
  const lastState: FxState = { yaw: 0, dYaw: 0, vel: 0, orbitWant: false, bodyX: 0, bodyY: 0 };

  function pick(arr?: string[]): string {
    const list = arr || colors;
    return list[(Math.random() * list.length) | 0] as string;
  }

  function orbitPoint(o: OrbitParams, lam: number): OrbitPoint {
    const hx = o.rad * Math.sin(lam);
    const hy = -o.rad * Math.cos(lam) * Math.sin(o.tilt);
    const ca = Math.cos(o.roll);
    const sa = Math.sin(o.roll);
    return {
      x: C + hx * ca - hy * sa,
      y: C + hx * sa + hy * ca,
      z: Math.cos(lam) * Math.cos(o.tilt),
      l: lam,
    };
  }

  function spawnOrbiter(mode: 'spin' | 'orbit', cfg: { o: OrbitParams }): void {
    if (orbiters.length > 26) return;
    const special = mode === 'orbit' && skin.orbitSpecial && Math.random() < skin.orbitSpecial.chance;
    const node = special && skin.orbitSpecial ? skin.orbitSpecial.make(pick()) : skin.makeOrbitNode(pick());
    front.appendChild(node);
    const sz = special && skin.orbitSpecial ? skin.orbitSpecial.size : skin.orbitSize;
    orbiters.push(
      Object.assign(
        {
          node,
          inFront: true,
          mode,
          life: 0,
          max: mode === 'spin' ? rand(1.1, 2) : Number.POSITIVE_INFINITY,
          ret: 0,
          size: rand(sz[0], sz[1]),
          rotSpd: special ? rand(40, 80) : rand(-160, 160),
          rot: rand(0, 360),
        },
        cfg,
      ),
    );
  }

  function spawnSpinGroup(yaw: number, dir: number): void {
    spinPlane = {
      tilt: rand(0.18, 0.5),
      roll: rand(-0.7, 0.7),
    };
    const n = Math.round(rand(5, 8));
    spawnAt = [];
    for (let q = 0; q < n; q++) spawnAt.push({ at: performance.now() + q * rand(45, 90), dir, yaw });
  }

  function releaseSpinOne(item: SpawnItem, yaw: number): void {
    const plane = spinPlane as { tilt: number; roll: number };
    spawnOrbiter('spin', {
      o: {
        lam: yaw - rand(0, 0.2) * item.dir,
        lamVel: item.dir * rand(2.2, 4.2),
        tilt: plane.tilt + rand(-0.06, 0.06),
        roll: plane.roll + rand(-0.08, 0.08),
        rad: rand(118, 142),
        radVel: rand(14, 40),
      },
    });
  }

  function removeOrbiter(idx: number): void {
    (orbiters[idx] as Orbiter).node.remove();
    orbiters.splice(idx, 1);
  }

  function burst(count?: number): void {
    const total = count || 20;
    for (let i = 0; i < total && pieces.length < 56; i++) {
      const ang = (i / total) * TAU + rand(-0.35, 0.35);
      const spd = rand(170, 360);
      const node = skin.makeBurstNode(pick());
      front.appendChild(node);
      pieces.push({
        x: C + Math.cos(ang) * rand(96, 118),
        y: C + Math.sin(ang) * rand(96, 118),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(20, 75),
        life: 0,
        max: rand(0.45, 0.9),
        r: rand(skin.burstSize[0], skin.burstSize[1]),
        rot: rand(0, 360),
        vr: rand(-260, 260),
        el: node,
      });
    }
  }

  const emitApi: EmitApi = {
    C,
    defs: ctx.defs,
    anchors,
    state: lastState,
    pick: () => pick(),
    orbitPoint: (o, lam) => orbitPoint(o, lam),
    emit(node, cfg) {
      if (emits.length > 80) {
        return;
      }
      node.setAttribute('opacity', '0');
      front.appendChild(node);
      emits.push({
        node,
        x: cfg.x,
        y: cfg.y,
        born: performance.now() + (cfg.delay || 0),
        life: 0,
        max: cfg.max || 1,
        step: cfg.step,
        cleanup: cfg.cleanup,
      });
    },
  };

  function signature(strength?: number): boolean {
    if (!skin.signature) return false;
    return skin.signature(emitApi, strength || 1) === true;
  }

  function update(dt: number, now: number, state: FxState): void {
    lastState.yaw = state.yaw;
    lastState.dYaw = state.dYaw;
    lastState.vel = state.vel;
    lastState.orbitWant = state.orbitWant;
    lastState.bodyX = state.bodyX || 0;
    lastState.bodyY = state.bodyY || 0;

    const vel = state.vel;
    const fast = Math.abs(vel) >= 0.9;
    const dir = vel >= 0 ? 1 : -1;

    if (fast && !wasFast) spawnSpinGroup(state.yaw, dir);
    if (!fast) spawnAt.length = 0;
    wasFast = fast;
    if (Math.abs(vel) >= 5) {
      while (spawnAt.length && now >= (spawnAt[0] as SpawnItem).at) {
        releaseSpinOne(spawnAt.shift() as SpawnItem, state.yaw);
      }
    }

    if (state.orbitWant && now >= orbitNextAt) {
      let orbitCount = 0;
      for (let oc = 0; oc < orbiters.length; oc++)
        if ((orbiters[oc] as Orbiter).mode === 'orbit') orbitCount++;
      if (orbitCount < 5) {
        spawnOrbiter('orbit', {
          o: {
            lam: rand(0, TAU),
            lamVel: (Math.random() < 0.5 ? -1 : 1) * rand(1.5, 2.2),
            tilt: rand(0.1, 0.24),
            roll: rand(-0.12, 0.12),
            rad: rand(122, 146),
            radVel: 0,
          },
        });
      }
      orbitNextAt = now + 420;
    }

    for (let ti = orbiters.length - 1; ti >= 0; ti--) {
      const ob = orbiters[ti] as Orbiter;
      ob.life += dt;
      const retreat = ob.mode === 'orbit' ? !state.orbitWant : ob.life > ob.max;
      ob.ret = clamp(ob.ret + (retreat ? dt / 0.4 : -dt / 0.3), 0, 1);
      if (retreat && ob.ret >= 1) {
        removeOrbiter(ti);
        continue;
      }

      const o = ob.o;
      o.lam += o.lamVel * dt + (ob.mode === 'spin' ? state.dYaw * 0.55 : state.dYaw * 0.2);
      if (ob.mode === 'spin') {
        o.lamVel *= Math.exp(-1.1 * dt);
        o.rad += o.radVel * dt;
        o.radVel *= Math.exp(-1.6 * dt);
      }
      ob.rot += ob.rotSpd * dt;

      const p = orbitPoint(o, o.lam);
      const wantFront = p.z >= 0;
      if (wantFront !== ob.inFront) {
        (wantFront ? front : back).appendChild(ob.node);
        ob.inFront = wantFront;
      }
      let grow = Math.min(ob.life / 0.3, 1);
      grow = grow * grow * (3 - 2 * grow);
      const depth = 0.68 + 0.32 * clamp(p.z, 0, 1);
      const s = ob.size * depth * grow * (1 - 0.8 * ob.ret * ob.ret);
      if (s < 0.25) {
        ob.node.setAttribute('opacity', '0');
        continue;
      }
      ob.node.setAttribute('opacity', ((1 - ob.ret) * (0.55 + 0.45 * depth)).toFixed(3));
      ob.node.setAttribute(
        'transform',
        `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${ob.rot.toFixed(1)}) scale(${s.toFixed(3)})`,
      );
    }

    for (let ci = pieces.length - 1; ci >= 0; ci--) {
      const pc = pieces[ci] as Piece;
      pc.life += dt;
      if (pc.life >= pc.max) {
        pc.el.remove();
        pieces.splice(ci, 1);
        continue;
      }
      pc.x += pc.vx * dt;
      pc.y += pc.vy * dt;
      const drag = 0.94 ** (60 * dt);
      pc.vx *= drag;
      pc.vy = pc.vy * drag + 40 * dt;
      pc.rot += pc.vr * dt;
      const u = pc.life / pc.max;
      const fd = u < 0.1 ? u / 0.1 : (1 - (u - 0.1) / 0.9) ** 1.7;
      const sz = Math.max(pc.r * (1 - 0.4 * u), 0.4);
      pc.el.setAttribute('opacity', fd.toFixed(3));
      pc.el.setAttribute(
        'transform',
        `translate(${pc.x.toFixed(2)} ${pc.y.toFixed(2)}) rotate(${pc.rot.toFixed(1)}) scale(${sz.toFixed(3)})`,
      );
    }

    for (let ei = emits.length - 1; ei >= 0; ei--) {
      const em = emits[ei] as Emit;
      if (now < em.born) continue;
      em.life += dt;
      if (em.life >= em.max) {
        em.node.remove();
        if (em.cleanup) em.cleanup();
        emits.splice(ei, 1);
        continue;
      }
      em.step(em, dt, em.life / em.max, em.life);
    }
  }

  function destroy(): void {
    for (const o of orbiters) o.node.remove();
    for (const p of pieces) p.el.remove();
    for (const e of emits) {
      e.node.remove();
      if (e.cleanup) e.cleanup();
    }
    orbiters.length = 0;
    pieces.length = 0;
    emits.length = 0;
  }

  return {
    update,
    burst,
    signature,
    destroy,
    signatureMouth: skin.signatureMouth || null,
    signatureMouthMs: skin.signatureMouthMs || 0,
    signatureComplete: !!skin.signatureComplete,
  };
}
