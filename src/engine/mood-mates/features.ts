import { lens, type Ring } from './geometry';
import type {
  Accessory,
  BlushCfg,
  BrowCfg,
  CharacterEyeStyle,
  FaceLayout,
  FacePose,
  Features,
  Micro,
  MouthCfg,
  Palette,
  Pose,
} from './types';
import { clamp, el, r2, ringPath } from './util';

const TAU = Math.PI * 2;

export interface FeatureCtx {
  C: number;
  face: FaceLayout;
  palette: Palette;
  eyeStyle: CharacterEyeStyle;
  silAt: (y: number) => [number, number];
  defs: SVGDefsElement;
  uid: string;
}

export interface FeatureLayer {
  back: SVGGElement | null;
  mid: SVGGElement | null;
  front: SVGGElement;
  apply: (pose: Pose, sketch: number, yaw: number, now: number) => void;
}

interface Projection {
  x: number;
  cn: number;
}

interface BuiltAccessory {
  node: SVGElement;
  layer?: 'back' | 'front';
  update?: (pose: Pose, sketch: number, yaw: number, now: number) => void;
}

function microVal(micro: Micro | undefined, now: number, seed: number): { dy: number; rot: number } {
  if (!micro) return { dy: 0, rot: 0 };
  const ph = (TAU * now) / (micro.period || 3000) + (seed || 0);
  if (micro.type === 'float') return { dy: (micro.amp != null ? micro.amp : 1.6) * Math.sin(ph), rot: 0 };
  if (micro.type === 'swing') return { dy: 0, rot: (micro.amp != null ? micro.amp : 4) * Math.sin(ph) };
  return { dy: 0, rot: 0 };
}

