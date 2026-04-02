

## Fix OTP Failure After Google/Apple Signup

### Root Cause

The `phone_verifications` table has a **foreign key constraint** (`phone_verifications_user_id_fkey`) referencing the `Customers` table. When a user signs up via Google/Apple:

1. `AuthCallback` creates the Customer profile (with retries)
2. User is redirected to `/phone-setup`
3. User enters phone → `send-otp` tries to insert into `phone_verifications`
4. **If the Customer profile wasn't created yet (race) or creation failed**, the FK constraint blocks the insert with error `23503`

This does NOT affect phone-based signup because the Customer profile is created during the signup flow itself, before OTP verification.

### Fix — Two changes

#### 1. Database migration: Change FK target from `Customers` to `auth.users`

The foreign key should reference `auth.users(id)` instead of `Customers(id)`. The auth user always exists at this point (Google/Apple created it). This is the correct reference since `user_id` represents the auth user, not the customer profile.

```sql
ALTER TABLE phone_verifications 
  DROP CONSTRAINT phone_verifications_user_id_fkey;

ALTER TABLE phone_verifications 
  ADD CONSTRAINT phone_verifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

#### 2. Edge function fallback (belt-and-suspenders): `send-otp/index.ts`

Add a fallback in the `send-otp` function: if the insert fails with `23503` (FK violation), **ensure the Customer record exists** by upserting a minimal profile, then retry the insert. This handles edge cases where even `auth.users` might have timing issues.

**Lines ~403-420**: Wrap the existing insert in a try/retry block:

```typescript
// After the initial insert fails with 23503:
if (insertError?.code === '23503') {
  // Ensure minimal Customer profile exists
  await supabase.from('Customers').upsert({
    id: resolvedUserId,
    country_id: country_id || 'kw',
    preferred_country: country_id || 'kw',
    phone_verified: false
  }, { onConflict: 'id' });
  
  // Retry insert
  const { error: retryError } = await supabase
    .from('phone_verifications')
    .insert({ phone_number: normalizedPhone, otp_code: otpCode, expires_at: expiresAt, user_id: resolvedUserId, verified: false, attempts: 0 });
  
  if (retryError) {
    // Return error
  }
}
```

### Why both changes

- The migration is the **permanent fix** — `auth.users` always exists before OTP is needed
- The edge function fallback handles any remaining edge cases and ensures the Customer profile is bootstrapped

### Files changed
1. New SQL migration (FK constraint change)
2. `supabase/functions/send-otp/index.ts` (fallback insert retry)

