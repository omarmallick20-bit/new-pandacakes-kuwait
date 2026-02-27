

## Problem
KW menu items' `custom_sections` JSON is missing `title_ar` and `name_ar` fields (only 3/396 have them), while QA items have full Arabic translations (407/409). This happened because KW cakes were duplicated from QA but the Arabic fields in `custom_sections` were lost.

## Approach: Two-pronged fix

### 1. Database: Copy Arabic translations from QA to KW counterparts (376 items)
Write a SQL migration that for each KW menu item with a matching QA item (by name), copies the `title_ar` and `name_ar` values from QA's `custom_sections` into the KW item's `custom_sections`.

This handles 376 of 396 KW items with sections.

### 2. Frontend fallback: Already handled
The remaining 20 KW items use standard section titles ("Flavour", "Size", "Colour") and common option names ("Mix", "Vanilla & Chocolate", etc.) — all already translated by the `variantTranslations` map in `useTranslation.ts`. The `CustomVariantSelector` component already falls back to `translateVariant()` when `title_ar`/`name_ar` is missing. No frontend changes needed.

### Implementation
- Single SQL migration that:
  1. For each KW item matching a QA item by name, rebuilds `custom_sections` by copying `title_ar` from QA sections (matched by title) and `name_ar` from QA options (matched by option name)
  2. Uses a PL/pgSQL function to iterate sections and options, matching by title/name

### Files
- New migration: `supabase/migrations/XXXX_copy_ar_translations_to_kw.sql`

