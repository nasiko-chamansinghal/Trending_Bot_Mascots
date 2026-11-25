import { unionOutline } from '../../shared/hoops';
import { type BodyShape, limbShape, type Mat3, type Vec2 } from '../solid/model';
import type { SolidSpec } from '../solid/spec';
import { buildFurBody, discMesh, lensMesh, PILE_REACH, rayReach, tubeMesh } from './mesh';
import { type FurLook, type FurPart, type FurSet, furSupported, renderFur } from './renderer';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_BOX = 240;
const TOPPER_THICKNESS = 0.14;
const TOPPER_LIFT = 0.04;
const STEM_PILE = 0.3;
const BALL_PILE = 0.55;
const MERGED_RIM = 720;
const sets = new WeakMap<SolidSpec, FurSet>();

function joinsBody(spec: SolidSpec): boolean {
  return !!spec.topper && !spec.topper.rig && !spec.topper.fill;
}

function mergedBody(spec: SolidSpec, outline: () => Array<[number, number]>): BodyShape {
  const [cx, cy] = spec.center;
  const ring = unionOutline([outline(), spec.topper?.ring ?? []]);
  const up = ring.map(([x, y]): Vec2 => [(x - cx) / spec.scale, -(y - cy) / spec.scale]);
  const rim = Array.from({ length: MERGED_RIM }, (_, i) =>
    rayReach(up, -Math.PI + (2 * Math.PI * i) / MERGED_RIM),
  );
  return { ...spec.body, rim, rimSoft: rim };
}

function setOf(spec: SolidSpec, outline: () => Array<[number, number]>): FurSet {
  const known = sets.get(spec);
  if (known) return known;
  const merged = joinsBody(spec);
  const { mesh, unit } = buildFurBody(merged ? mergedBody(spec, outline) : spec.body);
  const parts: FurPart[] = [{ mesh }];
  const [cx, cy] = spec.center;
  const toModel = ([x, y]: Vec2): Vec2 => [(x - cx) / spec.scale, -(y - cy) / spec.scale];
  let seed = 7001;
  spec.limbs?.forEach((limb) => {
    parts.push({ mesh: tubeMesh(limbShape(limb, 0), unit, seed++) });
  });
  if (spec.stem) {
    parts.push({
      mesh: tubeMesh(spec.stem, unit, seed++),
      color: spec.stemFollow ? undefined : spec.stemColor,
      pile: STEM_PILE,
    });
    const ball = spec.stemShading?.ball;
    if (ball) {
      parts.push({
        mesh: discMesh(spec.stem.tip, ball.radius, ball.radius, unit, seed++),
        color: ball.light,
        pile: BALL_PILE,
      });
    }
  }
  if (spec.topper && !spec.topper.rig && !merged) {
    parts.push({
      mesh: lensMesh(spec.topper.ring.map(toModel), TOPPER_THICKNESS, TOPPER_LIFT, unit, seed++),
      color: spec.topper.fill,
    });
  }
  for (const ear of spec.ears ?? []) {
    parts.push({ mesh: discMesh(ear.center, ear.radius, ear.half, unit, seed++) });
    parts.push({
      mesh: discMesh(
        [ear.center[0], ear.center[1], ear.center[2] + ear.half * 0.7],
        ear.inner.radius,
        ear.half * 0.5,
        unit,
        seed++,
      ),
      color: ear.inner.fill,
    });
  }
  const set = { parts, unit };
  sets.set(spec, set);
  return set;
}

export interface FurLayer {
  node: SVGGElement;
  draw(view: Mat3, look: FurLook): void;
  destroy(): void;
}

export interface FurLayerOptions {
  svg: SVGSVGElement;
  spec: SolidSpec;
  outline?: () => Array<[number, number]>;
}

export { furSupported };

export function createFurLayer({ svg, spec, outline = () => [] }: FurLayerOptions): FurLayer {
  const set = setOf(spec, outline);
  const [cx, cy] = spec.center;
  const k = spec.scale;
  const reach = Math.max(...set.parts.map((part) => part.mesh.radius));
  const half = ((reach + PILE_REACH) * k) / set.unit;
  const node = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  node.setAttribute('class', 'mm-fur');
  node.setAttribute('pointer-events', 'none');
  const frame = document.createElementNS(SVG_NS, 'foreignObject');
  frame.setAttribute('x', String(cx - half));
  frame.setAttribute('y', String(cy - half));
  frame.setAttribute('width', String(2 * half));
  frame.setAttribute('height', String(2 * half));
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
  frame.appendChild(canvas);
  node.appendChild(frame);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const place = { cx, cy, k };

  let scale = 1;
  const measure = (): void => {
    const width = svg.getBoundingClientRect().width;
    if (width > 0) scale = (width / VIEW_BOX) * (window.devicePixelRatio || 1);
  };
  measure();
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
  observer?.observe(svg);

  return {
    node,
    draw(view, look) {
      const image = renderFur(set, place, view, look, scale);
      if (!image) return;
      if (canvas.width !== image.size) canvas.width = canvas.height = image.size;
      ctx.clearRect(0, 0, image.size, image.size);
      ctx.drawImage(image.canvas, image.x, image.y, image.size, image.size, 0, 0, image.size, image.size);
    },
    destroy() {
      observer?.disconnect();
      node.remove();
    },
  };
}
