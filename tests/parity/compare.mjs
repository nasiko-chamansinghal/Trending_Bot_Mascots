import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const [dirA, dirB] = process.argv.slice(2);
const NUM_TOLERANCE = 0.05;
const PIXEL_RATIO_LIMIT = 0.002;
const NUM_RE = /-?\d+(?:\.\d+)?/g;

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

function compareText(a, b) {
  if (a.replace(NUM_RE, '#') !== b.replace(NUM_RE, '#')) return 'structure differs';
  const na = a.match(NUM_RE) ?? [];
  const nb = b.match(NUM_RE) ?? [];
  let worst = 0;
  for (let i = 0; i < na.length; i++) worst = Math.max(worst, Math.abs(Number(na[i]) - Number(nb[i])));
  return worst > NUM_TOLERANCE ? `numeric drift ${worst.toFixed(3)}` : null;
}

function comparePng(a, b) {
  const imgA = PNG.sync.read(a);
  const imgB = PNG.sync.read(b);
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) return 'size differs';
  const diff = pixelmatch(imgA.data, imgB.data, null, imgA.width, imgA.height, { threshold: 0.1 });
  const ratio = diff / (imgA.width * imgA.height);
  return ratio > PIXEL_RATIO_LIMIT ? `pixel diff ${(ratio * 100).toFixed(2)}%` : null;
}

const filesA = await walk(dirA);
const filesB = await walk(dirB);
const failures = [];
const onlyA = filesA.filter((f) => !filesB.includes(f));
const onlyB = filesB.filter((f) => !filesA.includes(f));
for (const f of onlyA) failures.push(`${f}: missing in candidate`);
for (const f of onlyB) failures.push(`${f}: unexpected in candidate`);

let checked = 0;
for (const f of filesA.filter((x) => filesB.includes(x))) {
  const [a, b] = await Promise.all([readFile(path.join(dirA, f)), readFile(path.join(dirB, f))]);
  const problem = f.endsWith('.png') ? comparePng(a, b) : compareText(a.toString(), b.toString());
  checked++;
  if (problem) failures.push(`${f}: ${problem}`);
}

console.log(`checked ${checked} files, ${failures.length} failures`);
for (const f of failures.slice(0, 40)) console.log(`  ${f}`);
process.exit(failures.length ? 1 : 0);
