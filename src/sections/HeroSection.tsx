import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import ParticleCanvas from '@/components/ParticleCanvas';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollStarted, setScrollStarted] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });

      tl.fromTo('.hero-label', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
        .fromTo('.hero-title', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' }, '-=0.3')
        .fromTo('.hero-tagline', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.5')
        .fromTo('.hero-buttons', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.3')
        .fromTo('.hero-scroll', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.1');
    }, contentRef);

    const onScroll = () => {
      if (window.scrollY > 50) setScrollStarted(true);
      else setScrollStarted(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      ctx.revert();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section className="relative w-full min-h-[100dvh] overflow-hidden bg-charcoal">
      {/* Particle Canvas */}
      <ParticleCanvas />

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(26,24,22,0.3) 0%, rgba(26,24,22,0.8) 100%)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div ref={contentRef} className="relative flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center" style={{ zIndex: 2 }}>
        <div className="max-w-[900px] pt-[72px]">
          {/* Section Label */}
          <div className="hero-label flex items-center justify-center gap-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-warm-gold" />
            <span className="font-body font-medium text-xs uppercase tracking-[0.15em] text-warm-gold">
              Est. 1986
            </span>
          </div>

          {/* Hero Title */}
          <h1 className="hero-title font-display font-bold text-cream leading-[1.05] tracking-[-0.02em] text-[44px] md:text-[80px]">
            Restoran
            <br />
            Wawasan
          </h1>

          {/* Tagline */}
          <p className="hero-tagline font-body text-base md:text-xl text-cream/70 leading-relaxed max-w-[560px] mx-auto mt-6">
            Where Heritage Meets Flavor in the Heart of Putrajaya
          </p>

          {/* CTA Buttons */}
          <div className="hero-buttons flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mt-10 w-full max-w-sm sm:max-w-none mx-auto">
            <Link
              to="/order"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-warm-gold text-charcoal font-body font-semibold text-sm uppercase tracking-[0.05em] rounded-lg hover:bg-[#E0BC74] hover:scale-[1.02] transition-all duration-300 active:scale-[0.98] shadow-[0_4px_20px_rgba(212,168,83,0.3)]"
            >
              Order Now
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="#menu"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 border border-warm-gold text-warm-gold font-body font-semibold text-sm uppercase tracking-[0.05em] rounded-lg hover:bg-warm-gold hover:text-charcoal transition-all duration-300"
            >
              View Our Menu
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          className={`hero-scroll absolute bottom-10 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${scrollStarted ? 'opacity-0' : 'opacity-100'}`}
        >
          <ChevronDown className="w-6 h-6 text-cream/40 animate-bounce-down" />
        </div>
      </div>
    </section>
  );
}
