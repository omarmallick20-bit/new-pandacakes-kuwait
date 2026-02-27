import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { formatAmount } from '@/utils/currencyHelpers';

export interface CustomSectionOption {
  name: string;
  name_ar?: string;
  price: number;
}

export interface CustomSection {
  title: string;
  title_ar?: string;
  option_type: 'single' | 'multiple' | 'dropdown';
  options: CustomSectionOption[];
}

interface CustomVariantSelectorProps {
  customSections: CustomSection[];
  selections: Record<string, string | string[]>;
  onSelectionChange: (sectionTitle: string, value: string | string[]) => void;
  onPriceChange: (totalPrice: number) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export function CustomVariantSelector({
  customSections,
  selections,
  onSelectionChange,
  onPriceChange,
  onValidationChange
}: CustomVariantSelectorProps) {
  const [totalPrice, setTotalPrice] = useState(0);
  const { t, translateVariant, toArabicNumerals, language, currencyLabel } = useTranslation();

  useEffect(() => {
    // Calculate total variant price
    let total = 0;
    customSections.forEach(section => {
      const selected = selections[section.title];
      if (selected) {
        const selectedOptions = Array.isArray(selected) ? selected : [selected];
        selectedOptions.forEach(optName => {
          const option = section.options.find(opt => opt.name === optName);
          if (option) total += option.price;
        });
      }
    });
    setTotalPrice(total);
    onPriceChange(total);

    // Validate required fields
    const isValid = customSections.every(section => {
      if (section.option_type === 'multiple') return true; // Optional
      const value = selections[section.title];
      return value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
    });
    onValidationChange?.(isValid);
  }, [selections, customSections, onPriceChange, onValidationChange]);

  const handleSingleChange = (sectionTitle: string, value: string) => {
    onSelectionChange(sectionTitle, value);
  };

  const handleMultipleChange = (sectionTitle: string, optionName: string, checked: boolean) => {
    const currentSelections = (selections[sectionTitle] as string[]) || [];
    const newSelections = checked
      ? [...currentSelections, optionName]
      : currentSelections.filter(name => name !== optionName);
    onSelectionChange(sectionTitle, newSelections);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return '';
    return `+${currencyLabel} ${toArabicNumerals(formatAmount(price))}`;
  };

  if (customSections.length === 0) return null;

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t('cake_customize_order')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('cake_select_options')}
        </p>
      </div>

      {customSections.map((section) => (
        <div key={section.title} className="space-y-3">
          <Label className="text-base">
            {language === 'ar' ? (section.title_ar || translateVariant(section.title)) : section.title}
            {section.option_type !== 'multiple' && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>

          {section.option_type?.toLowerCase?.().trim() === 'single' && (
            <RadioGroup
              value={selections[section.title] as string}
              onValueChange={(val) => handleSingleChange(section.title, val)}
            >
              <div className="space-y-2">
                {section.options.map(opt => (
                  <div key={opt.name} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.name} id={`${section.title}-${opt.name}`} />
                    <Label
                      htmlFor={`${section.title}-${opt.name}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <span>{language === 'ar' ? (opt.name_ar || translateVariant(opt.name)) : opt.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {formatPrice(opt.price)}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {section.option_type?.toLowerCase?.().trim() === 'multiple' && (
            <div className="space-y-2">
              {section.options.map(opt => (
                <div key={opt.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${section.title}-${opt.name}`}
                    checked={(selections[section.title] as string[])?.includes(opt.name) || false}
                    onCheckedChange={(checked) =>
                      handleMultipleChange(section.title, opt.name, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`${section.title}-${opt.name}`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <span>{language === 'ar' ? (opt.name_ar || translateVariant(opt.name)) : opt.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatPrice(opt.price)}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          )}

          {section.option_type?.toLowerCase?.().trim() === 'dropdown' && (
            <Select
              value={selections[section.title] as string}
              onValueChange={(val) => handleSingleChange(section.title, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? `اختر ${section.title_ar || translateVariant(section.title)}` : `Select ${section.title}`} />
              </SelectTrigger>
              <SelectContent>
                {section.options.map(opt => (
                  <SelectItem key={opt.name} value={opt.name}>
                    {language === 'ar' ? (opt.name_ar || translateVariant(opt.name)) : opt.name} {opt.price > 0 && `(+${currencyLabel} ${toArabicNumerals(formatAmount(opt.price))})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}

      {totalPrice > 0 && (
        <div className="pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('cake_customization_total')}</span>
            <span className="font-semibold text-primary">{currencyLabel} {toArabicNumerals(formatAmount(totalPrice))}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
