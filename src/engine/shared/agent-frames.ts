const TAU = Math.PI * 2;
const STEP_MS = 40;
const unit = (v: number): number => Math.min(1, Math.max(0, v));

export type AgentFrame = Record<string, unknown>;

function sampled(totalMs: number, make: (seconds: number) => AgentFrame): AgentFrame[] {
  const frames: AgentFrame[] = [];
  for (let at = 0; at <= totalMs; at += STEP_MS) frames.push({ at, ...make(at / 1000) });
  return frames;
}

const WORK_FIRST_S = 1.5;
const WORK_GAP_S = 7.5;
const WORK_TURN_S = 1.5;
const WORK_EASE = 6.2;
const WORK_DRAW_IN_S = 0.5;
const WORK_GROW_S = 0.16;

export const WORK_LOOP_FROM_MS = WORK_FIRST_S * 1000;

function workFrame(t: number): AgentFrame {
  const into = t - WORK_FIRST_S;
  const live = into >= 0 && into < WORK_TURN_S;
  const e = WORK_EASE * into;
  const turn = live ? TAU * (1 - (1 + e) * Math.exp(-e)) : 0;
  const swell = Math.sin(turn / 2);
  const hoops = live ? unit(into / WORK_GROW_S) * unit((WORK_TURN_S - into) / WORK_DRAW_IN_S) : 0;
  return {
    body: { hoops, sweep: turn, cage: 0, rotate: 3 + 3 * swell, y: -3 * swell, turn: 0.22 * swell },
    eyes: { both: { lookX: -5 * Math.sin(turn), lookY: -2 * swell } },
  };
}

export function workFrames(): AgentFrame[] {
  return sampled((WORK_FIRST_S + WORK_GAP_S) * 1000, workFrame);
}

const DONE_CYCLE_S = 6.2;
const DONE_TURN_S = 3.87;
const DONE_SWEEPS = 9;
const DONE_DRAW_IN_S = 0.5;
const CELEBRATION_END_S = 3.79;
const CELEBRATION_SPEED = (DONE_SWEEPS * TAU + 0.5) / 2.4625;

function celebration(t: number): number {
  const v = CELEBRATION_SPEED;
  if (t <= 0) return 0;
  if (t < 0.24) return -0.25 * (1 - Math.cos((Math.PI * t) / 0.24));
  if (t < 0.54) return -0.5 + (v * (t - 0.24) ** 2) / 0.6;
  if (t < 2.54) return -0.5 + v * (t - 0.39);
  if (t < CELEBRATION_END_S) return -0.5 + v * 2.15 + (1.25 * v * (1 - (1 - (t - 2.54) / 1.25) ** 4)) / 4;
  return DONE_SWEEPS * TAU;
}

function doneFrame(t: number): AgentFrame {
  const second = t >= DONE_CYCLE_S;
  const since = t - (second ? DONE_CYCLE_S : 0);
  const turning = since < DONE_TURN_S;
  const raw = turning ? celebration(since) : DONE_SWEEPS * TAU;
  const yaw = (second ? DONE_SWEEPS * TAU - raw : raw) / 3;
  const swell = turning ? Math.sin((Math.PI * since) / DONE_TURN_S) : 0;
  const hoops = turning ? unit(since / 0.1) * unit((DONE_TURN_S - since) / DONE_DRAW_IN_S) : 0;
  const way = second ? -1 : 1;
  return {
    body: {
      hoops,
      sweep: turning ? way * Math.max(0, raw) : 0,
      cage: 1,
      yaw,
      y: -5 * swell,
      scaleY: 1 + 0.04 * swell,
    },
  };
}

export const WORK_PREVIEW = { body: { hoops: 1, sweep: 3.4, cage: 0, rotate: 5, turn: 0.1 } };

export const DONE_PREVIEW = { body: { hoops: 1, sweep: 25.3, cage: 1, yaw: 0.5, y: -5 } };

export function doneFrames(): AgentFrame[] {
  return sampled(DONE_CYCLE_S * 2000, doneFrame);
}
