<div align="center">

# Trending Grokbot Mascots

**Animated SVG mascots for AI assistants.**
Your AI picks one emotion with a single `emotionId`. The mascot does the rest.

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Characters](https://img.shields.io/badge/characters-9-f97316)

<img src="docs/screenshots/studio-light.png" alt="Mascot Studio in light mode, showing the Ghosty mascot with its character and emotion pickers" width="880">

</div>

## Meet the mascots

<table align="center">
  <tr>
    <td align="center"><img src="docs/screenshots/ball.png" alt="Ball" width="170"><br><b>Ball</b><br><sub>44 emotions</sub></td>
    <td align="center"><img src="docs/screenshots/nubby.png" alt="Nubby" width="170"><br><b>Nubby</b><br><sub>53 emotions</sub></td>
    <td align="center"><img src="docs/screenshots/stampy.png" alt="Stampy" width="170"><br><b>Stampy</b><br><sub>51 emotions</sub></td>
    <td align="center"><img src="docs/screenshots/pumpkin.png" alt="Pumpkin" width="170"><br><b>Pumpkin</b><br><sub>56 emotions</sub></td>
    <td align="center"><img src="docs/screenshots/woody.png" alt="Woody" width="170"><br><b>Woody</b><br><sub>44 emotions</sub></td>
    <td align="center"><img src="docs/screenshots/peaky.png" alt="Peaky" width="170"><br><b>Peaky</b><br><sub>44 emotions</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/ghosty.png" alt="Ghosty" width="170"><br><b>Ghosty</b><br><sub>44 emotions</sub></td>
    <td align="center"><img src="docs/screenshots/bloom.png" alt="Bloom" width="170"><br><b>Bloom</b><br><sub>44 emotions</sub></td>
    <td align="center"><img src="docs/screenshots/hexo.png" alt="Hexo" width="170"><br><b>Hexo</b><br><sub>44 emotions</sub></td>
  </tr>
</table>

| Mascot | Engine | What makes it special |
| --- | --- | --- |
| Ball | `src/engine/emotion-ball` | The Grok bot ball, with blob, wedge and gem shapes |
| Nubby | `src/engine/mood-mates` | A stair-stepped block on stubby legs, 9 video states, Peekaboo Pop and Marble Eyes click animations |
| Stampy | `src/engine/mood-mates` | A perforated postage stamp, 6 video states, corner peel and card flip click animations |
| Pumpkin | `src/engine/mood-mates` | A carved pumpkin that turns like a 3D head, its eyes wrap around the curve, 8 click animations |
| Woody | `src/engine/mood-mates` | An orange wooden slab with raised arms and cut-notch eyes, a different arm pose for every emotion, Wave, Cheer and Timber click animations |
| Peaky | `src/engine/mood-mates` | A pink-to-peach mountain with a three-peak crown, built as a soft pillow-shaped 3D solid, Rumble, Survey and Wring click animations |
| Ghosty | `src/engine/mood-mates` | A white-and-lavender ghost leaning like a tilted teardrop, with a tail of three soft lobes, built as a smooth 3D solid |
| Bloom | `src/engine/mood-mates` | An orange flower with eight petals of different lengths, two tall ones leaning up, built as a puffy 3D solid |
| Hexo | `src/engine/mood-mates` | A glossy dark rounded hexagon with bright eyes, built as a chunky 3D solid |

The emotion counts are what Mascot Studio shows for each character.

## Mascot Studio

A React app for trying every mascot before you wire one into your product.

- **Customise:** pick a character, an eye colour and any of its emotions, and recolour the body.
- **Animation:** build a timeline of 2-second clips and play it back.
- **Export:** download a PNG or SVG, or copy the image or the SVG code to the clipboard.
- **Themes:** light and dark.

<div align="center">
<img src="docs/screenshots/studio-dark.png" alt="Mascot Studio in dark mode with Woody selected" width="440">
<img src="docs/screenshots/animation-dark.png" alt="The Animation tab with the clip timeline" width="440">
</div>

## Quick start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173/`. You need Node `^20.19.0` or `>=22.12.0`.

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

- `MoodMates.create` takes `character`: `nubby`, `stampy`, `pumpkin`, `woody`, `peak`, `ghosty`, `bloom` or `hexo`.
- For the ball, load `dist-lib/emotion-ball.iife.js` and call `EmotionBall.create(el, { shape: 'blob' })`.
- In React, mount any mascot through `src/app/components/Mascot.tsx`.
- Unknown IDs and bad JSON fall back to idle (`02`) and emit an `error` event.
- `tips` is surfaced through the `tips` event.

### Emotion IDs

Every character shares the same ID ranges, so your AI can use one mapping for all of them.

| IDs | Group | Examples |
| --- | --- | --- |
| `00`–`07` | Sleep and wake | Sleeping, Waking, Idle, Curious |
| `10`–`21` | Moods | Happy, Puzzled, Surprised, Angry |
| `30`–`41` | AI states | Thinking, Listening, Searching, Done, Error |
| `60`–`71` | Effects | Alert, Notification, Rocket Blast Off, Love Strike |

Some characters add their own IDs on top, for example Pumpkin's `44` Giggle and `47` Pumpkin Show. Open the studio to browse all of them.

## Project layout

```
src/engine/emotion-ball/       Grok bot ball engine
src/engine/mood-mates/         engine for Nubby, Stampy, Pumpkin, Woody, Peaky, Ghosty, Bloom and Hexo
  characters/<name>/           one folder per character: shape, eyes, emotions, clips
  characters/rim.ts            shared recipe for outline-based 3D characters (Peaky, Ghosty, Bloom, Hexo)
  solid/                       shared 3D solid renderer (slabs, limbs, inflated outlines)
src/engine/shared/             code shared by both engines
src/app/                       Mascot Studio (React): App, components, export, theme
src/styles/app.css             the studio's styles, light and dark tokens
docs/screenshots/              images used in this README
```

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm build:lib
```

## Credits

Nubby and Stampy are recreated from videos by socoloffalex on X, for learning.
