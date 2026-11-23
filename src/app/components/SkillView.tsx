import { useEffect, useRef, useState } from 'react';
import { characterName, createMascot } from '../characters';
import { copyText } from '../clipboard';
import { getDesign } from '../designer/store';
import { Mascot } from './Mascot';

const SKILL = 'mascot-studio';
const RESET_MS = 1800;

interface CopyBlockProps {
  label: string;
  text: string;
  multiline?: boolean;
}

function CopyBlock({ label, text, multiline = false }: CopyBlockProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    setState((await copyText(text)) ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), RESET_MS);
  };
  return (
    <div className="copy-block" data-multiline={multiline || undefined}>
      <pre aria-label={label}>
        <code>{text}</code>
      </pre>
      <button type="button" className="button-quiet" onClick={copy}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy blocked' : 'Copy'}
      </button>
    </div>
  );
}

interface SkillViewProps {
  character: string;
  color: string | null;
  eyes: string | null;
}

/** Builds the "try it" prompt from the mascot chosen in the studio, so the agent adds exactly that one. */
function promptFor(character: string, color: string | null, eyes: string | null): string {
  const design = getDesign(character);
  const name = characterName(character);
  const look: string[] = [];
  if (color) look.push(`body colour ${color}`);
  if (eyes) look.push(`eye colour ${eyes}`);
  const styled = look.length ? `, with ${look.join(' and ')}` : '';
  const which =
    character === 'ball'
      ? `the Ball mascot (EmotionBall, shape 'blob')${styled}`
      : design
        ? `my custom mascot "${name}"${styled}`
        : `the ${name} mascot (character '${character}')${styled}`;
  const lines = [
    `Use the ${SKILL} skill to add ${which} to this app.`,
    'Put it where it fits best (ask me if unsure), make it follow the cursor, show Thinking while a request is in flight, Done on success and Error on failure, and let it fall asleep when idle.',
    'Self-host the library, clean it up on unmount, and run the app to check it renders.',
  ];
  if (!design) return lines.join(' ');
  const { id: _id, ...portable } = design;
  return [
    ...lines,
    '',
    'It is a Mascot Studio design: register it with MoodMates.registerDesign(design) and create it with the id that returns.',
    `design = ${JSON.stringify(portable)}`,
  ].join('\n');
}

export function SkillView({ character, color, eyes }: SkillViewProps) {
  const origin = window.location.origin;
  const base = `${origin}/skill/${SKILL}`;
  const install = (dir: string) => `mkdir -p ${dir} && curl -fsSL ${base}.tar.gz | tar -xz -C ${dir}`;
  const pointer = `Before adding a mascot, read ${base}/SKILL.md and follow it (Mascot Studio: animated SVG mascots with emotions).`;
  const files = [
    ['SKILL.md', 'How to add a mascot, step by step'],
    ['references/frameworks.md', 'React, Next.js, Vue, Svelte, Angular, plain HTML'],
    ['references/characters.md', 'Every character id and look'],
    ['references/emotions.md', 'Every emotion id'],
    ['references/api.md', 'Options, methods, events, TypeScript'],
  ];

  return (
    <div className="skill-page">
      <header className="skill-hero">
        <Mascot
          key={`${character}:${color}:${eyes}`}
          className="skill-mascot"
          gaze
          create={(el) =>
            createMascot(el, { character, emotion: '10', color, eyeColor: eyes, label: 'Your mascot' })
          }
        />
        <div>
          <h1>Agent skill</h1>
          <p>
            Teach Claude Code, the Claude apps or any coding agent to add these mascots to your app. It knows
            every character and emotion, sets the mascot up the right way for React, Next.js, Vue, Svelte,
            Angular or plain HTML, and wires its emotions to what your app is doing.
          </p>
        </div>
      </header>

      <section className="skill-card" aria-labelledby="skill-claude-code">
        <div className="skill-card-head">
          <h2 id="skill-claude-code">Claude Code</h2>
          <span className="meta">Terminal</span>
        </div>
        <p>Install it for all your projects:</p>
        <CopyBlock label="Install for all projects" text={install('~/.claude/skills')} />
        <p>Or only for this project. Commit the folder and your whole team gets it:</p>
        <CopyBlock label="Install for this project" text={install('.claude/skills')} />
        <p className="skill-note">
          Start a new Claude Code session afterwards. Claude uses the skill on its own whenever you ask for a
          mascot.
        </p>
      </section>

      <section className="skill-card" aria-labelledby="skill-claude-apps">
        <div className="skill-card-head">
          <h2 id="skill-claude-apps">Claude apps</h2>
          <span className="meta">claude.ai, Desktop</span>
        </div>
        <p>Download the skill, then upload the .zip in Claude's settings under Capabilities, Skills.</p>
        <div className="skill-actions">
          <a className="export-button" data-kind="primary" href={`${base}.zip`} download>
            Download {SKILL}.zip
          </a>
        </div>
      </section>

      <section className="skill-card" aria-labelledby="skill-any-agent">
        <div className="skill-card-head">
          <h2 id="skill-any-agent">Any other agent</h2>
          <span className="meta">Cursor, Codex, Copilot, Windsurf…</span>
        </div>
        <p>
          Paste this into the chat, or add it to your <code>AGENTS.md</code> or rules file. Agents that
          support skills can also unpack the <a href={`${base}.tar.gz`}>.tar.gz</a> into their skills folder.
        </p>
        <CopyBlock label="Instruction for any agent" text={pointer} />
      </section>

      <section className="skill-card" aria-labelledby="skill-try">
        <div className="skill-card-head">
          <h2 id="skill-try">Try it</h2>
          <span className="meta">{characterName(character)}</span>
        </div>
        <p>
          A ready prompt for the mascot you picked in Customise or Design. Change the character there and this
          updates.
        </p>
        <CopyBlock label="Prompt for your agent" text={promptFor(character, color, eyes)} multiline />
      </section>

      <section className="skill-card" aria-labelledby="skill-files">
        <div className="skill-card-head">
          <h2 id="skill-files">What's inside</h2>
        </div>
        <ul className="skill-files">
          {files.map(([file, what]) => (
            <li key={file}>
              <a href={`${base}/${file}`} target="_blank" rel="noreferrer">
                {file}
              </a>
              <span>{what}</span>
            </li>
          ))}
          <li>
            <a href={`${origin}/llms.txt`} target="_blank" rel="noreferrer">
              llms.txt
            </a>
            <span>An index of all of the above for agents that look for it</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
