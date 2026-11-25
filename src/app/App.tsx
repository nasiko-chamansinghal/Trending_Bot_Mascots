import { useEffect, useState } from 'react';
import { characterName, DEFAULT_EMOTION, emotionsOf, hasCharacter, listCharacters } from './characters';
import type { Clip } from './clips';
import { eyeColorOf, isSavedColor } from './colors';
import { AnimationView } from './components/AnimationView';
import { AppBar, type Tab } from './components/AppBar';
import { BodyPicker } from './components/BodyPicker';
import { CharacterPicker } from './components/CharacterPicker';
import { ColorPicker } from './components/ColorPicker';
import { DesignView } from './components/DesignView';
import { EmotionPicker } from './components/EmotionPicker';
import { SkillView } from './components/SkillView';
import { Stage } from './components/Stage';
import { useDesigns } from './designer/store';
import { installGazeListeners } from './gaze';
import { usePrefs } from './prefs';

type Colors = Record<string, string | null>;

interface Prefs {
  character: string;
  colors: Colors;
}

const PREF_KEY = 'mascot-studio.prefs.v2';
const DEFAULTS: Prefs = { character: 'ball', colors: {} };

function sanitize(prefs: Prefs): Prefs {
  const storedColors: Colors = prefs.colors && typeof prefs.colors === 'object' ? prefs.colors : {};
  const colors: Colors = {};
  for (const c of listCharacters()) {
    const color = storedColors[c.id] ?? null;
    colors[c.id] = isSavedColor(color) ? color : null;
  }
  return {
    character: hasCharacter(prefs.character) ? prefs.character : DEFAULTS.character,
    colors,
  };
}

const NO_CLIPS: Clip[] = [];

function readTab(): Tab {
  const hash = window.location.hash;
  if (hash === '#animation') return 'animation';
  if (hash === '#design') return 'design';
  if (hash === '#skill') return 'skill';
  return 'customise';
}

export function App() {
  const [prefs, updatePrefs] = usePrefs<Prefs>(PREF_KEY, DEFAULTS, sanitize);
  const [emotion, setEmotion] = useState(DEFAULT_EMOTION);
  const [tab, setTab] = useState<Tab>(readTab);
  const [timelines, setTimelines] = useState<Record<string, Clip[]>>({});
  const designs = useDesigns();

  useEffect(() => installGazeListeners(), []);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const character = hasCharacter(prefs.character) ? prefs.character : DEFAULTS.character;
  const emotions = emotionsOf(character);
  const current = emotions.find((def) => def.id === emotion);
  const color = prefs.colors[character] ?? null;
  const eyeHexes: Record<string, string | null> = {};
  for (const c of listCharacters()) eyeHexes[c.id] = eyeColorOf(c.id);

  const selectCharacter = (id: string) => {
    if (id === character) return;
    updatePrefs({ character: id });
    setEmotion(DEFAULT_EMOTION);
  };

  const selectColor = (hex: string | null) => {
    updatePrefs({ colors: { ...prefs.colors, [character]: hex } });
  };

  return (
    <>
      <AppBar tab={tab} />
      <main className="canvas" id={tab}>
        {tab === 'skill' ? (
          <SkillView character={character} color={color} eyes={eyeHexes[character] ?? null} />
        ) : tab === 'design' ? (
          <DesignView
            state={designs}
            onUse={(id) => {
              selectCharacter(id);
              window.location.hash = '#customise';
            }}
          />
        ) : tab === 'animation' ? (
          <AnimationView
            character={character}
            color={color}
            eyes={eyeHexes[character] ?? null}
            clips={timelines[character] ?? NO_CLIPS}
            onClipsChange={(next) => setTimelines((all) => ({ ...all, [character]: next }))}
          />
        ) : (
          <>
            <div className="stage-column">
              <div className="title-row">
                <h1>Customise</h1>
                <p>
                  {characterName(character)} · {current?.name ?? '—'}
                </p>
              </div>
              <Stage
                character={character}
                emotion={emotion}
                color={color}
                eyes={eyeHexes[character] ?? null}
                onEmotionChange={setEmotion}
              />
            </div>
            <aside className="inspector" aria-label="Customise options">
              <section className="inspector-section">
                <div className="section-head">
                  <h2>Body</h2>
                </div>
                <BodyPicker />
              </section>
              <section className="inspector-section">
                <div className="section-head">
                  <h2>Character</h2>
                </div>
                <CharacterPicker
                  character={character}
                  colors={prefs.colors}
                  eyes={eyeHexes}
                  onSelect={selectCharacter}
                />
              </section>
              <section className="inspector-section">
                <div className="section-head">
                  <h2>Emotion</h2>
                  <span className="meta">{emotions.length}</span>
                </div>
                <EmotionPicker
                  character={character}
                  emotion={emotion}
                  color={color}
                  eyes={eyeHexes[character] ?? null}
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
