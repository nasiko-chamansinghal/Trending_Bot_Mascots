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
import { EmotionBall, emotionBallConfig } from '../kits';
import { usePrefs } from '../prefs';
import { useDrawer, useDrawerTools } from '../useDrawerTools';
import { type CorePrefs, useGalleryCore } from '../useGalleryCore';

interface Prefs extends CorePrefs {
  shape: string;
}

const PREF_KEY = 'eb.prefs';
const DEFAULTS: Prefs = {
  theme: 'dark',
  mode: 'wall',
  shape: 'blob',
  sketch: false,
  tourMs: 2500,
};

const INTERVALS: DropdownOption[] = [
  { value: '1500', label: '1.5s' },
  { value: '2500', label: '2.5s' },
  { value: '4000', label: '4s' },
];
const SHAPES: DropdownOption[] = [
  { value: 'blob', label: 'Blob' },
  { value: 'wedge', label: 'Wedge' },
  { value: 'gem', label: 'Gem' },
];
const IDLE = { standbyAfter: 60000, sleepAfter: 180000 };

interface Baby {
  role: string;
  color: string;
  emotion: string;
  shape?: string;
}

const BABIES: Baby[] = [
  { role: 'Chief', color: '#54B9A6', emotion: '19' },
  { role: 'Sales', color: '#F19D38', emotion: '32' },
  { role: 'Inbox', color: '#6464EF', emotion: '31' },
  { role: 'Account', color: '#885CF5', emotion: '35' },
  { role: 'Scout', color: '#3C82F6', emotion: '40' },
  { role: 'Expense', color: '#ED712E', emotion: '30' },
  { role: 'Ops', color: '#4A9E8F', emotion: '16', shape: 'wedge' },
  { role: 'Lab', color: '#C75C8A', emotion: '03', shape: 'gem' },
];

function sanitize(p: Prefs): Prefs {
  return { ...p, shape: SHAPES.some((s) => s.value === p.shape) ? p.shape : 'blob' };
}

function BabyButton({
  baby,
  onPick,
}: {
  baby: Baby;
  onPick: (baby: Baby, engine: MascotEngine | null) => void;
}) {
  const engineRef = useRef<MascotEngine | null>(null);
  const def = emotionBallConfig.def(baby.emotion);
  return (
    <Mascot
      as="button"
      className="baby"
      title={`${baby.role} · ${def ? def.name : baby.emotion}(click to switch the main bot)`}
      gaze
      engineRef={engineRef}
      onClick={() => onPick(baby, engineRef.current)}
      create={(el) =>
        EmotionBall.create(el, {
          emotion: baby.emotion,
          color: baby.color,
          shape: baby.shape || 'blob',
          lite: true,
          eyeScale: 1.7,
          label: baby.role,
        })
      }
    />
  );
}

