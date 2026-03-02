

## No code changes needed

The "X% off Selected Cakes" banner has already been successfully removed from `CategoryPage.tsx` (confirmed at lines 289-290 — the block is gone). The screenshot you're seeing is from a cached version of the page.

**To verify**: Do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R) in the preview, then navigate to a category with active discounts. The banner should no longer appear at the top of the category page.

The discount badges are correctly showing on the category cards in the main order/menu page via the `useCategoryDiscounts` hook, as intended.

