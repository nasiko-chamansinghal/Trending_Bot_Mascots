import { useEffect, useRef } from 'react';
import { Dropdown, type DropdownOption } from '../components/Dropdown';
import { Hero } from '../components/Hero';
import { Mascot } from '../components/Mascot';
import { StageZone } from '../components/StageZone';
import { ThumbZone } from '../components/ThumbZone';
import { Toast } from '../components/Toast';
import { Toggle } from '../components/Toggle';
import { Topbar } from '../components/Topbar';
import type { DefLike, EmotionConfigApi, MascotEngine } from '../engine-types';
import { EmotionBall, emotionBallConfig, MoodMates, moodMatesConfig } from '../kits';
import { usePrefs } from '../prefs';
import { type CorePrefs, useGalleryCore } from '../useGalleryCore';

interface Prefs extends CorePrefs {
  character: string;
  variants: Record<string, string>;
}

interface CharInfo {
  id: string;
  name: string;
  industry: string;
}

interface InstOptions {
  character: string;
  variant?: string;
  emotion: string;
  idle?: { standbyAfter: number; sleepAfter: number };
  label?: string;
  lite?: boolean;
  eyeScale?: number;
  autostart?: boolean;
}

const PREF_KEY = 'eg.prefs.v2';
const DEFAULTS: Prefs = {
  theme: 'dark',
  mode: 'wall',
  character: 'ball',
  sketch: false,
  tourMs: 2500,
  variants: {},
};

const BALL_CHAR: CharInfo = { id: 'ball', name: 'Ball', industry: 'learn' };
const CHARS: CharInfo[] = [
  BALL_CHAR,
  ...MoodMates.characters.list().map((c) => ({ id: c.id, name: c.name, industry: c.industry })),
];
const INDUSTRY: Record<string, string> = { general: 'General', learn: 'Learning only' };
const BASE_SHAPES: Record<string, string> = { ball: 'Round', nimbo: 'Cloud', twinkle: 'Star' };
const BALL_VARIANTS = [
  { id: 'wedge', name: 'Wedge' },
  { id: 'gem', name: 'Gem' },
];
const INTERVALS: DropdownOption[] = [
  { value: '1500', label: '1.5s' },
  { value: '2500', label: '2.5s' },
  { value: '4000', label: '4s' },
];
const IDLE = { standbyAfter: 60000, sleepAfter: 180000 };

function getChar(id: string): CharInfo | undefined {
  return CHARS.find((c) => c.id === id);
}

function configOf(id: string): EmotionConfigApi {
  return id === 'ball' ? emotionBallConfig : moodMatesConfig;
}

function charVariants(id: string): Array<{ id: string; name: string }> {
  return id === 'ball'
    ? BALL_VARIANTS
    : MoodMates.characters.variants(id).map((v) => ({ id: v.id, name: v.en?.name || v.name }));
}

function createInst(el: HTMLElement, opts: InstOptions): MascotEngine {
  const { character, variant, ...rest } = opts;
  if (character === 'ball') {
    return EmotionBall.create(el, variant ? { ...rest, shape: variant } : rest);
  }
  return MoodMates.create(el, { ...rest, character, variant });
}

function sanitize(p: Prefs): Prefs {
  return {
    ...p,
    character: getChar(p.character) ? p.character : 'ball',
    variants: p.variants && typeof p.variants === 'object' ? p.variants : {},
  };
}

