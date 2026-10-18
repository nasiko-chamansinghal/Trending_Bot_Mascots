import { createFeatures, type FeatureCtx } from './features';
import { createFx, type FxHandle } from './fx';
import type { Point, Ring } from './geometry';
import { getMaterial } from './materials';
import { projectOnBody } from './projection';
import { createProps } from './props';
import type { EyePose, HighlightCfg, Pose, ResolvedCharacter } from './types';
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

interface BeanHighlight {
  cfg: HighlightCfg;
  node: SVGCircleElement;
  lastR?: number;
}

interface IrisHighlight {
  cfg: HighlightCfg;
  node: SVGCircleElement;
}

interface EyeState {
  ring: Ring;
  c: Point;
  base: Point;
  k: number;
  defBBox: BBox;
  bbox: BBox;
  thick: number;
  mode: 'bean' | 'iris';
  node: SVGElement;
  hls?: BeanHighlight[];
  lidClip?: SVGPathElement;
  inner?: SVGGElement;
  socket?: SVGPathElement;
  irisR?: number;
  pupilR?: number;
  iris?: SVGCircleElement;
  pupil?: SVGCircleElement;
  hlNodes?: IrisHighlight[];
  sketchNode?: SVGPathElement;
  lastFill?: string;
  lastStroke?: string;
  lastLash?: boolean;
  lastSmall?: boolean;
  lastPupilR?: number;
  lastSocketFill?: string;
  lastLidTf?: string;
  lastBallTf?: string;
  lastShowInner?: boolean;
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
  signature: (strength?: number) => boolean;
  destroy: () => void;
  signatureMouth: string | null;
  signatureMouthMs: number | null;
  signatureComplete: boolean;
}

let uid = 0;

function ringThickness(ring: Ring): number {
  let area = 0;
  let minX = 1e9;
  let maxX = -1e9;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Point;
    const b = ring[(i + 1) % ring.length] as Point;
    area += a[0] * b[1] - b[0] * a[1];
    if (a[0] < minX) minX = a[0];
    if (a[0] > maxX) maxX = a[0];
  }
  const w = Math.max(maxX - minX, 1);
  return Math.abs(area) / 2 / w;
}

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

function clampIn(v: number, lo: number, hi: number): number {
  if (lo > hi) return (lo + hi) / 2;
  return clamp(v, lo, hi);
}

const BEAN_HL_MIN_H = 10;
const BEAN_HL_FULL_H = 26;
const IRIS_LASH = 0.26;
const IRIS_SMALL = 0.45;

