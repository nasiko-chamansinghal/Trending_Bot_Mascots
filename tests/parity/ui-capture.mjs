import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { initScript } from './init-script.mjs';

const [baseUrl, outDir] = process.argv.slice(2);
if (!baseUrl || !outDir) {
  console.error('usage: node ui-capture.mjs <baseUrl> <outDir>');
  process.exit(1);
}

const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
const MASCOT_HOSTS = '.stage, .thumb, .cast-avatar, .brand-ball, .hero-bot, .baby';

const skeleton = (hostSelector) => {
  const root = document.getElementById('root') || document.body;
  const clone = root.cloneNode(true);
  for (const svg of clone.querySelectorAll('svg')) {
    if (svg.closest(hostSelector)) svg.replaceWith(document.createElement('svg'));
  }
  for (const el of clone.querySelectorAll('script, #langToggle')) el.remove();
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const c of comments) c.remove();
  const srcInputs = [...root.querySelectorAll('input, select, option')];
  const dstInputs = [...clone.querySelectorAll('input, select, option')];
  dstInputs.forEach((dst, i) => {
    const src = srcInputs[i];
    if (dst.tagName === 'INPUT' && dst.type === 'checkbox') {
      dst.removeAttribute('checked');
      dst.setAttribute('data-checked', String(src.checked));
    } else if (dst.tagName === 'INPUT') {
      const isDefaultAi =
        dst.id === 'aiInput' &&
        /"emotionId":"30","tips":"(\u6b63\u5728\u601d\u8003\u7528\u6237\u95ee\u9898|Thinking about the user's question)"/.test(
          src.value,
        );
      dst.setAttribute('value', isDefaultAi ? 'DEFAULT_AI_MESSAGE' : src.value);
    } else if (dst.tagName === 'OPTION') {
      dst.removeAttribute('selected');
      dst.setAttribute('data-selected', String(src.selected));
    }
  });
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    el.removeAttribute('data-i18n');
    if (el.hasAttribute('style')) {
      const css = el.style.cssText;
      if (css) el.setAttribute('style', css);
      else el.removeAttribute('style');
    }
    if (el.hasAttribute('class')) {
      const classes = el.getAttribute('class').split(/\s+/).filter(Boolean).sort().join(' ');
      if (classes) el.setAttribute('class', classes);
      else el.removeAttribute('class');
    }
    const attrs = [...el.attributes].map((a) => [a.name, a.value]).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name] of attrs) el.removeAttribute(name);
    for (const [name, value] of attrs) el.setAttribute(name, value);
  }
  const head = {
    lang: document.documentElement.lang,
    theme: document.documentElement.getAttribute('data-theme'),
    body: [...document.body.classList].sort().join(' '),
  };
  const html = clone.innerHTML
    .replace(
      '\u672a\u77e5\u8868\u60c5 ID "99"\uff0c\u5df2\u56de\u9000\u5f85\u673a',
      'Unknown emotion ID "99", fell back to idle',
    )
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
  return `${JSON.stringify(head)}\n${html.replace(/></g, '>\n<')}`;
};

