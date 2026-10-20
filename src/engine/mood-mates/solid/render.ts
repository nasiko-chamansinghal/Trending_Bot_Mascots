import { createRibbons } from '../../shared/ribbons';
import { createFx, type FxHandle } from '../fx';
import type { Point, Ring } from '../geometry';
import { createProps } from '../props';
import type { BallHandle, BallOptions } from '../render';
import type { EyePose, Pose } from '../types';
import { centroid, clamp, el, r2 } from '../util';
import {
  bodyMesh,
  buildDepthMap,
  type DepthMap,
  type Mat3,
  projectDecal,
  projectStem,
  rotation,
  silhouette,
  type Vec2,
} from './model';
import type { SolidSpec } from './spec';

const C = 120;
let uid = 0;

interface Prepared {
  mesh: ReturnType<typeof bodyMesh>;
  map: DepthMap;
  restT: Mat3;
  restBottom: number;
}

const prepared = new WeakMap<SolidSpec, Prepared>();

function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

function mul(a: Mat3, b: Mat3): Mat3 {
  const o = new Array(9).fill(0) as Mat3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return o;
}

function prepare(spec: SolidSpec): Prepared {
  const hit = prepared.get(spec);
  if (hit) return hit;
  const rest = rotation(spec.rest);
  const mesh = bodyMesh(spec.body, 48, spec.body.ribs * 36);
  const restSil = silhouette(mesh, rest, 360);
  let bottom = Number.NEGATIVE_INFINITY;
  for (const p of restSil) bottom = Math.max(bottom, spec.center[1] + p[1] * spec.scale * spec.stretch[1]);
  const out: Prepared = {
    mesh,
    map: buildDepthMap(spec.body, rest, 256, 1.3),
    restT: transpose(rest),
    restBottom: bottom,
  };
  prepared.set(spec, out);
  return out;
}

export function solidRestOutline(spec: SolidSpec, count = 120): Point[] {
  const sil = silhouette(prepare(spec).mesh, rotation(spec.rest), count);
  return sil.map(
    (p) =>
      [
        spec.center[0] + p[0] * spec.scale * spec.stretch[0],
        spec.center[1] + p[1] * spec.scale * spec.stretch[1],
      ] as Point,
  );
}

function polyPath(pts: Vec2[]): string {
  if (!pts.length) return 'M0 0Z';
  let s = '';
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i] as Vec2;
    s += `${i ? 'L' : 'M'}${r2(p[0])} ${r2(p[1])}`;
  }
  return `${s}Z`;
}

interface EyeNode {
  node: SVGPathElement;
  lastD: string;
  lastFill?: string;
  lastStroke?: string;
}

