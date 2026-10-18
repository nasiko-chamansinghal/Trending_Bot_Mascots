import type { BodyDescriptor, EyePair, EyeShapeSpec, EyeStyle, MouthLensParams, Ring } from './geometry';

export interface BodyPose {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  color: string;
  breathe: number;
  spinFx: number;
  confetti: number;
  sketch: number;
  zzz: number;
  orbit: number;
  scaleX: number;
  scaleY: number;
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

export interface FacePose {
  blush: number;
  browVis: number;
  browTilt: number;
  browRaise: number;
  mouthX: number;
  mouthY: number;
  mouthSX: number;
  mouthSY: number;
  mouthRing?: Ring;
}

export interface Pose {
  body: BodyPose;
  left: EyePose;
  right: EyePose;
  face: FacePose;
  props: Record<string, number>;
}

export interface PoseSpec {
  body?: Partial<BodyPose>;
  face?: Partial<FacePose>;
  props?: Record<string, number>;
  eyes?: {
    both?: Partial<EyePose>;
    left?: Partial<EyePose>;
    right?: Partial<EyePose>;
  };
}

export interface HighlightCfg {
  dx?: number;
  dy?: number;
  r?: number;
  color?: string;
  opacity?: number;
}

export interface PupilCfg {
  irisColor?: string;
  irisR?: number;
  pupilR?: number;
  pupilColor?: string;
  socket?: string;
  highlights?: HighlightCfg[];
}

export interface CharacterEyeStyle extends EyeStyle {
  highlight: HighlightCfg | HighlightCfg[] | null;
  pupil: PupilCfg | null;
}

export interface Palette {
  body: string;
  eye: string;
  eyeHighlight: string;
  blush?: string;
  zzz?: string;
  gloss?: number;
  mouth?: string;
  fx?: string[];
  states: Record<string, string>;
}

export interface FaceLayout {
  x: number;
  y: number;
  sx: number;
  sy: number;
  eye: number;
  projection?: 'sphere' | 'plane';
  level?: number;
}

export interface Micro {
  type?: string;
  amp?: number;
  period?: number;
}

export interface Accessory {
  kind?: string;
  layer?: 'back' | 'front';
  color?: string;
  fit?: number;
  strokeWidth?: number;
  glintPeriod?: number;
  micro?: Micro;
  d?: string;
  fill?: string;
  stroke?: string;
  opacity?: number;
  seed?: number;
  anchor?: string;
  dx?: number;
  dy?: number;
  pivotX?: number;
  pivotY?: number;
  transform?: string;
}

export interface BlushCfg {
  dx: number;
  dy: number;
  rx: number;
  ry: number;
  color: string;
  max: number;
}

export interface BrowCfg {
  w: number;
  h: number;
  gap: number;
  color: string;
  always: boolean;
  bend: number;
  dx?: number;
  dyTop?: number;
}

export interface MouthCfg {
  w?: number;
  dy: number;
  color: string;
}

export interface Features {
  accessories?: Accessory[];
  blush?: boolean | Partial<BlushCfg>;
  brows?: boolean | Partial<BrowCfg>;
  mouth?: boolean | Partial<MouthCfg>;
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
}

export interface ClipDef {
  duration: number;
  sample: (t: number, strength: number) => ClipFrame;
  expr?: Array<{ at: number; expr: string; speed?: number }>;
  burst?: Array<{ at: number; count: number }>;
}

export interface ZzzStyle {
  glyph?: string;
  italic?: boolean;
  weight?: string;
  size?: number;
  opacity?: number;
}

export interface BeatFrame {
  at: number;
  eyes?: PoseSpec['eyes'];
  face?: PoseSpec['face'];
  body?: PoseSpec['body'];
}

export interface CelebrateBeat {
  expr?: string;
  mouth?: string;
  fade?: number;
  frames: BeatFrame[];
}

export interface VariantRaw {
  name?: string;
  en?: { name?: string } | null;
  body?: BodyDescriptor;
  material?: string;
}

export interface LocalizedText {
  name?: string;
  desc?: string;
}

export interface CharacterRaw {
  id: string;
  name: string;
  en?: LocalizedText | null;
  industry?: string;
  desc?: string;
  body: BodyDescriptor;
  face?: Partial<FaceLayout>;
  palette?: Partial<Palette> & { body: string };
  eyeStyle?: Partial<CharacterEyeStyle>;
  eyeShapes?: Record<string, EyeShapeSpec>;
  mouthShapes?: Record<string, Partial<MouthLensParams>>;
  features?: Features;
  fxSkin?: string;
  material?: string;
  zzz?: ZzzStyle;
  props?: PropDef[];
  extraEmotions?: EmotionRaw[];
  emotionGroups?: EmotionGroup[];
  baseAnims?: AnimSpec[];
  clips?: Record<string, ClipDef>;
  signatureClips?: string[];
  celebrateBeat?: CelebrateBeat | null;
  emotions?: Record<string, Record<string, unknown>> | null;
  variants?: Record<string, VariantRaw>;
  _resolved?: ResolvedCharacter;
  _variantCache?: Record<string, ResolvedCharacter>;
}

export interface ResolvedCharacter {
  id: string;
  name: string;
  en: LocalizedText | null;
  industry: string;
  desc: string;
  bodyRing: Ring;
  face: FaceLayout;
  palette: Palette;
  eyeStyle: CharacterEyeStyle;
  eyeFamily: Record<string, EyePair>;
  mouthShapes: Record<string, Ring>;
  defaultEyeRing: EyePair;
  features: Features;
  fxSkin: string;
  material: string;
  zzz: ZzzStyle | null;
  props: PropDef[];
  baseAnims: AnimSpec[];
  clips: Record<string, ClipDef>;
  signatureClips: string[];
  celebrateBeat: CelebrateBeat | null;
  emotions: Record<string, Record<string, unknown>> | null;
  raw: CharacterRaw;
  variant?: string;
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
  transition?: number;
  gaze?: boolean;
  pool?: string[];
  poolMs?: [number, number];
  poolSpeed?: number;
  blinkMs?: [number, number] | null;
  openness?: number;
  antics?: boolean;
  mouth?: string;
  anims?: AnimSpec[];
  sequence?: SequenceSpec;
  bare?: boolean;
}