export function EmotionBallPage() {
  const [prefs, updatePrefs, prefsRef] = usePrefs<Prefs>(PREF_KEY, DEFAULTS, sanitize);
  const drawer = useDrawer();
  const core = useGalleryCore<Prefs>({
    config: emotionBallConfig,
    prefs,
    prefsRef,
    updatePrefs,
    debugHandle: 'EB_MAIN',
    onEscape: drawer.closeIfOpen,
  });
  const tools = useDrawerTools({
    mainRef: core.mainRef,
    lastErrorAt: core.lastErrorAt,
    stopTourUI: core.stopTourUI,
    openStage: core.openStage,
    toast: core.toast,
    importApplied: core.importApplied,
    config: emotionBallConfig,
    filename: 'emotion-ball-config.json',
  });

  const brandRef = useRef<MascotEngine | null>(null);
  const heroRef = useRef<MascotEngine | null>(null);

  const intervalValue = INTERVALS.some((o) => o.value === String(prefs.tourMs))
    ? String(prefs.tourMs)
    : '2500';
  const counts: Record<string, number> = { all: emotionBallConfig.list().length };
  for (const g of core.tabs) if (g.key !== 'all') counts[g.key] = emotionBallConfig.list(g.key).length;

  useEffect(() => {
    if (intervalValue !== String(prefs.tourMs)) updatePrefs({ tourMs: 2500 });
  }, [intervalValue, prefs.tourMs, updatePrefs]);

  const onShapeChange = (value: string) => {
    updatePrefs({ shape: value });
    if (core.mainRef.current?.touring) core.stopTourUI();
    const label = SHAPES.find((s) => s.value === value)?.label ?? value;
    core.toast(`Body shape switched to ${label}`, 'ok');
  };

  const onBabyPick = (baby: Baby, engine: MascotEngine | null) => {
    if (core.mainRef.current?.touring) core.stopTourUI();
    engine?.spin(1);
    core.mainRef.current?.setEmotion(baby.emotion);
  };

  const def = core.shownDef;
  const nameOf = (d: DefLike) => d.name;

  return (
    <>
      <Topbar
        brandName="Emotion Ball"
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
            onClick={() => brandRef.current?.spin(1)}
            create={(el) =>
              EmotionBall.create(el, { emotion: '02', lite: true, eyeScale: 1.7, label: 'Emotion Ball' })
            }
          />
        }
      />

      <main className="page">
        <Hero
          eyebrow="EMOTION GALLERY"
          title="A little bot that wears its feelings"
          sub="32 expressive states · Real-time SVG · Hook up your AI with a single emotionId"
          cta="Enter the gallery"
          hint="Move your mouse and it watches · Click for a ribbon spin"
          particles
          engineRef={heroRef}
          intro={(hero) => hero.spin(2)}
          bot={
            <Mascot
              id="heroBot"
              className="hero-bot"
              gaze
              engineRef={heroRef}
              onEngine={(hero) => hero.setStyle({ sketch: 1 })}
              onClick={() => heroRef.current?.spin(1)}
              create={(el) => EmotionBall.create(el, { emotion: '02', shape: 'blob', label: 'Emotion Ball' })}
            />
          }
        />

        <section className="gallery" id="gallery">
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
              Click a thumbnail to switch · Hover to preview · ← / → to flip
            </p>
            <SettingsButton onClick={drawer.openDrawer} />
          </div>

          <ThumbZone
            zoneRef={core.thumbZoneRef}
            defs={core.defs}
            selectedId={core.selectedId}
            sketch={false}
            isAlbum={prefs.mode === 'album'}
            engineKey={`${core.currentTab}|${core.configVersion}`}
            registerCell={core.registerCell}
            onSelect={core.selectCell}
            titleOf={(d) => `${nameOf(d)}:${d.desc || ''}`}
            labelOf={nameOf}
            create={(d) => (el) =>
              EmotionBall.create(el, {
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
            extra={
              <div className="baby-row" aria-label="Team bots">
                <div id="babyList" className="baby-list">
                  {BABIES.map((b) => (
                    <BabyButton key={b.role} baby={b} onPick={onBabyPick} />
                  ))}
                </div>
              </div>
            }
            stage={
              <Mascot
                key={prefs.shape}
                id="stage"
                className="stage"
                gaze
                engineRef={core.mainRef}
                onEngine={core.attachMain}
                onClick={core.onStageClick}
                create={(el) =>
                  EmotionBall.create(el, {
                    emotion: core.selectedRef.current,
                    shape: prefs.shape || 'blob',
                    idle: IDLE,
                    label: 'Main emotion stage',
                  })
                }
              />
            }
          />
        </section>
      </main>

      <footer className="legal-note">
        <p>
          The ball-character visual designs on this site are for personal technical study and research only;
          any commercial use of the visuals is prohibited. The expression engine and emotion data are
          available for commercial licensing (see LICENSE-COMMERCIAL.md in the repository root).
        </p>
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
                <label htmlFor="shapeSelect">Body shape</label>
                <Dropdown id="shapeSelect" value={prefs.shape} options={SHAPES} onChange={onShapeChange} />
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
