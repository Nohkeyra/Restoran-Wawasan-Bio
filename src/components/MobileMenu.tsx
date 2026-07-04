import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { Languages, Shield, ArrowRight } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { label: string; href: string }[];
}

export default function MobileMenu({ isOpen, onClose, links }: MobileMenuProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bm' : 'en');
  };

  useEffect(() => {
    if (!overlayRef.current || !itemsRef.current) return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        pointerEvents: 'auto',
      });
      gsap.fromTo(
        itemsRef.current.children,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power3.out', delay: 0.15 }
      );
    } else {
      document.body.style.overflow = '';
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        pointerEvents: 'none',
      });
    }
  }, [isOpen]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[2000] bg-charcoal/98 backdrop-blur-xl opacity-0 pointer-events-none md:hidden"
    >
      <div className="flex flex-col items-center justify-between h-full py-16 px-6 overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-5 right-6 text-cream p-2 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-[0.98]"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

        <div ref={itemsRef} className="flex flex-col items-center gap-5 my-auto w-full max-w-xs">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="font-display font-medium text-[24px] text-cream hover:text-warm-gold transition-colors duration-300 min-h-[44px] flex items-center justify-center active:scale-[0.98]"
            >
              {link.label}
            </a>
          ))}

          {/* Divider */}
          <div className="w-full h-px bg-cream/10 my-2" />

          {/* Primary Mobile CTA: Order Now */}
          <Link
            to="/order"
            onClick={onClose}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-warm-gold text-charcoal font-body font-semibold text-xs uppercase tracking-[0.05em] rounded-lg hover:bg-[#E0BC74] transition-all duration-300 shadow-[0_4px_12px_rgba(212,168,83,0.2)] active:scale-[0.98]"
          >
            {t('order_now')}
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Language Toggle and Admin Buttons */}
          <div className="flex flex-col w-full gap-2.5">
            {/* Mobile Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 border border-cream/20 text-cream rounded-lg hover:bg-cream/5 transition-all duration-300 text-xs font-medium active:scale-[0.98]"
            >
              <Languages className="w-3.5 h-3.5 text-warm-gold" />
              <span>{language === 'en' ? 'Tukar ke Bahasa Melayu' : 'Switch to English'}</span>
            </button>

            {/* Mobile Admin Link */}
            <Link
              to="/admin"
              onClick={onClose}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-cream/5 border border-cream/10 text-cream/70 rounded-lg hover:bg-cream/10 transition-all duration-300 text-xs font-medium active:scale-[0.98]"
            >
              <Shield className="w-3.5 h-3.5 text-warm-gold" />
              <span>{t('admin_login')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
