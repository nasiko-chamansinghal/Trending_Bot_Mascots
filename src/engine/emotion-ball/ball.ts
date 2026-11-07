import { createRibbons } from '../shared/ribbons';
import { centroid, clamp, el, type Point, type Ring, r2, rand, shade } from '../shared/util';
import { RINGS } from './rings';
import type { EyePose, Pose } from './types';

const RD = RINGS;
const TAU = Math.PI * 2;
let uid = 0;

const HEAD_C = RD.HEAD_C;
const EYE_HALF = RD.EYE_HALF;
const EXPR = RD.EXPRESSIONS;
const STAR_GOLD = RD.STAR_GOLD;
const CONFETTI_COLORS = ['#f9705c', '#5b95f0', '#3fbe86', '#f5b13f', '#9a72ee', '#35c3bd'];

const STAR_PATH = (() => {
  const pts: string[] = [];
  for (let e = 0; e < 10; e++) {
    const a = -Math.PI / 2 + (e * Math.PI) / 5;
    const r = e % 2 === 0 ? 1 : 0.42;
    pts.push(`${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
})();

function ringPath(ring: Ring): string {
  let s = 'M';
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i] as Point;
    s += `${i ? 'L' : ''}${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  }
  return `${s}Z`;
}

interface ConfPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  rot: number;
  vr: number;
  stretch: number;
  el: SVGElement;
}

interface EyeState {
  node: SVGPathElement;
  ring: Ring;
  c: Point;
  lastFill?: string;
  lastStroke?: string;
}

export interface BallOptions {
  shape?: string;
  lite?: boolean;
  label?: string;
}

export interface BallHandle {
  svg: SVGSVGElement;
  applyPose: (pose: Pose) => void;
  burst: (count?: number) => void;
  destroy: () => void;
}

export function createBall(container: HTMLElement, opts: BallOptions = {}): BallHandle {
  const id = `eb${uid++}`;
  const lite = !!opts.lite;
  const shape = RD.SHAPES[opts.shape as string] || (RD.SHAPES.blob as (typeof RD.SHAPES)[string]);
  const face = shape.face;
  const headRing = shape.ring;

  let silMinY = 1e9;
  let silMaxY = -1e9;
  for (let i = 0; i < headRing.length; i++) {
    const hp = headRing[i] as Point;
    if (hp[1] < silMinY) silMinY = hp[1];
    if (hp[1] > silMaxY) silMaxY = hp[1];
  }
  const SIL_STEP = 2;
  const silRows: Array<[number, number]> = [];
  const silRowCount = Math.ceil((silMaxY - silMinY) / SIL_STEP) + 1;
  for (let r = 0; r < silRowCount; r++) {
    const y = silMinY + r * SIL_STEP;
    let lo = 1e9;
    let hi = -1e9;
    for (let e = 0; e < headRing.length; e++) {
      const a = headRing[e] as Point;
      const b = headRing[(e + 1) % headRing.length] as Point;
      const y0 = a[1];
      const y1 = b[1];
      if ((y0 <= y && y1 >= y) || (y1 <= y && y0 >= y)) {
        const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
        const x = a[0] + (b[0] - a[0]) * t;
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    if (lo > hi) {
      lo = HEAD_C - 4;
      hi = HEAD_C + 4;
    }
    silRows.push([lo, hi]);
  }
  function silAt(y: number): [number, number] {
    const r = Math.round((clamp(y, silMinY, silMaxY) - silMinY) / SIL_STEP);
    return silRows[clamp(r, 0, silRows.length - 1)] as [number, number];
  }

  const svg = el('svg', {
    viewBox: '-15 -15 259 259',
    width: '100%',
    height: '100%',
    role: 'img',
    'aria-label': opts.label || 'AI emotion ball',
  });
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  const defs = el('defs', {});
  const grad = el('radialGradient', { id: `${id}g`, cx: '38%', cy: '32%', r: '75%' });
  const stopA = el('stop', { offset: '0%' });
  const stopB = el('stop', { offset: '62%' });
  const stopC = el('stop', { offset: '100%' });
  grad.appendChild(stopA);
  grad.appendChild(stopB);
  grad.appendChild(stopC);
  defs.appendChild(grad);
  svg.appendChild(defs);

  const fxBack = el('g', { 'pointer-events': 'none' });
  svg.appendChild(fxBack);

  const bodyG = el('g', {});
  const head = el('path', {
    d: ringPath(headRing),
    fill: `url(#${id}g)`,
    stroke: 'none',
    'stroke-width': '2',
  });
  bodyG.appendChild(head);

  function buildEye(k: number): EyeState {
    const ring0 = (EXPR[0] as [Ring, Ring])[k] as Ring;
    const node = el('path', { fill: '#1A1A1A', stroke: 'none', 'stroke-width': '1.6' });
    node.setAttribute('d', ringPath(ring0));
    return { node, ring: ring0, c: centroid(ring0) };
  }
  const eyeL = buildEye(0);
  const eyeR = buildEye(1);
  bodyG.appendChild(eyeL.node);
  bodyG.appendChild(eyeR.node);
  svg.appendChild(bodyG);

  const fxFront = el('g', { 'pointer-events': 'none' });
  svg.appendChild(fxFront);

  const BASE_C: [Point, Point] = [
    centroid((EXPR[0] as [Ring, Ring])[0]),
    centroid((EXPR[0] as [Ring, Ring])[1]),
  ];

  let zzzNodes: SVGTextElement[] | null = null;
  if (!lite) {
    zzzNodes = [];
    for (let zi = 0; zi < 3; zi++) {
      const zn = el('text', {
        x: 0,
        y: 0,
        fill: '#A8A296',
        opacity: '0',
        'font-family': "'Space Grotesk', 'Noto Sans SC', sans-serif",
        'font-weight': '700',
        'font-style': 'italic',
        'text-anchor': 'middle',
      });
      zn.textContent = 'z';
      fxFront.appendChild(zn);
      zzzNodes.push(zn);
    }
  }

  container.appendChild(svg);

  const ribbons = createRibbons({
    id,
    defs,
    back: fxBack,
    front: fxFront,
    centerX: HEAD_C,
    centerY: HEAD_C,
    nextUid: () => uid++,
  });
  let prevNow = 0;
  const confPieces: ConfPiece[] = [];

  function burst(count?: number): void {
    if (lite) return;
    const total = count || 20;
    for (let i = 0; i < total && confPieces.length < 60; i++) {
      const ang = (i / total) * TAU + rand(-0.35, 0.35);
      const spd = rand(170, 360);
      const star = Math.random() < 0.18;
      const round = !star && Math.random() < 0.3;
      let node: SVGElement;
      if (star) node = el('path', { d: STAR_PATH, fill: STAR_GOLD });
      else if (round)
        node = el('circle', {
          r: 1,
          fill: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0] as string,
        });
      else
        node = el('rect', {
          x: -0.5,
          y: -0.5,
          width: 1,
          height: 1,
          rx: 0.24,
          fill: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0] as string,
        });
      fxFront.appendChild(node);
      confPieces.push({
        x: HEAD_C + Math.cos(ang) * rand(96, 116),
        y: HEAD_C + Math.sin(ang) * rand(96, 116),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(20, 75),
        life: 0,
        max: rand(0.45, 0.85),
        r: star ? rand(4, 7) : rand(3.5, 8),
        rot: rand(0, 360),
        vr: rand(-260, 260),
        stretch: !star && !round ? 1.9 : 1,
        el: node,
      });
    }
  }

  let curBodyColor: string | null = null;
  let curSketch = -1;

  function setBodyColor(color: string): void {
    if (color === curBodyColor) return;
    curBodyColor = color;
    stopA.setAttribute('stop-color', shade(color, 0.22));
    stopB.setAttribute('stop-color', color);
    stopC.setAttribute('stop-color', shade(color, -0.12));
    if (curSketch > 0.5) head.style.stroke = `var(--sketch-ink, ${shade(color, -0.6)})`;
  }

  function setEye(eye: EyeState, pose: EyePose, k: number, sketch: number, yaw: number): void {
    const ring = pose.ring;
    if (ring && ring !== eye.ring) {
      eye.ring = ring;
      eye.node.setAttribute('d', ringPath(ring));
      eye.c = centroid(ring);
    }

    const base = eye.c || BASE_C[k];
    const open = clamp(pose.open, 0.02, 2.4);
    const sy = clamp(pose.scaleY * open * face.eye, 0.02, 2.4);
    const sxBase = pose.scaleX * face.eye;

    const halfH = EYE_HALF * sy + 2;
    let ey0 = HEAD_C + face.y + (base[1] - HEAD_C) * face.sy + pose.y + pose.lookY;
    ey0 = clamp(ey0, silMinY + halfH, silMaxY - halfH);

    const sil = silAt(ey0);
    const cx0 = (sil[0] + sil[1]) / 2;
    const hw = Math.max((sil[1] - sil[0]) / 2, 12);

    const ox = face.x + (base[0] - HEAD_C) * face.sx + pose.x + pose.lookX;
    const theta = clamp(ox / hw, -1.15, 1.15);
    const total = theta + (yaw || 0);
    const cn = Math.cos(total);
    if (cn <= 0.02) {
      eye.node.style.display = 'none';
      return;
    }
    eye.node.style.display = '';
    const ex = cx0 + hw * Math.sin(total) * 0.985;
    const dyN = (ey0 - HEAD_C) / 130;
    const fy = Math.sqrt(1 - dyN * dyN * 0.22);

    eye.node.setAttribute(
      'transform',
      `translate(${r2(ex)} ${r2(ey0)})${pose.rotate ? ` rotate(${r2(pose.rotate)})` : ''} scale(${r2(sxBase * cn)} ${r2(sy * fy)}) translate(${r2(-base[0])} ${r2(-base[1])})`,
    );

    const fill = sketch > 0.5 ? 'none' : pose.color;
    const stroke = sketch > 0.5 ? `var(--sketch-ink, ${pose.color})` : '';
    if (fill !== eye.lastFill) {
      eye.node.setAttribute('fill', fill);
      eye.lastFill = fill;
    }
    if (stroke !== eye.lastStroke) {
      eye.node.style.stroke = stroke;
      eye.lastStroke = stroke;
    }
  }

  function applyPose(pose: Pose): void {
    const b = pose.body;
    const now = performance.now();
    const sketch = b.sketch || 0;

    bodyG.setAttribute(
      'transform',
      `translate(${r2(HEAD_C + b.x)} ${r2(HEAD_C + b.y)}) rotate(${r2(b.rotate || 0)}) scale(${r2(b.scale * (b.scaleX ?? 1))} ${r2(b.scale * (b.scaleY ?? 1))}) translate(${r2(-HEAD_C)} ${r2(-HEAD_C)})`,
    );
    setBodyColor(b.color);

    if (sketch !== curSketch) {
      curSketch = sketch;
      if (sketch > 0.5) {
        head.setAttribute('fill', 'none');
        head.style.stroke = `var(--sketch-ink, ${shade(b.color, -0.6)})`;
        head.setAttribute('stroke-opacity', '0.85');
      } else {
        head.setAttribute('fill', `url(#${id}g)`);
        head.style.stroke = '';
      }
    }

    const yaw = b.yaw || 0;
    setEye(eyeL, pose.left, 0, sketch, yaw);
    setEye(eyeR, pose.right, 1, sketch, yaw);

    if (lite) return;

    const dt = prevNow ? clamp((now - prevNow) / 1000, 0.001, 0.05) : 1 / 60;
    prevNow = now;

    if (zzzNodes) {
      const zOn = (b.zzz || 0) > 0;
      for (let z = 0; z < zzzNodes.length; z++) {
        const znode = zzzNodes[z] as SVGTextElement;
        if (!zOn) {
          if (znode.getAttribute('opacity') !== '0') znode.setAttribute('opacity', '0');
          continue;
        }
        const zp = (now * 0.00033 + z / 3) % 1;
        const zo = (zp < 0.18 ? zp / 0.18 : 1 - (zp - 0.18) / 0.82) * 0.8 * b.zzz;
        znode.setAttribute('opacity', zo.toFixed(3));
        znode.setAttribute('font-size', (12 + zp * 11).toFixed(1));
        znode.setAttribute(
          'transform',
          `translate(${r2(180 + zp * 34 + 4 * Math.sin(zp * 9))} ${r2(48 - zp * 42)}) rotate(${r2(-10 + zp * 14)})`,
        );
      }
    }

    ribbons.update(dt, now, yaw, (b.orbit || 0) > 0);

    for (let ci = confPieces.length - 1; ci >= 0; ci--) {
      const pc = confPieces[ci] as ConfPiece;
      pc.life += dt;
      if (pc.life >= pc.max) {
        pc.el.remove();
        confPieces.splice(ci, 1);
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
      const sz = Math.max(pc.r * (1 - 0.4 * u), 0.5);
      pc.el.setAttribute('opacity', fd.toFixed(3));
      pc.el.setAttribute(
        'transform',
        `translate(${r2(pc.x)} ${r2(pc.y)}) rotate(${r2(pc.rot)}) scale(${r2(sz)} ${r2(sz * pc.stretch)})`,
      );
    }
  }

  function destroy(): void {
    if (svg.parentNode) svg.parentNode.removeChild(svg);
  }

  return { svg, applyPose, burst, destroy };
}
