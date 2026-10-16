# Character Design Guide

> A complete guide to creating a new Mood Mates character from scratch. A character is one self-contained pure-data file; no engine code needs to change.

## 1. Character data schema

A character is a typed object (`CharacterRaw` in `src/engine/mood-mates/types.ts`) in its own file under `src/engine/mood-mates/characters/`, registered from `src/engine/mood-mates/index.ts`:

```ts
import type { CharacterRaw } from '../types';

export const puffy: CharacterRaw = {
  id: 'puffy',                     // unique ID (lowercase letters)
  name: 'Puffy',                   // display name
  industry: 'general',             // general / custom (add the label in the gallery's industry map)
  desc: 'One-line character intro',

  // 1. Body silhouette: parametric generator descriptor (see "Body generators")
  body: { type: 'puff', r: 0.96, waves: [{ k: 6, amp: 0.05 }] },

  // 2. Face fit: overall offset and scale of the features on the silhouette
  //    x/y translate; sx/sy scale the eye placement; eye is the eye size factor
  face: { x: 0, y: 6, sx: 1, sy: 0.96, eye: 1 },

  // 3. Palette: body main color + states for semantic colors (emotion data references them as @tokens)
  palette: {
    body: '#8AD6C8',
    eye: '#25333B',                // eye color (@eye)
    eyeHighlight: '#FFFFFF',
    blush: '#F0A8A8',
    mouth: '#31424B',              // falls back to the eye color
    zzz: '#8FB5AC',                // sleep letter particles
    fx: ['#7FD8CE', '#9BC7F0'],    // optional: override the FX skin colors
    states: {
      base: '#8AD6C8',             // @base resting
      dim: '#7CB4A9',              // @dim low / sleeping
      soft: '#98E0D2',             // @soft gentle / happy
      blush: '#EFB9BC',            // @blush flushed
      angry: '#E5705F',            // @angry red
      alert: '#E25B5B',            // @alert error warning
      off: '#93AFA8',              // @off halted
    },
  },

  // 4. Eye style: sets the "look" of the 20 semantic eye-shape slots
  eyeStyle: {
    dx: 30,       // distance from eye center to the face midline
    cy: 102,      // eye center y (head center is 120)
    w: 25, h: 33, // eye width / height
    taper: 0.42,  // end taper: 0.3 rounded-rect feel ~ 1.2 very pointed ends
    tilt: 0,      // overall tilt in degrees (positive = outer high, inner low)
    bend: 0.02,   // center-line bend (positive = arched up)
    highlight: { dx: 4, dy: -7, r: 3.2 },  // bean-eye highlight dot, null disables

    // Optional pupil eyes: providing `pupil` switches from bean eyes to a layered eyeball.
    // The eyelid lens ring becomes a clipPath and the sclera / iris / pupil / highlights render inside it:
    // - closed / blinking / smiling eyes switch to a dark lash line, so the pupil never shows outside a closed eye
    // - when looking, the pupil slides further inside the socket (50% more than the eyelid)
    // - highlights stay fixed (the light source does not move) and do not rotate with the eyeball
    pupil: {
      irisR: 11,               // iris radius
      pupilR: 5.2,             // pupil radius
      irisColor: '#23424E',    // iris color (radial gradient generated automatically)
      socket: '#FFFFFF',       // sclera color
      highlights: [            // fixed-light highlights (several allowed; dx mirrors between eyes)
        { dx: -3.6, dy: -4.4, r: 3.4 },
        { dx: 4.2, dy: 2.8, r: 1.5, opacity: 0.65 },
      ],
    },
  },

  // 4b. Custom outline sets (optional): outlines beyond the 20 semantic slots for specific emotions.
  //     eyeShapes use raw lens params (w/h/bend/slope/taper/shift/tilt),
  //     mouthShapes use raw mouthLens params (w/h/bend/taper);
  //     reference them by name from emotion overrides afterwards
  eyeShapes: {
    delight: { w: 28, h: 15, bend: 0.7, taper: 1.3 },
  },
  mouthShapes: {
    bigGrin: { w: 20, h: 9, bend: -0.35, taper: 0.5 },
  },

  // 5. Facial features
  features: {
    mouth: { w: 25, dy: 33 },                                     // mouth width / vertical position; false disables
    blush: { dx: 42, dy: 22, rx: 11, ry: 6.5, max: 0.85 },        // true uses defaults; false disables
    brows: { w: 15, h: 3.2, dx: 30, dyTop: -26, always: false },  // false disables
    // linked accessory components (see "4. Linked accessories")
    accessories: [
      { kind: 'glasses', color: '#C9973F', fit: 1.3 },
      { kind: 'path', layer: 'back', d: 'M...', fill: '...', micro: { type: 'float', amp: 1.6, period: 3000 } },
    ],
  },

  // 6. FX skin (including the signature move):
  //    cloudpuff = cloud bubbles blown at varied distances, repeated clicks change sector /
  //    stardust = star burst + a pencil in the thinking orbit.
  //    A skin may set signatureMouth: the mouth is overridden while the signature plays, then returns to the emotion's mouth
  fxSkin: 'cloudpuff',

  // 7. Emotion overrides (optional): shallow-merged over the shared base by emotion ID;
  //    pool / mouth may reference the custom outline names from 4b
  emotions: {
    '02': { antics: false, poolMs: [14000, 22000] },
    '21': { pool: ['delight'] },
    '33': { body: { spinFx: 0, confetti: 0.8 }, mouth: 'bigGrin' },
  },
};
```

Register it in `src/engine/mood-mates/index.ts` (`characters.register(puffy)`), after the existing characters.

## 2. Body generators

