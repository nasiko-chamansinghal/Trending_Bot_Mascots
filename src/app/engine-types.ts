export interface DefLike {
  id: string;
  name: string;
  desc?: string;
  group: string;
}

export interface ChangeEvent {
  id: string;
  def: DefLike;
  auto: boolean;
}

export interface TipsEvent {
  text: string;
}

export interface ErrorEvent {
  message: string;
}

interface EventPayloads {
  change: ChangeEvent;
  tips: TipsEvent;
  error: ErrorEvent;
}

export interface MascotEngine {
  readonly emotionId: string | null;
  readonly touring: boolean;
  setEmotion(id: string, o?: { auto?: boolean }): boolean;
  setStyle(style?: { sketch?: number }): unknown;
  setColor(body: string | null, eyes?: string | null, instant?: boolean): unknown;
  renderStatic(): void;
  /** Advances the animation to a timestamp; driven by the engine's own ticker when active. */
  tick(now: number): void;
  setActive(on: boolean): void;
  replay(): void;
  setGaze(nx: number, ny: number): unknown;
  clearGaze(): unknown;
  startTour(ids: string[], interval?: number): void;
  stopTour(): void;
  resetIdle(): void;
  spin(turns?: number, dir?: number): unknown;
  handleAIMessage(msg: unknown): boolean;
  on<E extends keyof EventPayloads>(evt: E, cb: (payload: EventPayloads[E]) => void): unknown;
  destroy(): void;
  signature?(strength?: number): boolean;
  celebrate?(strength?: number): unknown;
}

export interface GroupLike {
  key: string;
  name: string;
}

export interface ImportResult {
  ok: boolean;
  added: number;
  errors: string[];
}

export interface EmotionConfigApi {
  list(group?: string | null): DefLike[];
  groups(): GroupLike[];
  def(id: string): DefLike | null;
  exportConfig(): string;
  importConfig(json: string): ImportResult;
}
