import { useEffect, useState } from 'react';
import { CHARACTERS, characterName, DEFAULT_EMOTION, emotionsOf, hasCharacter } from './characters';
import type { Clip } from './clips';
import { type EyeTone, eyeHex, isEyeTone, isSavedColor } from './colors';
import { AnimationView } from './components/AnimationView';
import { AppBar, type Tab } from './components/AppBar';
import { CharacterPicker } from './components/CharacterPicker';
import { ColorPicker } from './components/ColorPicker';
import { EmotionPicker } from './components/EmotionPicker';
import { EyePicker } from './components/EyePicker';
import { Stage } from './components/Stage';
import { installGazeListeners } from './gaze';
import { usePrefs } from './prefs';

type Colors = Record<string, string | null>;
type Eyes = Record<string, EyeTone | null>;

interface Prefs {
  character: string;
  colors: Colors;
  eyes: Eyes;
}

const PREF_KEY = 'mascot-studio.prefs.v2';
const DEFAULTS: Prefs = { character: 'ball', colors: {}, eyes: {} };

function sanitize(prefs: Prefs): Prefs {
  const storedColors: Colors = prefs.colors && typeof prefs.colors === 'object' ? prefs.colors : {};
  const storedEyes: Eyes = prefs.eyes && typeof prefs.eyes === 'object' ? prefs.eyes : {};
  const colors: Colors = {};
  const eyes: Eyes = {};
  for (const c of CHARACTERS) {
    const color = storedColors[c.id] ?? null;
    const tone = storedEyes[c.id];
    colors[c.id] = isSavedColor(color) ? color : null;
    eyes[c.id] = isEyeTone(tone) ? tone : null;
  }
  return {
    character: hasCharacter(prefs.character) ? prefs.character : DEFAULTS.character,
    colors,
    eyes,
  };
}

const NO_CLIPS: Clip[] = [];

function readTab(): Tab {
  return window.location.hash === '#animation' ? 'animation' : 'customise';
}

export function App() {
  const [prefs, updatePrefs] = usePrefs<Prefs>(PREF_KEY, DEFAULTS, sanitize);
  const [emotion, setEmotion] = useState(DEFAULT_EMOTION);
  const [tab, setTab] = useState<Tab>(readTab);
  const [timelines, setTimelines] = useState<Record<string, Clip[]>>({});

  useEffect(() => installGazeListeners(), []);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const emotions = emotionsOf(prefs.character);
  const current = emotions.find((def) => def.id === emotion);
  const color = prefs.colors[prefs.character] ?? null;
  const tone = prefs.eyes[prefs.character] ?? null;
  const eyeHexes: Record<string, string | null> = {};
  for (const c of CHARACTERS) eyeHexes[c.id] = eyeHex(prefs.eyes[c.id] ?? null);

  const selectCharacter = (id: string) => {
    if (id === prefs.character) return;
    updatePrefs({ character: id });
    setEmotion(DEFAULT_EMOTION);
  };

  const selectColor = (hex: string | null) => {
    updatePrefs({ colors: { ...prefs.colors, [prefs.character]: hex } });
  };

  const selectEyes = (next: EyeTone | null) => {
    updatePrefs({ eyes: { ...prefs.eyes, [prefs.character]: next } });
  };

  return (
    <>
      <AppBar tab={tab} />
      <main className="canvas" id={tab}>
        {tab === 'animation' ? (
          <AnimationView
            character={prefs.character}
            color={color}
            eyes={eyeHexes[prefs.character] ?? null}
            clips={timelines[prefs.character] ?? NO_CLIPS}
            onClipsChange={(next) => setTimelines((all) => ({ ...all, [prefs.character]: next }))}
          />
        ) : (
          <>
            <div className="stage-column">
              <div className="title-row">
                <h1>Customise</h1>
                <p>
                  {characterName(prefs.character)} · {current?.name ?? '—'}
                </p>
              </div>
              <Stage
                character={prefs.character}
                emotion={emotion}
                emotionName={current?.name ?? emotion}
                color={color}
                eyes={eyeHexes[prefs.character] ?? null}
                onEmotionChange={setEmotion}
              />
            </div>
            <aside className="inspector" aria-label="Customise options">
              <section className="inspector-section">
                <div className="section-head">
                  <h2>Character</h2>
                </div>
                <CharacterPicker
                  character={prefs.character}
                  colors={prefs.colors}
                  eyes={eyeHexes}
                  onSelect={selectCharacter}
                />
              </section>
              <section className="inspector-section">
                <div className="section-head">
                  <h2>Eyes</h2>
                  {tone ? (
                    <button type="button" className="button-quiet" onClick={() => selectEyes(null)}>
                      Reset
                    </button>
                  ) : (
                    <span className="meta">Original</span>
                  )}
                </div>
                <EyePicker tone={tone} onSelect={selectEyes} />
              </section>
              <section className="inspector-section">
                <div className="section-head">
                  <h2>Emotion</h2>
                  <span className="meta">{emotions.length}</span>
                </div>
                <EmotionPicker
                  character={prefs.character}
                  emotion={emotion}
                  color={color}
                  eyes={eyeHexes[prefs.character] ?? null}
                  onSelect={setEmotion}
                />
              </section>
              <section className="inspector-section">
                <div className="section-head">
                  <h2>Colour</h2>
                  {color ? (
                    <button type="button" className="button-quiet" onClick={() => selectColor(null)}>
                      Reset
                    </button>
                  ) : (
                    <span className="meta">Original</span>
                  )}
                </div>
                <ColorPicker color={color} onSelect={selectColor} />
              </section>
            </aside>
          </>
        )}
      </main>
    </>
  );
}
