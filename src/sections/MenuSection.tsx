import SectionLabel from '@/components/SectionLabel';
import FoodCard from '@/components/FoodCard';
import { useScrollTrigger } from '@/hooks/useScrollTrigger';
import { useLanguage } from '@/context/LanguageContext';

const MENU_ITEMS = [
  {
    nameEn: 'Asam Pedas',
    nameBm: 'Asam Pedas',
    descEn: 'Our #1 crowd favorite — spicy tamarind fish stew with tangy, bold flavors. A true Malay classic.',
    descBm: 'Kegemaran ramai #1 — rebusan ikan asam pedas dengan rasa masam dan berani yang ketara. Klasik Melayu sejati.',
    priceEn: 'From RM 8',
    priceBm: 'Daripada RM 8',
    image: `${import.meta.env.BASE_URL}assets/asam-pedas.jpg`,
  },
  {
    nameEn: 'Nasi Lemak',
    nameBm: 'Nasi Lemak',
    descEn: "Malaysia's national dish — fragrant coconut rice with sambal, anchovies, peanuts, cucumber & egg.",
    descBm: 'Hidangan kebangsaan Malaysia — nasi santan wangi bersama sambal, ikan bilis, kacang tanah, timun & telur.',
    priceEn: 'From RM 3',
    priceBm: 'Daripada RM 3',
    image: `${import.meta.env.BASE_URL}assets/nasi-lemak.jpg`,
  },
  {
    nameEn: 'Lontong Singapore',
    nameBm: 'Lontong Singapore',
    descEn: 'Compressed rice cakes in rich coconut vegetable curry with cabbage, long beans, and sambal.',
    descBm: 'Nasi himpit di dalam kuah lodeh sayur bersantan pekat bersama kuubisan, kacang panjang, dan sambal.',
    priceEn: 'From RM 7',
    priceBm: 'Daripada RM 7',
    image: `${import.meta.env.BASE_URL}assets/lontong-singapore.jpg`,
  },
  {
    nameEn: 'Mee Soto',
    nameBm: 'Mee Soto',
    descEn: 'Aromatic chicken noodle soup with shredded chicken, bean sprouts, and crispy fried shallots.',
    descBm: 'Sup mi ayam aromatik bersama carikan isi ayam, taugeh, dan bawang goreng garing.',
    priceEn: 'From RM 6',
    priceBm: 'Daripada RM 6',
    image: `${import.meta.env.BASE_URL}assets/mee-soto.jpg`,
  },
  {
    nameEn: 'Rendang Padang',
    nameBm: 'Rendang Padang',
    descEn: 'Slow-cooked beef in rich coconut milk and spices — tender, flavorful, and deeply satisfying.',
    descBm: 'Daging yang dimasak perlahan di dalam santan kaya dan rempah-ratus — empuk, berperisa, dan amat memuaskan.',
    priceEn: 'From RM 10',
    priceBm: 'Daripada RM 10',
    image: `${import.meta.env.BASE_URL}assets/rendang-padang.jpg`,
  },
  {
    nameEn: 'Rojak Singapore',
    nameBm: 'Rojak Singapore',
    descEn: 'Our famous Friday special — crispy tofu, cucumber, and bean sprouts tossed in rich prawn paste sauce with sesame seeds and chilli.',
    descBm: 'Keistimewaan hari Jumaat kami yang terkenal — tauhu garing, timun, dan taugeh digaul bersama kuah petis udang khas, bijian bijan dan sedikit pedas.',
    priceEn: 'From RM 7',
    priceBm: 'Daripada RM 7',
    image: `${import.meta.env.BASE_URL}assets/rojak-singapore.jpg`,
  },
  {
    nameEn: 'Nasi Goreng Kampung',
    nameBm: 'Nasi Goreng Kampung',
    descEn: 'Village-style fried rice with crunchy anchovies, kangkung, and a perfectly fried egg on top.',
    descBm: 'Nasi goreng gaya kampung bersama ikan bilis rangup, kangkung, dan telur mata di atasnya.',
    priceEn: 'From RM 7',
    priceBm: 'Daripada RM 7',
    image: `${import.meta.env.BASE_URL}assets/nasi-goreng-kampung.jpg`,
  },
];

export default function MenuSection() {
  const { language, t } = useLanguage();

  const headerRef = useScrollTrigger<HTMLDivElement>({
    animation: 'fade-up',
    childSelector: '.menu-header',
    stagger: 0.1,
  });

  const gridRef = useScrollTrigger<HTMLDivElement>({
    animation: 'fade-up',
    y: 40,
    childSelector: '.menu-card',
    stagger: 0.12,
    delay: 0.3,
  });

  return (
    <section id="menu" className="section-padding bg-charcoal">
      <div className="content-container">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <div className="menu-header">
            <SectionLabel text={t('our_menu')} light />
          </div>
          <h2 className="menu-header font-display font-semibold text-[36px] md:text-[56px] text-cream leading-[1.1] mb-6">
            {t('signature_dishes')}
          </h2>
          <p className="menu-header font-body text-lg text-cream/70 leading-relaxed max-w-[640px] mx-auto">
            {t('menu_subtitle')}
          </p>
        </div>

        {/* Food Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {MENU_ITEMS.map((item) => (
            <div key={item.nameEn} className="menu-card">
              <FoodCard
                name={language === 'en' ? item.nameEn : item.nameBm}
                description={language === 'en' ? item.descEn : item.descBm}
                price={language === 'en' ? item.priceEn : item.priceBm}
                image={item.image}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
