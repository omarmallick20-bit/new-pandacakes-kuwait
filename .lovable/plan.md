

## Fix Cart Translation Issues + Time Display

### Two Problems

**1. Cart items show untranslated text in Arabic mode**

The cart stores only English keys for custom selections (e.g., `"Candle Number": { selected: ["Number 4", "Number 5"] }`). The display relies on a static `translateVariant()` dictionary, which doesn't know DB-specific values like "Candle Number" or "Number 4". Also, "Default" is missing from the dictionary entirely.

**2. Time-related issue** — Need you to clarify what specific time issue persists. The slot buffer was already reduced to 15 minutes, and the PaymentSuccessPage now uses Kuwait timezone. Is it still showing wrong times somewhere? Which page/screen?

---

### Fix for Translation

**Approach**: Store Arabic translations alongside English in the cart data, then use them at display time. This eliminates dependency on the static dictionary for DB-sourced values.

#### File 1: `src/hooks/useTranslation.ts`

Add "Default" to the variant translations map:
```
"Default": "عادي"
```

#### File 2: `src/types/index.ts` — Extend cart customization type

Add optional Arabic metadata to `custom_selections`:
```typescript
custom_selections: Record<string, {
  selected: string | string[];
  selected_ar?: string | string[];  // Arabic option names
  title_ar?: string;                 // Arabic section title
  price: number;
}>;
```

#### File 3: `src/pages/CakeDetailPage.tsx` — Store Arabic data when adding to cart

When building `custom_selections` (lines 428-439), also store `title_ar` and the Arabic option names from the section data:
```typescript
customizations.custom_selections[section.title] = {
  selected,
  selected_ar: section.options
    .filter(opt => selectedOptions.includes(opt.name))
    .map(opt => opt.name_ar || opt.name),
  title_ar: section.title_ar,
  price
};
```

#### File 4: `src/pages/CartPage.tsx` — Use stored Arabic data

Update the custom selections display (lines 308-315) to prefer stored Arabic when language is Arabic:
```typescript
// Title: use stored title_ar, fall back to translateVariant
const displayTitle = language === 'ar' 
  ? (data.title_ar || translateVariant(title)) 
  : title;

// Values: use stored selected_ar, fall back to translateVariant  
const displaySelected = language === 'ar' && data.selected_ar
  ? (Array.isArray(data.selected_ar) ? data.selected_ar.join('، ') : data.selected_ar)
  : (Array.isArray(data.selected) ? data.selected.map(s => translateVariant(s)).join('، ') : translateVariant(data.selected));
```

#### File 5: Same pattern for `CheckoutModal.tsx`, `PaymentSuccessPage.tsx`, `UpsellQuickAddModal.tsx`

Apply the same Arabic-aware display logic wherever cart item customizations are rendered.

### Product names ("Number Candles Silver")

This item likely has no `name_ar` in the database. The code already shows `name_ar` when available. This is a **data issue** — the Arabic name needs to be added in the database for that menu item. No code change needed.

### Summary
- 1 dictionary addition ("Default" → "عادي")
- 1 type extension (add `selected_ar`, `title_ar` to cart customizations)
- Store Arabic metadata at add-to-cart time
- Display Arabic metadata in cart, checkout, and payment success pages
- Product names without `name_ar` in DB will still show English — that's a data entry task

