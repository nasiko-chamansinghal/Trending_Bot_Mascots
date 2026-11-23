/**
 * Builds the Mascot Studio agent skill from skill/ and the live engine data.
 *
 * Writes public/skill/mascot-studio/ (SKILL.md and references/), the same folder packed as
 * public/skill/mascot-studio.tar.gz (one-line install) and .zip (Claude app upload), and public/llms.txt.
 * Character and emotion lists come from the engine itself, so the skill cannot drift from the code.
 * The site URL comes from SKILL_SITE_URL, then Vercel's production domain, then the public studio.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { crc32, deflateRawSync, gzipSync } from 'node:zlib';
import { createServer } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'skill');
const NAME = 'mascot-studio';
const OUT = join(ROOT, 'public', 'skill');
const SKILL_OUT = join(OUT, NAME);
const DEFAULT_SITE = 'https://trendingbotsmascots.vercel.app';
// Fixed timestamp so the archives are byte-identical between builds of the same content.
const MTIME = Date.UTC(2026, 0, 1) / 1000;

const SITE_URL = (
  process.env.SKILL_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  DEFAULT_SITE
).replace(/\/+$/, '');

// App states an agent is likely to wire up, and the emotion that fits each, looked up by name.
const STATES = [
  ['Resting, nothing happening', 'Idle'],
  ['User is typing or speaking', 'Listening'],
  ['Request sent, waiting', 'Thinking'],
  ['Long task in progress', 'Loading'],
  ['Searching or fetching', 'Searching'],
  ['Answer streaming in', 'Replying'],
  ['Success, task finished', 'Done'],
  ['Positive result', 'Happy'],
  ['Error or failed request', 'Error'],
  ['Unclear input', 'Confused'],
  ['Declined or not allowed', 'Refusing'],
  ['New message or notification', 'Notification'],
  ['Inactive for a long time', 'Sleeping'],
];
// Emotions offered to an AI in the suggested system prompt.
const PROMPT_EMOTIONS = ['Idle', 'Happy', 'Thinking', 'Confused', 'Surprised', 'Down', 'Done', 'Error', 'Refusing', 'Love Strike'];
const EXAMPLE_CHARACTER = 'ghosty';

async function engineData() {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    const { MoodMates } = await server.ssrLoadModule('/src/engine/mood-mates/index.ts');
    const { EmotionBall } = await server.ssrLoadModule('/src/engine/emotion-ball/index.ts');
    const { RINGS } = await server.ssrLoadModule('/src/engine/emotion-ball/rings.ts');
    const emotions = MoodMates.config.list();
    const baseIds = new Set(emotions.map((e) => e.id));
    const characters = MoodMates.characters.list().map((c) => ({
      id: c.id,
      name: c.name,
      desc: c.raw?.desc ?? '',
      extras: MoodMates.characters.emotionList(c.id).filter((e) => !baseIds.has(e.id)),
    }));
    const ballIds = EmotionBall.config.list().map((e) => e.id);
    if (ballIds.join() !== [...baseIds].join()) throw new Error('Ball and Mood Mates emotion ids differ; update the skill text');
    return {
      version: MoodMates.version,
      emotions,
      groups: MoodMates.config.groups(),
      characters,
      ballShapes: Object.keys(RINGS.SHAPES),
    };
  } finally {
    await server.close();
  }
}

const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const code = (text) => `\`${text}\``;

function byName(emotions, name) {
  const found = emotions.find((e) => e.name === name);
  if (!found) throw new Error(`The skill refers to an emotion named "${name}", which the engine no longer has`);
  return found;
}

function emotionsDoc(data) {
  const lines = [
    '# Emotions',
    '',
    `All ${data.emotions.length} emotion IDs. Every character and the Ball share them, so one mapping works everywhere. Pass the ID as a string, for example \`bot.setEmotion('10')\`.`,
    '',
  ];
  for (const group of data.groups) {
    const list = data.emotions.filter((e) => e.group === group.key);
    if (!list.length) continue;
    lines.push(`## ${group.name}`, '', '| ID | Name | What it looks like |', '| --- | --- | --- |');
    for (const e of list) lines.push(`| ${code(e.id)} | ${cell(e.name)} | ${cell(e.desc)} |`);
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function charactersDoc(data) {
  const lines = [
    '# Characters',
    '',
    `${data.characters.length} characters in \`mood-mates.js\`. Pass the id as \`character\`. Preview any of them at ${SITE_URL}/#customise.`,
    '',
    '| id | Name | Looks like |',
    '| --- | --- | --- |',
    ...data.characters.map((c) => `| ${code(c.id)} | ${cell(c.name)} | ${cell(c.desc)} |`),
    '',
    `The Ball lives in \`emotion-ball.js\` instead: \`EmotionBall.create(el, { shape })\` with shape ${data.ballShapes.map(code).join(', ')}.`,
    '',
    'Custom mascots from the Design tab are registered with `MoodMates.registerDesign(json)`, which returns their id.',
  ];
  const withExtras = data.characters.filter((c) => c.extras.length);
  if (withExtras.length) {
    lines.push(
      '',
      '## Extra animations',
      '',
      'These characters also have their own animations on top of the shared emotions. Play them with `setEmotion(id)` like any emotion.',
    );
    for (const c of withExtras) {
      lines.push('', `### ${c.name} (${code(c.id)})`, '', '| ID | Name | What it looks like |', '| --- | --- | --- |');
      for (const e of c.extras) lines.push(`| ${code(e.id)} | ${cell(e.name)} | ${cell(e.desc)} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function fill(template, data) {
  const id = (name) => byName(data.emotions, name).id;
  const values = {
    SITE_URL,
    VERSION: data.version,
    CHARACTER_COUNT: String(data.characters.length),
    EMOTION_COUNT: String(data.emotions.length),
    CHARACTER_IDS: data.characters.map((c) => code(c.id)).join(', '),
    BALL_SHAPES: data.ballShapes.map(code).join(', '),
    EXAMPLE_CHARACTER,
    IDLE_ID: id('Idle'),
    HAPPY_ID: id('Happy'),
    THINKING_ID: id('Thinking'),
    LOADING_ID: id('Loading'),
    DONE_ID: id('Done'),
    ERROR_ID: id('Error'),
    STATE_TABLE: [
      '| App state | Emotion | ID |',
      '| --- | --- | --- |',
      ...STATES.map(([state, name]) => `| ${state} | ${name} | ${code(id(name))} |`),
    ].join('\n'),
    PROMPT_EMOTIONS: PROMPT_EMOTIONS.map((name) => `${id(name)} ${name}`).join(', '),
  };
  if (!data.characters.some((c) => c.id === EXAMPLE_CHARACTER)) {
    throw new Error(`Example character "${EXAMPLE_CHARACTER}" no longer exists`);
  }
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`Unknown placeholder ${match} in the skill templates`);
    return values[key];
  });
}

function llmsTxt(data) {
  return `# Mascot Studio

> Animated SVG mascots for AI products: ${data.characters.length} characters plus the Ball, each with ${data.emotions.length} emotions picked by a single emotionId. Drop them into any website with one script tag.

An agent skill teaches coding agents (Claude Code, Claude apps, and any agent that reads SKILL.md) to add these mascots to a frontend and wire their emotions to app state.

## Agent skill

- [SKILL.md](${SITE_URL}/skill/${NAME}/SKILL.md): how to add a mascot to React, Next.js, Vue, Svelte, Angular or plain HTML
- [Characters](${SITE_URL}/skill/${NAME}/references/characters.md): every character id
- [Emotions](${SITE_URL}/skill/${NAME}/references/emotions.md): every emotion id
- [Framework recipes](${SITE_URL}/skill/${NAME}/references/frameworks.md)
- [API reference](${SITE_URL}/skill/${NAME}/references/api.md)
- [Skill archive, .tar.gz](${SITE_URL}/skill/${NAME}.tar.gz) and [.zip](${SITE_URL}/skill/${NAME}.zip)

## Libraries

- [mood-mates.js](${SITE_URL}/mood-mates.js): global \`MoodMates\`, all characters and custom designs
- [emotion-ball.js](${SITE_URL}/emotion-ball.js): global \`EmotionBall\`, the Ball

## Studio

- [Mascot Studio](${SITE_URL}/): pick, recolour, design, animate and export mascots
`;
}

function walk(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

/** A gzipped POSIX tar of the files, each under `${NAME}/`, so `tar -xz -C <skills dir>` installs it. */
function tarGz(files) {
  const blocks = [];
  const header = (name, size, type) => {
    const h = Buffer.alloc(512);
    h.write(name, 0, 100, 'utf8');
    h.write(type === '5' ? '0000755\0' : '0000644\0', 100);
    h.write('0000000\0', 108);
    h.write('0000000\0', 116);
    h.write(`${size.toString(8).padStart(11, '0')}\0`, 124);
    h.write(`${MTIME.toString(8).padStart(11, '0')}\0`, 136);
    h.write('        ', 148);
    h.write(type, 156);
    h.write('ustar\0', 257);
    h.write('00', 263);
    let sum = 0;
    for (const byte of h) sum += byte;
    h.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
    return h;
  };
  const dirs = new Set();
  for (const { name, data } of files) {
    const parts = name.split('/');
    for (let i = 1; i < parts.length; i++) {
      const dir = `${parts.slice(0, i).join('/')}/`;
      if (!dirs.has(dir)) {
        dirs.add(dir);
        blocks.push(header(dir, 0, '5'));
      }
    }
    blocks.push(header(name, data.length, '0'), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks), { level: 9 });
}

