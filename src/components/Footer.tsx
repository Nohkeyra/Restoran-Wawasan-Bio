import { Utensils, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Our Story', href: '#story' },
  { label: 'Menu', href: '#menu' },
  { label: 'Experience', href: '#experience' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Visit Us', href: '#visit' },
];

export default function Footer() {
  return (
    <footer className="bg-charcoal border-t border-warm-gold/15 pt-16 pb-8">
      <div className="content-container">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-10">
          {/* Logo */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Utensils className="w-4 h-4 text-warm-gold" />
              <span className="font-display font-semibold text-2xl text-cream">Restoran</span>
            </div>
            <span className="block font-body text-sm text-cream/60 mt-1">Wawasan</span>
            <span className="block font-body text-xs text-warm-gold tracking-[0.1em] mt-2">
              Since 1986
            </span>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col items-center md:items-start gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-body text-sm text-cream/60 hover:text-warm-gold transition-colors duration-300 py-1.5 px-3 -mx-3"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Social */}
          <div className="text-center md:text-right">
            <span className="font-body font-medium text-xs uppercase text-warm-gold tracking-[0.1em]">
              Follow Us
            </span>
            <a
              href="https://www.facebook.com/Restoran-Wawasan-Pakusop-1057152710976512/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-cream/60 hover:text-warm-gold transition-colors duration-300 mt-2 justify-center md:justify-end py-2 px-3 -mx-3"
            >
              <Facebook className="w-4 h-4" />
              <span className="font-body text-sm">Restoran Wawasan</span>
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-warm-gold/15 my-10" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <p className="font-body text-xs text-cream/40 text-center md:text-left">
              &copy; {new Date().getFullYear()} Restoran Wawasan. All rights reserved.
            </p>
            <span className="hidden md:inline text-cream/20">|</span>
            <Link
              to="/admin"
              className="font-body text-xs text-cream/40 hover:text-warm-gold transition-colors duration-300 py-2 px-3 -mx-3 md:mx-0"
            >
              Admin Panel
            </Link>
          </div>
          <span className="font-body font-medium text-xs text-warm-gold">
            Halal Certified
          </span>
        </div>
      </div>
    </footer>
  );
}