export function createSolidBall(container: HTMLElement, opts: BallOptions): BallHandle {
  const id = `ms${uid++}`;
  const lite = !!opts.lite;
  const ch = opts.character;
  const spec = ch.solid as SolidSpec;
  const prep = prepare(spec);
  const palette = ch.palette;
  const K = spec.scale;
  const KX = K * spec.stretch[0];
  const KY = K * spec.stretch[1];
  const [CX, CY] = spec.center;

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
  const defs = el('defs', {}) as SVGDefsElement;
  svg.appendChild(defs);

  const shGrad = el('radialGradient', { id: `${id}sh`, cx: '50%', cy: '50%', r: '50%' });
  shGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#000000', 'stop-opacity': '0.9' }));
  shGrad.appendChild(el('stop', { offset: '72%', 'stop-color': '#000000', 'stop-opacity': '0.32' }));
  shGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#000000', 'stop-opacity': '0' }));
  defs.appendChild(shGrad);
  const shadowCy = Math.min(prep.restBottom + 6, 234);
  const shadow = el('ellipse', {
    cx: C,
    cy: shadowCy,
    rx: r2(K * 0.72),
    ry: 7,
    fill: `url(#${id}sh)`,
    opacity: '0.16',
    'pointer-events': 'none',
  });
  svg.appendChild(shadow);

  const fxBack = el('g', { 'pointer-events': 'none' }) as SVGGElement;
  svg.appendChild(fxBack);

  const bodyG = el('g', { class: 'mm-body' });
  const stemBack = el('path', { fill: spec.stemColor, stroke: 'none' }) as SVGPathElement;
  const body = el('path', { fill: palette.body, stroke: 'none' }) as SVGPathElement;
  const stemFront = el('path', { fill: spec.stemColor, stroke: 'none' }) as SVGPathElement;
  const cap = el('ellipse', { fill: spec.capColor, stroke: 'none' }) as SVGEllipseElement;
  bodyG.appendChild(stemBack);
  bodyG.appendChild(body);
  bodyG.appendChild(stemFront);
  bodyG.appendChild(cap);
  svg.appendChild(bodyG);

  const eyeG = el('g', {});
  const eyes: [EyeNode, EyeNode] = [0, 1].map(() => {
    const node = el('path', { fill: palette.eye, stroke: 'none', 'stroke-width': '1.6' }) as SVGPathElement;
    eyeG.appendChild(node);
    return { node, lastD: '' };
  }) as [EyeNode, EyeNode];
  svg.appendChild(eyeG);

  const propsLayer = ch.props.length ? el('g', { 'pointer-events': 'none' }) : null;
  const props = propsLayer ? createProps(ch.props, propsLayer) : null;
  if (propsLayer) svg.appendChild(propsLayer);

  const fxFront = el('g', { 'pointer-events': 'none' }) as SVGGElement;
  svg.appendChild(fxFront);

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
      }) as SVGTextElement;
      zn.textContent = ch.zzz?.glyph || 'z';
      fxFront.appendChild(zn);
      zzzNodes.push(zn);
    }
  }

  container.appendChild(svg);

  const fx: FxHandle | null = !lite
    ? createFx({ back: fxBack, front: fxFront, C, skin: ch.fxSkin, palette })
    : null;
  const ribbons = !lite
    ? createRibbons({
        id,
        defs,
        back: fxBack,
        front: fxFront,
        centerX: CX,
        centerY: CY,
        nextUid: () => uid++,
        trailRadius: K * 1.08,
        orbitRadius: K * 1.16,
        width: K / 110,
      })
    : null;

  let lastKey = '';
  let lastM: Mat3 = rotation(spec.rest);
  let curSketch = -1;
  let prevNow = 0;

  function setGeometry(yaw: number, pitch: number): Mat3 {
    const key = `${Math.round(yaw * 573)}:${Math.round(pitch * 573)}`;
    if (key === lastKey) return lastM;
    lastKey = key;
    const m = rotation({ yaw: spec.rest.yaw + yaw, pitch: spec.rest.pitch + pitch, roll: spec.rest.roll });
    lastM = m;
    const sil = silhouette(prep.mesh, m, 360).map((p) => [CX + p[0] * KX, CY + p[1] * KY] as Vec2);
    body.setAttribute('d', polyPath(sil));
    const st = projectStem(spec.stem, m);
    const outline = st.outline.map((p) => [CX + p[0] * KX, CY + p[1] * KY] as Vec2);
    const d = polyPath(outline);
    stemFront.setAttribute('d', st.front ? d : 'M0 0Z');
    stemBack.setAttribute('d', st.front ? 'M0 0Z' : d);
    if (st.cap) {
      cap.style.display = '';
      cap.setAttribute('cx', r2(CX + st.cap.cx * KX).toString());
      cap.setAttribute('cy', r2(CY + st.cap.cy * KY).toString());
      cap.setAttribute('rx', r2(st.cap.rx * K).toString());
      cap.setAttribute('ry', r2(Math.max(0.3, st.cap.ry * K)).toString());
      cap.setAttribute(
        'transform',
        `rotate(${r2(st.cap.angle)} ${r2(CX + st.cap.cx * KX)} ${r2(CY + st.cap.cy * KY)})`,
      );
      if (!st.front) bodyG.insertBefore(cap, body);
      else bodyG.appendChild(cap);
    } else {
      cap.style.display = 'none';
    }
    return m;
  }

  function eyeRing(pose: EyePose): Vec2[] {
    const ring = pose.ring as Ring;
    const c = centroid(ring);
    const sx = pose.scaleX * ch.face.eye;
    const sy = pose.scaleY * ch.face.eye * clamp(pose.open, 0.02, 2.4);
    const a = ((pose.rotate || 0) * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const ox = c[0] + pose.x + pose.lookX;
    const oy = c[1] + pose.y + pose.lookY;
    const out: Vec2[] = new Array(ring.length);
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i] as Point;
      const dx = (p[0] - c[0]) * sx;
      const dy = (p[1] - c[1]) * sy;
      out[i] = [(ox + dx * ca - dy * sa - CX) / KX, (oy + dx * sa + dy * ca - CY) / KY];
    }
    return out;
  }

  function setEye(
    eye: EyeNode,
    pose: EyePose,
    rel: Mat3,
    sketch: number,
    bodyTf: string,
    sqx: number,
    sqy: number,
  ): void {
    const pts = projectDecal(prep.map, eyeRing(pose), rel, spec.edge);
    if (!pts) {
      eye.node.style.display = 'none';
      return;
    }
    eye.node.style.display = '';
    const scr = pts.map((p) => [CX + p[0] * KX, CY + p[1] * KY] as Vec2);
    let mx = 0;
    let my = 0;
    for (const p of scr) {
      mx += p[0];
      my += p[1];
    }
    mx /= scr.length;
    my /= scr.length;
    const d = polyPath(scr);
    if (d !== eye.lastD) {
      eye.node.setAttribute('d', d);
      eye.lastD = d;
    }
    eye.node.setAttribute(
      'transform',
      `${bodyTf} translate(${r2(mx)} ${r2(my)}) scale(${r2(1 / sqx)} ${r2(1 / sqy)}) translate(${r2(-mx)} ${r2(-my)})`,
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
    const spinYaw = b.yaw || 0;
    const m = setGeometry((b.turn || 0) + spinYaw, b.pitch || 0);
    const rel = mul(m, prep.restT);
    const sqx = b.scaleX || 1;
    const sqy = b.scaleY || 1;
    const bodyTf = `translate(${r2(C + b.x)} ${r2(C + b.y + (1 - sqy) * b.scale * (prep.restBottom - C))}) rotate(${r2(b.rotate || 0)}) scale(${r2(b.scale * sqx)} ${r2(b.scale * sqy)}) translate(${-C} ${-C})`;
    bodyG.setAttribute('transform', bodyTf);

    const sketchOn = sketch > 0.5;
    if (sketchOn !== curSketch > 0.5) {
      curSketch = sketchOn ? 1 : 0;
      svg.classList.toggle('is-sketch', sketchOn);
      for (const node of [body, stemBack, stemFront, cap]) {
        node.style.stroke = sketchOn ? `var(--sketch-ink, ${b.color})` : '';
        node.style.strokeWidth = sketchOn ? '1.6' : '';
      }
    }
    body.setAttribute('fill', sketchOn ? 'none' : b.color);
    stemBack.setAttribute('fill', sketchOn ? 'none' : spec.stemColor);
    stemFront.setAttribute('fill', sketchOn ? 'none' : spec.stemColor);
    cap.setAttribute('fill', sketchOn ? 'none' : spec.capColor);

    setEye(eyes[0], pose.left, rel, sketch, bodyTf, sqx, sqy);
    setEye(eyes[1], pose.right, rel, sketch, bodyTf, sqx, sqy);

    const lift = clamp(-b.y / 52, 0, 1);
    const shOp = sketchOn ? 0 : 0.16 * (1 - 0.55 * lift);
    shadow.setAttribute('opacity', shOp.toFixed(3));
    if (shOp > 0.001) {
      shadow.setAttribute(
        'transform',
        `translate(${r2(C + b.x * 0.7)} ${shadowCy}) scale(${r2((1 - 0.3 * lift) * b.scale * sqx)} ${r2(1 - 0.35 * lift)}) translate(${-C} ${-shadowCy})`,
      );
    }

    if (props) props.apply(pose.props, { body: b.color, eye: pose.left.color, sketch: sketchOn });
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
          `translate(${r2(176 + zp * 34 + 4 * Math.sin(zp * 9))} ${r2(70 - zp * 42)}) rotate(${r2(-10 + zp * 14)})`,
        );
      }
    }

    if (ribbons) ribbons.update(dt, now, spinYaw, (b.orbit || 0) > 0);
    if (fx) fx.update(dt, now, { yaw: 0, dYaw: 0, vel: 0 });
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
