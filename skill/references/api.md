# API reference

Engine version {{VERSION}}. `MoodMates` comes from `mood-mates.js`, `EmotionBall` from `emotion-ball.js`; both are browser globals.

## Creating a mascot

```ts
MoodMates.create(element: HTMLElement | string, options?: MoodMatesOptions): MascotEngine
EmotionBall.create(element: HTMLElement | string, options?: BallOptions): MascotEngine
```

`element` is the container (or a CSS selector for it). The mascot is an SVG that fills the container, so give the container a width and height.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `character` | string | first character | Mood Mates only. One of the ids in [characters.md](characters.md), or the id returned by `registerDesign` |
| `shape` | string | `'blob'` | Ball only. One of {{BALL_SHAPES}} |
| `emotion` | string | `'02'` | Emotion to start on |
| `color` | string | the character's own | Body colour (hex). The body keeps its gradient in the new hue |
| `eyeColor` | string \| null | the character's own | Eye colour (hex) |
| `eyeScale` | number | 1 | Makes the eyes bigger or smaller |
| `idle` | boolean \| object | off | `true`, or `{ standbyAfter: 60000, sleepAfter: 180000, standbyId: '02', sleepId: '00' }` (ms). Goes to standby, then to sleep, after that long without a new emotion |
| `autostart` | boolean | true | `false` draws one still frame and does not animate (thumbnails, reduced motion) |
| `lite` | boolean | `!autostart` | Skips effect layers. For many small thumbnails |
| `label` | string | | Accessible label for the SVG |
| `fallbackId` | string | `'02'` | Emotion used when an unknown id arrives |

## MascotEngine

| Member | Description |
| --- | --- |
| `setEmotion(id)` → boolean | Switches emotion with a smooth transition. `false` (and an `error` event) for an unknown id, which falls back to `fallbackId` |
| `handleAIMessage(msg)` → boolean | `msg` is a JSON string or object `{ emotionId, tips? }`. Sets the emotion and emits `tips` |
| `startTour(ids, intervalMs = 2500)` / `stopTour()` | Cycles through emotions until stopped |
| `setGaze(nx, ny)` / `clearGaze()` | Look direction, each from -1 to 1 |
| `setColor(body, eyes?, instant?)` | Recolour live; `null` restores the character's own colour |
| `spin(turns = 1)` | A quick spin |
| `celebrate(strength = 1)` | Mood Mates only: the character's signature click animation, or a spin |
| `resetIdle()` | Restarts the idle countdown without changing emotion |
| `replay()` | Plays the current emotion again from the start |
| `setActive(on)` | Pauses (`false`) or resumes animation, for example when off screen |
| `renderStatic()` | Draws the current frame once (for a paused mascot) |
| `emotionId` | The current emotion id |
| `on(event, callback)` / `off(event, callback)` | Events below |
| `destroy()` | Stops the animation and removes the SVG. Always call it on unmount |

| Event | Payload |
| --- | --- |
| `change` | `{ id, def, auto }`: the emotion changed; `auto` is true for idle, tour and fallback changes |
| `tips` | `{ text }`: from `handleAIMessage` |
| `error` | `{ message }`: unknown emotion id or bad AI message |

## Other globals

- `MoodMates.registerDesign(json)` → string | null: registers a Design-tab mascot (`.mascot.json` contents) and returns its character id.
- `MoodMates.characters.list()`: the registered characters (`id`, `name`).
- `MoodMates.config.list()`: every emotion definition (`id`, `name`, `group`, `desc`).
- `MoodMates.version` / `EmotionBall.version`: the engine version.

## TypeScript

```ts
type EmotionId = string; // see emotions.md

interface MascotEngine {
  readonly emotionId: EmotionId | null;
  setEmotion(id: EmotionId): boolean;
  handleAIMessage(msg: string | { emotionId: EmotionId; tips?: string }): boolean;
  startTour(ids: EmotionId[], intervalMs?: number): void;
  stopTour(): void;
  setGaze(nx: number, ny: number): MascotEngine;
  clearGaze(): MascotEngine;
  setColor(body: string | null, eyes?: string | null, instant?: boolean): MascotEngine;
  spin(turns?: number): MascotEngine;
  celebrate?(strength?: number): MascotEngine;
  resetIdle(): void;
  replay(): void;
  setActive(on: boolean): void;
  renderStatic(): void;
  on(event: 'change', cb: (e: { id: EmotionId; auto: boolean }) => void): MascotEngine;
  on(event: 'tips', cb: (e: { text: string }) => void): MascotEngine;
  on(event: 'error', cb: (e: { message: string }) => void): MascotEngine;
  destroy(): void;
}

interface MoodMatesOptions {
  character?: string;
  emotion?: EmotionId;
  color?: string;
  eyeColor?: string | null;
  eyeScale?: number;
  idle?: boolean | { standbyAfter?: number; sleepAfter?: number; standbyId?: EmotionId; sleepId?: EmotionId };
  autostart?: boolean;
  lite?: boolean;
  label?: string;
  fallbackId?: EmotionId;
}

declare global {
  interface Window {
    MoodMates?: {
      create(el: HTMLElement | string, options?: MoodMatesOptions): MascotEngine;
      registerDesign(design: unknown): string | null;
      version: string;
    };
    EmotionBall?: {
      create(el: HTMLElement | string, options?: Omit<MoodMatesOptions, 'character'> & { shape?: string }): MascotEngine;
      version: string;
    };
  }
}
export {};
```
