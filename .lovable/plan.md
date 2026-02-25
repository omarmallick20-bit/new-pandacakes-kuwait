

# Fix: Reassign Customer Profile Foreign Key Order

## Root Cause

In `supabase/functions/reassign-customer-profile/index.ts`, the operations happen in this order:

1. **Step 3** — Update `Customers.id` from old to new
2. **Step 4** — Update `addresses.customer_id` from old to new
3. Steps 5-8 — Update cart_items, wishlist_items, orders, loyalty_transactions

The problem: `addresses.customer_id` has a **foreign key constraint** referencing `Customers.id`. When step 3 tries to change the Customer's ID, PostgreSQL blocks it because addresses still reference the old ID. The function returns a 500 error and **none** of the data transfers happen — addresses, orders, cart items all stay orphaned.

The edge function logs confirm this:
```
Failed to update customer ID: Key (id)=(b2d7f630-...) is still referenced from table "addresses"
```

## Fix

**File: `supabase/functions/reassign-customer-profile/index.ts`**

Reorder the operations so all child tables (addresses, cart_items, wishlist_items, orders, loyalty_transactions) are updated **before** the Customer ID change:

```
Current order:              Fixed order:
3. Update Customers.id      4. Update addresses
4. Update addresses          5. Update cart_items
5. Update cart_items         6. Update wishlist_items
6. Update wishlist_items     7. Update orders
7. Update orders             8. Update loyalty_transactions
8. Update loyalty_txns       3. Update Customers.id (now safe)
```

This way, by the time we change `Customers.id`, no child records reference the old ID anymore.

## Additional Safety

Also update the "already exists" early return (line 59-64). Currently, if a Customer record already exists with the new user ID, the function returns immediately without merging data. This should instead:
- Transfer any addresses/orders/cart/wishlist from the old profile to the new one
- Delete the old Customer record

This handles the case where a bare Customer record was auto-created (e.g., by `updateCustomerProfile`) before the reassignment could run.

## Files Changed
- `supabase/functions/reassign-customer-profile/index.ts` — reorder operations + merge on conflict