export function createBall(container: HTMLElement, opts: BallOptions): BallHandle {
  const id = `mm${uid++}`;
  const lite = !!opts.lite;
  const ch = opts.character;
  const face = ch.face;
  const plane = face.projection === 'plane';
  const headRing = ch.bodyRing;
  const palette = ch.palette;
  const feats = ch.features || {};
  const pupilCfg = ch.eyeStyle.pupil || null;

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

  if (pupilCfg) {
    const irisColor = pupilCfg.irisColor || palette.eye;
    const irisGrad = el('radialGradient', { id: `${id}ir`, cx: '50%', cy: '38%', r: '72%' });
    irisGrad.appendChild(el('stop', { offset: '0%', 'stop-color': shade(irisColor, -0.25) }));
    irisGrad.appendChild(el('stop', { offset: '62%', 'stop-color': irisColor }));
    irisGrad.appendChild(el('stop', { offset: '100%', 'stop-color': shade(irisColor, 0.28) }));
    defs.appendChild(irisGrad);
  }

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

  const featureCtx: FeatureCtx = {
    C,
    face,
    palette,
    eyeStyle: ch.eyeStyle,
    silAt,
    defs,
    uid: id,
  };
  const featureLayer = createFeatures(feats, featureCtx);
  if (featureLayer.back) bodyG.appendChild(featureLayer.back);

  for (const node of material.body()) bodyG.appendChild(node);

  if (featureLayer.mid) bodyG.appendChild(featureLayer.mid);

  const EYE_HALF = ch.eyeStyle.h / 2;

  function buildEye(k: number): EyeState {
    const ring0 = ch.defaultEyeRing[k] as Ring;
    const base = centroid(ring0);

    if (!pupilCfg) {
      const beanEye: EyeState = {
        ring: ring0,
        c: base,
        base,
        k,
        defBBox: ringBBox(ring0),
        bbox: ringBBox(ring0),
        thick: ringThickness(ring0),
        mode: 'bean',
        node: el('path', { fill: palette.eye, stroke: 'none', 'stroke-width': '1.6', d: ringPath(ring0) }),
      };
      if (ch.eyeStyle.highlight) {
        const hls = ch.eyeStyle.highlight;
        beanEye.hls = (Array.isArray(hls) ? hls : [hls]).map((h) => ({
          cfg: h,
          node: el('circle', {
            r: h.r || 3,
            fill: h.color || palette.eyeHighlight || '#FFFFFF',
            opacity: h.opacity != null ? h.opacity : 0.92,
            'pointer-events': 'none',
          }),
        }));
      }
      return beanEye;
    }

    const clipId = `${id}ec${k}`;
    const cp = el('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
    const lidClip = el('path', { d: ringPath(ring0) });
    cp.appendChild(lidClip);
    defs.appendChild(cp);

    const node = el('g', {});
    const inner = el('g', { 'clip-path': `url(#${clipId})` });

    const socket = el('path', {
      d: ringPath(ring0),
      fill: pupilCfg.socket || '#FFFFFF',
    });
    inner.appendChild(socket);

    const irisR = pupilCfg.irisR || EYE_HALF * 0.86;
    const pupilR = pupilCfg.pupilR || irisR * 0.52;
    const iris = el('circle', { r: irisR, fill: `url(#${id}ir)` });
    const pupil = el('circle', {
      r: pupilR,
      fill: pupilCfg.pupilColor || shade(pupilCfg.irisColor || palette.eye, -0.72),
    });
    inner.appendChild(iris);
    inner.appendChild(pupil);

    const hlList: HighlightCfg[] = pupilCfg.highlights || [
      { dx: -irisR * 0.34, dy: -irisR * 0.4, r: irisR * 0.3 },
      { dx: irisR * 0.36, dy: irisR * 0.22, r: irisR * 0.13, opacity: 0.6 },
    ];
    const hlNodes = hlList.map((h) => {
      const n = el('circle', {
        r: h.r as number,
        fill: h.color || '#FFFFFF',
        opacity: h.opacity != null ? h.opacity : 0.95,
        'pointer-events': 'none',
      });
      inner.appendChild(n);
      return { cfg: h, node: n };
    });

    node.appendChild(inner);
    return {
      ring: ring0,
      c: base,
      base,
      k,
      defBBox: ringBBox(ring0),
      bbox: ringBBox(ring0),
      thick: ringThickness(ring0),
      mode: 'iris',
      lidClip,
      node,
      inner,
      socket,
      irisR,
      pupilR,
      iris,
      pupil,
      hlNodes,
    };
  }

  const faceLevel = face.level || 0;
  const faceG = faceLevel > 0 ? el('g', {}) : null;
  const faceHost = faceG || bodyG;

  const eyeL = buildEye(0);
  const eyeR = buildEye(1);
  faceHost.appendChild(eyeL.node);
  faceHost.appendChild(eyeR.node);
  if (eyeL.hls) for (const h of eyeL.hls) faceHost.appendChild(h.node);
  if (eyeR.hls) for (const h of eyeR.hls) faceHost.appendChild(h.node);

  faceHost.appendChild(featureLayer.front);
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

  const mouthAnchorY = C + face.y + ((feats.mouth && (feats.mouth as { dy?: number }).dy) || 36) * face.sy;
  const fx: FxHandle | null = !lite
    ? createFx({
        defs,
        back: fxBack,
        front: fxFront,
        C,
        skin: ch.fxSkin,
        palette,
        anchors: {
          mouth: { x: C, y: mouthAnchorY },
          top: { x: C, y: silMinY },
          bottom: { x: C, y: silMaxY },
          halfW: silMaxW / 2,
        },
      })
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
      const d = ringPath(ring);
      if (eye.mode === 'bean') {
        eye.node.setAttribute('d', d);
      } else {
        (eye.lidClip as SVGPathElement).setAttribute('d', d);
        (eye.socket as SVGPathElement).setAttribute('d', d);
      }
      eye.c = centroid(ring);
      eye.bbox = ringBBox(ring);
      eye.thick = ringThickness(ring);
    }

    const base = eye.c || BASE_C[k];
    const open = clamp(pose.open, 0.02, 2.4);
    const syEye = clamp(pose.scaleY * face.eye, 0.02, 2.4);
    const sxBase = pose.scaleX * face.eye;

    const syAll = eye.mode === 'bean' ? clamp(syEye * open, 0.02, 2.4) : syEye;

    const halfH = EYE_HALF * clamp(syEye * open, 0.02, 2.4) + 2;
    let ey0 = C + face.y + (base[1] - C) * face.sy + pose.y + pose.lookY;
    ey0 = clamp(ey0, silMinY + halfH, silMaxY - halfH);

    const ox = face.x + (base[0] - C) * face.sx + pose.x + pose.lookX;
    const proj = projectOnBody(plane, C, silAt(ey0), ox, yaw || 0);
    if (!proj) {
      eye.node.style.display = 'none';
      if (eye.hls) for (const h of eye.hls) h.node.style.display = 'none';
      return;
    }
    const cn = proj.cn;
    eye.node.style.display = '';
    const ex = proj.x;
    const dyN = (ey0 - C) / 130;
    const fy = plane ? 1 : Math.sqrt(1 - dyN * dyN * 0.22);

    const tf = `translate(${r2(ex)} ${r2(ey0)})${pose.rotate ? ` rotate(${r2(pose.rotate)})` : ''} scale(${r2(sxBase * cn)} ${r2(syAll * fy)})`;
    const tfFull = `${tf} translate(${r2(-base[0])} ${r2(-base[1])})`;
    eye.node.setAttribute('transform', tfFull);

    if (eye.mode === 'bean') {
      if (eye.hls) {
        const boxH = eye.bbox ? eye.bbox.h : EYE_HALF * 2;
        const thickH = (eye.thick != null ? eye.thick : boxH) * 1.65;
        const visH = Math.min(boxH, thickH) * Math.abs(syAll * fy);
        const hideHl = visH <= BEAN_HL_MIN_H || sketch > 0.5;
        const defB = eye.defBBox || eye.bbox;
        const curB = eye.bbox || defB;
        const sxOff = defB && defB.w > 0.5 ? curB.w / defB.w : 1;
        const syOff = defB && defB.h > 0.5 ? curB.h / defB.h : 1;
        const c0 = eye.c || base;
        for (let hi = 0; hi < eye.hls.length; hi++) {
          const hl = eye.hls[hi] as BeanHighlight;
          if (hideHl) {
            hl.node.style.display = 'none';
          } else {
            hl.node.style.display = '';
            const hlScale = clamp(visH / BEAN_HL_FULL_H, 0.55, 1);
            const hlR = (hl.cfg.r || 3) * hlScale;
            if (hlR !== hl.lastR) {
              hl.node.setAttribute('r', String(r2(hlR)));
              hl.lastR = hlR;
            }
            let hdx = (hl.cfg.dx || 0) * (k === 0 ? 1 : -1) * sxOff;
            let hdy = (hl.cfg.dy || 0) * syOff;
            if (curB) {
              hdx = clampIn(hdx, curB.minX - c0[0] + hlR, curB.maxX - c0[0] - hlR);
              hdy = clampIn(hdy, curB.minY - c0[1] + hlR, curB.maxY - c0[1] - hlR);
            }
            hl.node.setAttribute('transform', `${tf} translate(${r2(hdx)} ${r2(hdy)})`);
          }
        }
      }
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
      return;
    }

    const irisEl = eye.iris as SVGCircleElement;
    const pupilEl = eye.pupil as SVGCircleElement;
    const socketEl = eye.socket as SVGPathElement;
    const lidClipEl = eye.lidClip as SVGPathElement;
    const hlNodes = eye.hlNodes as IrisHighlight[];
    const irisR = eye.irisR as number;
    const pupilR = eye.pupilR as number;

    const thick = eye.thick != null ? eye.thick : EYE_HALF * 2 * 0.7;
    const effOpen = (open * thick) / (EYE_HALF * 2);
    const lash = effOpen < IRIS_LASH;
    const small = !lash && effOpen < IRIS_SMALL;
    if (lash !== eye.lastLash || small !== eye.lastSmall) {
      eye.lastLash = lash;
      eye.lastSmall = small;
      irisEl.style.display = lash ? 'none' : '';
      pupilEl.style.display = lash ? 'none' : '';
      for (let lh = 0; lh < hlNodes.length; lh++) {
        (hlNodes[lh] as IrisHighlight).node.style.display = lash || small ? 'none' : '';
      }
    }
    const pupilScl = lash ? 1 : clamp(effOpen / IRIS_SMALL, 0.6, 1);
    const pupilRNow = pupilR * pupilScl;
    if (pupilRNow !== eye.lastPupilR) {
      pupilEl.setAttribute('r', String(r2(pupilRNow)));
      eye.lastPupilR = pupilRNow;
    }
    const socketFill = lash ? pose.color : (pupilCfg as NonNullable<typeof pupilCfg>).socket || '#FFFFFF';
    if (socketFill !== eye.lastSocketFill) {
      socketEl.setAttribute('fill', socketFill);
      eye.lastSocketFill = socketFill;
    }

    const lidTf =
      open >= 0.995 && open <= 1.005
        ? ''
        : `translate(${r2(base[0])} ${r2(base[1])}) scale(1 ${r2(open)}) translate(${r2(-base[0])} ${r2(-base[1])})`;
    if (lidTf !== eye.lastLidTf) {
      if (lidTf) {
        lidClipEl.setAttribute('transform', lidTf);
        socketEl.setAttribute('transform', lidTf);
      } else {
        lidClipEl.removeAttribute('transform');
        socketEl.removeAttribute('transform');
      }
      eye.lastLidTf = lidTf;
    }

    const travel = irisR * 0.5;
    let px = base[0] + clamp(pose.lookX * 0.5, -travel, travel);
    let py = base[1] + clamp(pose.lookY * 0.55, -travel, travel);
    const bb = eye.bbox;
    if (bb) {
      const pR = pupilR || irisR * 0.5;
      const iPad = (irisR || pR) * 0.32;
      const padX = Math.max(pR, iPad);
      const visMinY = base[1] + (bb.minY - base[1]) * open;
      const visMaxY = base[1] + (bb.maxY - base[1]) * open;
      px = clampIn(px, bb.minX + padX, bb.maxX - padX);
      py = clampIn(py, visMinY + pR, visMaxY - pR);
    }
    const ballTf = `translate(${r2(px - base[0])} ${r2(py - base[1])})`;
    if (ballTf !== eye.lastBallTf) {
      irisEl.setAttribute('transform', ballTf);
      pupilEl.setAttribute('transform', ballTf);
      eye.lastBallTf = ballTf;
    }
    irisEl.setAttribute('cx', String(r2(base[0])));
    irisEl.setAttribute('cy', String(r2(base[1])));
    pupilEl.setAttribute('cx', String(r2(base[0])));
    pupilEl.setAttribute('cy', String(r2(base[1])));

    for (let hj = 0; hj < hlNodes.length; hj++) {
      const hn = hlNodes[hj] as IrisHighlight;
      hn.node.setAttribute('cx', String(r2(base[0] + (hn.cfg.dx || 0) * (k === 0 ? 1 : -1))));
      hn.node.setAttribute('cy', String(r2(base[1] + (hn.cfg.dy || 0))));
    }

    const showInner = sketch <= 0.5;
    if (showInner !== eye.lastShowInner) {
      (eye.inner as SVGGElement).style.display = showInner ? '' : 'none';
      eye.lastShowInner = showInner;
    }
    if (sketch > 0.5) {
      if (!eye.sketchNode) {
        eye.sketchNode = el('path', { fill: 'none', 'stroke-width': '1.6' });
        eye.node.appendChild(eye.sketchNode);
      }
      eye.sketchNode.style.display = '';
      eye.sketchNode.setAttribute('d', ringPath(eye.ring));
      eye.sketchNode.style.stroke = `var(--sketch-ink, ${pose.color})`;
      if (lidTf) eye.sketchNode.setAttribute('transform', lidTf);
      else eye.sketchNode.removeAttribute('transform');
    } else if (eye.sketchNode) {
      eye.sketchNode.style.display = 'none';
    }
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

    bodyG.setAttribute(
      'transform',
      `translate(${r2(C + b.x)} ${r2(C + b.y + (1 - b.scaleY) * b.scale * (silMaxY - C))}) rotate(${r2((b.rotate || 0) + spinTilt)}) scale(${r2(b.scale * spinSqX * b.scaleX)} ${r2(b.scale * b.scaleY)}) translate(${r2(-C)} ${r2(-C)})`,
    );
    if (faceG) faceG.setAttribute('transform', `rotate(${r2(-(b.rotate || 0) * faceLevel)} ${C} ${C})`);
    material.setColor(b.color);

    const lift = clamp(-b.y / 52, 0, 1);
    const shOp = sketch > 0.5 ? 0 : 0.16 * (1 - 0.55 * lift);
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

    featureLayer.apply(pose, sketch, yaw, now);
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
      fx.update(dt, now, {
        yaw,
        dYaw,
        vel,
        orbitWant: (b.orbit || 0) > 0,
        bodyX: b.x,
        bodyY: b.y,
      });
    }
  }

  function burst(count?: number): void {
    if (fx) fx.burst(count);
  }

  function signature(strength?: number): boolean {
    return fx?.signature ? fx.signature(strength) : false;
  }

  function destroy(): void {
    if (fx) fx.destroy();
    if (svg.parentNode) svg.parentNode.removeChild(svg);
  }

  return {
    svg,
    applyPose,
    burst,
    signature,
    destroy,
    signatureMouth: fx ? fx.signatureMouth : null,
    signatureMouthMs: fx ? fx.signatureMouthMs : null,
    signatureComplete: !!fx?.signatureComplete,
  };
}
