# Integration Guide

Mood Mates is a dependency-free expression engine rendered as pure SVG. The engine is written in TypeScript with no framework: a host either imports it as an ES module or loads a single prebuilt script tag, and then calls `MoodMates.create`.

## Quick start

### Option A: script tag (no build step on the host)

Build the bundles once (`pnpm build:lib` writes `dist-lib/mood-mates.iife.js` and `dist-lib/emotion-ball.iife.js`), then:

```html
<script src="dist-lib/mood-mates.iife.js"></script>

<div id="mate" style="width:200px;height:200px"></div>
<script>
  var mate = MoodMates.create(document.getElementById('mate'), {
    character: 'nimbo',
    emotion: '02',
    idle: true
  });
</script>
```

The bundle registers the two bundled characters (`nimbo`, `twinkle`) and exposes the global `MoodMates`.

### Option B: ES module

```ts
import { MoodMates } from './src/engine/mood-mates';

const mate = MoodMates.create(document.getElementById('mate') as HTMLElement, {
  character: 'nimbo',
  emotion: '02',
  idle: true,
});
```

### Option C: React

The gallery apps mount mascots through the `Mascot` component in `src/app/components/Mascot.tsx`. It owns the engine lifecycle: it creates the instance in an effect, registers gaze tracking, and destroys the instance on unmount.

## AI protocol

The AI only needs to output one JSON payload and hand it to `handleAIMessage` (an object or a string):

```js
mate.handleAIMessage('{"emotionId":"30","tips":"Thinking about the user\'s question"}');
```

- Unknown `emotionId`, JSON parse failures and missing fields emit an `error` event and fall back to idle (`fallbackId`, default `'02'`), so the page never breaks;
- `tips` is optional display text, surfaced through the `tips` event for the host to render.

### emotionId segments (a public contract; IDs are never renumbered)

| Range | Group | Common |
| --- | --- | --- |
| 00-09 | Lifecycle | 00 Sleeping · 01 Waking · 02 Idle · 03 Curious |
| 10-29 | Emotions | 10 Happy · 13 Surprised · 14 Shy · 21 Angry |
| 30-49 | Agent States | 30 Thinking · 33 Done · 34 Error · 38 Refusing · 40 Searching |
| 50+ | Custom | Registered at runtime |

## Creation options

| Option | Default | Description |
| --- | --- | --- |
| `character` | first registered character | Character ID: `nimbo` / `twinkle` |
| `variant` | — | Body outline variant declared by the character |
| `emotion` | `'02'` | Initial emotion ID |
| `color` / `eyeColor` | — | Themed instance body / eye color (for team instances) |
| `eyeScale` | `1` | Eye magnification; `1.5–1.8` recommended below 80 px |
| `idle` | `false` | Idle policy: auto standby / sleep after a timeout; pass an object to customize durations and target states |
| `autostart` | `true` | `false` renders a single static frame (for thumbnails) |
| `lite` | follows `autostart` | Lite mode: disables FX particles and zzz |
| `label` | — | Accessible label for the SVG |
| `fallbackId` | `'02'` | Fallback emotion for unknown IDs |

## Events & methods

```js
mate.on('change', e => {});         // emotion switched { id, def, auto }
mate.on('tips',   e => {});         // AI display text { text }
mate.on('error',  e => {});         // protocol error { message, ... }

mate.setEmotion('21');              // switch directly
mate.setGaze(nx, ny);               // normalized gaze [-1, 1]; host listens to pointermove
mate.setStyle({ sketch: 1 });       // wireframe mode
mate.celebrate();                   // click celebration: Nimbo blows cloud bubbles; Twinkle signature + limbs + confetti
mate.signature();                   // signature move only (Nimbo cloud bubbles / Twinkle star burst)
                                    // returns false when the skin has no signature
mate.spin(3);                       // spin and throw FX particles (generic)
mate.burst(24);                     // confetti
mate.bounce();                      // bounce
mate.startTour(ids, 2500);          // auto tour / mate.stopTour()
mate.setActive(false);              // pause off-screen to save power; true resumes
mate.renderStatic();                // render one frame while paused
mate.registerEmotion(raw);          // register a custom emotion at runtime (50+ range)
mate.destroy();                     // dispose the instance
```

## Multi-instance & performance

- All instances share a single rAF heartbeat, so the instance count does not multiply loop overhead;
- Thumbnail walls: render statically with `autostart: false`, then `setActive(true)` on hover and `setActive(false)` on leave;
- Pair with IntersectionObserver to pause off-screen instances via `setActive(false)`.

## Desktop pet / Electron

- Window flags: `transparent: true, frame: false, alwaysOnTop: true, skipTaskbar: true`, with a transparent page background and only the character container;
- Click-through: `win.setIgnoreMouseEvents(true, { forwardMouseMove: true })` — the character still receives `setGaze` while clicks pass through to the desktop;
- Forward AI messages via IPC: `ipcRenderer.on('emotion', (_, msg) => mate.handleAIMessage(msg))`;
- For small floating windows (≤ 120 px), use `eyeScale: 1.5` with `lite: true`.

## Custom emotions

```js
MoodMates.config.register({
  id: '50', name: 'Greeting', group: 'custom',
  pool: ['happy', 'wide'],        // eye-shape semantic slots (shared by all characters)
  mouth: 'grin',                  // mouth slot
  body: { color: '@soft' },       // colors use @tokens and adapt to each character palette
  anims: [ { target: 'body', prop: 'rotate', type: 'sine', amp: 6, period: 900 } ]
});
```

Export and import with `MoodMates.config.exportConfig()` / `importConfig(json)`.

## Emotion config reference

The 32 shipped emotions live in `src/engine/mood-mates/data/emotions.ts` and are typed by `EmotionRaw` in `src/engine/mood-mates/types.ts`. Three semantic layers keep them independent of any specific character:

| Layer | Meaning |
| --- | --- |
| `pool` | Eye-shape slot names (see `eyeSlots` in `src/engine/mood-mates/geometry.ts`); each character realizes them with its own eye ring family |
| `mouth` | Mouth slot name: `smile` / `grin` / `o` / `flat` / `frown` / `wavy` / `pout` / `open` / `dot` |
| colors | `'@token'` looked up in the character palette: `@base` resting · `@dim` low · `@soft` gentle · `@blush` flushed · `@angry` red · `@alert` warning · `@off` powered down |

Fields:

| Field | Description |
| --- | --- |
| `id` / `name` / `desc` / `group` | Identity and display text; `group` is one of `life`, `emotion`, `agent`, `custom` |
| `pool` / `poolMs` / `poolSpeed` | Eye-shape pool, rotation interval `[min, max]` ms, and morph speed |
| `blinkMs` | Blink interval `[min, max]` ms (`null` = never blink) |
| `openness` | Resting eye openness (sleeping `0.08`, tired `0.55`) |
| `antics` | Random idle antics (spin / bounce) |
| `transition` | Entry transition duration in ms |
| `gaze` | `false` ignores mouse gaze (sleep and halt states) |
| `face` | `{ blush 0..1, browVis, browTilt, browRaise, mouthX/Y/SX/SY }` facial pose |
| `body.spinFx` / `body.confetti` | One-shot events on entering the emotion: spin with FX particles / confetti |
| `body.zzz` / `body.orbit` | Sleep letter particles / persistent orbiting particles |
| `anims` | Up to three animators from `sine`, `glance`, `pulse`, `jitter`, `scan`, `blink` |
| `sequence` | Keyframe sequence; `settle` is `'base'`, `'hold'` or `{ next: '<id>' }` |
