import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import OrderForm from '@/components/OrderForm';

export default function OrderPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-cream">
      {/* Premium Header for Order Page */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center justify-between px-6 md:px-12 bg-charcoal/95 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
        <Link to="/" className="flex items-center gap-2 group">
          <Utensils className="w-4 h-4 text-warm-gold" strokeWidth={2} />
          <div>
            <span className="font-display font-semibold text-xl text-cream leading-none">
              Restoran
            </span>
            <span className="block font-body text-xs text-cream/60 leading-tight">
              Wawasan
            </span>
          </div>
        </Link>
        <Link to="/">
          <Button variant="ghost" className="text-cream hover:text-warm-gold hover:bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-12 pt-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-[1px] bg-warm-gold/60" />
              <span className="text-warm-gold text-sm font-medium tracking-[0.1em] uppercase">
                Catering
              </span>
              <div className="w-12 h-[1px] bg-warm-gold/60" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-charcoal mb-4">
              {t('catering_order')}
            </h1>
            <p className="text-charcoal/60 text-lg max-w-xl mx-auto">
              {t('order_subtitle')}
            </p>
          </div>

          {/* Order Form Container */}
          <div className="bg-white rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.08)] border border-charcoal/5 overflow-hidden">
            {/* Decorative Top Bar */}
            <div className="h-1 bg-gradient-to-r from-warm-gold via-warm-gold/80 to-warm-gold/60" />
            
            <div className="p-6 md:p-10">
              <OrderForm />
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-warm-gold/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-warm-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-sm text-charcoal/70 font-medium">Secure Booking</p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-warm-gold/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-warm-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-charcoal/70 font-medium">Fast Response</p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-warm-gold/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-warm-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-charcoal/70 font-medium">Quality Guaranteed</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-charcoal py-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-cream/50 text-sm">
            &copy; {new Date().getFullYear()} Restoran Wawasan. {t('all_rights_reserved')}.
          </p>
        </div>
      </footer>
    </div>
  );
}
