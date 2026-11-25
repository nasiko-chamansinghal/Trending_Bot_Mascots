<div align="center">

# Trending Bot Mascots

**Animated 3D mascots for AI assistants.**
Your AI picks one emotion with a single `emotionId`. The mascot does the rest.

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)

[Mascots](#meet-the-mascots) · [Try it](#try-it) · [Design your own](#design-your-own-mascot) · [Build one from an image](#build-one-from-an-image) · [Use in your app](#use-it-in-your-app)

<img src="docs/screenshots/studio-light.png" alt="Mascot Studio in light mode with the character and emotion pickers" width="880">

</div>

## Meet the mascots

<table align="center">
  <tr>
    <td align="center"><img src="docs/screenshots/ball.png" alt="Ball" width="150"><br><b>Ball</b></td>
    <td align="center"><img src="docs/screenshots/nubby.png" alt="Nubby" width="150"><br><b>Nubby</b></td>
    <td align="center"><img src="docs/screenshots/stampy.png" alt="Stampy" width="150"><br><b>Stampy</b></td>
    <td align="center"><img src="docs/screenshots/pumpkin.png" alt="Pumpy" width="150"><br><b>Pumpy</b></td>
    <td align="center"><img src="docs/screenshots/peaky.png" alt="Peaky" width="150"><br><b>Peaky</b></td>
    <td align="center"><img src="docs/screenshots/ghosty.png" alt="Ghosty" width="150"><br><b>Ghosty</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/bloom.png" alt="Bloom" width="150"><br><b>Bloom</b></td>
    <td align="center"><img src="docs/screenshots/hexo.png" alt="Hexo" width="150"><br><b>Hexo</b></td>
    <td align="center"><img src="docs/screenshots/ninjo.png" alt="Ninjo" width="150"><br><b>Ninjo</b></td>
    <td align="center"><img src="docs/screenshots/jelo.png" alt="Jelo" width="150"><br><b>Jelo</b></td>
    <td align="center"><img src="docs/screenshots/drip.png" alt="Drip" width="150"><br><b>Drip</b></td>
    <td align="center"><img src="docs/screenshots/flame.png" alt="Flame" width="150"><br><b>Flame</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/germy.png" alt="Germy" width="150"><br><b>Germy</b></td>
    <td align="center"><img src="docs/screenshots/spiky.png" alt="Spiky" width="150"><br><b>Spiky</b></td>
    <td align="center"><img src="docs/screenshots/mokey.png" alt="Mokey" width="150"><br><b>Mokey</b></td>
    <td align="center"><img src="docs/screenshots/inky.png" alt="Inky" width="150"><br><b>Inky</b></td>
    <td align="center"><img src="docs/screenshots/dewy.png" alt="Dewy" width="150"><br><b>Dewy</b></td>
    <td align="center"><img src="docs/screenshots/tufty.png" alt="Tufty" width="150"><br><b>Tufty</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/ember.png" alt="Ember" width="150"><br><b>Ember</b></td>
    <td align="center"><img src="docs/screenshots/cheffy.png" alt="Cheffy" width="150"><br><b>Cheffy</b></td>
    <td align="center"><img src="docs/screenshots/blaze.png" alt="Blaze" width="150"><br><b>Blaze</b></td>
    <td align="center"><img src="docs/screenshots/glowy.png" alt="Glowy" width="150"><br><b>Glowy</b></td>
    <td align="center"><img src="docs/screenshots/wispy.png" alt="Wispy" width="150"><br><b>Wispy</b></td>
    <td align="center"><img src="docs/screenshots/cheeky.png" alt="Cheeky" width="150"><br><b>Cheeky</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/blobby.png" alt="Blobby" width="150"><br><b>Blobby</b></td>
    <td align="center"><img src="docs/screenshots/fuzzy.png" alt="Fuzzy" width="150"><br><b>Fuzzy</b></td>
    <td align="center"><img src="docs/screenshots/limey.png" alt="Limey" width="150"><br><b>Limey</b></td>
    <td align="center"><img src="docs/screenshots/googly.png" alt="Googly" width="150"><br><b>Googly</b></td>
    <td align="center"><img src="docs/screenshots/bunni.png" alt="Bunni" width="150"><br><b>Bunni</b></td>
    <td align="center"><img src="docs/screenshots/bao.png" alt="Bao" width="150"><br><b>Bao</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/nimbo.png" alt="Nimbo" width="150"><br><b>Nimbo</b></td>
    <td align="center"><img src="docs/screenshots/grokky.png" alt="Grokky" width="150"><br><b>Grokky</b></td>
    <td align="center"><img src="docs/screenshots/chimpy.png" alt="Chimpy" width="150"><br><b>Chimpy</b></td>
  </tr>
</table>

<p align="center">Every mascot turns in 3D, follows your cursor and shares the same emotions. New ones are added all the time.</p>

## Try it

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173/` (Node `^20.19.0` or `>=22.12.0`). Mascot Studio has four tabs:

- **Customise:** pick a mascot, recolour it and play any emotion.
- **Design:** shape your own mascot. [More below.](#design-your-own-mascot)
- **Animation:** chain 2-second clips into a timeline and export it.
- **Agent skill:** install a skill that lets Claude Code or any coding agent add these mascots to your app. [More below.](#let-your-coding-agent-add-it)

Every tab exports a PNG, SVG, GIF or MP4 video, or a one-paste embed code.

### Emotions made for AI agents

One `emotionId` is all your AI needs to send. These are the ones agents use most:

| Moment | ID | What the mascot does |
| --- | --- | --- |
| Thinking | `30` | Glances up and away, then turns into three hopping dots |
| Working (shown as Busy) | `32` | Squints and bobs; every few seconds ribbons sweep round it |
| Done | `33` | Turns three times inside a cage of nine ribbons, then rests |
| Error | `34` | Flashes alarm red |

The ribbons always take their colour from the mascot, so recolouring a mascot recolours them too. Browse the rest in the studio.

## Design your own mascot

<div align="center">

**No code, no account. Shape it, colour it, export it.**

<img src="docs/screenshots/design-light.png" alt="The Design tab with a custom star mascot" width="800">

</div>

Open the **Design** tab, pick a template (Blob, Squircle, Polygon, Star, Flower, Ghost or Drop), then sculpt the outline, body, colours and eyes with live 3D preview. Your design gets every emotion the built-in mascots have.

<details>
<summary><b>Exports and saving</b></summary>

- **Export menu:** PNG (1024 × 1024, transparent), SVG, GIF (512 × 512) or transparent GIF, and copy image or SVG code.
- **Download video:** an MP4 (512 × 512, 30 fps) of the current emotion, or your whole Animation timeline. Needs a browser that can encode video, such as Chrome.
- **Copy embed code:** one snippet that puts the live mascot on any website.
- **Emotion sheet** and **Animated GIF** (Design tab): every emotion on one PNG, or a GIF with your own length, size and background.
- Designs are saved in your browser. **Download design** saves a `.mascot.json` file and **Import** loads it back.

<div align="center">
<img src="docs/screenshots/design-love-strike.gif" alt="A custom star mascot playing Love Strike" width="220">
</div>

</details>

## Build one from an image

Bring one picture and let Claude Code build a fully animated 3D mascot from it, with smooth edges, a gradient and every emotion.

1. Run `pnpm install && pnpm dev`, open the repo in Claude Code and drag your image into the prompt box.
2. Paste the prompt below and send it.
3. Open `http://localhost:5173/`. Your mascot is in the picker.

<details>
<summary><b>The prompt</b></summary>

```text
Build one new mascot for this repo from the image I attached. It must match the image's silhouette, colours and eye position exactly, look fully 3D with smooth edges and a gradient, and support every emotion the repo already has.

First read src/engine/mood-mates/characters/rim.ts and one finished example: characters/ghosty (traced outline) or characters/hexo (simple shape). Copy their patterns and do not guess any API. Before coding, tell me in two lines what you see: shape, body colour, eye colour, eye positions.

1. Silhouette: trace it from the image pixels, never by eye, and store the radii in characters/<id>/radii.ts. Compare a render with the image to prove it matches.
2. Smooth: no dips, wiggles or bumps that the image does not have.
3. 3D and gradient: use rimSpec with a tint that is lighter on top and deeper at the bottom, like the other characters.
4. Eyes: rimEyes anchored at the image's eye position. Eyes must stay inside the body at every turn angle.
5. Emotions: rimCharacter gives every emotion for free. Fill palette(...) with state colours in the same hue family.
6. Register it in src/engine/mood-mates/index.ts.
7. Verify in the browser and show me the images and numbers, then run pnpm typecheck && pnpm lint && pnpm build. Do not say done without them.

Rules: no click animations unless I ask. Do not change existing characters or shared engine files; if one needs changing, stop and ask me. Delete any scratch files afterwards.
```

**Tips:** use one character per image, front view, on a plain or transparent background, with both eyes visible. Not happy with a detail? Say so in plain words, such as "smooth the dip on the left side".

</details>

## Use it in your app

Build the script-tag bundles with `pnpm build:lib`, or press **Copy embed code** in the studio.

```html
<script src="dist-lib/mood-mates.iife.js"></script>
<div id="bot" style="width:200px;height:200px"></div>
<script>
  const bot = MoodMates.create(document.getElementById('bot'), { character: 'nubby', emotion: '02' });
  bot.handleAIMessage('{"emotionId":"30","tips":"thinking"}');
</script>
```

- `character` is the lowercase mascot name, such as `cheeky`. Two differ from their display names: Peaky is `peak` and Pumpy is `pumpkin`.
- The Ball uses `dist-lib/emotion-ball.iife.js` and `EmotionBall.create(el, { shape: 'blob' })`.
- Every mascot shares the same emotion IDs, so one mapping works for all of them.
- Unknown IDs and bad JSON fall back to idle (`02`) and emit an `error` event.

### Let your coding agent add it

The studio serves an agent skill, `mascot-studio`, that teaches Claude Code, the Claude apps and other coding agents to add any mascot to React, Next.js, Vue, Svelte, Angular or plain HTML, wire its emotions to app state, and clean it up properly. Install it for Claude Code with:

```bash
mkdir -p ~/.claude/skills && curl -fsSL https://trendingbotsmascots.vercel.app/skill/mascot-studio.tar.gz | tar -xz -C ~/.claude/skills
```

Then ask, for example, "add Ghosty to the chat page and show Thinking while it waits". The **Agent skill** tab has the project-level install, a `.zip` for the Claude apps, a one-line instruction for any other agent, and a ready prompt for the mascot you picked. `/llms.txt` lists everything for agents that look for it.

The skill's text lives in `skill/`. `scripts/build-skill.mjs` fills in the character and emotion lists from the engine and writes the skill, its `.tar.gz` and `.zip`, and `llms.txt` into `public/` on every `pnpm dev` and `pnpm build`, so it always matches the code. Set `SKILL_SITE_URL` to change the address it points to; on Vercel it uses the production domain.

## Credits

The ribbons, the three hopping dots and the Working and Done motion follow [Open Bot Avatar](https://github.com/DominikScholz/open-bot-avatar) (MIT). See `THIRD_PARTY_NOTICES.txt`.