/** A zip of the files, each under `${NAME}/`, the layout the Claude apps expect for an uploaded skill. */
function zip(files) {
  const date = new Date(MTIME * 1000);
  const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1);
  const dosDate = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  const local = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6);
    head.writeUInt16LE(8, 8);
    head.writeUInt16LE(dosTime, 10);
    head.writeUInt16LE(dosDate, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26);
    local.push(head, nameBuf, packed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(dosTime, 12);
    entry.writeUInt16LE(dosDate, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);
    offset += head.length + nameBuf.length + packed.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, end]);
}

const data = await engineData();
rmSync(OUT, { recursive: true, force: true });
const outputs = new Map();
for (const path of walk(SOURCE)) {
  outputs.set(relative(SOURCE, path), fill(readFileSync(path, 'utf8'), data));
}
outputs.set('references/emotions.md', emotionsDoc(data));
outputs.set('references/characters.md', charactersDoc(data));

const files = [...outputs.keys()].sort().map((rel) => {
  const target = join(SKILL_OUT, rel);
  mkdirSync(dirname(target), { recursive: true });
  const body = Buffer.from(outputs.get(rel), 'utf8');
  writeFileSync(target, body);
  return { name: `${NAME}/${rel}`, data: body };
});
writeFileSync(join(OUT, `${NAME}.tar.gz`), tarGz(files));
writeFileSync(join(OUT, `${NAME}.zip`), zip(files));
writeFileSync(join(ROOT, 'public', 'llms.txt'), llmsTxt(data));

console.log(
  `Skill "${NAME}" for ${SITE_URL}: ${files.length} files, ${data.characters.length} characters, ${data.emotions.length} emotions, engine ${data.version}`,
);
