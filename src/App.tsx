import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import { ToastProvider } from '@/components/ui/Toast';

import LandingPage from '@/pages/LandingPage';
import OrderPage from '@/pages/OrderPage';
import AdminPage from '@/pages/AdminPage';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  
  return null;
}

// Smooth scroll handler for anchor links
function SmoothScrollHandler() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('#/')) {
          e.preventDefault();
          const el = document.querySelector(href);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}

function AppContent() {
  return (
    <>
      <ScrollToTop />
      <SmoothScrollHandler />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;
