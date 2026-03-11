

## Plan: Use Database `name_ar` for Category Arabic Translations

### 1. Populate `name_ar` in the categories table

Using the existing `categoryTranslations` mapping from the frontend code, plus adding "Mothers Day Cakes" → "كيكات عيد الأم":

| Category | Arabic Name |
|----------|------------|
| Mothers Day Cakes | كيكات عيد الأم |
| Islamic Cakes | كيكات إسلامية |
| Retro Cakes | كيكات ريترو |
| Girls Cakes | كيكات بنات |
| Boys Cakes | كيكات أولاد |
| Anime Cakes | كيكات أنمي |
| European Cakes | كيكات أوروبية |
| Classic Cakes | كيكات كلاسيكية |
| Comic Cakes | كيكات كوميك |
| Cupcakes | كب كيك |
| Customized Cakes | كيكات مخصصة |
| Family Cakes | كيكات عائلية |
| Flower & Balloon Cakes | كيكات ورد وبالون |
| Gender Reveal Cakes | كيكات كشف الجنس |
| Graduation Corner | ركن التخرج |
| Marble Cakes | كيكات ماربل |
| Movies & TV Cakes | كيكات أفلام وتلفزيون |
| Photo Cakes | كيكات صور |
| Small Cakes | كيكات صغيرة |
| Special Cakes | كيكات خاصة |
| Sports Corner | ركن الرياضة |
| Zodiac Sign Cakes | كيكات الأبراج |
| Valentine Corner | ركن الفالنتاين |
| Wedding Corner | ركن الزفاف |
| Candles & Toppers | شموع وتوبرز |

### 2. Update category queries to include `name_ar`

**Files to update:**
- `src/contexts/DataContext.tsx` (line 146): Add `name_ar` to the select
- `src/pages/CategoryPage.tsx` (line 102): Add `name_ar` to the select

### 3. Update display code to prefer `name_ar` from DB

In these files, replace `translateCategory(category.name)` with `(language === 'ar' && category.name_ar) || category.name`:
- `src/pages/OrderPage.tsx` (2 places)
- `src/pages/CategoryPage.tsx` (1 place)
- `src/pages/CakeDetailPage.tsx` (1 place)
- `src/components/GlobalSearchModal.tsx` (1 place)

The `translateCategory()` function in `useTranslation.ts` can remain as a fallback but will no longer be the primary source.

### 4. Update Category interface/types

Add `name_ar?: string` to category type definitions where used (CategoryPage's local interface, DataContext types).

