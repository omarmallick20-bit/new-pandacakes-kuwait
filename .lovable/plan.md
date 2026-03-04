

## Analysis: Currency display is already fixed in code

The fix is **already implemented** in the current codebase (line 593-595 of ProfilePage.tsx):

```typescript
const orderCurrency = order.payment_currency || DEFAULT_CURRENCY;
const orderDecimals = orderCurrency === 'KWD' ? 3 : 2;
const fmt = (amount: number) => `${amount.toFixed(orderDecimals)} ${orderCurrency}`;
```

The database confirms QA orders have `payment_currency = 'QAR'` correctly.

**The screenshot is from the production site (`kuwait.pandacakes.me`) which is running an older deployment** that still has the hardcoded `DEFAULT_CURRENCY`. The Lovable preview already has the fix.

**Action needed:** Publish/deploy the latest version to production. No further code changes are required — the fix just needs to reach the live site.

To verify, you can check the Lovable preview at the profile orders tab — QA orders should already show QAR there.

