

## Investigation Results: BakePoints Redeem Transactions

### Staff claim: "KW-26MA-0012 has no redeem transaction"
**FALSE.** KW-26MA-0012 (bakepoints_discount = 6 KWD) **does** have a corresponding `loyalty_transactions` record:
- Transaction ID: `c5fcab4b-...`, points: -3000, type: `redeem`, created at same timestamp as order

### Actual findings from the database

**All KW orders with BakePoints discounts:**

| Order | Discount | Redeem TX | Points | Status |
|-------|----------|-----------|--------|--------|
| KW-26MA-0012 | 6 KWD | Yes | -3000 | OK |
| KW-26MA-0010 | 5 KWD | Yes | -2500 | OK |
| KW-26MA-0009 | 16 KWD | Yes | -8000 | **Over-redeemed** |
| KW-26MA-0008 | 1 KWD | Yes | -500 | OK |
| KW-26MA-0007 | 1 KWD | Yes | -500 | OK |
| KW-26MA-0005 | 2 KWD | **No** | — | **Missing** |

### Three real issues found

**1. Missing redeem transaction for KW-26MA-0005** (created March 2, 10:00)
This is the earliest BakePoints order — likely placed before the `redeem_bakepoints` RPC call was wired into the checkout flow. This is a **data gap**, not a current code bug. The customer website code now correctly calls `redeem_bakepoints` for both cash orders (in `CheckoutModal.tsx` line 965) and card orders (in `tap-webhook-kw` line 209).

**2. Over-redemption allowed (critical)**
KW-26MA-0009 redeemed 8000 points when the customer had ~500 available. The current balance is **-10,721** (earned 3,779 minus redeemed 14,500). The `redeem_bakepoints` function does validate balance, but a race condition occurred: KW-26MA-0008 and KW-26MA-0009 were placed 45 seconds apart, and the balance check ran before the first redemption committed. This is a **DB function concurrency issue** — it needs a `SELECT ... FOR UPDATE` lock or advisory lock to prevent concurrent redemptions.

**3. `is_redeemed` flag inconsistency**
4 of 5 redeem records have `is_redeemed = false` despite being type `redeem`. There are **two versions** of the `redeem_bakepoints` function in the database. The currently-active one inserts `is_redeemed = true`, but the data suggests an older version was active when most redemptions occurred. If the CRM dashboard counts redeemed points using `is_redeemed = true`, it would only see 500 points (the single `true` record) instead of the actual 14,500. This explains the staff's incorrect "only 500 redeemed" observation.

### Recommended fixes

**Data fix (no code change):** Update the 4 redeem records that have `is_redeemed = false` to `true`, and insert the missing redeem transaction for KW-26MA-0005.

**Concurrency fix (DB function):** Add row-level locking to `redeem_bakepoints` to prevent race conditions. This would use `PERFORM pg_advisory_xact_lock(hashtext(p_customer_id::text))` at the start of the function.

**No customer website code changes needed** — the checkout flow correctly calls `redeem_bakepoints` for both cash (CheckoutModal.tsx) and card (tap-webhook-kw) paths.

