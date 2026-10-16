---
name: emotion-integration
description: "Integrate Emotion Ball into a host app: SDK creation options, the AI emotionId protocol, events and methods, multi-instance performance, desktop pet / Electron floating window wiring. Use when embedding the emotion ball in another page or app, wiring AI output to expressions, using the EmotionBall SDK, or building a desktop pet / floating assistant."
---

# Emotion Ball integration

## Minimal setup

Build the script-tag bundle once (`pnpm build:lib` writes `dist-lib/emotion-ball.iife.js`), load it, then create an instance:

```html
<script src="dist-lib/emotion-ball.iife.js"></script>
<div id="bot" style="width:200px;height:200px"></div>
<script>
  var ball = EmotionBall.create(document.getElementById('bot'), {
    emotion: '02', idle: true
  });
</script>
```

Inside a TypeScript project, import it instead: `import { EmotionBall } from './src/engine/emotion-ball';`. In React, mount it through the `Mascot` component (`src/app/components/Mascot.tsx`).

## AI protocol

The AI outputs a single JSON payload and hands it to `handleAIMessage` (an object or a string):

```js
ball.handleAIMessage('{"emotionId":"30","tips":"Thinking about the user\'s question"}');
```

- Unknown `emotionId`, JSON parse failures and missing fields emit an `error` event and automatically fall back to idle (`fallbackId`, default `'02'`), so the page never breaks.
- `tips` is optional display text, surfaced through the `tips` event for the host to render as it sees fit.

## Creation options

| Option | Default | Description |
|---|---|---|
| `emotion` | `'02'` | Initial emotion ID |
| `shape` | `'blob'` | Body shape: `blob` / `wedge` / `gem` |
| `color` / `eyeColor` | — | Themed instance body / eye color, overriding per-emotion colors |
| `eyeScale` | `1` | Eye magnification; `1.5~1.8` recommended for instances below 80 px for readability |
| `idle` | `false` | Idle policy (auto standby / sleep after a timeout) |
| `autostart` | `true` | `false` renders a single static frame without entering the rAF loop (for thumbnails) |
| `lite` | follows autostart | Lite mode: disables ribbon / confetti effects |
| `fallbackId` | `'02'` | Fallback emotion for unknown IDs |

## Events & methods

```js
ball.on('change', e => {});         // { id, def, auto }
ball.on('tips',   e => {});         // { text }
ball.on('error',  e => {});         // { message, ... }

ball.setEmotion('21');
ball.setGaze(nx, ny);               // normalized gaze [-1, 1]; the host listens to pointermove
ball.setStyle({ sketch: 1 });       // wireframe mode
ball.spin(3); ball.burst(24); ball.bounce();
ball.startTour(ids, 2500); ball.stopTour();
ball.setActive(false);              // pause off-screen to save power; true resumes
ball.renderStatic();                // render one static frame of the current emotion while paused
ball.registerEmotion(raw);          // register a custom emotion at runtime
ball.destroy();
EmotionBall.config.exportConfig();  // export / import every emotion as JSON
```

## Wiring mouse gaze

The engine does not listen to the DOM; the host converts to normalized coordinates (spherical projection and smoothing are handled inside):

```js
addEventListener('pointermove', e => {
  var r = el.getBoundingClientRect(),
      cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  ball.setGaze(
    Math.max(-1, Math.min(1, (e.clientX - cx) / 300)),
    Math.max(-1, Math.min(1, (e.clientY - cy) / 300))
  );
});
```

Re-read the rect after scrolling or layout changes; with several instances, share one pointermove dispatch. The gallery implements this in `src/app/gaze.ts`.

## Multi-instance performance

- All instances share one rAF heartbeat, so the instance count does not change the number of loops.
- Thumbnail walls: render statically with `autostart: false`, then `setActive(true)` on hover and `setActive(false)` on leave.
- Use IntersectionObserver to call `setActive(false)` outside the viewport.

## Desktop pet / Electron notes

- Window: `transparent: true, frame: false, alwaysOnTop: true, skipTaskbar: true, resizable: false`; transparent page background with only the ball container.
- Click-through: `win.setIgnoreMouseEvents(true, { forwardMouseMove: true })`; with forwardMouseMove the ball can still be driven by `setGaze`.
- Forward AI messages through main-process IPC: `ipcRenderer.on('emotion', (_, msg) => ball.handleAIMessage(msg))`.
- Map the tray menu to common states (idle / sleep / halt), and call `ball.destroy()` before quitting.
- For small floating windows (≤ 120 px), use `eyeScale: 1.5` with `lite: true`.
