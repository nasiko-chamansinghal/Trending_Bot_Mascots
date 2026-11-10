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

## Build your own mascot from one image

<div align="center">

**Bring one picture. Get a fully animated 3D mascot.**

Smooth edges, a real gradient, a body that turns in 3D and all 44 emotions, built by Claude from your image alone.

</div>

> [!TIP]
> This is how Ghosty, Bloom and Hexo were made. You need Claude Code, this repo and one image.

**1. Set up the repo**

```bash
pnpm install
pnpm dev
```

**2. Open the repo in Claude Code** and drag your image into the prompt box.

**3. Paste this prompt and send it**

```text
Build one new mascot for this repo (Mascot Studio: Vite + React + TypeScript) from the image I attached.
It must match the image's silhouette, colours and eye position exactly, look fully 3D with smooth edges and a gradient, and support every emotion the repo already has.

First read src/engine/mood-mates/characters/rim.ts and one finished example: characters/ghosty (traced outline) or characters/hexo (simple geometric shape). Copy their patterns and do not guess any API. Before coding, tell me in two lines what you see: shape, body colour, eye colour, eye positions.

1. Silhouette: trace it from the image pixels, never by eye. With Playwright (already installed, channel 'chrome'), draw the image on a canvas, mask the character (ignore background and alpha), take its centroid, and cast 240 rays at equal angles from +x going clockwise on screen (y down). Store each ray's farthest character pixel divided by the largest radius in characters/<id>/radii.ts. Re-trace and compare to prove it matches. Simple shapes (hexagon, rounded square) can use roundedOutline instead.
2. Smooth: radialRing(radii, 100), then smoothContour or the windowed smoothing in ghosty/bloom until there are no dips, wiggles or flat tips that the image does not have.
3. 3D: rimSpec({ ring, unit: 100, depth, puff, sigma, edge, tint, scale, center }). Start from depth 0.6-0.8, puff 2.2-2.4, sigma 30-40, scale 66-80 and center [120,124], so the body fills about 70% of the 240 view.
4. Gradient: tint { top: [lighter, 0.5], bottom: [deeper, 0.55] }. Same hue family, lighter and warmer on top, deeper and richer at the bottom, like the other characters.
5. Eyes: rimEyes anchored at the image's eye position, converted into the 240 view (offset from the centroid divided by the max radius, times scale). Start from ghosty's values. Eyes must stay inside the body at every turn angle.
6. Emotions: rimCharacter gives all 44 emotions (sleep, moods, AI states, effects) for free. Fill palette(...) with state colours in the same hue family (blush pink, angry red, off grey). If I attached an expression sheet, match those eye shapes too.
7. Register: add the import and characters.register(...) in src/engine/mood-mates/index.ts. The studio picks it up on its own.
8. Verify with scratch scripts in /tmp against pnpm dev, and delete them afterwards: a contact sheet of all emotions; the body turned from -70 to 70 degrees; recolouring with the studio swatches (Rose, Sky, Pale pink, Grey) and Reset; eyes inside the outline; then pnpm typecheck && pnpm lint && pnpm build && pnpm build:lib. Show me the images and numbers. Do not say done without them.

Rules: no click animations unless I ask. Do not change existing characters or shared engine files; if one needs changing, stop and ask me. Match the existing code style. Add the character's card to this README and its screenshot to docs/screenshots/<id>.png, then commit it all as one commit.
```

**4. Open `http://localhost:5173/`.** Your character is in the picker, with every emotion ready.

<details>
<summary><b>Tips for a better result</b></summary>

- Use one character per image, front view, on a plain or transparent background, with both eyes visible.
- Want custom expressions? Attach a second image of the expressions you want and the prompt will match those eye shapes.
- Want click animations? Add "also build three click animations" to the prompt. Without it, the character gets the body animation only.
- Not happy with a detail? Say so in plain words, for example "smooth the dip on the left side" or "make the top lighter".

</details>

## Mascot Studio

A React app for trying every mascot before you wire one into your product.

- **Customise:** pick a character, an eye colour and any of its emotions, and recolour the body.
- **Design:** build your own mascot in the browser. Start from a template (blob, squircle, polygon, star, flower, ghost, drop), then sculpt the outline, size, thickness, gradient and eyes with live preview. Every design gets all the built-in emotions, shows up in Customise and Animation, exports as PNG/SVG, and can be saved or loaded as a `.mascot.json` file. Designs live in your browser's localStorage, so no account is needed.
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
- Every character shares the same emotion IDs, so one mapping works for all of them. Open the studio to browse them.

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
