import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

export function Footer() {
  const location = useLocation();
  const showPolicyLinks = location.pathname === '/faqs';
  const { t, language } = useTranslation();

  return (
    <footer className="bg-primary text-primary-foreground py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        {showPolicyLinks && (
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <Link to="/terms" className="text-sm hover:underline opacity-90 hover:opacity-100 transition-opacity">
              {t('footer_terms')}
            </Link>
            <Link to="/privacy-policy" className="text-sm hover:underline opacity-90 hover:opacity-100 transition-opacity">
              {t('footer_privacy')}
            </Link>
            <Link to="/refund-policy" className="text-sm hover:underline opacity-90 hover:opacity-100 transition-opacity">
              {t('footer_refund')}
            </Link>
          </div>
        )}
        <p className="text-sm md:text-base font-medium">
          {language === 'ar' ? 'حقوق النشر © باندا كيك' : t('footer_copyright')}
        </p>
      </div>
    </footer>
  );
}
