import { createFx, type FxHandle } from './fx';
import type { Point, Ring } from './geometry';
import { getMaterial } from './materials';
import { createProps } from './props';
import type { BodyPose, EyePose, Pose, ResolvedCharacter } from './types';
import { centroid, clamp, el, r2, ringPath, shade } from './util';

const C = 120;

interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  w: number;
  h: number;
}

interface EyeState {
  ring: Ring;
  c: Point;
  base: Point;
  bbox: BBox;
  node: SVGElement;
  lastFill?: string;
  lastStroke?: string;
}

export interface BallOptions {
  character: ResolvedCharacter;
  label?: string;
  lite?: boolean;
  material?: string;
}

export interface BallHandle {
  svg: SVGSVGElement;
  applyPose: (pose: Pose) => void;
  burst: (count?: number) => void;
  destroy: () => void;
}

let uid = 0;

function ringBBox(ring: Ring): BBox {
  let minX = 1e9;
  let maxX = -1e9;
  let minY = 1e9;
  let maxY = -1e9;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i] as Point;
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

export function createBall(container: HTMLElement, opts: BallOptions): BallHandle {
  const id = `mm${uid++}`;
  const lite = !!opts.lite;
  const ch = opts.character;
  const face = ch.face;
  const headRing = ch.bodyRing;
  const palette = ch.palette;

  let silMinY = 1e9;
  let silMaxY = -1e9;
  let silMaxW = 0;
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
      lo = C - 4;
      hi = C + 4;
    }
    silRows.push([lo, hi]);
    if (hi - lo > silMaxW) silMaxW = hi - lo;
  }
  const silCols: Array<[number, number]> = [];
  let silMinX = 1e9;
  let silMaxX = -1e9;
  for (const p of headRing) {
    if (p[0] < silMinX) silMinX = p[0];
    if (p[0] > silMaxX) silMaxX = p[0];
  }
  for (let x = silMinX; x <= silMaxX + SIL_STEP; x += SIL_STEP) {
    let top = Number.POSITIVE_INFINITY;
    let bot = Number.NEGATIVE_INFINITY;
    for (let e = 0; e < headRing.length; e++) {
      const a = headRing[e] as Point;
      const b = headRing[(e + 1) % headRing.length] as Point;
      if ((a[0] <= x && b[0] >= x) || (b[0] <= x && a[0] >= x)) {
        const t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
        const y = a[1] + (b[1] - a[1]) * t;
        if (y < top) top = y;
        if (y > bot) bot = y;
      }
    }
    silCols.push(top > bot ? [C - 4, C + 4] : [top, bot]);
  }
  function silColAt(x: number): [number, number] {
    const i = Math.round((x - silMinX) / SIL_STEP);
    return silCols[clamp(i, 0, silCols.length - 1)] as [number, number];
  }
  function silAt(y: number): [number, number] {
    const r = Math.round((clamp(y, silMinY, silMaxY) - silMinY) / SIL_STEP);
    return silRows[clamp(r, 0, silRows.length - 1)] as [number, number];
  }

  const svg = el('svg', {
    viewBox: '0 0 240 240',
    width: '100%',
    height: '100%',
    class: 'mm-svg',
    role: 'img',
    'aria-label': opts.label || ch.name || 'Mood Mates character',
  });
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  const defs = el('defs', {});
  svg.appendChild(defs);

  const materialId = opts.material || ch.material;
  const materialDef = getMaterial(materialId);
  if (!materialDef) throw new Error(`[MoodMates] Unknown material: ${materialId}`);
  const material = materialDef.create({ id, defs, headRing, palette, silMinY, silMaxY, silMaxW });

  const shGrad = el('radialGradient', { id: `${id}sh`, cx: '50%', cy: '50%', r: '50%' });
  shGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#000000', 'stop-opacity': '0.9' }));
  shGrad.appendChild(el('stop', { offset: '72%', 'stop-color': '#000000', 'stop-opacity': '0.32' }));
  shGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#000000', 'stop-opacity': '0' }));
  defs.appendChild(shGrad);

  const shadowRy = 7;
  const shadowCy = Math.min(silMaxY + 6, 234);
  const shadow = el('ellipse', {
    cx: C,
    cy: shadowCy,
    rx: r2(silMaxW * 0.36),
    ry: shadowRy,
    fill: `url(#${id}sh)`,
    opacity: '0.16',
    'pointer-events': 'none',
  });
  svg.appendChild(shadow);

  const fxBack = el('g', { 'pointer-events': 'none' });
  svg.appendChild(fxBack);

  const bodyG = el('g', { class: 'mm-body' });
  for (const node of material.body()) bodyG.appendChild(node);

  function buildEye(k: number): EyeState {
    const ring0 = ch.defaultEyeRing[k] as Ring;
    const base = centroid(ring0);
    return {
      ring: ring0,
      c: base,
      base,
      bbox: ringBBox(ring0),
      node: el('path', { fill: palette.eye, stroke: 'none', 'stroke-width': '1.6', d: ringPath(ring0) }),
    };
  }

  const faceLevel = face.level || 0;
  const faceG = faceLevel > 0 ? el('g', {}) : null;
  const faceHost = faceG || bodyG;

  const eyeL = buildEye(0);
  const eyeR = buildEye(1);
  faceHost.appendChild(eyeL.node);
  faceHost.appendChild(eyeR.node);
  if (faceG) bodyG.appendChild(faceG);

  svg.appendChild(bodyG);

  const propsLayer = ch.props.length ? el('g', { 'pointer-events': 'none' }) : null;
  const props = propsLayer ? createProps(ch.props, propsLayer) : null;
  if (propsLayer) svg.appendChild(propsLayer);

  const fxFront = el('g', { 'pointer-events': 'none' });
  svg.appendChild(fxFront);

  const BASE_C: [Point, Point] = [centroid(ch.defaultEyeRing[0]), centroid(ch.defaultEyeRing[1])];

  let zzzNodes: SVGTextElement[] | null = null;
  if (!lite) {
    zzzNodes = [];
    for (let zi = 0; zi < 3; zi++) {
      const zn = el('text', {
        x: 0,
        y: 0,
        fill: palette.zzz || '#A8A296',
        opacity: '0',
        'font-family': "'Space Grotesk', 'Noto Sans SC', sans-serif",
        'font-weight': ch.zzz?.weight || '700',
        'font-style': ch.zzz?.italic === false ? 'normal' : 'italic',
        'text-anchor': 'middle',
      });
      zn.textContent = ch.zzz?.glyph || 'z';
      fxFront.appendChild(zn);
      zzzNodes.push(zn);
    }
  }

  container.appendChild(svg);

  const fx: FxHandle | null = !lite
    ? createFx({ back: fxBack, front: fxFront, C, skin: ch.fxSkin, palette })
    : null;

  let curSketch = -1;
  let prevYaw = 0;
  let prevNow = 0;

  function applySketchChrome(on: boolean, color: string): void {
    svg.classList.toggle('is-sketch', on);
    material.setSketch(on, color);
  }

  function setEye(eye: EyeState, pose: EyePose, k: number, sketch: number, yaw: number): void {
    const ring = pose.ring;
    if (ring && ring !== eye.ring) {
      eye.ring = ring;
      eye.node.setAttribute('d', ringPath(ring));
      eye.c = centroid(ring);
      eye.bbox = ringBBox(ring);
    }

    const base = eye.c || BASE_C[k];
    const open = clamp(pose.open, 0.02, 2.4);
    const syEye = clamp(pose.scaleY * face.eye, 0.02, 2.4);
    const sxBase = pose.scaleX * face.eye;
    const syAll = clamp(syEye * open, 0.02, 2.4);

    let ey0 = C + face.y + (base[1] - C) * face.sy + pose.y + pose.lookY;
    const ox = face.x + (base[0] - C) * face.sx + pose.x + pose.lookX;
    const cn = Math.cos(yaw || 0);
    if (cn <= 0.02) {
      eye.node.style.display = 'none';
      return;
    }
    eye.node.style.display = '';
    const row0 = silAt(ey0);
    let ex = clamp(C + ox * cn, row0[0] + 4, row0[1] - 4);
    const m = face.contain;
    const sxA = Math.abs(sxBase * cn);
    const top = (eye.bbox.minY - base[1]) * syAll;
    const bottom = (eye.bbox.maxY - base[1]) * syAll;
    const left = (eye.bbox.minX - base[0]) * sxA;
    const right = (eye.bbox.maxX - base[0]) * sxA;
    for (let pass = 0; pass < 2; pass++) {
      let lo = Number.NEGATIVE_INFINITY;
      let hi = Number.POSITIVE_INFINITY;
      for (let y = ey0 + top; y <= ey0 + bottom + SIL_STEP; y += SIL_STEP) {
        const row = silAt(Math.min(y, ey0 + bottom));
        if (row[0] > lo) lo = row[0];
        if (row[1] < hi) hi = row[1];
      }
      ex = clamp(ex, lo + m - left, hi - m - right);
      let ceil = Number.NEGATIVE_INFINITY;
      let floor = Number.POSITIVE_INFINITY;
      for (let x = ex + left; x <= ex + right + SIL_STEP; x += SIL_STEP) {
        const col = silColAt(Math.min(x, ex + right));
        if (col[0] > ceil) ceil = col[0];
        if (col[1] < floor) floor = col[1];
      }
      ey0 = clamp(ey0, ceil + m - top, floor - m - bottom);
    }

    const tf = `translate(${r2(ex)} ${r2(ey0)})${pose.rotate ? ` rotate(${r2(pose.rotate)})` : ''} scale(${r2(sxBase * cn)} ${r2(syAll)})`;
    eye.node.setAttribute('transform', `${tf} translate(${r2(-base[0])} ${r2(-base[1])})`);

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

  let peelState: {
    flap: SVGPathElement;
    shade: SVGPathElement;
    clip: SVGPathElement;
    g: SVGGElement;
  } | null = null;
  let backState: { g: SVGGElement; card: SVGPathElement; text: SVGTextElement } | null = null;
  let sinkState: { g: SVGGElement; hole: SVGEllipseElement; clip: SVGRectElement } | null = null;

  function applyPeel(amount: number, color: string, bodyTf: string): void {
    if (amount <= 0.001) {
      if (peelState) {
        bodyG.removeAttribute('clip-path');
        peelState.g.style.display = 'none';
      }
      return;
    }
    if (!peelState) {
      const cp = el('clipPath', { id: `${id}pc`, clipPathUnits: 'userSpaceOnUse' });
      const clip = el('path', {});
      cp.appendChild(clip);
      defs.appendChild(cp);
      const g = el('g', { 'pointer-events': 'none' });
      const shadeP = el('path', { fill: '#000000', opacity: '0.2' });
      const flap = el('path', { 'stroke-width': '1.2', 'stroke-linejoin': 'round' });
      g.appendChild(shadeP);
      g.appendChild(flap);
      bodyG.after(g);
      peelState = { flap, shade: shadeP, clip, g };
    }
    let cx = 0;
    let cy = 0;
    let corner = headRing[0] as Point;
    for (const p of headRing) {
      cx += p[0] / headRing.length;
      cy += p[1] / headRing.length;
      if (p[1] - p[0] > corner[1] - corner[0]) corner = p;
    }
    const len = Math.hypot(corner[0] - cx, corner[1] - cy);
    const ux = (corner[0] - cx) / len;
    const uy = (corner[1] - cy) / len;
    const d = clamp(amount, 0, 1) * 0.36 * len;
    const lx = corner[0] - ux * d;
    const ly = corner[1] - uy * d;
    const side = (p: Point) => (p[0] - lx) * ux + (p[1] - ly) * uy;
    const vx = -uy;
    const vy = ux;
    peelState.clip.setAttribute(
      'd',
      `M${r2(lx + vx * 400)} ${r2(ly + vy * 400)}L${r2(lx - vx * 400)} ${r2(ly - vy * 400)}L${r2(lx - vx * 400 - ux * 800)} ${r2(ly - vy * 400 - uy * 800)}L${r2(lx + vx * 400 - ux * 800)} ${r2(ly + vy * 400 - uy * 800)}Z`,
    );
    const cut: Point[] = [];
    for (let i = 0; i < headRing.length; i++) {
      const a = headRing[i] as Point;
      const bb = headRing[(i + 1) % headRing.length] as Point;
      const sa = side(a);
      const sb = side(bb);
      if (sa >= 0) cut.push(a);
      if (sa >= 0 !== sb >= 0) {
        const t = sa / (sa - sb);
        cut.push([a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t]);
      }
    }
    const flapRing = cut.map((p) => {
      const sd = side(p);
      return [p[0] - 2 * sd * ux, p[1] - 2 * sd * uy] as Point;
    });
    const dFlap = ringPath(flapRing);
    peelState.flap.setAttribute('d', dFlap);
    peelState.flap.setAttribute('fill', shade(color, 0.55));
    peelState.flap.setAttribute('stroke', shade(color, -0.18));
    peelState.shade.setAttribute('d', dFlap);
    peelState.shade.setAttribute('transform', 'translate(1.6 2.6)');
    peelState.g.setAttribute('transform', bodyTf);
    peelState.g.style.display = '';
    bodyG.setAttribute('clip-path', `url(#${id}pc)`);
  }

  function applyBack(on: boolean, color: string): void {
    if (!on) {
      if (backState) backState.g.style.display = 'none';
      return;
    }
    if (!backState) {
      const g = el('g', { 'pointer-events': 'none' });
      const card = el('path', { d: ringPath(headRing) });
      const text = el('text', {
        x: C,
        y: C,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': "'Space Grotesk', 'Noto Sans SC', sans-serif",
        'font-weight': '800',
        'font-size': '64',
      });
      text.textContent = ch.backFace?.text ?? '';
      g.appendChild(card);
      g.appendChild(text);
      bodyG.appendChild(g);
      backState = { g, card, text };
    }
    backState.card.setAttribute('fill', shade(color, ch.backFace?.lighten ?? 0.5));
    backState.text.setAttribute('fill', shade(color, -0.45));
    backState.g.style.display = '';
  }

  function applySink(amount: number, b: BodyPose): void {
    if (amount <= 0.001) {
      if (sinkState) {
        sinkState.g.removeAttribute('clip-path');
        sinkState.hole.style.display = 'none';
      }
      return;
    }
    if (!sinkState) {
      const cp = el('clipPath', { id: `${id}sk`, clipPathUnits: 'userSpaceOnUse' });
      const clip = el('rect', { x: -400, y: -1000, width: 1040, height: r2(1000 + silMaxY) });
      cp.appendChild(clip);
      defs.appendChild(cp);
      const hole = el('ellipse', { cy: r2(silMaxY), 'pointer-events': 'none' });
      const g = el('g', {});
      bodyG.before(hole);
      bodyG.before(g);
      g.appendChild(bodyG);
      sinkState = { g, hole, clip };
    }
    const k = clamp(amount, 0, 1);
    const hole = sinkState.hole;
    hole.style.display = '';
    hole.setAttribute('cx', String(r2(C + b.x)));
    hole.setAttribute('rx', String(r2(silMaxW * 0.56 * k)));
    hole.setAttribute('ry', String(r2(9 * k)));
    if ((b.sketch || 0) > 0.5) {
      hole.setAttribute('fill', 'none');
      hole.setAttribute('stroke', `var(--sketch-ink, ${b.color})`);
      hole.setAttribute('stroke-width', '1.6');
    } else {
      hole.setAttribute('fill', shade(b.color, -0.62));
      hole.removeAttribute('stroke');
    }
    sinkState.g.setAttribute('clip-path', `url(#${id}sk)`);
  }

  function applyPose(pose: Pose): void {
    const b = pose.body;
    const now = performance.now();
    const sketch = b.sketch || 0;

    const yaw0 = b.yaw || 0;
    let spinTilt = 0;
    let spinSqX = 1;
    if (yaw0 > 0.001 || yaw0 < -0.001) {
      spinTilt = 5 * Math.sin(yaw0);
      spinSqX = 0.88 + 0.12 * Math.abs(Math.cos(yaw0));
    }

    const bodyTf = `translate(${r2(C + b.x)} ${r2(C + b.y + (1 - b.scaleY) * b.scale * (silMaxY - C))}) rotate(${r2((b.rotate || 0) + spinTilt)}) scale(${r2(b.scale * spinSqX * b.scaleX)} ${r2(b.scale * b.scaleY)}) translate(${r2(-C)} ${r2(-C)})`;
    bodyG.setAttribute('transform', bodyTf);
    if (faceG) faceG.setAttribute('transform', `rotate(${r2(-(b.rotate || 0) * faceLevel)} ${C} ${C})`);
    material.setColor(b.color);
    if (b.peel != null || peelState) applyPeel(b.peel || 0, b.color, bodyTf);
    if (b.flip != null || backState) applyBack((b.flip || 0) >= 0.5, b.color);
    if (b.sink != null || sinkState) applySink(b.sink || 0, b);

    const lift = clamp(-b.y / 52, 0, 1);
    const shOp = sketch > 0.5 ? 0 : 0.16 * (1 - 0.55 * lift) * (1 - clamp(b.sink || 0, 0, 1));
    shadow.setAttribute('opacity', shOp.toFixed(3));
    if (shOp > 0.001) {
      shadow.setAttribute(
        'transform',
        `translate(${r2(C + b.x * 0.7)} ${shadowCy}) scale(${r2((1 - 0.3 * lift) * b.scale)} ${r2(1 - 0.35 * lift)}) translate(${-C} ${-shadowCy})`,
      );
    }

    const sketchOn = sketch > 0.5;
    if (sketchOn !== curSketch > 0.5) {
      curSketch = sketchOn ? 1 : 0;
      applySketchChrome(sketchOn, b.color);
    }

    const yaw = b.yaw || 0;
    setEye(eyeL, pose.left, 0, sketch, yaw);
    setEye(eyeR, pose.right, 1, sketch, yaw);

    if (props) props.apply(pose.props, { body: b.color, eye: pose.left.color, sketch: sketchOn });

    if (lite) return;

    const dt = prevNow ? clamp((now - prevNow) / 1000, 0.001, 0.05) : 1 / 60;
    prevNow = now;

    if (zzzNodes) {
      const zzzSize = ch.zzz?.size ?? 1;
      const zzzOpacity = ch.zzz?.opacity ?? 0.8;
      const zOn = (b.zzz || 0) > 0;
      for (let z = 0; z < zzzNodes.length; z++) {
        const znode = zzzNodes[z] as SVGTextElement;
        if (!zOn) {
          if (znode.getAttribute('opacity') !== '0') znode.setAttribute('opacity', '0');
          continue;
        }
        const zp = (now * 0.00033 + z / 3) % 1;
        const zo = (zp < 0.18 ? zp / 0.18 : 1 - (zp - 0.18) / 0.82) * zzzOpacity * b.zzz;
        znode.setAttribute('opacity', zo.toFixed(3));
        znode.setAttribute('font-size', ((12 + zp * 11) * zzzSize).toFixed(1));
        znode.setAttribute(
          'transform',
          `translate(${r2(186 + zp * 34 + 4 * Math.sin(zp * 9))} ${r2(52 - zp * 42)}) rotate(${r2(-10 + zp * 14)})`,
        );
      }
    }

    let dYaw = yaw - prevYaw;
    if (!Number.isFinite(dYaw) || Math.abs(dYaw) > 1.2) dYaw = 0;
    prevYaw = yaw;
    const vel = dYaw / dt;

    if (fx) {
      fx.update(dt, now, { yaw, dYaw, vel });
    }
  }

  function burst(count?: number): void {
    if (fx) fx.burst(count);
  }

  function destroy(): void {
    if (fx) fx.destroy();
    if (svg.parentNode) svg.parentNode.removeChild(svg);
  }

  return { svg, applyPose, burst, destroy };
}
