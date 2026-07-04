import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  speedY: number;
  speedX: number;
  amplitude: number;
  frequency: number;
  phase: number;
  opacity: number;
  life: number;
  maxLife: number;
}

const PARTICLE_COLORS = [
  'rgba(212, 168, 83, ',   // warm gold
  'rgba(184, 147, 74, ',   // muted gold
  'rgba(193, 122, 95, ',   // terracotta
  'rgba(245, 240, 232, ',  // cream
];

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const maxParticles = isMobile ? 60 : 120;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const createParticle = (): Particle => {
      const colorIdx = Math.floor(Math.random() * PARTICLE_COLORS.length);
      const life = Math.random() * 200 + 100;
      return {
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + Math.random() * 50,
        radius: Math.random() * 2.5 + 1.5,
        color: PARTICLE_COLORS[colorIdx],
        speedY: -(Math.random() * 0.9 + 0.3),
        speedX: (Math.random() - 0.5) * 0.2,
        amplitude: Math.random() * 60 + 20,
        frequency: Math.random() * 0.002 + 0.001,
        phase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.4 + 0.2,
        life: 0,
        maxLife: life,
      };
    };

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle();
      p.y = Math.random() * window.innerHeight;
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    const animate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      particlesRef.current.forEach((p, i) => {
        p.life++;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.life * p.frequency + p.phase) * 0.3;

        // Fade out near top
        const topFadeZone = h * 0.2;
        let alpha = p.opacity;
        if (p.y < topFadeZone) {
          alpha = p.opacity * (p.y / topFadeZone);
        }
        // Fade in/out based on life
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.1) alpha *= lifeRatio / 0.1;
        if (lifeRatio > 0.8) alpha *= (1 - lifeRatio) / 0.2;

        if (p.life >= p.maxLife || p.y < -10) {
          particlesRef.current[i] = createParticle();
          return;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + alpha + ')';
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (alpha * 0.15) + ')';
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      particlesRef.current = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
