import type { MouthShape } from '../../types';
import { mouthShape } from '../mouth';
import type { TraceFrame } from '../traced';

const CENTRE: [number, number] = [124.5, 150];
const STEPS = 48;

const sweep = (from: number, to: number, at: (t: number) => [number, number]): number[] =>
  Array.from({ length: STEPS + 1 }, (_, i) => at(from + ((to - from) * i) / STEPS)).flat();

const smile = (): number[] =>
  sweep(Math.PI, 0, (t) => [CENTRE[0] + 12.5 * Math.cos(t), CENTRE[1] - 3 + 9.5 * Math.sin(t)]);

const frown = (): number[] =>
  sweep(-9.5, 9.5, (x) => [CENTRE[0] + x, CENTRE[1] + 3 - 6 * Math.cos((Math.PI * x) / 19)]);

const wave = (): number[] =>
  sweep(-13, 13, (x) => [CENTRE[0] + x, CENTRE[1] - 3 * Math.cos((4 * Math.PI * x) / 26)]);

const ring = (): number[] =>
  sweep(0, 2 * Math.PI, (t) => [CENTRE[0] + 10 * Math.cos(t), CENTRE[1] + 2 + 13.7 * Math.sin(t)]).slice(
    0,
    -2,
  );

const flat = (): number[] => [CENTRE[0] - 7, CENTRE[1], CENTRE[0] + 7, CENTRE[1]];

const open = (): number[] => {
  const [cx, cy] = CENTRE;
  const a = 16;
  const top = [
    [-a + 2.5, -15],
    [0, -15.8],
    [a - 2.5, -15],
    [a - 0.4, -13.2],
    [a, -10],
    [a, -4],
  ];
  const belly = Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = (Math.PI * i) / STEPS;
    return [a * Math.cos(t), -4 + 19 * Math.sin(t)];
  }).slice(1);
  const rise = [
    [-a, -4],
    [-a, -10],
    [-a + 0.4, -13.2],
  ];
  return [...top, ...belly, ...rise].flatMap(([x, y]) => [cx + (x as number), cy + 1 + (y as number)]);
};

export function baoMouths(frame: TraceFrame): Record<string, MouthShape> {
  const smileShape = mouthShape(smile(), frame, { width: 7 });
  const frownShape = mouthShape(frown(), frame, { width: 7 });
  const waveShape = mouthShape(wave(), frame, { width: 5 });
  const ringShape = mouthShape(ring(), frame, { width: 6.3, closed: true });
  const flatShape = mouthShape(flat(), frame, { width: 5 });
  const openShape = mouthShape(open(), frame, { width: 3, fill: true, closed: true });
  return {
    calm: smileShape,
    g2: openShape,
    g17: openShape,
    g11: waveShape,
    g19: waveShape,
    g14: waveShape,
    g5: waveShape,
    g3: ringShape,
    g21: ringShape,
    g4: flatShape,
    g22: flatShape,
    g13: flatShape,
    g7: frownShape,
    g16: frownShape,
    g23: frownShape,
  };
}
