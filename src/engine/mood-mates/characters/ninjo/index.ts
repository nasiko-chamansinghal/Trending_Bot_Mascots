import { EMOTION_SEED } from '../../../emotion-ball/emotions';
import type { EyePair, Point, Ring } from '../../geometry';
import type { SolidSpec } from '../../solid/spec';
import { palette, radialRing, rimCharacter, rimEyes, rimSpec } from '../rim';

const UNIT = 100;
const SCALE = 86;
const CENTER: [number, number] = [120, 150];
const VISOR = { x: 0, y: -0.04, rx: 0.871, ry: 0.529, power: 2.2 };
const EYES_Y = -0.04;

function view(x: number, y: number): Point {
  return [CENTER[0] + x * SCALE, CENTER[1] + y * SCALE];
}

function visorRing(): Ring {
  const e = 2 / VISOR.power;
  return Array.from({ length: 120 }, (_, i): Point => {
    const t = (2 * Math.PI * i) / 120;
    const c = Math.cos(t);
    const s = Math.sin(t);
    return view(
      VISOR.x + VISOR.rx * Math.sign(c) * Math.abs(c) ** e,
      VISOR.y + VISOR.ry * Math.sign(s) * Math.abs(s) ** e,
    );
  });
}

const BODY = rimSpec({
  ring: radialRing(
    Array.from({ length: 241 }, () => 1),
    UNIT,
  ),
  unit: UNIT,
  depth: 0.8,
  puff: 2.3,
  sigma: 30,
  edge: 0,
  tint: { top: ['#6B7088', 0.5], bottom: ['#000000', 0.6] },
  scale: SCALE,
  center: CENTER,
});

const SPEC: SolidSpec = {
  ...BODY,
  stem: {
    base: [0, 0.94, 0],
    c1: [0, 1.15, 0],
    c2: [0, 1.32, 0],
    tip: [0, 1.5, 0],
    radius: [
      [0, 0.05, 0.05],
      [0.12, 0.04, 0.04],
      [1, 0.036, 0.036],
    ],
  },
  stemShading: {
    edge: '#0B0C12',
    light: '#5A5F78',
    ball: { radius: 0.115, light: '#A0A5C0', dark: '#08090E' },
  },
  plate: {
    ring: visorRing(),
    top: '#FFFFFF',
    bottom: '#C9CEDC',
    inverse: { top: '#262836', bottom: '#0C0D12' },
    follow: { anchor: view(0, EYES_Y), gain: 0.8, limit: [7.7, 6] },
  },
  stemColor: '#0B0C12',
  capColor: '#0B0C12',
};

const EYES = rimEyes({
  anchor: view(0, EYES_Y),
  half: 30,
  rx: 9,
  ry: 15,
  scale: 0.566,
  spread: 0.89,
  reach: 0.1,
  aspect: 0.6,
  minHeight: 29.4,
  maxGrow: 1.2,
});

const IDLE = EMOTION_SEED.find((e) => e.id === '02')?.pool?.[0] ?? 0;
const RINGS: Record<string, EyePair> = { ...EYES, calm: EYES[`g${IDLE}`] as EyePair };

export const ninjo = rimCharacter({
  id: 'ninjo',
  name: 'Ninjo',
  desc: 'A round black ninja-bot with a glossy white visor, a shaded antenna ball and two Grok-style capsule eyes, built as a solid that turns in 3D',
  spec: SPEC,
  palette: palette(
    '#16171F',
    '#0A0A10',
    { dim: '#101117', soft: '#2B2D3A', blush: '#4A2A3C', angry: '#5A1F27', alert: '#5E1E2A', off: '#3F414C' },
    '#8A8FA8',
  ),
  rings: RINGS,
});