export function createFeatures(feats: Features, ctx: FeatureCtx): FeatureLayer {
  const { C, face, palette, eyeStyle } = ctx;

  let back: SVGGElement | null = null;
  let mid: SVGGElement | null = null;
  const front = el('g', { 'pointer-events': 'none' });
  const updaters: Array<NonNullable<BuiltAccessory['update']>> = [];

  function ensureBack(): SVGGElement {
    if (!back) back = el('g', { 'pointer-events': 'none' });
    return back;
  }

  function project(ox: number, oy: number, yaw: number): Projection | null {
    const sil = ctx.silAt(oy);
    const cx0 = (sil[0] + sil[1]) / 2;
    const hw = Math.max((sil[1] - sil[0]) / 2, 12);
    const theta = clamp(ox / hw, -1.15, 1.15);
    const total = theta + (yaw || 0);
    const cn = Math.cos(total);
    if (cn <= 0.02) return null;
    return { x: cx0 + hw * Math.sin(total) * 0.985, cn };
  }

  function eyeAnchor(side: number): { ox: number; y: number } {
    return {
      ox: face.x + side * eyeStyle.dx * face.sx,
      y: C + face.y + (eyeStyle.cy - C) * face.sy,
    };
  }

  const ACC_BUILDERS: Record<string, (acc: Accessory) => BuiltAccessory> = {
    glasses(acc) {
      const aL = eyeAnchor(-1);
      const aR = eyeAnchor(1);
      const rr = (Math.max(eyeStyle.w, eyeStyle.h) / 2) * face.eye * (acc.fit != null ? acc.fit : 1.22) + 2;
      const color = acc.color || '#C9A24B';
      const sw = acc.strokeWidth != null ? acc.strokeWidth : 2.6;

      const g = el('g', { 'pointer-events': 'none' });
      const lensG: SVGGElement[] = [];
      const glintNodes: SVGRectElement[] = [];

      [aL, aR].forEach((_a, idx) => {
        const lg = el('g', {});
        lg.appendChild(el('circle', { r: r2(rr), fill: '#FFFFFF', 'fill-opacity': 0.07 }));
        lg.appendChild(
          el('circle', {
            r: r2(rr),
            fill: 'none',
            stroke: color,
            'stroke-width': sw,
          }),
        );
        const clipId = `${ctx.uid}gls${idx}`;
        const cp = el('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
        cp.appendChild(el('circle', { cx: 0, cy: 0, r: r2(rr - sw / 2) }));
        ctx.defs.appendChild(cp);
        const glintWrap = el('g', { 'clip-path': `url(#${clipId})` });
        const glint = el('rect', {
          x: r2(-rr * 0.22),
          y: r2(-rr * 1.6),
          width: r2(rr * 0.34),
          height: r2(rr * 3.2),
          fill: '#FFFFFF',
          opacity: 0.55,
          transform: 'rotate(24)',
        });
        glintWrap.appendChild(glint);
        lg.appendChild(glintWrap);
        glintNodes.push(glint);
        lensG[idx] = lg;
        g.appendChild(lg);
      });

      const bridge = el('path', {
        fill: 'none',
        stroke: color,
        'stroke-width': sw,
        'stroke-linecap': 'round',
      });
      const armL = el('path', { fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round' });
      const armR = el('path', { fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round' });
      g.appendChild(bridge);
      g.appendChild(armL);
      g.appendChild(armR);

      let slide = 0;

      return {
        node: g,
        layer: 'front',
        update(pose, sketch, yaw, now) {
          const openMin = Math.min(
            pose.left.open != null ? pose.left.open : 1,
            pose.right.open != null ? pose.right.open : 1,
          );
          const slideT = clamp(1 - openMin, 0, 1) * 1.8;
          slide += (slideT - slide) * 0.25;

          const mv = microVal(acc.micro || { type: 'float', amp: 0.7, period: 3400 }, now, 1.3);
          const lookX = (pose.left.lookX || 0) * 0.75;
          const lookY = (pose.left.lookY || 0) * 0.75;
          const byv = (aL.y + aR.y) / 2 + lookY + slide + mv.dy;

          const pL = project(aL.ox + lookX, byv, yaw);
          const pR = project(aR.ox + lookX, byv, yaw);
          if (!pL && !pR) {
            g.style.display = 'none';
            return;
          }
          g.style.display = '';
          g.setAttribute('opacity', sketch > 0.5 ? '0.55' : '1');

          const scl = face.eye;
          [pL, pR].forEach((p, idx) => {
            const lg = lensG[idx] as SVGGElement;
            if (!p) {
              lg.style.display = 'none';
              return;
            }
            lg.style.display = '';
            lg.setAttribute(
              'transform',
              `translate(${r2(p.x)} ${r2(byv)}) scale(${r2(p.cn * scl)} ${r2(scl)})`,
            );
          });

          const per = acc.glintPeriod || 5200;
          const gp = (now % per) / per;
          const sweep = gp < 0.1 ? gp / 0.1 : -1;
          for (let gi = 0; gi < glintNodes.length; gi++) {
            const gn = glintNodes[gi] as SVGRectElement;
            if (sweep < 0) {
              gn.setAttribute('opacity', '0');
              continue;
            }
            gn.setAttribute('opacity', (0.5 * Math.sin(Math.PI * sweep)).toFixed(3));
            gn.setAttribute('transform', `translate(${r2((sweep * 2 - 1) * rr * 1.3)} 0) rotate(24)`);
          }

          if (pL && pR) {
            const x1 = pL.x + rr * pL.cn * scl;
            const x2 = pR.x - rr * pR.cn * scl;
            bridge.style.display = '';
            bridge.setAttribute(
              'd',
              `M${r2(x1)} ${r2(byv)} Q${r2((x1 + x2) / 2)} ${r2(byv - rr * 0.55)} ${r2(x2)} ${r2(byv)}`,
            );
          } else {
            bridge.style.display = 'none';
          }
          if (pL) {
            const xa = pL.x - rr * pL.cn * scl;
            armL.style.display = '';
            armL.setAttribute('d', `M${r2(xa)} ${r2(byv)} L${r2(xa - 7 * pL.cn)} ${r2(byv - 3)}`);
          } else armL.style.display = 'none';
          if (pR) {
            const xb = pR.x + rr * pR.cn * scl;
            armR.style.display = '';
            armR.setAttribute('d', `M${r2(xb)} ${r2(byv)} L${r2(xb + 7 * pR.cn)} ${r2(byv - 3)}`);
          } else armR.style.display = 'none';
        },
      };
    },

    path(acc) {
      const node = el('path', {
        d: acc.d as string,
        fill: acc.fill || 'none',
        stroke: acc.stroke || 'none',
        'stroke-width': acc.strokeWidth != null ? acc.strokeWidth : 0,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        opacity: acc.opacity != null ? acc.opacity : 1,
      });
      const seed = acc.seed != null ? acc.seed : Math.random() * TAU;

      return {
        node,
        layer: acc.layer || 'front',
        update(_pose, _sketch, yaw, now) {
          const mv = microVal(acc.micro, now, seed);
          if (acc.anchor === 'face') {
            const byv = C + face.y + (acc.dy || 0) * face.sy + mv.dy;
            const p = project((acc.dx || 0) * face.sx, byv, yaw);
            if (!p) {
              node.style.display = 'none';
              return;
            }
            node.style.display = '';
            node.setAttribute(
              'transform',
              `translate(${r2(p.x)} ${r2(byv)})${mv.rot ? ` rotate(${r2(mv.rot)})` : ''} scale(${r2(p.cn)} 1)`,
            );
          } else if (acc.micro) {
            node.setAttribute(
              'transform',
              `translate(${r2(acc.dx || 0)} ${r2((acc.dy || 0) + mv.dy)})${
                mv.rot ? ` rotate(${r2(mv.rot)} ${r2(acc.pivotX || C)} ${r2(acc.pivotY || C)})` : ''
              }`,
            );
          } else if (acc.transform) {
            node.setAttribute('transform', acc.transform);
          }
        },
      };
    },
  };

  (feats.accessories || []).forEach((acc) => {
    const kind = acc.kind || 'path';
    const builder = ACC_BUILDERS[kind];
    if (!builder) {
      console.warn(`[MoodMates] Unknown accessory kind: ${kind}`);
      return;
    }
    const built = builder(acc);
    const target = (acc.layer || built.layer) === 'back' ? ensureBack() : front;
    target.appendChild(built.node);
    if (built.update) updaters.push(built.update);
  });

  let blushL: SVGEllipseElement | null = null;
  let blushR: SVGEllipseElement | null = null;
  let blushCfg: BlushCfg | null = null;
  if (feats.blush !== false) {
    blushCfg = Object.assign(
      { dx: 34, dy: 26, rx: 11, ry: 6.5, color: palette.blush || '#F2A9A0', max: 0.85 },
      feats.blush === true ? {} : feats.blush || {},
    );
    mid = el('g', { 'pointer-events': 'none' });
    blushL = el('ellipse', { rx: blushCfg.rx, ry: blushCfg.ry, fill: blushCfg.color, opacity: '0' });
    blushR = el('ellipse', { rx: blushCfg.rx, ry: blushCfg.ry, fill: blushCfg.color, opacity: '0' });
    mid.appendChild(blushL);
    mid.appendChild(blushR);
  }

  let browL: SVGPathElement | null = null;
  let browR: SVGPathElement | null = null;
  let browCfg: BrowCfg | null = null;
  let browRing: Ring | null = null;
  if (feats.brows) {
    browCfg = Object.assign(
      { w: 16, h: 3.4, gap: 10, color: palette.eye, always: false, bend: 0.35 },
      feats.brows === true ? {} : feats.brows,
    );
    browRing = lens(0, 0, { w: browCfg.w, h: browCfg.h, bend: browCfg.bend, taper: 0.7 });
    browL = el('path', { d: ringPath(browRing), fill: browCfg.color });
    browR = el('path', { d: ringPath(browRing), fill: browCfg.color });
    front.appendChild(browL);
    front.appendChild(browR);
  }

  let mouthNode: SVGPathElement | null = null;
  let mouthCfg: MouthCfg | null = null;
  let lastMouthRing: Ring | null = null;
  if (feats.mouth) {
    mouthCfg = Object.assign(
      { dy: 36, color: palette.mouth || palette.eye },
      feats.mouth === true ? {} : feats.mouth,
    );
    mouthNode = el('path', { fill: mouthCfg.color, stroke: 'none' });
    front.appendChild(mouthNode);
  }

  function apply(pose: Pose, sketch: number, yaw: number, now: number): void {
    const f: Partial<FacePose> = pose.face || {};

    if (blushL && blushR && blushCfg) {
      const bv = clamp(f.blush || 0, 0, 1) * blushCfg.max * (sketch > 0.5 ? 0.4 : 1);
      if (bv < 0.01) {
        blushL.setAttribute('opacity', '0');
        blushR.setAttribute('opacity', '0');
      } else {
        const blshX = (pose.left.lookX || 0) * 0.25;
        const by = C + face.y + blushCfg.dy * face.sy + (pose.left.lookY || 0) * 0.25;
        const pL = project(-blushCfg.dx * face.sx + blshX, by, yaw);
        const pR = project(blushCfg.dx * face.sx + blshX, by, yaw);
        blushL.setAttribute('opacity', pL ? bv.toFixed(3) : '0');
        blushR.setAttribute('opacity', pR ? bv.toFixed(3) : '0');
        if (pL) blushL.setAttribute('transform', `translate(${r2(pL.x)} ${r2(by)}) scale(${r2(pL.cn)} 1)`);
        if (pR) blushR.setAttribute('transform', `translate(${r2(pR.x)} ${r2(by)}) scale(${r2(pR.cn)} 1)`);
      }
    }

    if (browL && browR && browCfg) {
      const vis = clamp(Math.max(f.browVis || 0, browCfg.always ? 1 : 0), 0, 1);
      if (vis < 0.02) {
        browL.setAttribute('opacity', '0');
        browR.setAttribute('opacity', '0');
      } else {
        const bx = browCfg.dx != null ? browCfg.dx : 26;
        const openB = Math.min(
          pose.left.open != null ? pose.left.open : 1,
          pose.right.open != null ? pose.right.open : 1,
        );
        const relax = clamp(1 - openB, 0, 1) * 2.6;
        const blkX = (pose.left.lookX || 0) * 0.8;
        const blkY = (pose.left.lookY || 0) * 0.8;
        const byv =
          C +
          face.y +
          ((browCfg.dyTop != null ? browCfg.dyTop : -30) - (f.browRaise || 0)) * face.sy +
          blkY +
          relax;
        const tilt = f.browTilt || 0;
        const qL = project(-bx * face.sx + blkX, byv, yaw);
        const qR = project(bx * face.sx + blkX, byv, yaw);
        browL.setAttribute('opacity', qL ? vis.toFixed(3) : '0');
        browR.setAttribute('opacity', qR ? vis.toFixed(3) : '0');
        if (qL)
          browL.setAttribute(
            'transform',
            `translate(${r2(qL.x)} ${r2(byv)}) rotate(${r2(-tilt)}) scale(${r2(qL.cn * face.eye)} ${r2(face.eye)})`,
          );
        if (qR)
          browR.setAttribute(
            'transform',
            `translate(${r2(qR.x)} ${r2(byv)}) rotate(${r2(tilt)}) scale(${r2(qR.cn * face.eye)} ${r2(face.eye)})`,
          );
      }
    }

    if (mouthNode && mouthCfg) {
      const ring = f.mouthRing;
      if (ring && ring !== lastMouthRing) {
        lastMouthRing = ring;
        mouthNode.setAttribute('d', ringPath(ring));
      }
      const my = C + face.y + (mouthCfg.dy + (f.mouthY || 0)) * face.sy;
      const pm = project((f.mouthX || 0) * face.sx, my, yaw);
      if (!pm || sketch > 0.5) {
        mouthNode.style.display = 'none';
      } else {
        mouthNode.style.display = '';
        mouthNode.setAttribute(
          'transform',
          `translate(${r2(pm.x)} ${r2(my)}) scale(${r2((f.mouthSX || 1) * pm.cn * face.eye)} ${r2((f.mouthSY || 1) * face.eye)})`,
        );
      }
    }

    for (let ui = 0; ui < updaters.length; ui++) {
      (updaters[ui] as NonNullable<BuiltAccessory['update']>)(pose, sketch, yaw, now);
    }
  }

  return { back, mid, front, apply };
}
