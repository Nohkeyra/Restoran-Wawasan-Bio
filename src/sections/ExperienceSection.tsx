import { Sparkles, Heart, Flame, HandHeart } from 'lucide-react';
import SectionLabel from '@/components/SectionLabel';
import PrincipleCard from '@/components/PrincipleCard';
import { useScrollTrigger } from '@/hooks/useScrollTrigger';
import { useLanguage } from '@/context/LanguageContext';

const PRINCIPLES = [
  {
    icon: Sparkles,
    name: 'Cleanliness',
    malayName: 'Kebersihan Kedai',
    description: 'Impeccable standards in every corner. A spotless environment for your dining comfort.',
  },
  {
    icon: Heart,
    name: 'Excellent Service',
    malayName: 'Servis Terbaik Fasih',
    description: 'Warm, attentive hospitality that makes every guest feel like family.',
  },
  {
    icon: Flame,
    name: 'Lasting Taste',
    malayName: 'Kenikmatan Yang Kekal',
    description: 'Recipes perfected over decades, delivering unforgettable flavors in every bite.',
  },
  {
    icon: HandHeart,
    name: 'Affordable Prices',
    malayName: 'Harga yang Berpatutan',
    description: 'Exceptional quality at prices that welcome everyone — from ministers to families.',
  },
];

export default function ExperienceSection() {
  const { t } = useLanguage();
  const imageRef = useScrollTrigger<HTMLDivElement>({
    animation: 'scale-up',
    duration: 1.2,
  });

  const contentRef = useScrollTrigger<HTMLDivElement>({
    animation: 'fade-up',
    childSelector: '.exp-animate',
    stagger: 0.15,
  });

  const gridRef = useScrollTrigger<HTMLDivElement>({
    animation: 'fade-up',
    y: 40,
    childSelector: '.principle-card',
    stagger: 0.15,
    delay: 0.5,
  });

  return (
    <section id="experience" className="bg-deep-brown">
      {/* Image Band */}
      <div ref={imageRef} className="relative w-full h-[250px] md:h-[400px] overflow-hidden">
        <img
          src={`/assets/putrajaya-lake-view.jpg`}
          alt="Putrajaya lake and Putra Mosque view"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(45,37,32,0.9) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="section-padding pt-16 md:pt-20">
        <div className="content-container">
          {/* Header */}
          <div ref={contentRef} className="text-center mb-16">
            <div className="exp-animate">
              <SectionLabel text={t('experience_title')} light />
            </div>
            <h2 className="exp-animate font-display font-semibold text-[32px] md:text-[48px] text-cream leading-[1.1] mb-6">
              {t('more_than_meal')}
            </h2>
            <p className="exp-animate font-body text-lg text-cream/70 leading-relaxed max-w-[560px] mx-auto">
              {t('experience_p1')}
            </p>
          </div>

          {/* Principles Grid */}
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PRINCIPLES.map((p) => (
              <div key={p.name} className="principle-card">
                <PrincipleCard {...p} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