function CastCard({
  ch,
  selected,
  onPick,
}: {
  ch: CharInfo;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  const engineRef = useRef<MascotEngine | null>(null);
  return (
    <button
      type="button"
      className={`cast${selected ? ' selected' : ''}`}
      title={`${ch.name} · click to switch to this character`}
      onClick={() => {
        const engine = engineRef.current;
        if (engine && !engine.signature?.(0.7)) engine.spin(1);
        onPick(ch.id);
      }}
    >
      <Mascot
        className="cast-avatar"
        gaze
        engineRef={engineRef}
        create={(el) =>
          createInst(el, { character: ch.id, emotion: '02', lite: true, eyeScale: 1.35, label: ch.name })
        }
      />
      <span className="cast-name">{ch.name}</span>
      <span className="cast-industry">{INDUSTRY[ch.industry]}</span>
    </button>
  );
}

export function GalleryPage() {
  const [prefs, updatePrefs, prefsRef] = usePrefs<Prefs>(PREF_KEY, DEFAULTS, sanitize);
  const config = configOf(prefs.character);
  const core = useGalleryCore<Prefs>({
    config,
    prefs,
    prefsRef,
    updatePrefs,
    debugHandle: 'EG_MAIN',
  });

  const brandRef = useRef<MascotEngine | null>(null);
  const heroRef = useRef<MascotEngine | null>(null);

  const variants = charVariants(prefs.character);
  const storedVariant = prefs.variants[prefs.character] || '';
  const variant = variants.some((v) => v.id === storedVariant) ? storedVariant : '';
  const variantOptions: DropdownOption[] = [
    { value: '', label: BASE_SHAPES[prefs.character] ?? (getChar(prefs.character) as CharInfo).name },
    ...variants.map((v) => ({ value: v.id, label: v.name })),
  ];
  const intervalValue = INTERVALS.some((o) => o.value === String(prefs.tourMs))
    ? String(prefs.tourMs)
    : '2500';

  useEffect(() => {
    if (storedVariant && !variant) {
      updatePrefs({ variants: { ...prefsRef.current.variants, [prefsRef.current.character]: '' } });
    }
  }, [storedVariant, variant, prefsRef, updatePrefs]);

  useEffect(() => {
    if (intervalValue !== String(prefs.tourMs)) updatePrefs({ tourMs: 2500 });
  }, [intervalValue, prefs.tourMs, updatePrefs]);

  const characterKey = `${prefs.character}|${variant}`;
  const groupOptions: DropdownOption[] = core.tabs.map((g) => ({
    value: g.key,
    label: `${g.name} (${g.key === 'all' ? config.list().length : config.list(g.key).length})`,
  }));
  const groupValue = core.tabs.some((g) => g.key === core.currentTab) ? core.currentTab : 'all';

  const switchCharacter = (id: string) => {
    const target = getChar(id);
    if (!target || id === prefsRef.current.character) return;
    updatePrefs({ character: id });
    if (core.mainRef.current?.touring) core.stopTourUI();
    core.resetMeta();
    const next = configOf(id);
    const keys = [
      'all',
      ...next
        .groups()
        .filter((g) => next.list(g.key).length > 0)
        .map((g) => g.key),
    ];
    if (!keys.includes(core.currentTab)) core.setTab('all');
    core.toast(`Switched to ${target.name}`, 'ok');
  };

  const onVariantChange = (value: string) => {
    updatePrefs({ variants: { ...prefsRef.current.variants, [prefsRef.current.character]: value } });
    if (core.mainRef.current?.touring) core.stopTourUI();
    const label = variantOptions.find((o) => o.value === value)?.label ?? '';
    core.toast(`Shape switched: ${label}`, 'ok');
  };

  const def = core.shownDef;
  const nameOf = (d: DefLike) => d.name;

  return (
    <>
      <Topbar
        brandName="Emotion Gallery"
        theme={prefs.theme}
        onToggleTheme={core.toggleTheme}
        brand={
          <Mascot
            key={characterKey}
            as="span"
            id="brandBall"
            className="brand-ball"
            aria-hidden="true"
            gaze
            engineRef={brandRef}
            onClick={() => {
              const brand = brandRef.current;
              if (brand && !brand.signature?.(0.6)) brand.spin(1);
            }}
            create={(el) =>
              createInst(el, {
                character: prefs.character,
                variant,
                emotion: '02',
                lite: true,
                eyeScale: 1.7,
                label: 'Emotion Gallery',
              })
            }
          />
        }
      />

      <main className="page">
        <Hero
          title="Three expressive pals, one shared stage"
          sub="Ball × Nimbo × Twinkle · 32 expressive states · Real-time SVG"
          cta="Enter the gallery"
          particles
          engineRef={heroRef}
          intro={(hero) => {
            if (!hero.signature?.(1)) hero.spin(2);
          }}
          bot={
            <Mascot
              key={characterKey}
              id="heroBot"
              className="hero-bot"
              gaze
              engineRef={heroRef}
              onEngine={(hero) => hero.setStyle({ sketch: 1 })}
              onClick={() => {
                const hero = heroRef.current;
                if (hero && !hero.signature?.(0.8)) hero.spin(1);
              }}
              create={(el) =>
                createInst(el, {
                  character: prefs.character,
                  variant,
                  emotion: '02',
                  label: 'Emotion Gallery',
                })
              }
            />
          }
        />

        <section className="gallery" id="gallery">
          <div id="castRow" className="cast-row" aria-label="Characters">
            {CHARS.map((ch) => (
              <CastCard key={ch.id} ch={ch} selected={ch.id === prefs.character} onPick={switchCharacter} />
            ))}
          </div>

          <div className="gallery-head">
            <nav className="mode-switch" aria-label="View mode">
              <button
                type="button"
                id="modeWall"
                className={`mode-btn${prefs.mode === 'wall' ? ' active' : ''}`}
                onClick={() => core.setMode('wall')}
              >
                Wall
              </button>
              <button
                type="button"
                id="modeAlbum"
                className={`mode-btn${prefs.mode === 'album' ? ' active' : ''}`}
                onClick={() => core.setMode('album')}
              >
                Album
              </button>
            </nav>
            <div className="head-controls">
              <span className="head-field">
                <span className="hf-label">Group</span>
                <Dropdown
                  id="groupSelect"
                  ariaLabel="Emotion group"
                  value={groupValue}
                  options={groupOptions}
                  onChange={core.setTab}
                />
              </span>
              <span className="head-field">
                <span className="hf-label">Shape</span>
                <Dropdown
                  id="variantSelect"
                  ariaLabel="Body shape"
                  value={variant}
                  options={variantOptions}
                  onChange={onVariantChange}
                />
              </span>
              <span className="head-field">
                <span className="hf-label">Interval</span>
                <Dropdown
                  id="tourInterval"
                  ariaLabel="Autoplay interval"
                  value={intervalValue}
                  options={INTERVALS}
                  onChange={core.onTourInterval}
                />
              </span>
              <label className="head-switch">
                <span className="switch">
                  <Toggle id="sketchToggle" checked={prefs.sketch} onChange={core.onSketch} />
                </span>
                <span className="hs-label">Sketch</span>
              </label>
              <label className="head-switch">
                <span className="switch">
                  <Toggle id="tourToggle" checked={core.tourOn} onChange={core.onTourToggle} />
                </span>
                <span className="hs-label">Autoplay</span>
              </label>
            </div>
            <p id="galleryHint" className="gallery-hint">
              Click a thumbnail · ← / → to flip
            </p>
          </div>

          <ThumbZone
            zoneRef={core.thumbZoneRef}
            defs={core.defs}
            selectedId={core.selectedId}
            sketch={prefs.sketch}
            isAlbum={prefs.mode === 'album'}
            engineKey={`${characterKey}|${core.currentTab}|${core.configVersion}`}
            registerCell={core.registerCell}
            onSelect={core.selectCell}
            titleOf={(d) => `${nameOf(d)}:${d.desc || ''}`}
            labelOf={nameOf}
            create={(d) => (el) =>
              createInst(el, {
                character: prefs.character,
                variant,
                emotion: d.id,
                autostart: false,
                label: `${nameOf(d)} thumbnail preview`,
              })
            }
          />

          <StageZone
            tips={core.tips}
            emoId={def ? `ID ${def.id}` : 'ID --'}
            emoName={def ? def.name : '--'}
            emoDesc={def?.desc || ''}
            pager={core.pager}
            onPrev={() => core.step(-1)}
            onNext={() => core.step(1)}
            onClose={core.closeStage}
            stage={
              <Mascot
                key={characterKey}
                id="stage"
                className="stage"
                gaze
                engineRef={core.mainRef}
                onEngine={core.attachMain}
                onClick={core.onStageClick}
                create={(el) =>
                  createInst(el, {
                    character: prefs.character,
                    variant,
                    emotion: core.selectedRef.current,
                    idle: IDLE,
                    label: 'Main emotion stage',
                  })
                }
              />
            }
          />
        </section>
      </main>

      <footer className="site-foot">
        <p>
          Nimbo &amp; Twinkle are original, dual-licensed characters (free for personal learning; commercial
          licensing via mood-mates/LICENSE-COMMERCIAL.md). The Ball visual design is learning-only (no
          commercial use); its expression engine and emotion data are commercially licensable via
          LICENSE-COMMERCIAL.md.
        </p>
        <p className="foot-links">
          <a href="mood-mates/index.html">Mood Mates site</a>
          <span aria-hidden="true">·</span>
          <a href="emotion-ball/index.html">Emotion Ball site</a>
        </p>
      </footer>

      <Toast state={core.toastState} />
    </>
  );
}
