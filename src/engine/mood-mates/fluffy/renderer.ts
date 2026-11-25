import { parseHex, type Rgb } from '../../shared/oklch';
import type { Mat3 } from '../solid/model';
import { DYE_RAMP_SIZE, dyeRamp } from './dye';
import { type FurMesh, PILE_REACH, ROOT_PASSES, rootsIn } from './mesh';
import { fragmentShader, PASS, vertexShader } from './shaders';
import { SOCKET_TILE, socketShape, socketTile } from './socket';

export type Point2 = [number, number];

export interface FurLook {
  color: string;
  ink: string;
  eyes: Point2[][];
  patches: Array<{ points: Point2[]; fill: string }>;
}

export interface FurPlacement {
  cx: number;
  cy: number;
  k: number;
}

export interface FurImage {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  size: number;
  half: number;
}

const SHELLS = 5;
const FULL_DETAIL = 2.56;
const MAX_PIXELS = 1024;
const MIN_PIXELS = 32;
const PAINT_SIZE = 256;
const SAME_VIEW = 0.1;
const MAX_TILES = 48;
const COLOR_CACHE = 64;

export function furDetail(scale: number): { shells: number; strandPasses: number } {
  const detail = Math.min(1, scale / FULL_DETAIL);
  return {
    shells: Math.max(2, Math.ceil(SHELLS * detail)),
    strandPasses: Math.max(ROOT_PASSES / 4, Math.ceil(ROOT_PASSES * Math.sqrt(detail))),
  };
}

interface Geometry {
  surface: WebGLVertexArrayObject;
  strands: WebGLVertexArrayObject;
  buffers: WebGLBuffer[];
  triangles: number;
  strandCount: number;
  half: number;
}

function randomFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function fiberTile(): HTMLCanvasElement {
  const size = 128;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const g = tile.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#252525';
  g.fillRect(0, 0, size, size);
  g.lineCap = 'round';
  const random = randomFrom(9213);
  for (let i = 0; i < 1400; i++) {
    const x = random() * size;
    const y = random() * size;
    const angle =
      2.4 * Math.sin((y * Math.PI) / 32) + 1.4 * Math.cos((x * Math.PI) / 32) + (random() - 0.5) * 3.3;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const length = 3 + random() * 8;
    const curl = (random() - 0.5) * length;
    const grey = Math.round(55 + 200 * random());
    g.strokeStyle = `rgb(${grey} ${grey} ${grey})`;
    g.lineWidth = 0.8 + random() * 1.5;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        if (x + ox < -12 || x + ox > size + 12 || y + oy < -12 || y + oy > size + 12) continue;
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.quadraticCurveTo(
          x + ox + dx * length * 0.5 - dy * curl,
          y + oy + dy * length * 0.5 + dx * curl,
          x + ox + dx * length,
          y + oy + dy * length,
        );
        g.stroke();
      }
    }
  }
  return tile;
}

function rootVolume(side: number): Uint8Array {
  const roots = new Uint8Array(side ** 3);
  let seed = 73021;
  for (let i = 0; i < roots.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    roots[i] = seed >>> 24;
  }
  return roots;
}

function link(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram() as WebGLProgram;
  for (const [kind, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(kind) as WebGLShader;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compilation failed');
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'shader linking failed');
  }
  return program;
}

function colorReader(): (color: string) => Rgb {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const known = new Map<string, Rgb>();
  return (color) => {
    const hex = parseHex(color);
    if (hex) return hex;
    let rgb = known.get(color);
    if (!rgb) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      rgb = [r as number, g as number, b as number];
      if (known.size >= COLOR_CACHE) known.clear();
      known.set(color, rgb);
    }
    return rgb;
  };
}

export interface FurPart {
  mesh: FurMesh;
  color?: string;
  pile?: number;
}

export interface FurSet {
  parts: FurPart[];
  unit: number;
}

type Renderer = (
  set: FurSet,
  place: FurPlacement,
  view: Mat3,
  look: FurLook,
  scale: number,
) => FurImage | null;

