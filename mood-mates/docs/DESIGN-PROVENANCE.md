# Design Provenance

> This file is the originality evidence chain for all Mood Mates visual assets: it records each character's design motivation, generation method, parameters and iteration history. Every silhouette is generated live by the parametric functions in `src/engine/mood-mates/geometry.ts`; the repository contains no hand-traced or third-party coordinate data.

## 1. Design methodology

**Date**: 2026-08-20 (first release v1.0; the same day v1.1 refinement: concept art finalized, layered pupil eyes, linked accessories, signature FX, e-commerce / finance characters replaced; the same day v1.2: four silhouettes reworked, Peachy replaced Hearty, physical rules for small-eye pupils and highlights).

**Core method**: all visual shapes = parametric geometric primitives + design parameters.

1. **Body silhouette**: generated from a radial function r(θ) (96-point sampling) or superellipse parametric curves. Primitives include bell bumps, scallop waves, cosine star weights and superellipses, all compositions of elementary mathematical functions.
2. **Eye shapes**: one unified lens (double-edge envelope) topology: a center line mid(u) plus a thickness envelope halfThick(u), 24 points each on the upper and lower edges. The 20 semantic slots (calm / smiling / wide / closed / squint / angry / scanning / listening / shy / sad and variants) are a parametric realization of the general performance language of "how eyes express emotion"; each character instantiates them with its own base parameters (width / height / roundness / tilt).
3. **Mouth shapes**: small 24-point rings with the same lens topology and 9 semantic slots (smile / grin / o / flat / frown / wavy / pout / open / dot).
4. **FX**: three particle systems (orbit / burst / emitter) in two skins (cloud puff / stardust). Particle shapes are procedurally generated primitives (circle, a miniature cloud of the same silhouette, four-point spark, five-point star, pencil). Each character has a "signature move" emitter script (cloud bubbles / star burst).
5. **Eye layering (v1.1)**: pupil eye = the eyelid lens ring as a clipPath + sclera / iris (radial-gradient circle) / pupil / fixed-light highlights in layers. The closed feel is decided by the outline's real thickness ("shoelace area ÷ width"); below the threshold it switches to a dark lash line. Everything is geometric construction with no image assets.
6. **Tooling**: `mood-mates/tools/ring-editor.html`, the parametric editor shipped with this repository (a React page in `src/app/pages/RingEditorPage.tsx`). Design iteration is parameter tuning; the final parameters are written straight into the character data file and can be reproduced at any time.
7. **Concept art (v1.1)**: before production, high-end 3D-style concept sketches were generated with a text-to-image tool to set the tone (kept in the repository's assets record), then approximated with parametric geometry for silhouette and palette. Concept art served only as an internal mood reference; the final assets are all parameter-generated.

**Independence statement**: the code of this project (state machine, spring interpolation, spherical projection, config registry) and its visual assets (all geometry generation parameters, palettes, accessory paths) are independent creations that do not reference, copy or trace the specific expression of any third-party artwork. "Cartoon characters that make expressions" is a general idea not protected by copyright; this project's specific expression (silhouette parameters, feature system, palette, accessories, FX language) is original.

## 2. Character profiles

### Nimbo (general · cloud)

- **Motivation**: the default character needs maximum approachability and a relaxed temperament; the half-a-beat-behind personality is realized through emotion overrides (idle rotation every 12–20 s). Concept finalized: misty-blue lavender scheme.
- **Body**: `{ type:'cloud', r:0.94, lobes:7, amp:0.08, flat:0.12 }`. An odd 7-lobe scallop avoids stiff symmetry, and the flattened bottom makes it look like a cloud sitting down.
- **Eyes**: bean eyes; the crescent feel comes from bend 0.1 + tilt -2; gloss 0.2 (matte cloud, weakened glaze).
- **Color**: misty-blue lavender #B4C6EE.
- **Signature move**: cloud bubbles. A click blows out cloud bubbles at varied distances in one breath, repeated clicks change sector; near bubbles pop first, far ones later. Celebration is not a gallery emotion. Light solid bubbles are lighter than the cloud body, and sketch mode switches to ink outlines.
- **Iteration log**: v1.0 signature was rain under the cloud; v1.5 cloud-puff bloom; v1.6 dropped the stroked arch-rainbow, orbit ribbons, halo petals and gallery `50` "Celebration"; now a click-only sector bubble blow.

### Twinkle (general · five-point star)

- **Motivation**: a "bright little teacher" temperament; a star plus round glasses balances knowledge and approachability (since v1.3 the industry label changed from education to general). Concept finalized: honey gold + gold-frame glasses.
- **Body**: `{ type:'star', r:1.02, points:5, inner:0.74, sharp:0.5 }`. An inner ratio of 0.74 keeps the star tips round and friendly.
- **Eyes**: pupil eyes (taper 0.38) + `pupil: { irisR:10, pupilR:4.8, irisColor:#7A4E2A (warm brown) }`.
- **Accessory**: autoFit round-frame glasses (`kind:'glasses'`, fit 1.3, gold frame #C9973F). Frame position and radius are derived from the eye positions and shapes; they follow the gaze at 75%, slip down on blinks and rebound, and the lenses sweep with a periodic glint.
- **Color**: honey gold #F5B93F; stardust FX (a rotating pencil joins the thinking orbit, chance 0.3).
- **Face fit**: a star has a small central area, so face sx/sy of 0.82 tightens the features.

## 3. v1.2 iteration log (2026-08-20)

This release established the eye physics rules in the shared render layer (all characters benefit):

- Bean-eye highlights hide by effective visible height (squint, scanning and sleepy eyes no longer show a white dot), and the offsets scale with the current eye ring bbox and are clamped inside the socket;
- Pupil eyes gained a small-eye tier: the iris hides below the lash line, and the pupil center is clamped by the shrunk bbox;
- The `signatureMouth` mechanism went live: while a signature plays the mouth is temporarily overridden (for example `o`) and returns to the emotion's mouth on expiry.

The same release reworked the silhouettes of four characters later retired (Drop / Flame / Peach / Piggy bank); those characters and generators were all removed in v1.3 / v1.5 and their parameters are not repeated here.

## 4. v1.3 iteration log (2026-08-20)

- **Cast trimmed**: only Nimbo and Twinkle remain. The other four characters and their replacement ideas (shopping bag / coin jar) fell short on recognizability and temperament in review and were removed together. Nimbo keeps its bean-eye + highlight design with no brows, hands or feet.
- **Smooth outline rendering**: `ringPath` in the render layer was upgraded from a polyline (L segments) to a Catmull-Rom → cubic Bézier through-point spline, so body / eye / mouth / brow outlines stay round and corner-free at any scale, with the geometric sampling parameters unchanged.
- **Spin motion**: while spinning, the body gets a slight tilt (±5°) and horizontal elastic squash (0.88–1.0), replacing the earlier "paper fold" look where only the features slid.
- **Bean-eye highlight consistency**: previously eye shapes with a visible height under 18 px always hid the highlight dot, so squinting / scanning / some small eyes had "no pupil". Now it hides only when truly closed (< 10 px) and scales proportionally across 10–26 px (minimum 0.55×); Nimbo's base highlight radius went 2.8 → 3.2, so the pupil dot reads consistently across all emotions.
- **Gallery layout**: the cast row moved from the bottom of the page to the very top, above the mode switch and group tabs (explicit grid areas for cast / head / thumbs), the same in wall and album modes, so switching characters no longer needs scrolling to the page bottom.
- **Twinkle industry type**: education → general, matching Nimbo.
- **Merged into the emotion-ball repository**: this project joined the emotion-ball repository as the `mood-mates/` subdirectory, with its own gallery site and all license files; the root ball characters keep their learning-only license and this project keeps its dual license, independently of each other.

## 4.5 v1.4 iteration log (2026-08-20)

- **Lens topology rework (eye / mouth outline quality)**: the old implementation laid points evenly in x along the upper and lower edges and joined them, producing a pair of coincident points where the thickness reaches zero at both ends; a through-point spline passing duplicate points folds visible corners, and the sampling was sparsest exactly where curvature is highest. It was rebuilt as a closed-curve parametric sampling (φ goes once around, u = (1 − cosφ) / 2): the upper and lower edges meet at a single endpoint and sampling naturally densifies toward the ends, so eye and mouth end caps are as round as an analytic capsule. The slot semantic parameters (w/h/bend/slope/taper/shift/tilt) and ring point counts are unchanged, so all emotion morphs stay compatible.
- **Body outline variant mechanism** (engine capability): a character may declare `variants = { id: { name, body } }`; a variant replaces only the body silhouette `bodyRing`, while the eye family / palette / emotion choreography stay shared; `MoodMates.create` gained a `variant` option. The gallery's "Shape" dropdown uses this entry point (the three Ball forms map to the EmotionBall `shape` option).
- **Nimbo "scalloped cloud" second outline (removed)**: five- and six-lobe deep-notch scallops in a flat sticker style were tried; five lobes collided with Twinkle's five-point star and six still fell short, so both were removed after review and Nimbo keeps the default seven-lobe fluffy cloud; the variant mechanism stays for future use.
- **Small pupil eyes no longer hide the pupil**: previously the small-eye tier (effective openness 0.26–0.45) hid the pupil along with the highlights and left only the iris, so Twinkle's squint / scanning emotions lost "the darkest pupil dot". The pupil and iris now move together and shrink in proportion to openness (minimum 0.6×); only the white highlights hide in the small-eye tier; the lash-line tier (< 0.26, truly closed) is unchanged.
- **Twinkle brows removed**: the short bars above the frames, combined with pupil eyes and glasses, made the face too dense; lid openness / gaze / mouth already express the emotion, and removing them suits the minimalist design language better.
- **Sketch mode draws no mouth**: tracing the closed mouth ring in sketch mode produced irregular small circles; a center-line arc was tried, and the final review decided sketch mode keeps only the body outline and eyelid lines with no mouth, closer to a hand-drawn draft.
- **Click celebration combo `celebrate()`**: a single signature move felt thin as click feedback, so an engine method now packages "signature + random spin or bounce + confetti" into one celebration, on the same scale as the Ball's ribbon + fireworks; idle antics still use the lightweight signature and are unaffected.
- **Sketch stroke follows the page theme**: the sketch stroke used to be the darkened body / pupil color, which is nearly invisible on dark pages. It now prefers the page CSS variable `--sketch-ink` (light ink on dark pages, dark ink on light pages) and falls back to the old logic when the variable is missing, keeping the engine free of site coupling while the host page defines the variable.

## 4.6 v1.5 iteration log (2026-08-21)

- **Nimbo signature replaced**: rain under the cloud → cloud-puff bloom. Rain was too quiet and single-direction as click feedback; a "rainbow swallow" (spiral inhale + ribbon rainbow) was tried midway, but fitting the mouth to every emotion's mouth shape was costly and it suited the character poorly. The final cloud-puff bloom pops a ring of small clouds around the body with elastic overshoot, sways upward, with air ripples and glints. All particles anchor to the body center plus live body offset, so they follow correctly during bounce / spin / any emotion and do not depend on the mouth shape. The rain / rainbow skins were removed.
- **Dead-code cleanup for final delivery**: removed body generators no character uses (drop / flame / bag / shield / heart / peach / pig, keeping only cloud / star and the generic extension point puff), FX skins (bubbles / embers / hearts / coins), accessory builders (snout / coinslot / limbs), and unused industry keys in the site strings; the engine default skin is now cloudpuff. Engine capabilities follow "what active characters use + generic extension points", with no dangling features.
- **Shape dropdown leftover fix**: a retired variant id left in local storage (such as scallop) made the select match no option and show blank; it is now validated on fill and falls back to the default shape.
- **Hero composition**: the half-masked sketch character was enlarged (720 → 880 px) and lowered by 7%, showing only the brows and above, with a bottom-edge fade divider for more focus.

## 4.7 v1.6 iteration log (2026-08-24)

- **Nimbo signature replaced**: cloud-puff bloom → cloud bubbles. The stroked arch-rainbow, orbit ribbons, halo petals and gallery `50` were all dropped. A click blows same-silhouette cloud bubbles first to the right, then to the left; they float and pop one by one without switching the emotionId.
- **Gallery light mist background**: drawn on `.gallery`'s own background, stacking a few offset ellipses outward from the gallery center to form an irregular mist. It avoids `::before` / `isolation` / child z-index so dropdowns, the stage modal and the top bar do not get stacked wrongly.

## 4.8 v1.7 iteration log (2026-08-25)

- **Cloud bubbles leave the frame**: a CSS `filter` on the stage SVG clipped particles outside the viewBox; the shadow now goes on the body group `.mm-body`. Landing spots extrapolate from the silhouette half-width, and six staggered bubbles blow toward the upper right.
- **Theme adaptation**: light solid bubbles are lighter than the cloud body with thinner outlines; in sketch mode (including the half-masked hero character) bubbles / sparks use `--sketch-ink` strokes with no highlight fill.
- **Blow rhythm**: one sector per breath, far first then near; flight uses absolute durations (far bubbles fly longer, not the same tension). Near bubbles pop first, far ones later. Repeated clicks change sector, and fast clicking spreads to left, right and top.

## 4.9 v1.8 iteration log (2026-08-25)

- **Sketch is a display switch**: `setStyle({ sketch })` is written after face overlays / transitions instead of lerping with keyframes. Celebrations that change the body color no longer write strokes into SVG attributes; turning sketch off clears both attributes and styles, leaving no temporary sketch on solid bodies.
- **Album selection strip**: the horizontal strip has side padding and the selected item uses the shared accent ring; centering scroll is computed from viewport rects, the same for all three characters.

## 4.10 v2.0 iteration log (2026-10-16)

- **Technology migration**: the engine and sites were migrated from global-script JavaScript to strict TypeScript ES modules with a React / Vite front end. Geometry generation, parameters, palettes, emotion data and FX scripts were ported without changing values; the engine output was verified byte-identical to the previous implementation across every character, variant and emotion, so the originality record above is unaffected.
- **Single language**: all user-visible text, engine messages and data names are English only; the previous bilingual `en` objects were flattened into `name` / `desc`.
- **Ring editor repaired**: the editor listed body generators removed in v1.5 (drop / flame / heart / peach / pig / bag / shield) and failed on load; it now offers the generators that exist (cloud / star) and all three tabs work.

## 5. Shared emotion base

The 32 emotion choreographies (`src/engine/mood-mates/data/emotions.ts`) use this project's self-developed three-layer config format: "eye pool + animation primitives + keyframe sequences", with durations, amplitudes and frequencies tuned one by one as performance design. Eye shapes reference semantic slots rather than concrete geometry, and colors reference @tokens rather than concrete values, so the same choreography takes on each character's own look and palette.

## 6. Adding characters later

When adding a character, append a profile section to this file with: motivation, body parameters, eye parameters, palette, accessory notes and an iteration log (with dates). This is required to keep the originality evidence chain current, and is part of the `docs/CHARACTER-DESIGN.md` specification.
