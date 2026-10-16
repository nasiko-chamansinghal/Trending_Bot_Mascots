import { type MutableRefObject, type ReactNode, useEffect, useRef } from 'react';
import { mountHeroParticles } from '../../engine/emotion-ball/hero-particles';
import type { MascotEngine } from '../engine-types';

interface HeroProps {
  eyebrow?: string;
  title: string;
  sub: string;
  cta: string;
  hint?: string;
  particles: boolean;
  engineRef: MutableRefObject<MascotEngine | null>;
  intro: (hero: MascotEngine) => void;
  bot: ReactNode;
}

export function Hero({ eyebrow, title, sub, cta, hint, particles, engineRef, intro, bot }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef(intro);
  introRef.current = intro;

  useEffect(() => {
    const timer = setTimeout(() => {
      const hero = engineRef.current;
      if (hero) introRef.current(hero);
    }, 700);
    return () => clearTimeout(timer);
  }, [engineRef]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        engineRef.current?.setActive(!!entries[0]?.isIntersecting);
      },
      { threshold: 0.05 },
    );
    io.observe(sectionRef.current as HTMLElement);
    return () => io.disconnect();
  }, [engineRef]);

  useEffect(() => {
    if (!particles || !canvasRef.current) return;
    return mountHeroParticles(canvasRef.current);
  }, [particles]);

  return (
    <section className="hero" id="hero" ref={sectionRef}>
      <div className="hero-backdrop" aria-hidden="true">
        {particles ? <canvas id="heroParticles" className="hero-particles" ref={canvasRef} /> : null}
      </div>
      <div className="hero-copy">
        {eyebrow ? <p className="hero-eyebrow">{eyebrow}</p> : null}
        <h1 className="hero-title">{title}</h1>
        <p className="hero-sub">{sub}</p>
        <button
          type="button"
          id="heroCta"
          className="hero-cta"
          onClick={() =>
            document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          <span>{cta}</span>
          <span className="cta-arrow" aria-hidden="true">
            ↓
          </span>
        </button>
      </div>
      {hint ? <p className="hero-hint">{hint}</p> : null}
      <div className="hero-bot-clip" aria-hidden="true">
        {bot}
      </div>
    </section>
  );
}
