import { SOCKET_PAD } from './shaders';

export const SOCKET_TILE = 96;

export interface SocketShape {
  w: number;
  h: number;
  span: number;
}

export function socketShape(points: Array<[number, number]>): SocketShape {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return { w, h, span: Math.max(w, h) + 2 * SOCKET_PAD };
}

export function socketTile(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  span: number,
): Uint8Array<ArrayBuffer> {
  const size = SOCKET_TILE;
  const scale = size / span;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.setTransform(scale, 0, 0, scale, size / 2, size / 2);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  const rgba = ctx.getImageData(0, 0, size, size).data;
  const coverage = new Uint8Array(size * size);
  for (let i = 0; i < coverage.length; i++) coverage[i] = rgba[i * 4 + 3] as number;

  const distance = new Float32Array(size * size).fill(size);
  for (let i = size + 1; i < distance.length - size - 1; i++) {
    const a = (coverage[i] as number) / 255;
    const inside = a >= 0.5;
    if (
      (a > 0 && a < 1) ||
      (coverage[i - 1] as number) >= 128 !== inside ||
      (coverage[i + 1] as number) >= 128 !== inside ||
      (coverage[i - size] as number) >= 128 !== inside ||
      (coverage[i + size] as number) >= 128 !== inside
    ) {
      distance[i] = Math.abs(a - 0.5);
    }
  }
  for (const step of [1, -1]) {
    for (let j = 1; j < size - 1; j++) {
      for (let k = 1; k < size - 1; k++) {
        const i = step === 1 ? j * size + k : (size - 1 - j) * size + size - 1 - k;
        const prev = i - size * step;
        distance[i] = Math.min(
          distance[i] as number,
          (distance[i - step] as number) + 1,
          (distance[prev] as number) + 1,
          (distance[prev - 1] as number) + Math.SQRT2,
          (distance[prev + 1] as number) + Math.SQRT2,
        );
      }
    }
  }
  const tile = new Uint8Array(distance.length);
  for (let i = 0; i < tile.length; i++) {
    const signed = (((coverage[i] as number) >= 128 ? -1 : 1) * (distance[i] as number)) / scale;
    tile[i] = Math.round(255 * Math.max(0, Math.min(1, 0.5 + signed / (2 * SOCKET_PAD))));
  }
  return tile;
}
