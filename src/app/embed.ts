import { getDesign } from './designer/store';
import type { Look, Segment } from './videoExport';

const SIZE = 240;

function uniqueHostId(): string {
  return `mascot-${Math.random().toString(36).slice(2, 7)}`;
}

function quote(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function optionLines(look: Look, character: string | null): string[] {
  const lines: string[] = [];
  if (character) lines.push(`character: ${character}`);
  if (look.color) lines.push(`color: ${quote(look.color)}`);
  if (look.eyeColor) lines.push(`eyeColor: ${quote(look.eyeColor)}`);
  return lines;
}

function playback(timeline: Segment[]): string {
  const ids = timeline.map((s) => s.emotion);
  if (ids.length === 1) return `bot.setEmotion(${quote(ids[0] as string)});`;
  const ms = timeline[0]?.ms ?? 2000;
  return `bot.startTour([${ids.map(quote).join(', ')}], ${ms});`;
}

export function embedCode(look: Look, timeline: Segment[]): string {
  const ball = look.character === 'ball';
  const design = getDesign(look.character);
  const library = ball ? 'emotion-ball' : 'mood-mates';
  const global = ball ? 'EmotionBall' : 'MoodMates';
  const hostId = uniqueHostId();
  const host = `document.getElementById('${hostId}')`;
  const lines = [
    `<div id="${hostId}" style="width:${SIZE}px;height:${SIZE}px"></div>`,
    `<script src="${window.location.origin}/${library}.js"></script>`,
    '<script>',
  ];
  let character: string | null = ball ? null : quote(look.character);
  if (design) {
    const { id: _id, ...portable } = design;
    lines.push(`  var id = MoodMates.registerDesign(${JSON.stringify(portable)});`);
    character = 'id';
  }
  const options = optionLines(look, character);
  if (options.length) {
    lines.push(
      `  var bot = ${global}.create(${host}, {`,
      options.map((line) => `    ${line}`).join(',\n'),
      '  });',
    );
  } else {
    lines.push(`  var bot = ${global}.create(${host});`);
  }
  lines.push(`  ${playback(timeline)}`, '</script>');
  return lines.join('\n');
}
