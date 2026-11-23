---
name: mascot-studio
description: Add an animated Mascot Studio mascot ({{CHARACTER_COUNT}} ready-made characters, the Grok-style Ball, or a custom mascot from the studio's Design tab) to any web frontend, including React, Next.js, Vue, Svelte, Angular and plain HTML, and drive its {{EMOTION_COUNT}} emotions from app state or AI replies. Use when the user wants a mascot, animated character, bot avatar or expressive face on a site or app, wants one to follow the cursor or react to loading, thinking, success and errors, or pastes a Mascot Studio embed snippet or .mascot.json design.
---

# Mascot Studio mascots

Mascot Studio ({{SITE_URL}}) makes animated SVG mascots for AI products. Each mascot is drawn live by a small JavaScript engine: it breathes, blinks, looks at the cursor, falls asleep when idle and switches between {{EMOTION_COUNT}} emotions on command. Every character shares the same emotion IDs, so one mapping works for all of them.

Two script-tag libraries, served by the studio (engine version {{VERSION}}):

| Library | Global | Use for |
| --- | --- | --- |
| `{{SITE_URL}}/mood-mates.js` | `MoodMates` | All {{CHARACTER_COUNT}} characters and custom Design-tab mascots |
| `{{SITE_URL}}/emotion-ball.js` | `EmotionBall` | The Ball only (shapes: {{BALL_SHAPES}}) |

## How to work

1. **Look at the project first.** Read `package.json` and the layout to learn the framework, whether it renders on the server (Next.js, Nuxt, SvelteKit, Remix, Astro) and where the mascot should go (hero, chat header, empty state, corner companion).
2. **Pick the character.** If the user did not name one, ask, or suggest a few from [references/characters.md](references/characters.md) that suit the brand, and point them at {{SITE_URL}}/#customise to browse. Any character can be recoloured with `color` and `eyeColor`. If they pasted a studio embed snippet or a `.mascot.json` file, use exactly that.
3. **Decide where the library comes from.** For a prototype, load it from `{{SITE_URL}}`. For production, download it into the app's static folder so the mascot does not depend on the studio staying online (see *Self-hosting* below), and tell the user you did.
4. **Mount it the framework's way**: create on mount, `destroy()` on unmount, give the container an explicit width and height, and never run it on the server. Recipes for each framework are in [references/frameworks.md](references/frameworks.md).
5. **Wire emotions to real app state** with the table below, rather than leaving it on idle.
6. **Verify.** Run the app, open the page, and check that an `svg.mm-svg` (Mood Mates) appears inside the container with no console errors, that it reacts when the state changes, and that only one mascot exists after hot reloads and React StrictMode double mounts.

## Quick start (any HTML page)

```html
<div id="mascot" style="width:200px;height:200px"></div>
<script src="{{SITE_URL}}/mood-mates.js"></script>
<script>
  var bot = MoodMates.create(document.getElementById('mascot'), {
    character: '{{EXAMPLE_CHARACTER}}',
    emotion: '02',
    idle: true
  });
  bot.setEmotion('{{HAPPY_ID}}');
</script>
```

- `character`: one of {{CHARACTER_IDS}}.
- `color` / `eyeColor`: optional hex colours to recolour the body and eyes; the body keeps its gradient.
- `idle: true`: after 60 s without a new emotion it goes to standby, and after 3 min it falls asleep. Pass `{ standbyAfter, sleepAfter }` in ms to change that, or leave `idle` out to keep it awake.
- The Ball uses `EmotionBall.create(el, { shape: 'blob', emotion: '02' })` from `emotion-ball.js` and takes the same emotion IDs.

## Driving emotions

```js
bot.setEmotion('{{THINKING_ID}}');                          // one emotion
bot.startTour(['{{HAPPY_ID}}', '{{THINKING_ID}}', '{{DONE_ID}}'], 2000);         // cycle through several, 2 s each; bot.stopTour() ends it
bot.handleAIMessage('{"emotionId":"{{THINKING_ID}}","tips":"thinking"}'); // JSON string or object from your AI
bot.on('change', ({ id, def }) => {});          // also 'tips' ({ text }) and 'error' ({ message })
```

Unknown IDs and malformed JSON fall back to Idle (`02`) and emit `error`, so a bad AI reply never breaks the page.

Map app state to emotions like this (the full list of {{EMOTION_COUNT}} is in [references/emotions.md](references/emotions.md)):

{{STATE_TABLE}}

**Letting an AI choose the emotion.** Add this to the system prompt of the model behind a chat, then pass its JSON to `bot.handleAIMessage(...)`:

```text
With every reply, also return {"emotionId": "<id>", "tips": "<2-4 words>"} choosing the emotion that fits your reply:
{{PROMPT_EMOTIONS}}
```

## Cursor, clicks and cleanup

```js
// Look at the cursor (values from -1 to 1 relative to the mascot's box).
const onMove = (e) => {
  const r = el.getBoundingClientRect();
  const clamp = (v) => Math.max(-0.6, Math.min(0.6, v)) / 0.6;
  bot.setGaze(clamp((e.clientX - (r.left + r.width / 2)) / r.width), clamp((e.clientY - (r.top + r.height / 2)) / r.height));
};
window.addEventListener('pointermove', onMove, { passive: true });
document.addEventListener('pointerleave', () => bot.clearGaze());

el.addEventListener('click', () => bot.celebrate ? bot.celebrate(0.8) : bot.spin(1)); // a little reaction

// When the mascot leaves the page:
window.removeEventListener('pointermove', onMove);
bot.destroy();
```

## Custom mascots from the Design tab

A mascot designed at {{SITE_URL}}/#design is a small JSON object. The studio's **Copy embed code** button gives a ready snippet; **Download design** gives a `.mascot.json` file. Register it, then create it like any character:

```js
const id = MoodMates.registerDesign(designJson); // the parsed .mascot.json; returns the character id, or null if invalid
const bot = MoodMates.create(el, { character: id, emotion: '02', idle: true });
```

## Self-hosting (recommended for production)

```bash
mkdir -p public/mascot
curl -fsSL {{SITE_URL}}/mood-mates.js -o public/mascot/mood-mates.js
```

Then load `/mascot/mood-mates.js` instead of the studio URL. The file is self-contained (about 160 KB gzipped) and has no dependencies. Use `emotion-ball.js` the same way for the Ball.

## Rules that prevent the usual bugs

- **Scripts inside JSX never run.** In React and Next.js, load the library with a `<script>` element you append yourself, or `next/script`, and create the mascot in an effect. Never paste the HTML snippet into JSX.
- **Always `destroy()` on unmount**, or StrictMode and hot reload leave two mascots.
- **No server rendering of the mascot.** Guard with `'use client'` or an effect in Next.js, `onMounted` in Vue and Nuxt, `onMount` in Svelte, or `afterNextRender`/`ngAfterViewInit` in Angular.
- **Give the container a size.** The mascot fills its container; a zero-height div shows nothing.
- **Content Security Policy:** allow the script's origin (`script-src`) when loading from the studio.
- Respect `prefers-reduced-motion` if the site does: show a still pose with `autostart: false` (it draws once and stays still) and skip `startTour`.

## Static images instead of a live mascot

When the user only needs a picture (an email, a README, a slide), the studio exports PNG, SVG, GIF, MP4 and a labelled sheet of every emotion from the **Export** menu at {{SITE_URL}}. Use those files instead of the library.

## Reference

- [references/characters.md](references/characters.md): every character id, name and look, and the extra click animations some have.
- [references/emotions.md](references/emotions.md): all {{EMOTION_COUNT}} emotion IDs with what each looks like.
- [references/frameworks.md](references/frameworks.md): React, Next.js, Vue, Nuxt, Svelte, Angular and vanilla recipes.
- [references/api.md](references/api.md): every option, method and event, with TypeScript types.
