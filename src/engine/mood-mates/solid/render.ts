import { hexToRgb, lerpColor } from '../../shared/math';
import { AURAS, createRibbons } from '../../shared/ribbons';
import { createFx, type FxHandle } from '../fx';
import type { Point, Ring } from '../geometry';
import { createProps } from '../props';
import type { BallHandle, BallOptions } from '../render';
import { createTint } from '../tint';
import type { EyePose, Pose } from '../types';
import { centroid, clamp, el, r2, ringPath } from '../util';
import {
  apply,
  type BodyShape,
  buildDecalMap,
  type DecalMap,
  type LimbGrid,
  limbGrid,
  limbShape,
  type Mat3,
  outline,
  projectEye,
  projectStem,
  rotation,
  skinOf,
  TAU,
  type Vec2,
} from './model';
import type { SolidSpec } from './spec';

const C = 120;
const LIMB_KNEE = 0.7;
const LIMB_MAX = 0.94;
const LIMB_STEPS = 180;
const RADIUS_BINS = 720;
const LIMB_FRONT_EDGE = 0.15;
const LIMB_SHADE_DROP = 2;
const LIMB_SHADE_OPACITY = '0.3';
const LIMB_SHADE_BLUR = 4;
let uid = 0;

function radiusAt(table: Float64Array, angle: number): number {
  const f = ((angle + Math.PI) / TAU) * RADIUS_BINS - 0.5;
  const i = Math.floor(f);
  const t = f - i;
  const a = table[(i + RADIUS_BINS) % RADIUS_BINS] as number;
  const b = table[(i + 1) % RADIUS_BINS] as number;
  return a + (b - a) * t;
}

function softLimb(d: number): number {
  const a = Math.abs(d);
  if (a <= LIMB_KNEE) return d;
  const span = LIMB_MAX - LIMB_KNEE;
  return Math.sign(d) * (LIMB_KNEE + span * Math.tanh((a - LIMB_KNEE) / span));
}

interface Prepared {
  grid: LimbGrid;
  skin: BodyShape;
  map: DecalMap;
  restRadius: Float64Array;
  restBottom: number;
  restTop: number;
}

const prepared = new WeakMap<SolidSpec, Prepared>();

function prepare(spec: SolidSpec): Prepared {
  const hit = prepared.get(spec);
  if (hit) return hit;
  const rest = rotation(spec.rest);
  const grid = limbGrid(spec.body);
  const skin = skinOf(spec.body);
  const restSil = outline(grid, rest, RADIUS_BINS);
  let bottom = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  for (const p of restSil) {
    const y = spec.center[1] + p[1] * spec.scale * spec.stretch[1];
    bottom = Math.max(bottom, y);
    top = Math.min(top, y);
  }
  const restRadius = new Float64Array(restSil.map((p) => Math.hypot(p[0], p[1])));
  const out: Prepared = {
    grid,
    skin,
    map: buildDecalMap(skin, rest),
    restRadius,
    restBottom: bottom,
    restTop: top,
  };
  prepared.set(spec, out);
  return out;
}