const PAGES = [
  {
    name: 'root',
    url: '/',
    key: 'eg.prefs.v2',
    prefs: { lang: 'en', theme: 'dark', mode: 'wall', sketch: false, tourMs: 2500, variants: {} },
    steps: [
      ['initial', async () => {}],
      ['cast-nimbo', async (c) => c.click('#castRow .cast:nth-child(2)')],
      ['cast-twinkle', async (c) => c.click('#castRow .cast:nth-child(3)')],
      ['cast-ball', async (c) => c.click('#castRow .cast:nth-child(1)')],
      ['variant-wedge', async (c) => c.pick('variantSelect', 1)],
      ['variant-gem', async (c) => c.pick('variantSelect', 2)],
      ['group-emotion', async (c) => c.pick('groupSelect', 2)],
      ['group-all', async (c) => c.pick('groupSelect', 0)],
      ['thumb-click', async (c) => c.click('#thumbFlow .cell:nth-child(5)')],
      ['next', async (c) => c.click('#navNext')],
      ['prev', async (c) => c.click('#navPrev')],
      ['escape', async (c) => c.key('Escape')],
      ['dropdown-open', async (c) => c.click('#groupSelect ~ .dd-trigger')],
      ['dropdown-dismiss', async (c) => c.click('.gallery-hint')],
      ['sketch-on', async (c) => c.click('#sketchToggle')],
      ['interval-4s', async (c) => c.pick('tourInterval', 2)],
      ['tour-on', async (c) => c.click('#tourToggle'), 3200],
      ['tour-off', async (c) => c.click('#tourToggle')],
      ['theme-light', async (c) => c.click('#themeToggle')],
      ['mode-album', async (c) => c.click('#modeAlbum')],
      ['album-next', async (c) => c.key('ArrowRight')],
      ['mode-wall', async (c) => c.click('#modeWall')],
      ['stage-click', async (c) => c.click('#stage')],
      ['gaze-move', async (c) => c.mouse(1100, 300)],
      ['thumb-hover', async (c) => c.hover('#thumbFlow .cell:nth-child(3)')],
      ['mouse-away', async (c) => c.mouse(5, 5)],
    ],
  },
  {
    name: 'mood-mates',
    url: '/mood-mates/',
    key: 'mm.prefs',
    prefs: { lang: 'en', theme: 'dark', mode: 'wall', sketch: false, tourMs: 2500, variants: {} },
    steps: [
      ['initial', async () => {}],
      ['cast-twinkle', async (c) => c.click('#castRow .cast:nth-child(2)')],
      ['cast-nimbo', async (c) => c.click('#castRow .cast:nth-child(1)')],
      ['tab-agent', async (c) => c.click('#tabs .tab:nth-child(4)')],
      ['tab-all', async (c) => c.click('#tabs .tab:nth-child(1)')],
      ['thumb-click', async (c) => c.click('#thumbFlow .cell:nth-child(7)')],
      ['next', async (c) => c.click('#navNext')],
      ['escape', async (c) => c.key('Escape')],
      ['drawer-open', async (c) => c.click('#settingsToggle'), 600],
      ['drawer-dropdown', async (c) => c.click('#charSelect ~ .dd-trigger')],
      ['drawer-char-select', async (c) => c.pick('charSelect', 1)],
      ['drawer-sketch', async (c) => c.click('#sketchToggle')],
      [
        'ai-send',
        async (c) => {
          await c.type('#aiInput', '{"emotionId":"30","tips":"thinking"}');
          await c.click('#aiSend');
        },
        900,
      ],
      ['ai-bad', async (c) => c.click('#aiSampleBad'), 900],
      ['ai-err', async (c) => c.click('#aiSampleErr'), 900],
      ['drawer-escape', async (c) => c.key('Escape'), 600],
      ['theme-light', async (c) => c.click('#themeToggle')],
      ['mode-album', async (c) => c.click('#modeAlbum')],
      ['stage-click', async (c) => c.click('#stage')],
      ['gaze-move', async (c) => c.mouse(1100, 300)],
      ['thumb-hover', async (c) => c.hover('#thumbFlow .cell:nth-child(3)')],
      ['mouse-away', async (c) => c.mouse(5, 5)],
    ],
  },
  {
    name: 'emotion-ball',
    url: '/emotion-ball/',
    key: 'eb.prefs',
    prefs: { lang: 'en', theme: 'dark', mode: 'wall', shape: 'blob', sketch: false, tourMs: 2500 },
    steps: [
      ['initial', async () => {}],
      ['tab-emotion', async (c) => c.click('#tabs .tab:nth-child(3)')],
      ['tab-all', async (c) => c.click('#tabs .tab:nth-child(1)')],
      ['thumb-click', async (c) => c.click('#thumbFlow .cell:nth-child(7)')],
      ['baby-click', async (c) => c.click('#babyList .baby:nth-child(3)')],
      ['next', async (c) => c.click('#navNext')],
      ['escape', async (c) => c.key('Escape')],
      ['drawer-open', async (c) => c.click('#settingsToggle'), 600],
      ['shape-wedge', async (c) => c.pick('shapeSelect', 1)],
      ['shape-gem', async (c) => c.pick('shapeSelect', 2)],
      ['drawer-sketch', async (c) => c.click('#sketchToggle')],
      ['tour-on', async (c) => c.click('#tourToggle'), 3200],
      ['tour-off', async (c) => c.click('#tourToggle')],
      [
        'ai-send',
        async (c) => {
          await c.type('#aiInput', '{"emotionId":"30","tips":"thinking"}');
          await c.click('#aiSend');
        },
        900,
      ],
      ['ai-bad', async (c) => c.click('#aiSampleBad'), 900],
      ['drawer-escape', async (c) => c.key('Escape'), 600],
      ['theme-light', async (c) => c.click('#themeToggle')],
      ['mode-album', async (c) => c.click('#modeAlbum')],
      ['stage-click', async (c) => c.click('#stage')],
      ['gaze-move', async (c) => c.mouse(1100, 300)],
      ['thumb-hover', async (c) => c.hover('#thumbFlow .cell:nth-child(3)')],
      ['mouse-away', async (c) => c.mouse(5, 5)],
    ],
  },
];

