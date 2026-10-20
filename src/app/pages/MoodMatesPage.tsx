import { useEffect, useRef } from 'react';
import { Drawer } from '../components/Drawer';
import { DrawerSections, SketchField } from '../components/DrawerSections';
import { Dropdown, type DropdownOption } from '../components/Dropdown';
import { Hero } from '../components/Hero';
import { Mascot } from '../components/Mascot';
import { StageZone } from '../components/StageZone';
import { SettingsButton, TabsNav } from '../components/TabsNav';
import { ThumbZone } from '../components/ThumbZone';
import { Toast } from '../components/Toast';
import { Topbar } from '../components/Topbar';
import type { DefLike, MascotEngine } from '../engine-types';
import { MoodMates, moodMatesConfigFor } from '../kits';
import { usePrefs } from '../prefs';
import { useDrawer, useDrawerTools } from '../useDrawerTools';
import { type CorePrefs, useGalleryCore } from '../useGalleryCore';

interface Prefs extends CorePrefs {
  character: string;
}

const PREF_KEY = 'mm.prefs';
const DEFAULTS: Prefs = {
  theme: 'dark',
  mode: 'wall',
  character: 'nubby',
  sketch: false,
  tourMs: 2500,
};

const INTERVALS: DropdownOption[] = [
  { value: '1500', label: '1.5s' },
  { value: '2500', label: '2.5s' },
  { value: '4000', label: '4s' },
];
const IDLE = { standbyAfter: 60000, sleepAfter: 180000 };
const CHARS = MoodMates.characters.list();

function sanitize(p: Prefs): Prefs {
  return {
    ...p,
    character: MoodMates.characters.get(p.character)
      ? p.character
      : (MoodMates.characters.defaultId() as string),
  };
}

function CastCard({
  id,
  name,
  selected,
  onPick,
}: {
  id: string;
  name: string;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  const engineRef = useRef<MascotEngine | null>(null);
  return (
    <button
      type="button"
      className={`cast${selected ? ' selected' : ''}`}
      title={`${name} · click to switch to this character`}
      onClick={() => {
        const engine = engineRef.current;
        if (engine && !engine.signature?.(0.7)) engine.spin(1);
        onPick(id);
      }}
    >
      <Mascot
        className="cast-avatar"
        gaze
        engineRef={engineRef}
        create={(el) =>
          MoodMates.create(el, { character: id, emotion: '02', lite: true, eyeScale: 1.35, label: name })
        }
      />
      <span className="cast-name">{name}</span>
      <span className="cast-industry">General</span>
    </button>
  );
}

export function MoodMatesPage() {
  const [prefs, updatePrefs, prefsRef] = usePrefs<Prefs>(PREF_KEY, DEFAULTS, sanitize);
  const drawer = useDrawer();
  const config = moodMatesConfigFor(prefs.character);
  const core = useGalleryCore<Prefs>({
    config,
    prefs,
    prefsRef,
    updatePrefs,
    debugHandle: 'MM_MAIN',
    onEscape: drawer.closeIfOpen,
  });
  const tools = useDrawerTools({
    mainRef: core.mainRef,
    lastErrorAt: core.lastErrorAt,
    stopTourUI: core.stopTourUI,
    openStage: core.openStage,
    toast: core.toast,
    importApplied: core.importApplied,
    config,
    filename: 'mood-mates-config.json',
  });

  const brandRef = useRef<MascotEngine | null>(null);
  const heroRef = useRef<MascotEngine | null>(null);
  const initialCharacter = useRef(prefs.character).current;

  const intervalValue = INTERVALS.some((o) => o.value === String(prefs.tourMs))
    ? String(prefs.tourMs)
    : '2500';
  const charOptions: DropdownOption[] = CHARS.map((c) => ({ value: c.id, label: `${c.name} · General` }));
  const counts: Record<string, number> = { all: config.list().length };
  for (const g of core.tabs) if (g.key !== 'all') counts[g.key] = config.list(g.key).length;

  useEffect(() => {
    if (intervalValue !== String(prefs.tourMs)) updatePrefs({ tourMs: 2500 });
  }, [intervalValue, prefs.tourMs, updatePrefs]);

  const switchCharacter = (id: string) => {
    if (!MoodMates.characters.get(id) || id === prefsRef.current.character) return;
    updatePrefs({ character: id });
    if (core.mainRef.current?.touring) core.stopTourUI();
    core.resetMeta();
    const next = moodMatesConfigFor(id);
    const keys = [
      'all',
      ...next
        .groups()
        .filter((g) => next.list(g.key).length > 0)
        .map((g) => g.key),
    ];
    if (!keys.includes(core.currentTab)) core.setTab('all');
    core.toast(`Switched to ${MoodMates.characters.get(id)?.name}`, 'ok');
  };

  const characterKey = prefs.character;
  const def = core.shownDef;
  const nameOf = (d: DefLike) => d.name;

  return (
    <>
      <Topbar
        brandName="Mood Mates"
        theme={prefs.theme}
        onToggleTheme={core.toggleTheme}
        brand={
          <Mascot
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
              MoodMates.create(el, {
                character: MoodMates.characters.defaultId() as string,
                emotion: '02',
                lite: true,
                eyeScale: 1.7,
                label: 'Mood Mates',
              })
            }
          />
        }
      />

      <main className="page">
        <Hero
          eyebrow="MOOD MATES"
          title="A cast that wears its feelings"
          sub="Nubby × Stampy × Pumpkin · 32 expressive states · Real-time SVG · Hook up your AI with a single emotionId"
          cta="Enter the gallery"
          hint="Move your mouse and it watches · Click for its signature move"
          particles={false}
          engineRef={heroRef}
          intro={(hero) => {
            if (!hero.signature?.(1)) hero.spin(2);
          }}
          bot={
            <Mascot
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
                MoodMates.create(el, { character: initialCharacter, emotion: '02', label: 'Mood Mates' })
              }
            />
          }
        />

        <section className="gallery" id="gallery">
          <div id="castRow" className="cast-row" aria-label="Characters">
            {CHARS.map((c) => (
              <CastCard
                key={c.id}
                id={c.id}
                name={c.name}
                selected={c.id === prefs.character}
                onPick={switchCharacter}
              />
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
            <TabsNav tabs={core.tabs} counts={counts} current={core.currentTab} onSelect={core.setTab} />
            <p id="galleryHint" className="gallery-hint">
              Click a cast card to switch characters · Click a thumbnail to switch emotions · ← / → to flip
            </p>
            <SettingsButton onClick={drawer.openDrawer} />
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
              MoodMates.create(el, {
                character: prefs.character,
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
                  MoodMates.create(el, {
                    character: prefs.character,
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
        <p>Free for personal learning; for commercial use see LICENSE-COMMERCIAL.md in the repository.</p>
      </footer>

      <Drawer
        open={drawer.open}
        maskHidden={drawer.maskHidden}
        maskShow={drawer.maskShow}
        onClose={drawer.closeDrawer}
      >
        <DrawerSections
          tourOn={core.tourOn}
          onTourToggle={core.onTourToggle}
          intervalValue={intervalValue}
          intervalOptions={INTERVALS}
          onTourInterval={core.onTourInterval}
          tools={tools}
          appearance={
            <>
              <div className="field">
                <label htmlFor="charSelect">Character</label>
                <Dropdown
                  id="charSelect"
                  value={prefs.character}
                  options={charOptions}
                  onChange={switchCharacter}
                />
              </div>
              <SketchField checked={prefs.sketch} onChange={core.onSketch} />
            </>
          }
        />
      </Drawer>

      <Toast state={core.toastState} />
    </>
  );
}
