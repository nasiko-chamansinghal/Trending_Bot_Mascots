import type { EyePair, Point, Ring } from './geometry';
import type { EyePose, Pose } from './types';
import { centroid, clamp } from './util';

export interface HeadFollow {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  roll: [number, number];
  reach: [number, number];
  parallax: number;
  tilt: number;
  tiltMax: number;
}

export const HEAD_FOLLOW = {
  x: 0.4,
  y: 0.44,
  yaw: 0.0065,
  pitch: 0.0065,
  roll: [0.1, 0.3],
  reach: [30, 22],
  tilt: 0.5,
  tiltMax: 12,
} satisfies Omit<HeadFollow, 'parallax'>;

const ROUND_UNTIL = 1.1;
const ELONGATED_AT = 1.5;
const SPIN_FREE = 40;
const SPIN_FADE = 15;

export function headFollowFor(scale: number): HeadFollow {
  return { ...HEAD_FOLLOW, parallax: scale * 1.25 };
}

export function restCentres(calm: EyePair): [Point, Point] {
  return [centroid(calm[0]), centroid(calm[1])];
}

function eyeLean(ring: Ring, eye: EyePose): { angle: number; weight: number } {
  const c = centroid(ring);
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const p of ring) {
    const dx = p[0] - c[0];
    const dy = p[1] - c[1];
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  }
  const mean = (xx + yy) / 2;
  const gap = Math.hypot((xx - yy) / 2, xy);
  const elongation = Math.sqrt((mean + gap) / Math.max(mean - gap, 1e-9));
  const axis = (0.5 * Math.atan2(2 * xy, xx - yy) * 180) / Math.PI;
  const lean = axis > 0 ? axis - 90 : axis + 90;
  return {
    angle: lean + (eye.rotate || 0),
    weight: clamp((elongation - ROUND_UNTIL) / (ELONGATED_AT - ROUND_UNTIL), 0, 1),
  };
}

function faceLean(pose: Pose): { angle: number; weight: number } {
  let sum = 0;
  let weight = 0;
  for (const eye of [pose.left, pose.right]) {
    if (!eye.ring) continue;
    const lean = eyeLean(eye.ring, eye);
    sum += lean.angle * lean.weight;
    weight += lean.weight;
  }
  return weight > 0 ? { angle: sum / weight, weight: weight / 2 } : { angle: 0, weight: 0 };
}

export function applyHeadFollow(pose: Pose, rest: [Point, Point], follow: HeadFollow, mix: number): void {
  let ex = 0;
  let ey = 0;
  [pose.left, pose.right].forEach((eye, i) => {
    const home = rest[i] as Point;
    const at = eye.ring ? centroid(eye.ring) : home;
    ex += at[0] + eye.x + eye.lookX - home[0];
    ey += at[1] + eye.y + eye.lookY - home[1];
  });
  ex = mix * clamp(ex / 2, -follow.reach[0], follow.reach[0]);
  ey = mix * clamp(ey / 2, -follow.reach[1], follow.reach[1]);
  const yaw = follow.yaw * ex;
  const pitch = -follow.pitch * ey;
  const body = pose.body;
  body.x += follow.x * ex;
  body.y += follow.y * ey;
  body.turn = (body.turn ?? 0) + yaw;
  body.pitch = (body.pitch ?? 0) + pitch;
  body.rotate += follow.roll[0] * ex + follow.roll[1] * ey;
  for (const eye of [pose.left, pose.right]) {
    eye.lookX -= follow.parallax * yaw;
    eye.lookY += follow.parallax * pitch;
  }
  const lean = faceLean(pose);
  const target = clamp(follow.tilt * lean.angle * lean.weight, -follow.tiltMax, follow.tiltMax);
  const opposed = clamp((-body.rotate * Math.sign(target)) / (Math.abs(target) + 1), 0, 1);
  const calm = clamp((SPIN_FREE - Math.abs(body.rotate)) / SPIN_FADE, 0, 1);
  body.rotate += mix * calm * opposed * (target - body.rotate);
}
