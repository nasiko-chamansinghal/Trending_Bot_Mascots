import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { scenario } from './engine-scenario.mjs';
import { initScript } from './init-script.mjs';

const [pageUrl, outDir] = process.argv.slice(2);
if (!pageUrl || !outDir) {
  console.error('usage: node engine-capture.mjs <harnessUrl> <outDir>');
  process.exit(1);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.addInitScript(initScript, {});
await page.goto(pageUrl, { waitUntil: 'load' });
const result = await page.evaluate(scenario);
await browser.close();

const normalize = (value) => value.replace(/></g, '>\n<');
for (const [key, value] of Object.entries(result)) {
  const file = path.join(outDir, `${key}.txt`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, normalize(String(value)));
}
console.log(JSON.stringify({ keys: Object.keys(result).length, pageErrors }));
