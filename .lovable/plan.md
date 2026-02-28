

## Fix: Filter website popups by country

The `WebsitePopup.tsx` query on line 55-60 fetches **all** active popups regardless of `country_id`. The Qatar 20% discount popup appears in Kuwait because there's no country filter.

### Change
**`src/components/WebsitePopup.tsx`** — Add `.eq('country_id', COUNTRY_ID)` to the Supabase query:

```typescript
const { data: popups, error } = await supabase
  .from('website_popups')
  .select('*')
  .eq('is_active', true)
  .eq('country_id', COUNTRY_ID)  // ← add this line
  .or(`valid_from.is.null,valid_from.lte.${now}`)
  .or(`valid_until.is.null,valid_until.gte.${now}`)
  .order('created_at', { ascending: false });
```

One line added. `COUNTRY_ID` is already imported in this file.

