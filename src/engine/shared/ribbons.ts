import { clamp, el, r2, rand } from './util';

const TAU = Math.PI * 2;

interface OrbitPoint {
  x: number;
  y: number;
  z: number;
  l: number;
}

interface TrailOrbit {
  lam: number;
  lamVel: number;
  tilt: number;
  roll: number;
  rad: number;
  radVel: number;
  follow: number;
  carry: number;
  arc: number;
  cy?: number;
  rise?: number;
}

interface Trail {
  o: TrailOrbit;
  r: number;
  life: number;
  ret: number;
  hist: OrbitPoint[];
  orbitMode: boolean;
  style: AuraStyle | null;
  hue: number;
  hueSpan: number;
  hueVel: number;
  gradEl: SVGLinearGradientElement;
  stops: SVGStopElement[];
  back: SVGPathElement;
  front: SVGPathElement;
}

interface Plane {
  tilt: number;
  roll: number;
}

export interface RibbonHost {
  id: string;
  defs: SVGDefsElement;
  back: SVGGElement;
  front: SVGGElement;
  centerX: number;
  centerY: number;
  nextUid: () => number;
  trailRadius?: number;
  orbitRadius?: number;
  width?: number;
}

export interface AuraStyle {
  count: number;
  every: number;
  rest?: number;
  rad: [number, number];
  step: number;
  tilt: [number, number];
  roll: [number, number];
  speed: [number, number];
  arc: [number, number];
  width: [number, number];
  starts?: Array<[number, number]>;
  lift?: number[];
  rise?: number;
  grow?: number;
  brake?: number;
  life?: number;
  hues?: number[];
  span?: number;
  spacing?: number;
}

const ORBIT: AuraStyle = {
  count: 2,
  every: 700,
  rad: [1, 1],
  step: 16,
  tilt: [0.1, 0.22],
  roll: [-0.12, 0.12],
  speed: [1.7, 2.3],
  arc: [2.4, 3.2],
  width: [5.5, 7],
};

const HALF = Math.PI / 2;

export const AURAS: Record<string, AuraStyle> = {
  orbit: ORBIT,
  rainbow: {
    spacing: 0.05,
    count: 5,
    every: 70,
    rest: 3300,
    rad: [1.02, 1.02],
    step: 5.4,
    tilt: [1.72, 1.72],
    roll: [0, 0],
    speed: [7.2, 7.2],
    arc: [3.3, 3.3],
    width: [4.6, 4.6],
    starts: [[-HALF - 0.12, 1]],
    brake: 2.2,
    life: 2.1,
    hues: [272, 212, 140, 50, 6],
    span: 14,
  },
  halo: {
    spacing: 0.05,
    count: 2,
    every: 260,
    rad: [0.46, 0.5],
    step: 0,
    tilt: [0.3, 0.36],
    roll: [-0.06, 0.06],
    speed: [1.1, 1.35],
    arc: [2.5, 2.9],
    width: [3.6, 4.2],
    starts: [
      [0, 1],
      [Math.PI, 1],
    ],
    lift: [-1.2],
  },
  swirl: {
    spacing: 0.05,
    count: 3,
    every: 420,
    rad: [0.94, 1],
    step: 0,
    tilt: [0.3, 0.42],
    roll: [-0.16, 0.16],
    speed: [2.3, 2.8],
    arc: [2, 2.6],
    width: [4.4, 5.4],
    lift: [0.55],
    rise: -0.62,
    grow: -0.14,
    life: 2,
  },
  waves: {
    spacing: 0.05,
    count: 4,
    every: 300,
    rad: [0.88, 0.88],
    step: 0,
    tilt: [HALF, HALF],
    roll: [0, 0],
    speed: [1.05, 1.05],
    arc: [1.1, 1.1],
    width: [3.4, 3.8],
    starts: [
      [HALF - 0.55, 1],
      [-HALF + 0.55, -1],
    ],
    grow: 0.42,
    life: 1.05,
  },
  scan: {
    spacing: 0.05,
    count: 3,
    every: 230,
    rad: [1, 1.04],
    step: 0,
    tilt: [0.12, 0.2],
    roll: [-0.05, 0.05],
    speed: [3.4, 4],
    arc: [1.7, 2.2],
    width: [3.6, 4.4],
    lift: [-0.36, 0.02, 0.4],
    life: 1.3,
  },
};

export interface Ribbons {
  update: (dt: number, now: number, yaw: number, aura: boolean | AuraStyle | null) => void;
}

function pick(range: [number, number]): number {
  return range[0] === range[1] ? range[0] : rand(range[0], range[1]);
}