const advance = (page, ms) => page.evaluate((m) => window.__advance(m), ms);

async function runPage(browser, cfg) {
  const dir = path.join(outDir, cfg.name);
  await mkdir(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(initScript, { key: cfg.key, prefs: cfg.prefs, constantRandom: true });
  await page.goto(baseUrl + cfg.url, { waitUntil: 'load' });
  await page.addStyleTag({ content: FREEZE_CSS });
  await advance(page, 2500);

  const ctx = {
    click: (sel) =>
      page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) throw new Error(`missing ${s}`);
        el.click();
      }, sel),
    pick: (id, index) =>
      page.evaluate(
        ([i, n]) => {
          const host = document.getElementById(i)?.parentElement;
          const items = host?.querySelectorAll('.dd-item');
          if (!items?.[n]) throw new Error(`missing dropdown item ${i}[${n}]`);
          items[n].click();
        },
        [id, index],
      ),
    type: (sel, text) =>
      page.evaluate(
        ([s, v]) => {
          const el = document.querySelector(s);
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        [sel, text],
      ),
    mouse: (x, y) => page.mouse.move(x, y),
    hover: (sel) => page.hover(sel),
    key: (k) =>
      page.evaluate((key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })), k),
  };

  let n = 0;
  const snap = async (name) => {
    await page.waitForTimeout(500);
    const tag = `${String(n++).padStart(2, '0')}-${name}`;
    const prefs = await page.evaluate((k) => {
      const saved = JSON.parse(localStorage.getItem(k) || '{}');
      delete saved.lang;
      return JSON.stringify(Object.fromEntries(Object.entries(saved).sort()));
    }, cfg.key);
    const body = await page.evaluate(skeleton, MASCOT_HOSTS);
    await writeFile(path.join(dir, `${tag}.txt`), `${prefs}\n${body}`);
    await page.screenshot({ path: path.join(dir, `${tag}.png`) });
  };

  await snap('initial');
  for (const [name, action, wait] of cfg.steps.slice(1)) {
    await action(ctx);
    await advance(page, wait ?? 1500);
    await snap(name);
  }
  await context.close();
  return { page: cfg.name, steps: n, errors };
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const results = await Promise.all(PAGES.map((cfg) => runPage(browser, cfg)));
await browser.close();
console.log(JSON.stringify(results));
