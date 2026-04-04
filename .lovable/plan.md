

## Apple Email Delivery Failures — Analysis and Fix

### What the screenshots show

From the Resend dashboard:
- **Gmail, Hotmail users**: All "Delivered" — working fine
- **Apple relay users** (`@privaterelay.appleid.com`): "Bounced" and "Suppressed"
- Once an Apple relay email bounces, Resend automatically **suppresses** all future emails to that address — which is why order confirmations show "Suppressed" after the welcome email already bounced

### Root cause

Apple's "Hide My Email" relay service (`privaterelay.appleid.com`) requires the sending domain to be **registered with Apple** as a trusted email source. Without this registration, Apple's relay servers reject (bounce) all emails from `pandacakes.me`.

This is **not a code issue** — the Resend API accepts the email, delivers it to Apple's relay servers, and Apple bounces it back because `pandacakes.me` is not whitelisted.

### Fix — Two steps required

#### Step 1: Register `pandacakes.me` with Apple (manual — you must do this)

1. Go to https://developer.apple.com/account/resources/services/configure
2. Under **"Sign in with Apple for Email Communication"**, click **Configure**
3. Register the email source domain: **`pandacakes.me`**
4. Register the individual sender addresses:
   - `order-noreply@pandacakes.me`
5. Apple will verify SPF records for the domain — since `pandacakes.me` is already verified in Resend with proper SPF/DKIM, this should pass automatically
6. After registration, Apple relay servers will accept emails from this domain

#### Step 2: Remove suppressed Apple addresses from Resend

Once the domain is registered with Apple, the previously bounced addresses are still **suppressed** in Resend. New emails to those users will continue to be blocked until removed from the suppression list.

1. In Resend dashboard, go to **Audience → Suppression List** (or check under the suppressed email's details)
2. Remove the suppressed Apple relay addresses (e.g., `9hpvgj8wz7@privaterelay.appleid.com`, `t2ndg2bkw2@privaterelay.appleid.com`)
3. After removal, future emails to these addresses will attempt delivery again

### No code changes needed

- The sending domain, API key, and edge functions are all working correctly
- Gmail, Hotmail, and other providers deliver successfully
- The same API key serves both Kuwait and Qatar — this is expected and correct
- The only action items are the Apple domain registration and Resend suppression list cleanup

### About Kuwait/Qatar logs appearing together

Both countries share one Resend API key and send from `pandacakes.me`. Resend does not have a concept of "country" — all sends appear in one unified log. This is normal. Order subjects already include the country prefix (KW- vs QA-) so you can visually distinguish them.

