import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import SectionLabel from '@/components/SectionLabel';
import ReviewCard from '@/components/ReviewCard';
import { useScrollTrigger } from '@/hooks/useScrollTrigger';
import { useCarousel } from '@/hooks/useCarousel';
import { useLanguage } from '@/context/LanguageContext';

const REVIEWS = [
  {
    text: "Wah... we are on our last day of our Putrajaya holiday. The place is at the basement of an administration building with a great view of lake and the mosque. My wife and I bought nasi goreng kampung, nasi lemak, and some other varieties. Everything was good. Really good food, and definitely affordable.",
    name: 'Sufian A',
    rating: 5,
  },
  {
    text: "The food was delicious and the owners are great people. After we ate our lunch here, they give us to try typical Malaysian delicious dessert — fried bananas and durian soup.",
    name: 'Anastasia V',
    rating: 5,
  },
  {
    text: "The Lontong Singapore, Soto and nasi campur are exquisitely delicious! My favorite is the Asam Pedas and ikan keli sambal. Also the teh tarik is legendary, and the coffee here uses Muar's 434 which is well known. Recommended!",
    name: 'Irwan R',
    rating: 5,
  },
  {
    text: "Soto Ayam was delicious. The price is really good for the area where it is located. A hidden gem in Putrajaya with authentic flavors.",
    name: 'Carolina P',
    rating: 5,
  },
  {
    text: "Pelbagai juadah yang tersedia — makanan ala padang yang bermacam-macam lauk dan pauk. Asam pedas, nasi lemak, mee rebus, mee soto, rendang padang, rojak Singapore. Semuanya sedap!",
    name: 'Regular Customer',
    rating: 5,
  },
];

export default function ReviewsSection() {
  const { t } = useLanguage();
  const [slidesToShow, setSlidesToShow] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSlidesToShow(1);
      } else if (window.innerWidth < 1024) {
        setSlidesToShow(2);
      } else {
        setSlidesToShow(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const headerRef = useScrollTrigger<HTMLDivElement>({
    animation: 'fade-up',
    childSelector: '.review-header',
    stagger: 0.1,
  });

  const {
    currentIndex,
    goTo,
    goNext,
    goPrev,
    setIsHovered,
    containerRef,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = useCarousel({
    totalSlides: REVIEWS.length,
    slidesToShow,
    autoPlayInterval: 5000,
  });

  return (
    <section id="reviews" className="section-padding bg-cream">
      <div className="content-container">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <div className="review-header">
            <SectionLabel text={t('testimonials')} />
          </div>
          <h2 className="review-header font-display font-semibold text-[32px] md:text-[48px] text-charcoal leading-[1.1] mb-6">
            {t('guest_reviews')}
          </h2>
          <div className="review-header flex items-center justify-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 text-warm-gold fill-warm-gold" />
              ))}
            </div>
            <span className="font-body font-semibold text-lg text-charcoal">4.9 {t('out_of')}</span>
            <span className="font-body text-sm text-warm-gray">{t('based_on')}</span>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={containerRef}
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Arrow buttons - desktop only */}
          <button
            onClick={goPrev}
            className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.1)] items-center justify-center hover:bg-warm-gold transition-colors duration-300"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-5 h-5 text-charcoal" />
          </button>
          <button
            onClick={goNext}
            className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.1)] items-center justify-center hover:bg-warm-gold transition-colors duration-300"
            aria-label="Next review"
          >
            <ChevronRight className="w-5 h-5 text-charcoal" />
          </button>

          {/* Slides */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / slidesToShow)}%)`,
              }}
            >
              {REVIEWS.map((review, i) => (
                <div
                  key={i}
                  className="w-full md:w-1/2 lg:w-1/3 flex-shrink-0 px-3"
                >
                  <ReviewCard {...review} />
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: Math.max(1, REVIEWS.length - slidesToShow + 1) }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'w-6 bg-warm-gold'
                    : 'w-2 bg-charcoal/20 hover:bg-charcoal/40'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
