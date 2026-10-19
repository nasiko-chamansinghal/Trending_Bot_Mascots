import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const [baseUrl] = process.argv.slice(2);
if (!baseUrl) {
  console.error('usage: node live-check.mjs <baseUrl>');
  process.exit(1);
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

async function domClick(page, selector) {
  await page.locator(selector).evaluate((el) => el.click());
}

const browser = await chromium.launch();

async function open(path, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)\.com/.test(m.location().url)) {
      errors.push(`console: ${m.text()}`);
    }
  });
  await page.goto(baseUrl + path, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  return { context, page, errors };
}

const svgCount = (page, sel) => page.locator(`${sel} > svg`).count();

for (const [name, path, cast] of [
  ['root', '/', 5],
  ['mood-mates', '/mood-mates/', 4],
  ['emotion-ball', '/emotion-ball/', 0],
]) {
  const { context, page, errors } = await open(path);
  check(`${name}: no console or page errors on load`, errors.length === 0, errors[0] ?? '');
  check(`${name}: exactly one SVG in the stage`, (await svgCount(page, '#stage')) === 1);
  check(
    `${name}: 32 thumbnails, one SVG each`,
    (await page.locator('#thumbFlow .cell > .thumb > svg').count()) === 32,
  );
  check(
    `${name}: hero, brand mascots present`,
    (await svgCount(page, '#heroBot')) === 1 && (await svgCount(page, '#brandBall')) === 1,
  );
  if (cast)
    check(
      `${name}: ${cast} cast avatars`,
      (await page.locator('#castRow .cast-avatar > svg').count()) === cast,
    );
  if (name === 'emotion-ball')
    check(`${name}: 8 team bots`, (await page.locator('#babyList .baby > svg').count()) === 8);

  const before = await page.locator('#stage').innerHTML();
  await page.waitForTimeout(700);
  const after = await page.locator('#stage').innerHTML();
  check(`${name}: stage animates in real time`, before !== after);

  const eyes = async () => (await page.locator('#stage').innerHTML()).replace(/\s+/g, '');
  await page.mouse.move(20, 20);
  await page.locator('#stage').scrollIntoViewIfNeeded();
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(900);
  const centered = await eyes();
  await page.mouse.move(box.x + box.width + 200, box.y + 10);
  await page.waitForTimeout(900);
  const looking = await eyes();
  check(`${name}: eyes follow the real mouse`, centered !== looking);

  await page.locator('#thumbFlow .cell').nth(11).click();
  await page.waitForTimeout(600);
  check(
    `${name}: thumbnail click opens the stage`,
    (await page.evaluate(() => document.body.classList.contains('stage-open'))) === true,
  );
  const pager = await page.locator('#pager').textContent();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  check(`${name}: ArrowRight pages forward`, (await page.locator('#pager').textContent()) !== pager);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(
    `${name}: Escape closes the stage`,
    (await page.evaluate(() => document.body.classList.contains('stage-open'))) === false,
  );

  await page.evaluate(() => document.getElementById('themeToggle').click());
  await page.waitForTimeout(200);
  check(
    `${name}: theme toggles to light`,
    (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light',
  );
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  check(
    `${name}: theme persists across reload`,
    (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light',
  );
  check(`${name}: no duplicate stage SVG after reload`, (await svgCount(page, '#stage')) === 1);

  await page.evaluate(() => document.getElementById('modeAlbum').click());
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  check(
    `${name}: album mode persists across reload`,
    (await page.evaluate(() => document.body.classList.contains('mode-album'))) === true,
  );
  await context.close();
}

{
  const { context, page, errors } = await open('/mood-mates/');
  await page.click('#settingsToggle');
  await page.waitForTimeout(500);
  check('mood-mates: drawer opens', (await page.locator('#drawer.open').count()) === 1);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  const path = await download.path();
  const exported = JSON.parse(await readFile(path, 'utf8'));
  check(
    'mood-mates: export downloads 32 emotions',
    Array.isArray(exported) && exported.length === 32,
    `${exported.length}`,
  );
  check('mood-mates: export filename', download.suggestedFilename() === 'mood-mates-config.json');

  exported[0].name = 'Renamed By Import';
  await page.setInputFiles('#importFile', {
    name: 'cfg.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await page.waitForTimeout(600);
  check(
    'mood-mates: import toast reports success',
    /Imported 32 emotion configs/.test((await page.locator('#toast').textContent()) ?? ''),
  );
  check(
    'mood-mates: imported name shows in thumbnails',
    (await page.locator('#thumbFlow .cell-label span:nth-child(2)').first().textContent()) ===
      'Renamed By Import',
  );
  check(
    'mood-mates: thumbnails rebuilt after import',
    (await page.locator('#thumbFlow .cell > .thumb > svg').count()) === 32,
  );

  await page.fill('#aiInput', '{"emotionId":"34","tips":"live test tip"}');
  await page.click('#aiSend');
  await page.waitForTimeout(500);
  check(
    'mood-mates: AI message shows tips bubble',
    (await page.locator('#tips.show').textContent()) === 'live test tip',
  );
  check(
    'mood-mates: AI message switches emotion',
    /ID 34/.test((await page.locator('#emoId').textContent()) ?? ''),
  );
  await page.click('#aiSampleBad');
  await page.waitForTimeout(400);
  check(
    'mood-mates: unknown ID raises danger toast',
    (await page.locator('#toast.danger.show').count()) === 1,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  check('mood-mates: Escape closes the drawer', (await page.locator('#drawer.open').count()) === 0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  check(
    'mood-mates: second Escape closes the stage',
    (await page.evaluate(() => document.body.classList.contains('stage-open'))) === false,
  );

  await page.click('#castRow .cast:nth-child(2)');
  await page.waitForTimeout(600);
  check(
    'mood-mates: cast click switches character',
    (await page.locator('#castRow .cast.selected .cast-name').textContent()) === 'Twinkle',
  );
  check('mood-mates: stage rebuilt with one SVG after switching', (await svgCount(page, '#stage')) === 1);
  check('mood-mates: no errors during interaction', errors.length === 0, errors[0] ?? '');
  await context.close();
}

{
  const { context, page, errors } = await open('/');
  await page.click('#castRow .cast:nth-child(2)');
  await page.waitForTimeout(500);
  await page.click('#castRow .cast:nth-child(3)');
  await page.waitForTimeout(500);
  await page.click('#castRow .cast:nth-child(1)');
  await page.waitForTimeout(500);
  await page.click('#variantSelect ~ .dd-trigger');
  await page.click('#variantSelect ~ .dd-pop .dd-item:nth-child(3)');
  await page.waitForTimeout(500);
  check('root: shape change keeps one stage SVG', (await svgCount(page, '#stage')) === 1);
  const before = await page.locator('#pager').textContent();
  await domClick(page, 'label:has(#tourToggle)');
  await page.waitForTimeout(4200);
  const duringTour = await page.locator('#pager').textContent();
  await domClick(page, 'label:has(#tourToggle)');
  check(
    'root: autoplay tour advances the emotion in real time',
    before !== duringTour,
    `${before} -> ${duringTour}`,
  );
  await domClick(page, 'label:has(#sketchToggle)');
  await page.waitForTimeout(400);
  check(
    'root: sketch mode outlines the stage body',
    (await page.locator('#stage').innerHTML()).includes('stroke-opacity="0.85"'),
  );
  check('root: rapid character/shape switching leaves no errors', errors.length === 0, errors[0] ?? '');
  await context.close();
}

{
  const { context, page, errors } = await open('/', { width: 390, height: 780 });
  check('mobile viewport: renders without errors', errors.length === 0, errors[0] ?? '');
  check(
    'mobile viewport: stage and thumbnails present',
    (await svgCount(page, '#stage')) === 1 && (await page.locator('#thumbFlow .cell').count()) === 32,
  );
  await context.close();
}

{
  const { context, page } = await open('/mood-mates/tools/ring-editor.html');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  check(
    'ring editor: body path rendered',
    ((await page.locator('#bodyPath').getAttribute('d')) ?? '').startsWith('M'),
  );
  check(
    'ring editor: 20 eye slots and 9 mouth slots',
    (await page.locator('#eyeGrid .slot-cell').count()) === 20 &&
      (await page.locator('#mouthGrid .slot-cell').count()) === 9,
  );
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
