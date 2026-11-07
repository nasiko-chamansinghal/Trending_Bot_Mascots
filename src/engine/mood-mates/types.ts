import type { BodyDescriptor, CutParams, EyePair, Ring } from './geometry';
import type { SolidSpec } from './solid/spec';

export interface BodyPose {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  color: string;
  breathe: number;
  sketch: number;
  zzz: number;
  scaleX: number;
  scaleY: number;
  yaw?: number;
  peel?: number;
  flip?: number;
  sink?: number;
  turn?: number;
  pitch?: number;
  ribbons?: number;
  confetti?: number;
  orbit?: number;
  aura?: string;
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
  props: Record<string, number>;
}

export interface PoseSpec {
  body?: Partial<BodyPose>;
  props?: Record<string, number>;
  eyes?: {
    both?: Partial<EyePose>;
    left?: Partial<EyePose>;
    right?: Partial<EyePose>;
  };
}

export interface Palette {
  body: string;
  eye: string;
  zzz?: string;
  fx?: string[];
  states: Record<string, string>;
}

export interface FaceLayout {
  x: number;
  y: number;
  sx: number;
  sy: number;
  eye: number;
  level?: number;
  contain: number;
}

export type PropKind = 'box' | 'bubble' | 'glyph';

export interface PropDef {
  id: string;
  kind: PropKind;
  color?: string;
  text?: string;
  weight?: string;
  radius?: number;
  dotColor?: string;
}

export interface ClipFrame {
  dx?: number;
  dy?: number;
  rotate?: number;
  sx?: number;
  sy?: number;
  eyeSx?: number;
  eyeSy?: number;
  peel?: number;
  flip?: number;
  sink?: number;
  eyeX?: [number, number];
  eyeY?: [number, number];
  turn?: number;
  pitch?: number;
  yaw?: number;
}

export interface BackFace {
  lighten: number;
  text?: string;
}

export interface BlinkStep {
  slot: string;
  ms: number;
}

export interface ClipDef {
  duration: number;
  sample: (t: number, strength: number) => ClipFrame;
  expr?: Array<{ at: number; expr: string; speed?: number }>;
}

export interface ZzzStyle {
  glyph?: string;
  italic?: boolean;
  weight?: string;
  size?: number;
  opacity?: number;
}

export interface CharacterRaw {
  id: string;
  name: string;
  industry?: string;
  desc?: string;
  body: BodyDescriptor;
  face?: Partial<FaceLayout>;
  palette: Palette;
  eyeShapes: Record<string, CutParams>;
  eyeRings?: Record<string, EyePair>;
  solid?: SolidSpec;
  blinkStyle?: 'ring' | 'open';
  poseDefaults?: PoseSpec;
  bounceScale?: number;
  fxSkin?: string;
  material?: string;
  zzz?: ZzzStyle;
  props?: PropDef[];
  extraEmotions?: EmotionRaw[];
  emotionGroups?: EmotionGroup[];
  baseAnims?: AnimSpec[];
  clips?: Record<string, ClipDef>;
  signatureClips?: string[];
  blink: BlinkStep[];
  backFace?: BackFace;
  gazeRange?: [number, number];
  emotions?: Record<string, Record<string, unknown>> | null;
  _resolved?: ResolvedCharacter;
}

export interface ResolvedCharacter {
  id: string;
  name: string;
  industry: string;
  desc: string;
  bodyRing: Ring;
  face: FaceLayout;
  palette: Palette;
  eyeFamily: Record<string, EyePair>;
  defaultEyeRing: EyePair;
  fxSkin: string;
  material: string;
  zzz: ZzzStyle | null;
  props: PropDef[];
  baseAnims: AnimSpec[];
  clips: Record<string, ClipDef>;
  signatureClips: string[];
  blink: BlinkStep[];
  backFace: BackFace | null;
  gazeRange: [number, number];
  emotions: Record<string, Record<string, unknown>> | null;
  solid: SolidSpec | null;
  blinkStyle: 'ring' | 'open';
  poseDefaults: PoseSpec | null;
  raw: CharacterRaw;
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

export interface EmotionGroup {
  key: string;
  name: string;
}

export interface SequenceFrameSpec extends PoseSpec {
  at?: number;
  expr?: string;
  exprSpeed?: number;
}

export interface SequenceSpec {
  settle?: 'base' | 'hold' | { next: string };
  frames: SequenceFrameSpec[];
  interp?: 'ease' | 'linear';
  loopFrom?: number;
}

export interface EmotionRaw extends PoseSpec {
  id: string;
  name: string;
  group: string;
  desc?: string;
  effect?: string;
  transition?: number;
  gaze?: boolean;
  pool?: string[];
  poolMs?: [number, number];
  poolSpeed?: number;
  blinkMs?: [number, number] | null;
  anims?: AnimSpec[];
  sequence?: SequenceSpec;
  bare?: boolean;
  openness?: number;
  antics?: boolean;
  follow?: number;
}