All generators live in `src/engine/mood-mates/geometry.ts` and output a 96-point closed ring. Tune them visually in the ring editor (`pnpm dev`, then open `/mood-mates/tools/ring-editor.html`) and copy the descriptor into the character file.

| type | Silhouette | Key parameters |
| --- | --- | --- |
| `cloud` | Scalloped cloud | `lobes` petal count, `amp` wave amplitude, `flat` flattened bottom |
| `star` | Rounded star | `points` point count, `inner` inner radius ratio, `sharp` sharpness |
| `puff` | Harmonically perturbed circle | `waves: [{k, amp, phase}]` (free primitives, a starting point for derivatives) |

**Overflow check**: the viewBox is 0 0 240 240, the head center is 120 and the base radius is 104. `r × 104 × (1 + max bulge)` must not exceed 118, or the top of the silhouette leaves the frame.

## 3. Eye-shape semantic slots

The emotion base references eye shapes by slot name, and each character realizes them with its own `eyeStyle`. The 20 slots:

- Calm: `calm` `calm2`
- Smiling: `happy` `happy2`
- Wide open: `wide` `wide2`
- Closed: `closed` `closed2` `sleepy`
- Squint: `squint` `squint2`
- Angry: `angry` `angry2`
- Scanning: `scan` `scan2` `scan3`
- Listening: `listen` `listen2`
- Shy: `shy` · Sad: `sad`

The 9 mouth slots: `smile` `grin` `o` `flat` `frown` `wavy` `pout` `open` `dot`.

A character's temperament is mostly set by four `eyeStyle` parameters: `taper` (round ↔ sharp), `tilt` (innocent ↔ shrewd), `bend` (flat ↔ crescent) and the `w/h` ratio (alert ↔ dopey).

## 4. Linked accessories

Accessories are not static decals. They are components with anchor bindings and micro-motion (`src/engine/mood-mates/features.ts`):

| kind | Description | Linked behavior |
| --- | --- | --- |
| `glasses` | Round-frame glasses | **autoFit**: the frame centers and radii are derived from the character's real eye positions and shapes (`fit` scales them); follows the gaze at 75% (the eyeballs slide inside the lenses for parallax); the frame slips down and rebounds on blinks; the lenses sweep with a periodic glint (`glintPeriod`) |
| `path` | Custom path | `anchor: 'face'` projects onto the face / `'abs'` uses body coordinates; `micro: { type: 'float' \| 'swing', amp, period }` adds micro-motion |

All accessories are authored in body coordinates (240 × 240, center 120) and follow body breathing / tilt / bounce. `layer: 'back'` renders behind the body (handles, wings) and `layer: 'front'` renders above the features (glasses, badges).

Actual eye position: x = 120 ± eyeStyle.dx × face.sx, y = 120 + face.y + (eyeStyle.cy − 120) × face.sy.

## 4b. Physical-correctness rules

The engine already enforces these rules. Do not break them when designing new characters or emotions:

1. **Closed eyes never show a pupil**: the closed feel of a pupil eye is decided by the outline's real thickness (shoelace area ÷ width) × openness. `effOpen < 0.26` switches to a dark lash line; `0.26–0.45` is the small-eye mode (pupil and iris shrink in proportion to openness, only the white highlights hide, and the darkest pupil dot stays visible). A custom `eyeShapes` entry that expresses "closed / squint" gets the lash effect automatically if you make it thin;
2. **Features follow the gaze in a gradient**: when the eyes look somewhere, the pupil travels 50% extra, the brows follow 80%, the glasses 75%, the mouth 35% and the blush 25%. The layering creates depth; new accessories should follow the same gradient;
3. **Closing chain reaction**: when blinking or closing, the brows relax downward and the glasses slip and rebound. Bean-eye highlights hide by **effective visible height** (the smaller of bbox height and outline thickness × open × scaleY, roughly below 18 px), not just `open < 0.35`;
4. **Highlights and pupils stay in the socket**: bean-eye highlight offsets scale with the current eye ring bbox relative to the default bbox and are clamped so the dot center stays at least one radius from the edge; the pupil center is clamped to the current eye bbox shrunk by `pupilR` (the iris constraint is looser), so the lid never crops the pupil into a crescent;
5. **Hidden when facing away**: all face-attached features and accessories share one longitude projection and hide automatically when the character spins to its back.

## 5. Personality = data

Express personality with emotion overrides, without touching code:

- **Steady** (finance): `antics: false`, longer `poolMs`, halved animation `amp`, longer `period`;
- **Restless** (games): shorter `poolMs`, larger `amp`, brows always visible;
- **Slow-paced**: raise the idle glance `period` to 6000+;
- **Celebration style**: clicks go through `celebrate()` (Nimbo blows cloud bubbles without stacking spin or confetti; Twinkle still does signature + limbs + confetti). The gallery's `'33'` `spinFx` / `confetti` only apply when entering that emotion; they are not the click celebration;
- **Distinctive emotion faces**: `pool` / `mouth` can reference custom `eyeShapes` / `mouthShapes` outlines, giving key emotions one-of-a-kind features.

## 6. Launch checklist

1. Finish tuning in the ring editor; the silhouette must not overflow or self-intersect;
2. Eyeball the six base states: 02 Idle / 10 Happy / 14 Shy / 21 Angry / 30 Thinking / 33 Done;
3. Fill in all 7 palette states (missing ones fall back to the body color, so anger would not turn red);
4. Register the character in `src/engine/mood-mates/index.ts`, after `engine`'s own imports;
5. **Append a character profile to `docs/DESIGN-PROVENANCE.md`** (motivation, parameters, date, iteration log), as the originality evidence chain requires;
6. Compare the silhouette against the existing characters to be sure none look alike, and that none resembles any well-known third-party character.
