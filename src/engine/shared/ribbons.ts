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
}

interface Trail {
  o: TrailOrbit;
  r: number;
  life: number;
  ret: number;
  hist: OrbitPoint[];
  orbitMode: boolean;
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

export interface Ribbons {
  update: (dt: number, now: number, yaw: number, orbitWant: boolean) => void;
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
      y: CY + hx * sa + hy * ca,
      z: Math.cos(lam) * Math.cos(o.tilt),
      l: lam,
    };
  }

  function createTrail(cfg: { o: TrailOrbit; r: number; hue: number; orbit?: boolean }): void {
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
      hue: cfg.hue,
      hueSpan: rand(45, 95) * (Math.random() < 0.5 ? 1 : -1),
      hueVel: rand(18, 42) * (Math.random() < 0.5 ? 1 : -1),
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

  function spawnOrbit(idx: number): void {
    createTrail({
      orbit: true,
      o: {
        lam: rand(0, TAU),
        lamVel: (Math.random() < 0.5 ? -1 : 1) * rand(1.7, 2.3),
        tilt: rand(0.1, 0.22),
        roll: rand(-0.12, 0.12),
        rad: orbitRadius + idx * 16,
        radVel: 0,
        follow: 0.8,
        carry: 0,
        arc: rand(2.4, 3.2),
      },
      r: rand(5.5, 7),
      hue: rand(0, 360),
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

  function update(dt: number, now: number, yaw: number, orbitWant: boolean): void {
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

    if (orbitWant && now >= orbitNextAt) {
      let orbitCount = 0;
      for (let oc = 0; oc < trails.length; oc++) if ((trails[oc] as Trail).orbitMode) orbitCount++;
      if (orbitCount < 2) spawnOrbit(orbitCount);
      orbitNextAt = now + 700;
    }

    for (let ti = trails.length - 1; ti >= 0; ti--) {
      const rb = trails[ti] as Trail;
      rb.life += dt;
      const retract = rb.orbitMode ? !orbitWant : !fast || rb.life > 5;
      rb.ret = clamp(rb.ret + (retract ? dt / 0.5 : -dt / 0.35), 0, 1);
      if (retract && rb.ret >= 1) {
        removeTrail(ti);
        continue;
      }
      const o = rb.o;
      if (rb.orbitMode) {
        o.lam += o.lamVel * dt + dYaw * o.follow;
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
      const lastL = hist.length ? (hist[hist.length - 1] as OrbitPoint).l : o.lam - 0.001 * dir;
      const dl = o.lam - lastL;
      const steps = Math.min(Math.ceil(Math.abs(dl) / 0.09), 24);
      for (let st = 1; st <= steps; st++) hist.push(orbitPoint(o, lastL + (dl * st) / steps));
      if (!hist.length) hist.push(orbitPoint(o, o.lam));

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
