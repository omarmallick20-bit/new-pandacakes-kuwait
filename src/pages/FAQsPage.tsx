import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BakePointsInfoModal } from "@/components/BakePointsInfoModal";
import { useTranslation } from '@/hooks/useTranslation';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';

export default function FAQsPage() {
  const [isBakePointsModalOpen, setIsBakePointsModalOpen] = useState(false);
  const { t } = useTranslation();

  const faqs = [
    { id: "order", questionKey: 'faq_order_q' as const, answerKey: 'faq_order_a' as const },
    { id: "advance", questionKey: 'faq_advance_q' as const, answerKey: 'faq_advance_a' as const },
    { id: "delivery", questionKey: 'faq_delivery_q' as const, answerKey: 'faq_delivery_a' as const },
    { id: "serving", questionKey: 'faq_serving_q' as const, answerKey: 'faq_serving_a' as const },
    { id: "flavors", questionKey: 'faq_flavors_q' as const, answerKey: 'faq_flavors_a' as const },
    { id: "frosting", questionKey: 'faq_frosting_q' as const, answerKey: 'faq_frosting_a' as const },
    { id: "allergens", questionKey: 'faq_allergens_q' as const, answerKey: 'faq_allergens_a' as const },
    { id: "payment", questionKey: 'faq_payment_q' as const, answerKey: 'faq_payment_a' as const },
    { id: "loyalty", questionKey: 'faq_loyalty_q' as const, answerKey: 'faq_loyalty_a' as const },
  ];

  return <div className="min-h-screen flex flex-col">
      <main className="flex-1 bg-hero-gradient">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black font-display mb-4 bg-gradient-to-r from-tiffany to-primary bg-clip-text text-slate-950">
              <span className="md:hidden">{t('faqs_title_mobile')}</span>
              <span className="hidden md:inline">{t('faqs_title')}</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('faqs_subtitle')}
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-6">
            {faqs.map(faq => <AccordionItem key={faq.id} value={faq.id} className="bg-card rounded-2xl border border-border/50 px-8 shadow-lg hover:shadow-xl transition-all duration-300">
                <AccordionTrigger className="text-left text-xl font-semibold text-foreground py-8 hover:no-underline hover:text-primary transition-colors duration-200">
                  {t(faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-lg leading-relaxed pb-8 whitespace-pre-line">
                  {t(faq.answerKey) === "BAKEPOINTS_MODAL" ? (
                    <>
                      {t('faq_loyalty_text')} <button 
                        onClick={() => setIsBakePointsModalOpen(true)} 
                        className="text-primary underline hover:text-primary/80 font-medium"
                      >BakePoints</button> {t('faq_loyalty_suffix')}
                    </>
                  ) : t(faq.answerKey) === "ALLERGENS_TERMS_LINK" ? (
                    <>
                      {t('faq_allergens_text')} <Link 
                        to="/terms" 
                        className="text-primary underline hover:text-primary/80 font-medium"
                      >{t('faq_terms_link')}</Link>.
                    </>
                  ) : (
                    t(faq.answerKey)
                  )}
                </AccordionContent>
              </AccordionItem>)}
          </Accordion>
        </div>
      </main>
      <BakePointsInfoModal isOpen={isBakePointsModalOpen} onClose={() => setIsBakePointsModalOpen(false)} />
      <WhatsAppFloat />
    </div>;
}
