import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from '@/hooks/useTranslation';

export function FAQSection() {
  const { t } = useTranslation();
  
  const faqs = [
    { id: "order", question: t('faq_section_order_q'), answer: t('faq_section_order_a') },
    { id: "advance", question: t('faq_section_advance_q'), answer: t('faq_section_advance_a') },
    { id: "delivery", question: t('faq_section_delivery_q'), answer: t('faq_section_delivery_a') },
  ];

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-foreground">
          {t('faq_section_title')}
        </h2>
        
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq) => (
            <AccordionItem 
              key={faq.id} 
              value={faq.id}
              className="bg-card rounded-2xl border border-border/50 px-6 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <AccordionTrigger className="text-left text-lg font-semibold text-foreground py-6 hover:no-underline hover:text-primary transition-colors duration-200">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6 whitespace-pre-line">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
