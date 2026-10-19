# Trending Grokbot Mascots

Animated SVG mascots for AI assistants. Each mascot has 32 emotions, and your AI picks one by sending a single `emotionId`.

| Mascot | Engine | Extras |
| --- | --- | --- |
| Grok bot ball | `src/engine/emotion-ball` | blob, wedge and gem shapes |
| Nubby (block) | `src/engine/mood-mates` | 9 video states, Peekaboo Pop and Marble Eyes click animations |
| Stampy (stamp) | `src/engine/mood-mates` | 6 video states, corner peel and card flip click animations |

## Quick start

```bash
pnpm install
pnpm dev
```

| URL | Page |
| --- | --- |
| `/` | All three mascots on one stage |
| `/mood-mates/` | Nubby and Stampy |
| `/emotion-ball/` | The Grok bot ball |

## Use in your app

Build the script-tag bundles with `pnpm build:lib`, then:

```html
<script src="dist-lib/mood-mates.iife.js"></script>
<div id="bot" style="width:200px;height:200px"></div>
<script>
  const bot = MoodMates.create(document.getElementById('bot'), { character: 'nubby', emotion: '02', idle: true });
  bot.handleAIMessage('{"emotionId":"30","tips":"thinking"}');
</script>
```

Use `dist-lib/emotion-ball.iife.js` and `EmotionBall.create(el, { shape: 'blob' })` for the ball. In React, mount any mascot through `src/app/components/Mascot.tsx`.

Unknown IDs and bad JSON fall back to idle (`02`) and emit an `error` event. `tips` is surfaced through the `tips` event.

## Project layout

```
src/engine/emotion-ball/       Grok bot ball engine
src/engine/mood-mates/         engine for Nubby and Stampy
  characters/nubby/            Nubby: shape, eyes, emotions, clips, video states
  characters/stampy/           Stampy: shape, eyes, emotions, clips, states
src/app/                       React pages and components
tests/live/live-check.mjs      end-to-end checks against a running site
```

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm build:lib
pnpm test:live http://localhost:5173
```

## License

- Engine code and emotion data: free for personal learning, commercial license available. See [LICENSE](LICENSE), [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) and [mood-mates/LICENSE](mood-mates/LICENSE).
- Ball visual design: learning only, no commercial use. See [NOTICE.md](NOTICE.md).
- Nubby and Stampy are recreated from videos by socoloffalex on X, for learning.