export function solidRestOutline(spec: SolidSpec, count = 120): Point[] {
  const sil = outline(prepare(spec).grid, rotation(spec.rest), count);
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

function paint(
  tag: 'linearGradient' | 'radialGradient',
  attrs: Record<string, string>,
  stops: Array<[string, string]>,
): SVGElement {
  const gradient = el(tag, attrs);
  for (const [offset, color] of stops) gradient.appendChild(el('stop', { offset, 'stop-color': color }));
  return gradient;
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
  const stemRoot = el('path', { fill: spec.stemColor, stroke: 'none' }) as SVGPathElement;
  const stemBack = el('path', { fill: spec.stemColor, stroke: 'none' }) as SVGPathElement;
  const body = el('path', { fill: palette.body, stroke: 'none' }) as SVGPathElement;
  const bodyFill = createTint(
    id,
    defs,
    spec.tint,
    palette.body,
    spec.limbs?.length ? [prep.restTop, prep.restBottom] : undefined,
  );

  const stemFront = el('path', { fill: spec.stemColor, stroke: 'none' }) as SVGPathElement;
  const cap = el('ellipse', { fill: spec.capColor, stroke: 'none' }) as SVGEllipseElement;
  bodyG.appendChild(stemRoot);
  bodyG.appendChild(stemBack);
  bodyG.appendChild(body);
  bodyG.appendChild(stemFront);
  bodyG.appendChild(cap);
  const shading = spec.stemShading;
  const stemFill = shading ? `url(#${id}stem)` : spec.stemColor;
  const ballLook = shading?.ball;
  const ballFill = `url(#${id}ball)`;
  const ball = ballLook ? el('circle', { fill: ballFill, stroke: 'none' }) : null;
  if (shading) {
    defs.appendChild(
      paint('linearGradient', { id: `${id}stem`, x1: '0', y1: '0', x2: '1', y2: '0' }, [
        ['0%', shading.edge],
        ['38%', shading.light],
        ['100%', shading.edge],
      ]),
    );
  }
  if (ball && ballLook) {
    defs.appendChild(
      paint('radialGradient', { id: `${id}ball`, cx: '0.5', cy: '0.5', r: '0.5', fx: '0.34', fy: '0.28' }, [
        ['0%', ballLook.light],
        ['55%', lerpColor(ballLook.light, ballLook.dark, 0.55)],
        ['100%', ballLook.dark],
      ]),
    );
    bodyG.appendChild(ball);
  }
  const limbs = (spec.limbs ?? []).map(() => {
    const node = el('path', { fill: palette.body, stroke: 'none' }) as SVGPathElement;
    bodyG.insertBefore(node, body);
    return node;
  });
  const limbFront = limbs.map(() => false);
  if (limbs.length) {
    const blur = el('filter', {
      id: `${id}lb`,
      filterUnits: 'userSpaceOnUse',
      x: '-60',
      y: '-60',
      width: '360',
      height: '360',
    });
    blur.appendChild(el('feGaussianBlur', { stdDeviation: LIMB_SHADE_BLUR }));
    defs.appendChild(blur);
  }
  const limbShades = limbs.map((_, i) => {
    const clipPath = el('clipPath', { id: `${id}lc${i}` });
    const clipArm = el('path', {}) as SVGPathElement;
    clipPath.appendChild(clipArm);
    defs.appendChild(clipPath);
    const path = el('path', {
      fill: '#000000',
      'fill-opacity': LIMB_SHADE_OPACITY,
      stroke: 'none',
      filter: `url(#${id}lb)`,
      transform: `translate(0 ${LIMB_SHADE_DROP})`,
    }) as SVGPathElement;
    const g = el('g', { 'clip-path': `url(#${id}lc${i})`, 'pointer-events': 'none' }) as SVGGElement;
    g.appendChild(path);
    bodyG.insertBefore(g, body);
    return { g, path, clipArm };
  });
  svg.appendChild(bodyG);

  const clip = el('clipPath', { id: `${id}clip` });
  const clipBody = el('path', {}) as SVGPathElement;
  clip.appendChild(clipBody);
  defs.appendChild(clip);
  const eyeG = el('g', { 'clip-path': `url(#${id}clip)` });
  const plateLook = spec.plate;
  const plateFill = `url(#${id}plate)`;
  const plateRing = (plateLook?.ring ?? []).map(([x, y]): Vec2 => [(x - CX) / KX, (y - CY) / KY]);
  let plateKey = '';
  const plate = plateLook ? el('path', { fill: plateFill, stroke: 'none' }) : null;
  let plateStops: SVGStopElement[] = [];
  if (plate && plateLook) {
    const gradient = paint('linearGradient', { id: `${id}plate`, x1: '0', y1: '0', x2: '0', y2: '1' }, [
      ['0%', plateLook.top],
      ['100%', plateLook.bottom],
    ]);
    plateStops = Array.from(gradient.children) as SVGStopElement[];
    defs.appendChild(gradient);
    eyeG.appendChild(plate);
  }
  let plateTone = 0;

  function tonePlate(eye: string): void {
    const inverse = plateLook?.inverse;
    if (!plateLook || !inverse) return;
    const [r, g, b] = hexToRgb(eye);
    const tone = Math.round(clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255 - 0.3, 0, 0.4) * 80) / 32;
    if (!Number.isFinite(tone) || tone === plateTone) return;
    plateTone = tone;
    plateStops[0]?.setAttribute('stop-color', lerpColor(plateLook.top, inverse.top, tone));
    plateStops[1]?.setAttribute('stop-color', lerpColor(plateLook.bottom, inverse.bottom, tone));
  }
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
  let lastLimbKey = '';

  function setGeometry(yaw: number, pitch: number): Mat3 {
    const key = `${Math.round(yaw * 573)}:${Math.round(pitch * 573)}`;
    if (key === lastKey) return lastM;
    lastKey = key;
    const m = rotation({ yaw: spec.rest.yaw + yaw, pitch: spec.rest.pitch + pitch, roll: spec.rest.roll });
    lastM = m;
    const sil = outline(prep.grid, m, 1080).map((p) => [CX + p[0] * KX, CY + p[1] * KY] as Vec2);
    const bodyD = polyPath(sil);
    body.setAttribute('d', bodyD);
    clipBody.setAttribute('d', bodyD);
    for (const shade of limbShades) shade.path.setAttribute('d', bodyD);
    lastLimbKey = '';
    if (!spec.stem) {
      cap.style.display = 'none';
      return m;
    }
    const st = projectStem(spec.stem, m);
    const toScreen = (p: Vec2): Vec2 => [CX + p[0] * KX, CY + p[1] * KY];
    const stemOutline = st.outline.map(toScreen);
    stemRoot.setAttribute('d', polyPath(st.root.map(toScreen)));
    const d = polyPath(stemOutline);
    stemFront.setAttribute('d', st.front ? d : 'M0 0Z');
    stemBack.setAttribute('d', st.front ? 'M0 0Z' : d);
    if (ball && ballLook) {
      cap.style.display = 'none';
      const tip = toScreen(st.tip);
      ball.setAttribute('cx', r2(tip[0]).toString());
      ball.setAttribute('cy', r2(tip[1]).toString());
      ball.setAttribute('r', r2(ballLook.radius * K).toString());
      if (!st.front) bodyG.insertBefore(ball, body);
      else bodyG.appendChild(ball);
      return m;
    }
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

  function eyeCentre(pose: EyePose): Vec2 {
    const [x, y] = centroid(pose.ring as Ring);
    return [x + pose.x + pose.lookX, y + pose.y + pose.lookY];
  }

  function setPlate(node: SVGPathElement, m: Mat3, pose: Pose): void {
    const follow = plateLook?.follow;
    let dx = 0;
    let dy = 0;
    if (follow) {
      const [lx, ly] = eyeCentre(pose.left);
      const [rx, ry] = eyeCentre(pose.right);
      dx = clamp(follow.gain * ((lx + rx) / 2 - follow.anchor[0]), -follow.limit[0], follow.limit[0]);
      dy = clamp(follow.gain * ((ly + ry) / 2 - follow.anchor[1]), -follow.limit[1], follow.limit[1]);
    }
    const key = `${lastKey}:${Math.round(dx * 8)}:${Math.round(dy * 8)}`;
    if (key === plateKey) return;
    plateKey = key;
    const ring = plateRing.map(([x, y]): Vec2 => [x + dx / KX, y + dy / KY]);
    const face = projectEye(prep.skin, prep.map, ring, m, spec.edge);
    node.style.display = face ? '' : 'none';
    if (face) node.setAttribute('d', polyPath(face.map((p): Vec2 => [CX + p[0] * KX, CY + p[1] * KY])));
  }

  function setLimbs(m: Mat3, raise: number[]): void {
    const key = raise.map((a) => Math.round(a * 10)).join(':');
    if (key === lastLimbKey) return;
    lastLimbKey = key;
    spec.limbs?.forEach((limb, i) => {
      const node = limbs[i] as SVGPathElement;
      const shade = limbShades[i] as (typeof limbShades)[number];
      const tube = projectStem(limbShape(limb, raise[i] ?? 0), m, LIMB_STEPS);
      const d = polyPath(tube.outline.map((p): Vec2 => [CX + p[0] * KX, CY + p[1] * KY]));
      node.setAttribute('d', d);
      shade.clipArm.setAttribute('d', d);
      const front = apply(m, limb.base)[2] > LIMB_FRONT_EDGE;
      if (front === limbFront[i]) return;
      limbFront[i] = front;
      if (front) {
        bodyG.appendChild(node);
      } else {
        bodyG.insertBefore(node, body);
        bodyG.insertBefore(shade.g, body);
      }
      showLimbShade(i);
    });
  }

  function showLimbShade(i: number): void {
    (limbShades[i] as (typeof limbShades)[number]).g.style.display =
      !limbFront[i] && curSketch <= 0.5 ? '' : 'none';
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
      const x = (ox + dx * ca - dy * sa - CX) / KX;
      const y = (oy + dx * sa + dy * ca - CY) / KY;
      const r = Math.hypot(x, y);
      const rim = radiusAt(prep.restRadius, Math.atan2(y, x));
      const k = r > 1e-6 ? (rim * softLimb(r / rim)) / r : 1;
      out[i] = [x * k, y * k];
    }
    return out;
  }

  function setEye(
    eye: EyeNode,
    pose: EyePose,
    m: Mat3,
    sketch: number,
    bodyTf: string,
    sqx: number,
    sqy: number,
  ): void {
    const pts = projectEye(prep.skin, prep.map, eyeRing(pose), m, spec.edge);
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
    const d = ringPath(scr);
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
    if (limbs.length) setLimbs(m, [b.armL ?? 0, b.armR ?? 0]);
    if (plate) setPlate(plate, m, pose);
    const sqx = b.scaleX || 1;
    const sqy = b.scaleY || 1;
    const bodyTf = `translate(${r2(C + b.x)} ${r2(C + b.y + (1 - sqy) * b.scale * (prep.restBottom - C))}) rotate(${r2(b.rotate || 0)}) scale(${r2(b.scale * sqx)} ${r2(b.scale * sqy)}) translate(${-C} ${-C})`;
    bodyG.setAttribute('transform', bodyTf);
    plate?.setAttribute('transform', bodyTf);

    const sketchOn = sketch > 0.5;
    if (sketchOn !== curSketch > 0.5) {
      curSketch = sketchOn ? 1 : 0;
      svg.classList.toggle('is-sketch', sketchOn);
      stemRoot.style.display = sketchOn ? 'none' : '';
      for (const node of [
        body,
        stemBack,
        stemFront,
        cap,
        ...limbs,
        ...(ball ? [ball] : []),
        ...(plate ? [plate] : []),
      ]) {
        node.style.stroke = sketchOn ? `var(--sketch-ink, ${b.color})` : '';
        node.style.strokeWidth = sketchOn ? '1.6' : '';
      }
      for (let i = 0; i < limbs.length; i++) showLimbShade(i);
    }
    body.setAttribute('fill', sketchOn ? 'none' : bodyFill(b.color));
    for (const limb of limbs) limb.setAttribute('fill', sketchOn ? 'none' : bodyFill(b.color));
    stemRoot.setAttribute('fill', spec.stemColor);
    stemBack.setAttribute('fill', sketchOn ? 'none' : stemFill);
    stemFront.setAttribute('fill', sketchOn ? 'none' : stemFill);
    cap.setAttribute('fill', sketchOn ? 'none' : spec.capColor);
    ball?.setAttribute('fill', sketchOn ? 'none' : ballFill);
    plate?.setAttribute('fill', sketchOn ? 'none' : plateFill);
    tonePlate(pose.left.color);

    clipBody.setAttribute('transform', bodyTf);
    setEye(eyes[0], pose.left, m, sketch, bodyTf, sqx, sqy);
    setEye(eyes[1], pose.right, m, sketch, bodyTf, sqx, sqy);

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

    if (ribbons) ribbons.update(dt, now, spinYaw, b.aura ? (AURAS[b.aura] ?? null) : (b.orbit || 0) > 0);
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
