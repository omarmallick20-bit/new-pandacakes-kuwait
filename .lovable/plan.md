

## Problem

The `send-otp` edge function uses `HTTPS_PROXY` / `HTTP_PROXY` secrets to route SMS through Fixie. Both Qatar and Kuwait share the same Supabase project, but Kuwait has a **different Fixie proxy URL**. Currently the secrets only contain Qatar's proxy, so Kuwait OTP sends either fail or go through the wrong proxy/IP.

The screenshot also shows a "+974" (Qatar) country code on the Kuwait signup page — that's a separate issue with the phone input defaulting to Qatar.

## Fix

### 1. Add Kuwait proxy secrets

Add two new secrets (without touching the existing Qatar ones):
- `HTTPS_PROXY_KW` = `http://fixie:aPBbymPS2fIwVPD@ventoux.usefixie.com:80`
- `HTTP_PROXY_KW` = `http://fixie:aPBbymPS2fIwVPD@ventoux.usefixie.com:80`

### 2. Update `send-otp` edge function to select proxy by country

**`supabase/functions/send-otp/index.ts`** — In `proxyFetch`, accept a `countryId` parameter. Pick the proxy env var based on country:
- If `countryId === 'kw'` → read `HTTPS_PROXY_KW` / `HTTP_PROXY_KW`
- Otherwise → read `HTTPS_PROXY` / `HTTP_PROXY` (Qatar default)

Thread `country_id` from the request body through to `sendSmsViaFcc` → `proxyFetch`.

### 3. Update all frontend callers to pass `country_id`

Add `country_id: COUNTRY_ID` to every `send-otp` invocation:
- `src/pages/SignupPage.tsx` (line 236)
- `src/components/ForgotPasswordModal.tsx` (line 110)
- `src/pages/PhoneSetupPage.tsx` (line 183)
- `src/components/ProfileModal.tsx` (line 176)
- `src/pages/ProfilePage.tsx` (line 135)

All files already import or can import `COUNTRY_ID` from `@/config/country`.

### Files to modify
- `supabase/functions/send-otp/index.ts` — country-aware proxy selection
- `src/pages/SignupPage.tsx` — pass `country_id`
- `src/components/ForgotPasswordModal.tsx` — pass `country_id`
- `src/pages/PhoneSetupPage.tsx` — pass `country_id`
- `src/components/ProfileModal.tsx` — pass `country_id`
- `src/pages/ProfilePage.tsx` — pass `country_id`
- 2 new Supabase secrets: `HTTPS_PROXY_KW`, `HTTP_PROXY_KW`

