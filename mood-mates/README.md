<div align="center">

# Mood Mates · Original Character Emotion Engine

**2 original cartoon characters × 32 emotion states, driven in real time by pure SVG. Strict TypeScript, no framework in the engine, zero image assets.**

</div>

---

Mood Mates is a character emotion engine for AI assistants, customer-service bots, and desktop pets. Each character has its own silhouette, eye style, mouth shapes, palette, and FX skin, while sharing a single choreography of 32 emotion states. Your AI outputs one `emotionId` and the character performs the matching emotion in real time.

## The Cast

| Character | Vertical | Silhouette | Eyes | Signature move |
| --- | --- | --- | --- | --- |
| **Nimbo** | General (default) | Cloud | Bean eyes | Cloud bubbles |
| **Twinkle** | General | Rounded star | Iris eyes + glasses | Star burst · orbiting pencil |

Every visual asset is generated at runtime by parametric geometry functions (`src/engine/mood-mates/geometry.ts`). The design process and parameters are documented in [docs/DESIGN-PROVENANCE.md](docs/DESIGN-PROVENANCE.md).

## Highlights

- **No runtime dependencies in the engine**: framework-free strict TypeScript, everything renders as SVG;
- **Premium rendering**: multi-stop volumetric gradients, glazed highlight, bottom ambient occlusion, and a soft ground shadow that shrinks as the character bounces;
- **Physically correct eyes**: iris eyes are layered under an eyelid clipPath (sclera / iris / pupil / light-fixed catchlights); closing, blinking, or arch-smiling automatically switches to a dark lash line — pupils can never float over closed lids; the eyeball slides inside the socket when gazing;
- **Accessory rig**: glasses auto-fit to the actual eye positions, trail the gaze, slide on blinks, and get a periodic lens glint;
- **Signature moves**: celebrations and idle antics are never a generic spin — Nimbo blows near-and-far cloud bubbles, Twinkle bursts starlight; a stage click calls `celebrate()` (bubbles only for Nimbo; Twinkle still adds a limb beat and confetti);
- **Characters are data**: one character = one self-contained data file — copy it, tweak the parameters, and you have a new character without touching engine code;
- **Semantic slots + per-emotion contours**: the shared emotion base references semantic eye/mouth slots; characters can define bespoke contours per emotion via `eyeShapes` / `mouthShapes`;
- **AI protocol**: wire up with one call — `handleAIMessage({ emotionId, tips })`; unknown IDs fall back to idle, never a blank screen;
- **Emotion taxonomy**: `00-09` lifecycle / `10-29` emotions / `30-49` agent working states / `50+` runtime custom;
- **Production plumbing**: idle strategies, shared rAF heartbeat across instances, off-screen frame pausing, static thumbnail rendering, sketch mode, React showcase site.

## Quick Start

From the repository root:

```bash
pnpm install
pnpm dev            # open http://localhost:5173/mood-mates/
```

Use the engine from code:

```ts
import { MoodMates } from './src/engine/mood-mates';

const mate = MoodMates.create(document.getElementById('mate') as HTMLElement, {
  character: 'nimbo', emotion: '02', idle: true,
});
mate.handleAIMessage('{"emotionId":"10","tips":"All done!"}');
```

Or as a drop-in script tag (`pnpm build:lib` writes `dist-lib/mood-mates.iife.js`):

```html
<script src="dist-lib/mood-mates.iife.js"></script>
<div id="mate" style="width:200px;height:200px"></div>
<script>
  var mate = MoodMates.create(document.getElementById('mate'), {
    character: 'nimbo', emotion: '02', idle: true
  });
  mate.handleAIMessage('{"emotionId":"10","tips":"All done!"}');
</script>
```

## Documentation

- [Integration Guide](docs/INTEGRATION.md) — SDK options, AI protocol, events & methods, multi-instance performance, Electron desktop pets
- [Character Design Guide](docs/CHARACTER-DESIGN.md) — create a new character from scratch (body generators / eye style / palette / features / accessories)
- [Design Provenance](docs/DESIGN-PROVENANCE.md) — the originality evidence chain for all visual assets
- Ring editor (`/mood-mates/tools/ring-editor.html` under `pnpm dev`) — parametric contour editor for tuning and exporting character data

## License

Dual license:

- **Community license** ([LICENSE](LICENSE)): free for personal learning, research, and non-commercial projects;
- **Commercial license** ([LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)): required for commercial products, SaaS, and client deliverables.

All Mood Mates characters are independently created original designs. All rights reserved.