const key2 = (points: Point2[], digits = 1): string => {
  const f = 10 ** digits;
  let out = '';
  for (const [x, y] of points) out += `${Math.round(x * f)},${Math.round(y * f)};`;
  return out;
};

function createRenderer(onContextRestored: () => void): Renderer | null {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MIN_PIXELS;
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  const program = link(gl, vertexShader, fragmentShader);
  const activate = gl.useProgram.bind(gl);
  activate(program);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    view: uniform('view'),
    radius: uniform('radius'),
    shell: uniform('shell'),
    pileScale: uniform('pileScale'),
    strandWidth: uniform('strandWidth'),
    pass: uniform('pass'),
    color: uniform('color'),
    ink: uniform('ink'),
    paintOn: uniform('paintOn'),
    eyeRegion: uniform('eyeRegion[0]'),
    eyeSize: uniform('eyeSize[0]'),
  };
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.SCISSOR_TEST);

  const texture = (unit: number, sampler: string, target: number) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target, gl.createTexture());
    gl.uniform1i(uniform(sampler), unit);
  };
  const clampLinear = () => {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  texture(0, 'pile', gl.TEXTURE_2D);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fiberTile());
  gl.generateMipmap(gl.TEXTURE_2D);
  texture(2, 'brushedPile', gl.TEXTURE_3D);
  const side = 64;
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, side, side, side, 0, gl.RED, gl.UNSIGNED_BYTE, rootVolume(side));
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_3D);
  texture(3, 'dyeRamp', gl.TEXTURE_2D);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, DYE_RAMP_SIZE, 1);
  clampLinear();
  texture(4, 'paint', gl.TEXTURE_2D);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, PAINT_SIZE, PAINT_SIZE);
  clampLinear();
  texture(1, 'eyeField', gl.TEXTURE_2D);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, 2 * SOCKET_TILE, SOCKET_TILE);
  clampLinear();

  const geometries = new Map<FurMesh, Geometry>();

  const upload = (mesh: FurMesh): Geometry => {
    const buffer = (target: number, data: Float32Array | Uint32Array) => {
      const b = gl.createBuffer() as WebGLBuffer;
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return b;
    };
    const attributes = (stride: number, sizes: number[], perInstance: boolean) => {
      let offset = 0;
      sizes.forEach((size, location) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
        if (perInstance) gl.vertexAttribDivisor(location, 1);
        offset += 4 * size;
      });
    };
    const surface = gl.createVertexArray() as WebGLVertexArrayObject;
    gl.bindVertexArray(surface);
    const vertices = buffer(gl.ARRAY_BUFFER, mesh.vertices);
    attributes(24, [3, 3], false);
    const indices = buffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
    const strands = gl.createVertexArray() as WebGLVertexArrayObject;
    gl.bindVertexArray(strands);
    const roots = buffer(gl.ARRAY_BUFFER, mesh.roots);
    attributes(32, [3, 3, 2], true);
    return {
      surface,
      strands,
      buffers: [vertices, indices, roots],
      triangles: mesh.indices.length,
      strandCount: mesh.roots.length / 8,
      half: mesh.radius + PILE_REACH,
    };
  };

  const geometryOf = (mesh: FurMesh): Geometry => {
    let geometry = geometries.get(mesh);
    if (!geometry) {
      geometry = upload(mesh);
      geometries.set(mesh, geometry);
    }
    return geometry;
  };

  const regions = new Float32Array(8);
  const sizes = new Float32Array(4);
  const scratch = document.createElement('canvas');
  scratch.width = scratch.height = SOCKET_TILE;
  const scratchCtx = scratch.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const tiles = new Map<string, Uint8Array<ArrayBuffer>>();
  const tileOf = (points: Point2[], span: number, key: string) => {
    let tile = tiles.get(key);
    if (!tile) {
      tile = socketTile(scratchCtx, points, span);
      if (tiles.size >= MAX_TILES) tiles.delete(tiles.keys().next().value as string);
      tiles.set(key, tile);
    }
    return tile;
  };

  const paintCanvas = document.createElement('canvas');
  paintCanvas.width = paintCanvas.height = PAINT_SIZE;
  const paintCtx = paintCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

  const readColor = colorReader();
  const shown = {
    set: null as FurSet | null,
    shades: '',
    view: null as Mat3 | null,
    pixels: 0,
    color: '',
    ink: '',
    eyes: ['', ''],
    regions: new Float32Array(8),
    paint: '',
    place: '',
  };
  let dye = '';

  return (set, place, view, look, scale) => {
    if (gl.isContextLost()) return null;
    const geometries = set.parts.map((part) => geometryOf(part.mesh));
    const reach = Math.max(...geometries.map((geometry) => geometry.half));
    const shades = set.parts.map((part) => part.color ?? '').join('|');
    const unit = place.k / set.unit;
    const half = reach * unit;
    const furScale = scale / unit;
    const pixels = Math.min(MAX_PIXELS, Math.max(MIN_PIXELS, Math.ceil(2 * half * scale)));
    if (canvas.width < pixels) canvas.width = canvas.height = pixels;
    const image: FurImage = { canvas, x: 0, y: canvas.height - pixels, size: pixels, half };

    regions.fill(0);
    sizes.fill(0);
    const keys = ['', ''];
    const shapes: Array<{ points: Point2[]; span: number } | null> = [null, null];
    look.eyes.slice(0, 2).forEach((eye, slot) => {
      if (eye.length < 3) return;
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const [x, y] of eye) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      const ex = (minX + maxX) / 2;
      const ey = (minY + maxY) / 2;
      const rel = eye.map(([x, y]): Point2 => [(x - ex) / unit, (y - ey) / unit]);
      const shape = socketShape(rel);
      regions.set([(ex - place.cx) / unit, (ey - place.cy) / unit, shape.span, 1], 4 * slot);
      sizes.set([shape.w, shape.h], 2 * slot);
      keys[slot] = `${key2(rel, 1)}|${shape.span.toFixed(1)}`;
      shapes[slot] = { points: rel, span: shape.span };
    });

    let paintKey = '';
    for (const patch of look.patches) paintKey += `${patch.fill}:${key2(patch.points, 0)}|`;
    const placeKey = `${place.cx}|${place.cy}|${place.k}`;

    const turn = shown.view
      ? Math.abs(view[0] - shown.view[0]) +
        Math.abs(view[1] - shown.view[1]) +
        Math.abs(view[2] - shown.view[2]) +
        Math.abs(view[3] - shown.view[3]) +
        Math.abs(view[4] - shown.view[4]) +
        Math.abs(view[5] - shown.view[5]) +
        Math.abs(view[6] - shown.view[6]) +
        Math.abs(view[7] - shown.view[7]) +
        Math.abs(view[8] - shown.view[8])
      : Number.POSITIVE_INFINITY;
    if (
      shown.set === set &&
      shown.shades === shades &&
      shown.pixels === pixels &&
      shown.color === look.color &&
      shown.ink === look.ink &&
      shown.paint === paintKey &&
      shown.place === placeKey &&
      keys.every((key, slot) => key === shown.eyes[slot]) &&
      regions.every((value, i) => Math.abs(value - (shown.regions[i] as number)) < 0.02) &&
      turn < SAME_VIEW / (half * scale)
    ) {
      return image;
    }
    shown.set = set;
    shown.shades = shades;
    shown.view = view;
    shown.pixels = pixels;
    shown.color = look.color;
    shown.ink = look.ink;
    shown.regions.set(regions);
    shown.paint = paintKey;
    shown.place = placeKey;

    gl.activeTexture(gl.TEXTURE1);
    shapes.forEach((shape, slot) => {
      if (!shape || keys[slot] === shown.eyes[slot]) return;
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        slot * SOCKET_TILE,
        0,
        SOCKET_TILE,
        SOCKET_TILE,
        gl.RED,
        gl.UNSIGNED_BYTE,
        tileOf(shape.points, shape.span, keys[slot] as string),
      );
    });
    shown.eyes = keys;
    gl.uniform4fv(u.eyeRegion, regions);
    gl.uniform2fv(u.eyeSize, sizes);

    const useDye = (color: string): void => {
      const [r, g, b] = readColor(color);
      gl.uniform3f(u.color, r / 255, g / 255, b / 255);
      if (dye === color) return;
      gl.activeTexture(gl.TEXTURE3);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        DYE_RAMP_SIZE,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        dyeRamp([r, g, b]),
      );
      gl.activeTexture(gl.TEXTURE1);
      dye = color;
    };
    const [inkR, inkG, inkB] = readColor(look.ink);
    gl.uniform3f(u.ink, inkR / 255, inkG / 255, inkB / 255);

    if (look.patches.length) {
      paintCtx.setTransform(1, 0, 0, 1, 0, 0);
      paintCtx.clearRect(0, 0, PAINT_SIZE, PAINT_SIZE);
      const k = PAINT_SIZE / (2 * half);
      paintCtx.setTransform(k, 0, 0, k, PAINT_SIZE / 2 - place.cx * k, PAINT_SIZE / 2 - place.cy * k);
      for (const patch of look.patches) {
        paintCtx.fillStyle = patch.fill;
        paintCtx.beginPath();
        patch.points.forEach(([x, y], i) => {
          if (i === 0) paintCtx.moveTo(x, y);
          else paintCtx.lineTo(x, y);
        });
        paintCtx.closePath();
        paintCtx.fill();
      }
      gl.activeTexture(gl.TEXTURE4);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        PAINT_SIZE,
        PAINT_SIZE,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        paintCanvas,
      );
      gl.activeTexture(gl.TEXTURE1);
    }
    gl.uniform1f(u.paintOn, look.patches.length ? 1 : 0);

    gl.uniform1f(u.radius, reach);
    gl.uniformMatrix3fv(u.view, false, [
      view[0],
      -view[3],
      view[6],
      -view[1],
      view[4],
      -view[7],
      view[2],
      -view[5],
      view[8],
    ]);

    gl.viewport(0, 0, pixels, pixels);
    gl.scissor(0, 0, pixels, pixels);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const { shells, strandPasses } = furDetail(furScale);
    set.parts.forEach((part, index) => {
      const geometry = geometries[index] as Geometry;
      useDye(part.color ?? look.color);
      gl.uniform1f(u.pileScale, part.pile ?? 1);
      gl.bindVertexArray(geometry.surface);
      gl.uniform1i(u.pass, PASS.body);
      gl.drawElements(gl.TRIANGLES, geometry.triangles, gl.UNSIGNED_INT, 0);
      gl.uniform1i(u.pass, PASS.shell);
      for (let layer = 1; layer <= shells; layer++) {
        gl.uniform1f(u.shell, layer / shells);
        gl.drawElements(gl.TRIANGLES, geometry.triangles, gl.UNSIGNED_INT, 0);
      }
      gl.bindVertexArray(geometry.strands);
      gl.uniform1i(u.pass, PASS.strand);
      gl.uniform1f(u.strandWidth, ROOT_PASSES / strandPasses);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 8, rootsIn(geometry.strandCount, strandPasses));
    });
    return image;
  };
}

let renderer: Renderer | null | undefined;

export function renderFur(
  set: FurSet,
  place: FurPlacement,
  view: Mat3,
  look: FurLook,
  scale: number,
): FurImage | null {
  if (renderer === undefined) {
    renderer = null;
    try {
      renderer = createRenderer(() => {
        renderer = undefined;
      });
    } catch (error) {
      console.warn('Fluffy bodies are unavailable, drawing flat', error);
    }
  }
  return renderer?.(set, place, view, look, scale) ?? null;
}

export function furSupported(): boolean {
  return typeof document !== 'undefined' && typeof WebGL2RenderingContext !== 'undefined';
}
