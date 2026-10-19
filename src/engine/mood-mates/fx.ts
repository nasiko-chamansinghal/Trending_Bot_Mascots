import type { Palette } from './types';
import { clamp, el } from './util';

const TAU = Math.PI * 2;

export interface FxState {
  yaw: number;
  dYaw: number;
  vel: number;
}

interface OrbitParams {
  lam: number;
  lamVel: number;
  tilt: number;
  roll: number;
  rad: number;
  radVel: number;
}

export interface Skin {
  colors: string[];
  orbitSize: [number, number];
  burstSize: [number, number];
  makeOrbitNode: (c: string) => SVGElement;
  makeBurstNode: (c: string) => SVGElement;
}

export interface FxContext {
  back: SVGGElement;
  front: SVGGElement;
  C: number;
  skin: string;
  palette: Palette;
}

export interface FxHandle {
  update: (dt: number, now: number, state: FxState) => void;
  burst: (count?: number) => void;
  destroy: () => void;
}

interface Orbiter {
  node: SVGElement;
  inFront: boolean;
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

const SPARK_PATH =
  'M0 -1 C0.12 -0.22 0.22 -0.12 1 0 C0.22 0.12 0.12 0.22 0 1 C-0.12 0.22 -0.22 0.12 -1 0 C-0.22 -0.12 -0.12 -0.22 0 -1 Z';

const SKINS: Record<string, Skin> = {
  spark: {
    colors: ['#C3D4F2', '#9FB3D6', '#F5D889', '#9A8AE8'],
    orbitSize: [2.8, 4.4],
    burstSize: [3, 5.4],
    makeOrbitNode: (c) => el('circle', { r: 1, fill: c, opacity: 0.9, class: 'mm-spark' }),
    makeBurstNode: (c) =>
      Math.random() < 0.3
        ? el('path', { d: SPARK_PATH, fill: c, class: 'mm-spark' })
        : el('circle', { r: 1, fill: c, opacity: 0.9, class: 'mm-spark' }),
  },
};

export function registerSkin(name: string, def: Skin): void {
  SKINS[name] = def;
}

export function createFx(ctx: FxContext): FxHandle {
  const C = ctx.C;
  const skin = SKINS[ctx.skin] || (SKINS.spark as Skin);
  const colors = ctx.palette?.fx || skin.colors;
  const back = ctx.back;
  const front = ctx.front;

  const orbiters: Orbiter[] = [];
  const pieces: Piece[] = [];
  let wasFast = false;
  let spawnAt: SpawnItem[] = [];
  let spinPlane: { tilt: number; roll: number } | null = null;

  function pick(): string {
    return colors[(Math.random() * colors.length) | 0] as string;
  }

  function orbitPoint(o: OrbitParams, lam: number): { x: number; y: number; z: number } {
    const hx = o.rad * Math.sin(lam);
    const hy = -o.rad * Math.cos(lam) * Math.sin(o.tilt);
    const ca = Math.cos(o.roll);
    const sa = Math.sin(o.roll);
    return {
      x: C + hx * ca - hy * sa,
      y: C + hx * sa + hy * ca,
      z: Math.cos(lam) * Math.cos(o.tilt),
    };
  }

  function spawnOrbiter(o: OrbitParams): void {
    if (orbiters.length > 26) return;
    const node = skin.makeOrbitNode(pick());
    front.appendChild(node);
    orbiters.push({
      node,
      inFront: true,
      life: 0,
      max: rand(1.1, 2),
      ret: 0,
      size: rand(skin.orbitSize[0], skin.orbitSize[1]),
      rotSpd: rand(-160, 160),
      rot: rand(0, 360),
      o,
    });
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
    spawnOrbiter({
      lam: yaw - rand(0, 0.2) * item.dir,
      lamVel: item.dir * rand(2.2, 4.2),
      tilt: plane.tilt + rand(-0.06, 0.06),
      roll: plane.roll + rand(-0.08, 0.08),
      rad: rand(118, 142),
      radVel: rand(14, 40),
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

  function update(dt: number, now: number, state: FxState): void {
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

    for (let ti = orbiters.length - 1; ti >= 0; ti--) {
      const ob = orbiters[ti] as Orbiter;
      ob.life += dt;
      const retreat = ob.life > ob.max;
      ob.ret = clamp(ob.ret + (retreat ? dt / 0.4 : -dt / 0.3), 0, 1);
      if (retreat && ob.ret >= 1) {
        removeOrbiter(ti);
        continue;
      }

      const o = ob.o;
      o.lam += o.lamVel * dt + state.dYaw * 0.55;
      o.lamVel *= Math.exp(-1.1 * dt);
      o.rad += o.radVel * dt;
      o.radVel *= Math.exp(-1.6 * dt);
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
  }

  function destroy(): void {
    for (const o of orbiters) o.node.remove();
    for (const p of pieces) p.el.remove();
    orbiters.length = 0;
    pieces.length = 0;
  }

  return { update, burst, destroy };
}
