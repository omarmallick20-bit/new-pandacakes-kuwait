import { useLanguage } from '@/contexts/LanguageContext';
import translations, { TranslationKey } from '@/i18n/translations';

const categoryTranslations: Record<string, string> = {
  "Valentine Corner": "ركن الفالنتاين",
  "Retro Cakes": "كيكات ريترو",
  "Anime Cakes": "كيكات أنمي",
  "European Cakes": "كيكات أوروبية",
  "Chocolates & Brownies": "شوكولاتة وبراونيز",
  "Girls Cakes": "كيكات بنات",
  "For Girls": "كيكات بنات",
  "Boys Cakes": "كيكات أولاد",
  "Classic Cakes": "كيكات كلاسيكية",
  "Comic Cakes": "كيكات كوميك",
  "Cupcakes": "كب كيك",
  "Customized Cakes": "كيكات مخصصة",
  "Family Cakes": "كيكات عائلية",
  "Flower & Balloon Cakes": "كيكات ورد وبالون",
  "Gender Reveal Cakes": "كيكات كشف الجنس",
  "Graduation Corner": "ركن التخرج",
  "Islamic Cakes": "كيكات إسلامية",
  "Marble Cakes": "كيكات ماربل",
  "Movies & TV": "أفلام وتلفزيون",
  "Movies & TV Cakes": "كيكات أفلام وتلفزيون",
  "Photo Cakes": "كيكات صور",
  "Small Cakes": "كيكات صغيرة",
  "Special Items": "منتجات خاصة",
  "Special Cakes": "كيكات خاصة",
  "Sports Corner": "ركن الرياضة",
  "Zodiac Sign Cakes": "كيكات الأبراج",
  "Wedding Corner": "ركن الزفاف",
  "Candles & Toppers": "شموع وتوبرز",
};

const variantTranslations: Record<string, string> = {
  // Section titles
  "Flavour": "النكهة",
  "Flavor": "النكهة",
  "Size": "الحجم",
  "Colour": "اللون",
  "Color": "اللون",
  "Topping": "الإضافة",
  "Toppings": "الإضافات",
  "Filling": "الحشوة",
  "Shape": "الشكل",
  "Type": "النوع",
  "Writing": "الكتابة",
  "Message": "الرسالة",
  "Decoration": "الزينة",
  "Layers": "الطبقات",
  "Base": "القاعدة",
  // Common option names
  "Mix": "مزيج",
  "Vanilla": "فانيلا",
  "Chocolate": "شوكولاتة",
  "Red Velvet": "ريد فيلفيت",
  "Red velvet": "ريد فيلفيت",
  "Strawberry": "فراولة",
  "Caramel": "كراميل",
  "Lemon": "ليمون",
  "Oreo": "أوريو",
  "Nutella": "نوتيلا",
  "Pistachio": "فستق",
  "Mango": "مانجو",
  "Blueberry": "توت أزرق",
  "Raspberry": "توت",
  "Coconut": "جوز هند",
  "Coffee": "قهوة",
  "Lotus": "لوتس",
  "Cheese": "جبن",
  "Cream Cheese": "كريم تشيز",
  "Butter Cream": "بتر كريم",
  "Fondant": "فوندان",
  "Whipped Cream": "كريمة مخفوقة",
  "Small": "صغير",
  "Medium": "وسط",
  "Large": "كبير",
  "Extra Large": "كبير جداً",
  "Regular": "عادي",
  "Mini": "ميني",
  "Round": "دائري",
  "Square": "مربع",
  "Heart": "قلب",
  "Rectangle": "مستطيل",
  "White": "أبيض",
  "Pink": "وردي",
  "Blue": "أزرق",
  "Red": "أحمر",
  "Black": "أسود",
  "Gold": "ذهبي",
  "Silver": "فضي",
  "Purple": "بنفسجي",
  "Green": "أخضر",
  "Yellow": "أصفر",
  "Orange": "برتقالي",
  "Brown": "بني",
  "None": "بدون",
  "Yes": "نعم",
  "No": "لا",
  "With": "مع",
  "Without": "بدون",
  "Standard": "عادي",
  "Premium": "بريميوم",
  "Custom": "مخصص",
};

const dayTranslations: Record<string, string> = {
  'Saturday': 'السبت',
  'Sunday': 'الأحد',
  'Monday': 'الإثنين',
  'Tuesday': 'الثلاثاء',
  'Wednesday': 'الأربعاء',
  'Thursday': 'الخميس',
  'Friday': 'الجمعة',
};

const monthTranslations: Record<string, string> = {
  'Jan': 'يناير',
  'Feb': 'فبراير',
  'Mar': 'مارس',
  'Apr': 'أبريل',
  'May': 'مايو',
  'Jun': 'يونيو',
  'Jul': 'يوليو',
  'Aug': 'أغسطس',
  'Sep': 'سبتمبر',
  'Oct': 'أكتوبر',
  'Nov': 'نوفمبر',
  'Dec': 'ديسمبر',
};

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function useTranslation() {
  const { language, toggleLanguage } = useLanguage();

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const toArabicNumerals = (str: string): string => {
    if (language !== 'ar') return str;
    return String(str).replace(/[0-9]/g, (d) => arabicDigits[parseInt(d)]);
  };

  const translateCategory = (name: string): string => {
    if (language === 'ar' && categoryTranslations[name]) {
      return categoryTranslations[name];
    }
    return name;
  };

  const translateVariant = (name: string): string => {
    if (language !== 'ar') return name;
    if (variantTranslations[name]) return variantTranslations[name];
    // Try splitting compounds
    if (name.includes(' & ')) {
      return name.split(' & ').map(p => variantTranslations[p.trim()] || p.trim()).join(' و ');
    }
    if (name.includes(', ')) {
      return name.split(', ').map(p => variantTranslations[p.trim()] || p.trim()).join('، ');
    }
    return name;
  };

  const translatePrepTime = (time: string): string => {
    if (language !== 'ar') return time;
    return time
      .replace(/(\d+)/g, (m) => toArabicNumerals(m))
      .replace('mins', 'دقيقة')
      .replace('min', 'دقيقة')
      .replace('hours', 'ساعات')
      .replace('hour', 'ساعة');
  };

  const translateDay = (dayName: string): string => {
    if (language === 'ar' && dayTranslations[dayName]) {
      return dayTranslations[dayName];
    }
    return dayName;
  };

  const translateMonth = (monthAbbrev: string): string => {
    if (language === 'ar') {
      const parts = monthAbbrev.split(' ');
      if (parts.length === 2 && monthTranslations[parts[0]]) {
        return `${monthTranslations[parts[0]]} ${parts[1]}`;
      }
      if (monthTranslations[monthAbbrev]) {
        return monthTranslations[monthAbbrev];
      }
    }
    return monthAbbrev;
  };

  const currencyLabel = language === 'ar' ? 'ر.ق' : 'QAR';

  return { t, language, toggleLanguage, translateCategory, translateDay, translateMonth, toArabicNumerals, translateVariant, translatePrepTime, currencyLabel };
}
