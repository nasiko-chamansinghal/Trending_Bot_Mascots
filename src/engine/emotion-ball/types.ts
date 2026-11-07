import type { Ring } from '../shared/util';

export interface BodyPose {
  x: number;
  y: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  rotate: number;
  color: string;
  breathe: number;
  ribbons: number;
  confetti: number;
  sketch: number;
  zzz: number;
  orbit: number;
  yaw?: number;
}

export interface EyePose {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  open: number;
  color: string;
  lookX: number;
  lookY: number;
  ring?: Ring;
}

export interface Pose {
  body: BodyPose;
  left: EyePose;
  right: EyePose;
}

export interface PoseSpec {
  body?: Partial<BodyPose>;
  eyes?: {
    both?: Partial<EyePose>;
    left?: Partial<EyePose>;
    right?: Partial<EyePose>;
  };
}

export interface FaceFit {
  x: number;
  y: number;
  sx: number;
  sy: number;
  eye: number;
}

export interface Shape {
  ring: Ring;
  face: FaceFit;
  tiltScale: number;
}

export interface RingData {
  HEAD_C: number;
  EYE_HALF: number;
  STAR_GOLD: string;
  EXPRESSIONS: Array<[Ring, Ring]>;
  SHAPES: Record<string, Shape>;
}

export interface AnimSpec {
  target: string;
  prop: string;
  type: string;
  amp?: number;
  period?: number;
  phase?: number;
  phaseMs?: number;
  speed?: number;
  decay?: number;
  interval?: number;
  dur?: number;
  depth?: number;
}

export interface SequenceFrameSpec extends PoseSpec {
  at?: number;
}

export interface SequenceSpec {
  settle?: 'base' | 'hold' | { next: string };
  interp?: 'ease' | 'linear';
  frames: SequenceFrameSpec[];
}

export interface EmotionGroup {
  key: string;
  name: string;
}

export interface EmotionRaw extends PoseSpec {
  id: string;
  name: string;
  group: string;
  desc?: string;
  effect?: string;
  transition?: number;
  gaze?: boolean;
  pool?: number[];
  poolMs?: [number, number];
  poolSpeed?: number;
  blinkMs?: [number, number] | null;
  openness?: number;
  antics?: boolean;
  anims?: AnimSpec[];
  sequence?: SequenceSpec;
}
