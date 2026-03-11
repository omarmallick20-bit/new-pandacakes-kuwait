

## Analysis: KSA OTP Failure

### What's Already Fixed
The sender ID mapping is correct — `966` is already in the `INFOSMS_COUNTRIES` array (line 196), so KSA numbers use `InfoSMS` sender ID. This was fixed in the previous update.

### Proxy Routing Issue (Likely Root Cause)

The `proxyFetch` function routes requests based on `country_id`:

```text
country_id === 'kw'  →  HTTPS_PROXY_KW / HTTP_PROXY_KW  (configured ✓)
everything else      →  HTTPS_PROXY / HTTP_PROXY          (NOT configured ✗)
```

**There are no `HTTPS_PROXY` or `HTTP_PROXY` secrets configured.** This means SA requests fall back to **direct fetch** (no proxy). If FCC requires whitelisted IPs, direct fetch from Supabase's edge runtime IPs would be rejected — likely returning error code `30` (IP not whitelisted).

### What the Frontend Sends

For the SA deployment (`VITE_COUNTRY_ID=sa`), the frontend passes `country_id: 'sa'` to the edge function. The proxy logic doesn't handle `'sa'` — it only checks for `'kw'`, so SA falls into the default path which has no proxy configured.

### Plan

**Option A (Recommended): Route SA through the Kuwait proxy**

Since both KW and SA are GCC countries and the Kuwait Fixie proxy is already configured and working, SA can share the same proxy. This is a single-line change.

**File: `supabase/functions/send-otp/index.ts`** — Update proxy selection (line 26-28):

```typescript
// Before:
let proxyUrl: string | undefined = countryId === 'kw'
  ? (Deno.env.get('HTTPS_PROXY_KW') || Deno.env.get('HTTP_PROXY_KW'))
  : (Deno.env.get('HTTPS_PROXY') || Deno.env.get('HTTP_PROXY'));

// After:
let proxyUrl: string | undefined = (countryId === 'kw' || countryId === 'sa')
  ? (Deno.env.get('HTTPS_PROXY_KW') || Deno.env.get('HTTP_PROXY_KW'))
  : (Deno.env.get('HTTPS_PROXY') || Deno.env.get('HTTP_PROXY'));
```

This routes SA OTP requests through the same Fixie proxy as Kuwait, ensuring FCC sees a whitelisted IP.

**Option B: Add a separate SA proxy**

If you want IP isolation per country, you'd need to set up a new Fixie proxy and add `HTTPS_PROXY_SA` / `HTTP_PROXY_SA` secrets, then update the code to check for `countryId === 'sa'` separately.

### Summary

| Issue | Detail |
|-------|--------|
| Sender ID | Already correct — `966` → `InfoSMS` ✓ |
| Proxy | SA has no proxy configured, falls back to direct fetch which FCC blocks |
| Fix | Route SA through existing Kuwait Fixie proxy (1-line change) |
| Redeploy | `send-otp` edge function |

