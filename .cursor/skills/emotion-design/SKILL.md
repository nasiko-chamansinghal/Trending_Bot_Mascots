---
name: emotion-design
description: "Design and add Emotion Ball emotions: eye-ring pool selection, animation primitive parameters, keyframe sequences, body color and copy rules. Use when adding or tuning emotions in src/engine/emotion-ball/emotions.ts, designing new expression behaviors, choosing eye-ring pools, or adjusting the emotion ball's visual language."
---

# Emotion Ball emotion design

## Visual language (hard constraints)

- Emotions differ through four things only: **eye-ring pool rotation, gaze direction, body pose (offset / rotation / scale) and body color**. Do not add new graphic elements (mouth, brows, hands, etc.).
- The body color baseline is ceramic white `#F3F0EA`; emotion colors are reserved for strong expression (angry / error red `#E4574A`, shy pink `#F4D3D0`), and desaturated grays are for low-energy states (sleeping / dormant / dejected).
- Restraint: no more than 3 `anims` per emotion; prefer small amplitudes (gaze ±2~11, body offset ±1~9).
- FX are events, not a constant: `ribbons` / `confetti` trigger once on entering an emotion; the only persistent effects are `body.orbit` (thinking ribbon orbit) and `body.zzz` (sleep letters).

## Eye-ring pool reference (EXPRESSIONS index)

| Emotion family | Indices |
|---|---|
| Calm | 0, 8 |
| Smiling | 2, 11, 17, 19 |
| Wide open | 3, 21 |
| Closed / sleepy | 13, 22, 4 |
| Squint / resigned | 14, 5, 23 |
| Angry | 7, 16 |
| Scanning / searching | 15, 9, 20, 12, 18 |
| Listening | 10, 1 |
| Shy | 24 |

## Config fields

```ts
{
  id: '10',                    // two-character string; 00-07 lifecycle, 10-21 emotions, 30-41 agent, 50+ custom
  name: 'Happy', group: 'emotion',
  desc: '...',                 // English display text; both name and desc are required
  transition: 380,             // entry transition in ms (excited 180-400, low-energy 700-1200)
  gaze: true,                  // false = ignore mouse gaze (sleep / halt states)
  pool: [2, 11, 17, 19],       // eye-ring index pool
  poolMs: [2500, 4500],        // rotation interval within the pool; poolSpeed: 10 for fast rotation (searching)
  blinkMs: [2500, 5000],       // blink interval; null = never (sleep / loading states)
  openness: 1,                 // resting eye openness (tired 0.55, sleeping 0.08)
  antics: true,                // random idle spin / bounce (relaxed emotions only)
  body: { breathe: 0.012, color: '#F6EFE4', zzz: 0, orbit: 0, ribbons: 0, confetti: 0 },
  eyes: { both: {...}, left: {...}, right: {...} },
  anims: [...], sequence: {...}
}
```

The type is `EmotionRaw` in `src/engine/emotion-ball/types.ts`.

## Animation primitives (anims entries)

| type | Effect | Key parameters |
|---|---|---|
| `sine` | sine drift | `amp, period, phase` |
| `glance` | smoothed square wave, dwelling at both ends (look left, look right / nod) | `amp, period` |
| `pulse` | rhythmic 0 → amp scaling | `amp, period` |
| `jitter` | pseudo-noise shake, can decay | `amp, speed, decay (ms)` |
| `scan` | fast triangular sweep | `amp, period` |
| `blink` | periodic closing (stagger alternating blinks with `phaseMs`) | `interval, dur, phaseMs` |

`target`: `eyes / body / left / right`; `prop`: `lookX / lookY / x / y / scale / open / rotate`.

## Keyframe sequences (sequence)

- `settle: 'base'` eases back to the resting pose when done (surprise, receiving a task); `'hold'` freezes on the last frame (shy turning pink, angry turning red); `{ next: '02' }` switches emotion when done (wake up → idle).
- **Thumbnail consistency rule**: when `settle: 'hold'` and the sequence changes the body color, the base `body.color` must equal the final sequence color, or the static thumbnail will not match the real look.

## Add-an-emotion workflow

```
- [ ] Pick an id segment and group; name and desc are filled in
- [ ] Choose 2~5 indices from the eye-ring pool reference to form the pool
- [ ] Set poolMs / blinkMs / openness / antics
- [ ] No more than 3 anims, restrained amplitudes
- [ ] If there is a sequence, check the settle semantics and the body color consistency rule
- [ ] Verify in the browser: the static thumbnail frame is recognizable, hover animation is correct, the stage entry transition feels natural
```

The engine and render layers (`src/engine/emotion-ball/engine.ts` / `ball.ts`) are a stable foundation; adding an emotion only edits `src/engine/emotion-ball/emotions.ts`. Extend `ANIM_TYPES` only when a new animation primitive is needed.
