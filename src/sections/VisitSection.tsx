import { MapPin, Clock, Phone, Mail, ArrowRight } from 'lucide-react';
import SectionLabel from '@/components/SectionLabel';
import { useScrollTrigger } from '@/hooks/useScrollTrigger';
import { useLanguage } from '@/context/LanguageContext';

export default function VisitSection() {
  const { t } = useLanguage();

  const HOURS = [
    { day: t('mon_thu'), time: t('time_730_400') },
    { day: t('friday'), time: t('time_730_400'), note: t('rojak_note') },
    { day: t('saturday'), time: t('time_730_400') },
    { day: t('sunday'), time: t('closed') },
  ];

  const contentRef = useScrollTrigger<HTMLDivElement>({
    animation: 'fade-up',
    childSelector: '.visit-animate',
    stagger: 0.15,
  });

  const imageRef = useScrollTrigger<HTMLDivElement>({
    animation: 'slide-left',
    x: 40,
    duration: 1.0,
  });

  const cardsRef = useScrollTrigger<HTMLDivElement>({
    animation: 'fade-up',
    y: 30,
    childSelector: '.info-card',
    stagger: 0.15,
    delay: 0.3,
  });

  const ctaRef = useScrollTrigger<HTMLDivElement>({
    animation: 'fade-up',
    y: 30,
    delay: 0.6,
  });

  return (
    <section id="visit" className="section-padding bg-charcoal relative overflow-hidden">
      {/* Subtle radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(45,37,32,0.5) 0%, rgba(26,24,22,0) 70%)',
        }}
      />

      <div className="content-container relative">
        {/* Header */}
        <div ref={contentRef} className="mb-12">
          <div className="visit-animate">
            <SectionLabel text={t('visit_us')} light />
          </div>
          <h2 className="visit-animate font-display font-semibold text-[32px] md:text-[48px] text-cream leading-[1.1] mb-4">
            {t('come_dine')}
          </h2>
          <p className="visit-animate font-body text-lg text-cream/60">
            {t('visit_subtitle')}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          {/* Left: Location Visual */}
          <div ref={imageRef} className="relative">
            <div className="relative border-2 border-warm-gold/30 rounded-xl overflow-hidden w-full">
              <img
                src={`/assets/wawasan-bridge-night.jpg`}
                alt="Jambatan Wawasan (Wawasan Bridge) night view in Putrajaya"
                loading="lazy"
                className="w-full h-auto object-cover"
              />
              {/* Corner decorations */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-warm-gold" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-warm-gold" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-warm-gold" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-warm-gold" />
            </div>
          </div>

          {/* Right: Info Cards */}
          <div ref={cardsRef} className="flex flex-col gap-6">
            {/* Address Card */}
            <div className="info-card bg-deep-brown rounded-xl border border-warm-gold/15 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-warm-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-body font-semibold text-base text-warm-gold mb-2">{t('address')}</h3>
                  <p className="font-body text-base text-cream leading-relaxed">
                    <strong>Unit 3, Level B3, Menara PjH (Putrajaya Holdings),</strong><br />
                    Jalan P2A, Presint 2,<br />
                    62100 Putrajaya
                  </p>
                  <p className="font-body text-sm text-cream/50 mt-2">
                    {t('location_detail')}
                  </p>
                  <a
                    href="https://maps.app.goo.gl/6U5V1Q4m1Q2Q3Q4Q5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-body text-sm text-warm-gold hover:underline mt-3 group py-2 px-3 -mx-3 min-h-[44px]"
                  >
                    <MapPin className="w-4 h-4" />
                    {t('get_directions')}
                  </a>
                </div>
              </div>
            </div>

            {/* Hours Card */}
            <div className="info-card bg-deep-brown rounded-xl border border-warm-gold/15 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-warm-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-body font-semibold text-base text-warm-gold mb-3">{t('hours')}</h3>
                  <div className="space-y-2">
                    {HOURS.map((h) => (
                      <div key={h.day} className="flex justify-between items-baseline">
                        <span className="font-body font-medium text-sm text-cream">{h.day}</span>
                        <div className="text-right">
                          <span className="font-body text-sm text-cream">{h.time}</span>
                          {h.note && (
                            <span className="block font-body text-xs text-warm-gold italic">
                              *{h.note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Card */}
            <div className="info-card bg-deep-brown rounded-xl border border-warm-gold/15 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-warm-gold flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-body font-semibold text-base text-warm-gold mb-3">{t('contact_us')}</h3>
                  
                  <div className="space-y-3">
                    <a
                      href="tel:+60178582642"
                      className="flex items-center gap-2.5 text-base text-cream hover:text-warm-gold transition-colors duration-300 group"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-semibold">
                        C
                      </span>
                      <span className="font-body">
                        {t('call_label')}{' '}
                        <strong className="text-cream group-hover:text-warm-gold transition-colors">+6017-8582642</strong> (Pak Usop)
                      </span>
                    </a>
                    
                    <a
                      href="https://wa.me/60173157721"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-base text-cream hover:text-warm-gold transition-colors duration-300 group"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold">
                        W
                      </span>
                      <span className="font-body">
                        {t('whatsapp_label')}{' '}
                        <strong className="text-cream group-hover:text-warm-gold transition-colors">+6017-3157721</strong> (Mad)
                      </span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-cream/70">
                    <Mail className="w-4 h-4 text-warm-gold" />
                    <span className="font-body text-sm">mywawasan@pakusop.com</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <a
                      href="tel:+60178582642"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] bg-warm-gold text-charcoal font-body font-semibold text-sm uppercase tracking-[0.05em] rounded-lg hover:bg-[#E0BC74] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                      {t('call_now')}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <a
                      href="https://wa.me/60173157721"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] border border-warm-gold/50 text-warm-gold font-body font-semibold text-sm uppercase tracking-[0.05em] rounded-lg hover:bg-warm-gold/10 hover:border-warm-gold hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                      WhatsApp
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div
          ref={ctaRef}
          className="mt-16 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            background: 'linear-gradient(135deg, #D4A853 0%, #C17A5F 100%)',
          }}
        >
          <div>
            <h3 className="font-display font-medium text-[24px] md:text-[28px] text-charcoal">
              {t('cta_title')}
            </h3>
            <p className="font-body text-base text-charcoal/70 mt-2">
              {t('cta_subtitle')}
            </p>
          </div>
          <a
            href="tel:+60178582642"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] bg-charcoal text-warm-gold font-body font-semibold text-sm uppercase tracking-[0.05em] rounded-lg hover:bg-deep-brown hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex-shrink-0"
          >
            {t('contact_pak_usop')}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
