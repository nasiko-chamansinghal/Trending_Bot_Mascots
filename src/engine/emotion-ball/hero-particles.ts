const TEX_W = 1000;
const TEX_H = Math.round((1000 * 642) / 1556);
const PITCH = Math.round((TEX_W * 16) / 1556);

interface Dot {
  x: number;
  y: number;
  t: number;
  phase: number;
  rate: number;
}

function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function buildDots(): Dot[] {
  const cols = Math.ceil(TEX_W / PITCH);
  const rows = Math.ceil(TEX_H / PITCH);
  const clusters = [
    { cx: 0.28 * TEX_W, cy: 0.36 * TEX_H, rx: 0.26 * TEX_W, ry: 0.32 * TEX_H, gain: 1 },
    { cx: 0.74 * TEX_W, cy: 0.44 * TEX_H, rx: 0.2 * TEX_W, ry: 0.28 * TEX_H, gain: 0.88 },
  ];
  const dots: Dot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * PITCH + PITCH / 2;
      const y = r * PITCH + PITCH / 2;
      let intensity = 0;
      for (let i = 0; i < clusters.length; i++) {
        const cl = clusters[i] as (typeof clusters)[number];
        const dx = (x - cl.cx) / cl.rx;
        const dy = (y - cl.cy) / cl.ry;
        intensity = Math.max(intensity, Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)) * cl.gain);
      }
      if (intensity <= 0.02) continue;
      const edge = intensity + (noise(c, r) - 0.5) * 0.35;
      if (edge < 0.12) continue;
      dots.push({
        x,
        y,
        t: Math.min(1, edge),
        phase: noise(c * 3.1, r * 2.7) * Math.PI * 2,
        rate: 0.7 + noise(c * 1.3, r * 5.9) * 0.6,
      });
    }
  }
  return dots;
}

function buildStarfield(w: number, h: number, seed: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
  let s = seed;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const count = Math.round(w * h * 0.00034);
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r0 = rnd();
    const size = r0 > 0.97 ? 1.5 + rnd() * 0.7 : r0 > 0.8 ? 0.8 + rnd() * 0.45 : 0.45 + rnd() * 0.35;
    const alpha = r0 > 0.97 ? 0.7 + rnd() * 0.28 : 0.16 + rnd() * 0.46;
    ctx.fillStyle = rnd() > 0.85 ? `rgba(255,246,232,${alpha})` : `rgba(226,232,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  return cv;
}

function isDark(): boolean {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}

function prefersReduce(): boolean {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function mountHeroParticles(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const dots = buildDots();
  let stars: HTMLCanvasElement | null = null;
  let cssW = 0;
  let cssH = 0;
  let raf = 0;
  const start = performance.now();
  let running = false;
  let inView = true;
  let dark = isDark();
  let reduce = prefersReduce();
  const breatheAmp = 0.62;
  const breathePeriod = 6;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, Math.round(rect.width));
    cssH = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    (ctx as CanvasRenderingContext2D).setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = dark ? buildStarfield(cssW, cssH, 987654321) : null;
    if (cssW > 1) draw(performance.now());
  }

  function paintDots(time: number): void {
    const c = ctx as CanvasRenderingContext2D;
    const omega = (Math.PI * 2) / breathePeriod;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i] as Dot;
      const s = Math.sin(time * omega * d.rate + d.phase) * 0.5 + 0.5;
      const breath = reduce ? 0.72 : 1 - breatheAmp + breatheAmp * s;
      const t = d.t;
      let R: number;
      let G: number;
      let B: number;
      let a: number;
      if (dark) {
        R = Math.round((14 + t * 46) * 0.28 + (40 + 150 * t) * 0.72 * breath);
        G = Math.round((14 + t * 46) * 0.28 + (20 + 55 * t) * 0.72 * breath);
        B = Math.round((16 + t * 46) * 0.28 + (55 + 205 * t) * 0.72 * breath);
        a = (0.42 + t * 0.55) * breath;
      } else {
        R = Math.round(110 + 35 * t);
        G = Math.round(33 + 40 * t);
        B = Math.round(196 + 20 * t);
        a = (0.07 + t * 0.16) * breath;
      }
      c.fillStyle = `rgba(${R},${G},${B},${a})`;
      c.beginPath();
      c.arc(d.x, d.y, 1.5 + t * 1.5, 0, Math.PI * 2);
      c.fill();
    }
  }

  function draw(now: number): void {
    const c = ctx as CanvasRenderingContext2D;
    const time = (now - start) / 1000;
    c.clearRect(0, 0, cssW, cssH);
    if (stars) c.drawImage(stars, 0, 0, cssW, cssH);
    c.save();
    c.globalCompositeOperation = dark ? 'screen' : 'source-over';
    const tw = cssW * 0.9;
    const th = tw * (TEX_H / TEX_W);
    c.translate((cssW - tw) / 2, cssH * 0.4 - th / 2);
    c.scale(tw / TEX_W, th / TEX_H);
    paintDots(time);
    c.restore();
  }

  function frame(now: number): void {
    raf = 0;
    if (!running) return;
    draw(now);
    if (running) raf = requestAnimationFrame(frame);
  }

  function play(): void {
    if (reduce) {
      draw(performance.now());
      return;
    }
    if (running || !inView || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function pause(): void {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function syncTheme(): void {
    dark = isDark();
    resize();
    if (running) return;
    draw(performance.now());
  }

  function onVis(): void {
    if (document.hidden) pause();
    else play();
  }

  resize();
  play();

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const io = new IntersectionObserver(
    (entries) => {
      inView = !!entries[0]?.isIntersecting;
      if (inView) play();
      else pause();
    },
    { threshold: 0.08 },
  );
  const hero = canvas.closest('.hero') || canvas.parentNode;
  io.observe((hero as Element) || canvas);

  const mo = new MutationObserver(syncTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  document.addEventListener('visibilitychange', onVis);
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const onMotionChange = (e: MediaQueryListEvent): void => {
    reduce = e.matches;
    if (reduce) {
      pause();
      draw(performance.now());
    } else play();
  };
  motionQuery?.addEventListener('change', onMotionChange);

  return () => {
    pause();
    ro.disconnect();
    io.disconnect();
    mo.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    motionQuery?.removeEventListener('change', onMotionChange);
  };
}