export function createRibbons(host: RibbonHost): Ribbons {
  const { id, defs, back: fxBack, front: fxFront } = host;
  const CX = host.centerX;
  const CY = host.centerY;
  const trailRadius = host.trailRadius ?? 116;
  const orbitRadius = host.orbitRadius ?? 124;
  const widthK = host.width ?? 1;
  const trails: Trail[] = [];
  let planes: Plane[] = [];
  let planeG = 4;
  let baseHue = 0;
  let spawnAt: number[] = [];
  let spawnIdx = 0;
  let wasFast = false;
  let prevYaw = 0;
  let orbitNextAt = 0;

  function makePlanes(): void {
    planes = [];
    const n = Math.random() < 0.45 ? 2 : 3;
    const roll0 = rand(-0.9, 0.9);
    for (let pi = 0; pi < n; pi++) {
      planes.push({
        tilt: rand(0.16, 0.72),
        roll: roll0 + pi * (Math.PI / n) + rand(-0.15, 0.15),
      });
    }
    planeG = Math.round(rand(4, 6));
    baseHue = rand(0, 360);
    spawnIdx = 0;
  }

  function orbitPoint(o: TrailOrbit, lam: number): OrbitPoint {
    const hx = o.rad * Math.sin(lam);
    const hy = -o.rad * Math.cos(lam) * Math.sin(o.tilt);
    const ca = Math.cos(o.roll);
    const sa = Math.sin(o.roll);
    return {
      x: CX + hx * ca - hy * sa,
      y: CY + (o.cy ?? 0) + hx * sa + hy * ca,
      z: Math.cos(lam) * Math.cos(o.tilt),
      l: lam,
    };
  }

  function createTrail(cfg: {
    o: TrailOrbit;
    r: number;
    hue: number;
    orbit?: boolean;
    style?: AuraStyle;
    span?: number;
  }): void {
    if (trails.length > 8) return;
    const gradEl = el('linearGradient', { id: `${id}tg${host.nextUid()}`, gradientUnits: 'userSpaceOnUse' });
    const stops: SVGStopElement[] = [];
    for (let s = 0; s < 5; s++) {
      const st = el('stop', { offset: (s / 4).toFixed(3) });
      gradEl.appendChild(st);
      stops.push(st);
    }
    defs.appendChild(gradEl);
    const fill = `url(#${gradEl.getAttribute('id')})`;
    const back = el('path', { stroke: 'none', fill, opacity: '0' });
    const front = el('path', { stroke: 'none', fill, opacity: '0' });
    fxBack.appendChild(back);
    fxFront.appendChild(front);
    trails.push({
      o: cfg.o,
      r: cfg.r,
      life: 0,
      ret: 0,
      hist: [],
      orbitMode: !!cfg.orbit,
      style: cfg.style ?? null,
      hue: cfg.hue,
      hueSpan: cfg.span ?? rand(45, 95) * (Math.random() < 0.5 ? 1 : -1),
      hueVel: cfg.span != null ? 0 : rand(18, 42) * (Math.random() < 0.5 ? 1 : -1),
      gradEl,
      stops,
      back,
      front,
    });
  }

  function spawnTrail(lam0: number, dir: number): void {
    const pl = planes[spawnIdx % planes.length] as Plane;
    const tierStep = 38 / Math.max(planeG - 1, 1);
    const rw = planeG <= 3 ? rand(8, 10.5) : planeG === 4 ? rand(6.6, 8.6) : rand(5.6, 7.4);
    createTrail({
      o: {
        lam: lam0,
        lamVel: dir * rand(0.5, 1.1),
        tilt: pl.tilt + rand(-0.04, 0.04),
        roll: pl.roll + rand(-0.05, 0.05),
        rad: trailRadius + spawnIdx * tierStep + rand(-1.5, 1.5),
        radVel: rand(0, 2.5),
        follow: rand(0.74, 0.94),
        carry: 0,
        arc: rand(2.2, 3.4),
      },
      r: rw,
      hue: baseHue + (360 * spawnIdx) / Math.max(planeG, 1) + rand(-14, 14),
    });
    spawnIdx++;
  }

  function spawnAura(st: AuraStyle, idx: number): void {
    const start = st.starts ? (st.starts[idx % st.starts.length] as [number, number]) : null;
    const lam = start ? start[0] : rand(0, TAU);
    const dir = start ? start[1] : Math.random() < 0.5 ? -1 : 1;
    createTrail({
      orbit: true,
      style: st,
      o: {
        lam,
        lamVel: dir * pick(st.speed),
        tilt: pick(st.tilt),
        roll: pick(st.roll),
        rad: orbitRadius * pick(st.rad) + idx * st.step,
        radVel: (st.grow ?? 0) * orbitRadius,
        follow: 0.8,
        carry: 0,
        arc: pick(st.arc),
        cy: (st.lift ? (st.lift[idx % st.lift.length] as number) : 0) * orbitRadius,
        rise: (st.rise ?? 0) * orbitRadius,
      },
      r: pick(st.width),
      hue: st.hues ? (st.hues[idx % st.hues.length] as number) : rand(0, 360),
      span: st.span,
    });
  }

  function buildTrail(pts: OrbitPoint[], width: number): { front: string; back: string } {
    const n = pts.length;
    const nx: number[] = [];
    const ny: number[] = [];
    for (let e = 0; e < n; e++) {
      const p0 = pts[e > 0 ? e - 1 : 0] as OrbitPoint;
      const p1 = pts[e < n - 1 ? e + 1 : n - 1] as OrbitPoint;
      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      const h = Math.hypot(dx, dy) || 1;
      dx /= h;
      dy /= h;
      const d = (width * (0.5 + (e / (n - 1)) * 0.5)) / 2;
      nx.push(-dy * d);
      ny.push(dx * d);
    }
    function cap(idx: number): string {
      const hw = Math.max(Math.hypot(nx[idx] as number, ny[idx] as number), 0.2);
      return `A${r2(hw)} ${r2(hw)} 0 0 0 `;
    }
    function seg(a: number, b: number): string {
      let s = '';
      for (let k = a; k <= b; k++) {
        const pk = pts[k] as OrbitPoint;
        s += `${k === a ? 'M' : 'L'}${r2(pk.x + (nx[k] as number))} ${r2(pk.y + (ny[k] as number))}`;
      }
      s += b === n - 1 ? cap(b) : 'L';
      for (let k = b; k >= a; k--) {
        const pk = pts[k] as OrbitPoint;
        s += `${k === b ? '' : 'L'}${r2(pk.x - (nx[k] as number))} ${r2(pk.y - (ny[k] as number))}`;
      }
      if (a === 0) {
        const p0 = pts[0] as OrbitPoint;
        s += `${cap(0)}${r2(p0.x + (nx[0] as number))} ${r2(p0.y + (ny[0] as number))}`;
      }
      return `${s}Z`;
    }
    let front = '';
    let back = '';
    let d0 = 0;
    while (d0 < n) {
      const isF = (pts[d0] as OrbitPoint).z >= 0;
      let i2 = d0;
      while (i2 + 1 < n && (pts[i2 + 1] as OrbitPoint).z >= 0 === isF) i2++;
      const a2 = Math.max(d0 - 1, 0);
      const b2 = Math.min(i2 + 1, n - 1);
      if (b2 > a2) {
        const str = seg(a2, b2);
        if (isF) front += str;
        else back += str;
      }
      d0 = i2 + 1;
    }
    return { front, back };
  }

  function removeTrail(idx: number): void {
    const rb = trails[idx] as Trail;
    rb.back.remove();
    rb.front.remove();
    rb.gradEl.remove();
    trails.splice(idx, 1);
  }

  function update(dt: number, now: number, yaw: number, aura: boolean | AuraStyle | null): void {
    const want = aura === true ? ORBIT : aura || null;
    let dYaw = yaw - prevYaw;
    if (!Number.isFinite(dYaw) || Math.abs(dYaw) > 1.2) dYaw = 0;
    prevYaw = yaw;
    const vel = dYaw / dt;
    const fast = Math.abs(vel) >= 0.9;
    const dir = vel >= 0 ? 1 : -1;

    if (fast && !wasFast) {
      makePlanes();
      spawnAt = [];
      for (let q = 0; q < planeG; q++) spawnAt.push(now + q * rand(55, 105));
    }
    if (!fast) spawnAt.length = 0;
    wasFast = fast;
    if (Math.abs(vel) >= 5) {
      while (spawnAt.length && now >= (spawnAt[0] as number)) {
        spawnAt.shift();
        spawnTrail(yaw - rand(0, 0.18) * dir, dir);
      }
    }

    if (want && now >= orbitNextAt) {
      let orbitCount = 0;
      for (let oc = 0; oc < trails.length; oc++) if ((trails[oc] as Trail).style === want) orbitCount++;
      if (orbitCount < want.count) {
        spawnAura(want, orbitCount);
        orbitNextAt = now + (orbitCount === want.count - 1 && want.rest != null ? want.rest : want.every);
      } else orbitNextAt = now + want.every;
    }

    for (let ti = trails.length - 1; ti >= 0; ti--) {
      const rb = trails[ti] as Trail;
      rb.life += dt;
      const st = rb.style;
      const retract = rb.orbitMode
        ? !st || st !== want || (st.life != null && rb.life > st.life)
        : !fast || rb.life > 5;
      rb.ret = clamp(rb.ret + (retract ? dt / 0.5 : -dt / 0.35), 0, 1);
      if (retract && rb.ret >= 1) {
        removeTrail(ti);
        continue;
      }
      const o = rb.o;
      if (rb.orbitMode) {
        o.lam += o.lamVel * dt + dYaw * o.follow;
        if (rb.style?.brake) o.lamVel *= Math.exp(-rb.style.brake * dt);
        if (o.rise) o.cy = (o.cy ?? 0) + o.rise * dt;
      } else if (fast) {
        o.carry = vel * o.follow;
        o.lam += dYaw * o.follow + o.lamVel * dt;
      } else {
        o.lam += (o.carry + o.lamVel) * dt;
        o.carry *= Math.exp(-2.6 * dt);
        o.lamVel *= Math.exp(-2.6 * dt);
      }
      o.rad += o.radVel * dt;

      const hist = rb.hist;
      const gap = rb.style?.spacing;
      const anchor = gap && hist.length >= 2 ? (hist[hist.length - 2] as OrbitPoint) : null;
      if (anchor && Math.abs(o.lam - anchor.l) < (gap as number)) {
        hist[hist.length - 1] = orbitPoint(o, o.lam);
      } else {
        const lastL = hist.length ? (hist[hist.length - 1] as OrbitPoint).l : o.lam - 0.001 * dir;
        const dl = o.lam - lastL;
        const steps = Math.min(Math.ceil(Math.abs(dl) / 0.09), 24);
        for (let st = 1; st <= steps; st++) hist.push(orbitPoint(o, lastL + (dl * st) / steps));
        if (!hist.length) hist.push(orbitPoint(o, o.lam));
      }

      const span = o.arc * (1 - rb.ret * rb.ret * (3 - 2 * rb.ret));
      while (hist.length > 2 && Math.abs(o.lam - (hist[0] as OrbitPoint).l) > span) hist.shift();
      const over = Math.abs(o.lam - (hist[0] as OrbitPoint).l) - span;
      if (hist.length >= 2 && over > 0) {
        const tl = (hist[0] as OrbitPoint).l + (o.lam - (hist[0] as OrbitPoint).l >= 0 ? 1 : -1) * over;
        hist[0] = orbitPoint(o, tl);
      }
      if (hist.length > 48) hist.splice(0, hist.length - 48);

      const zHead = Math.cos(o.lam) * Math.cos(o.tilt);
      const pz = 0.72 + 0.28 * clamp(zHead, 0, 1);
      let grow = Math.min(rb.life / 0.34, 1);
      grow = grow * grow * (3 - 2 * grow);
      const width = rb.r * pz * 1.7 * grow * (1 - 0.72 * rb.ret * rb.ret) * widthK;
      const fade = Math.min(rb.life / 0.26, 1).toFixed(3);

      if (hist.length < 2 || width < 0.5) {
        rb.back.setAttribute('opacity', '0');
        rb.front.setAttribute('opacity', '0');
        continue;
      }
      const dstr = buildTrail(hist, width);
      rb.back.setAttribute('d', dstr.back);
      rb.front.setAttribute('d', dstr.front);
      rb.back.setAttribute('opacity', fade);
      rb.front.setAttribute('opacity', fade);

      const hue = rb.hue + rb.hueVel * rb.life;
      for (let si = 0; si < rb.stops.length; si++) {
        const frac = si / (rb.stops.length - 1);
        const hv = hue + frac * rb.hueSpan;
        (rb.stops[si] as SVGStopElement).setAttribute(
          'stop-color',
          `hsl(${(((hv % 360) + 360) % 360).toFixed(0)} 56% ${(56 + 11 * frac).toFixed(0)}%)`,
        );
      }
      const tail = hist[0] as OrbitPoint;
      const headP = hist[hist.length - 1] as OrbitPoint;
      rb.gradEl.setAttribute('x1', tail.x.toFixed(1));
      rb.gradEl.setAttribute('y1', tail.y.toFixed(1));
      rb.gradEl.setAttribute('x2', headP.x.toFixed(1));
      rb.gradEl.setAttribute('y2', headP.y.toFixed(1));
    }
  }

  return { update };
}
