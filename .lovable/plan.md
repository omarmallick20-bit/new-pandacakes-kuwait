
Implementation steps

1) Confirm edge-function inventory and duplicate-trigger source (no deletions)
- Keep all edge functions unchanged/deployed as-is.
- Confirmed only one `send-otp` and one `verify-otp` function exist (no duplicate OTP function pair).
- Use existing logs as baseline:
  - `send-otp` called twice for `+974 51209482`:
    - `signup_verification` at `00:53:43Z`
    - `phone_verification` at `00:56:28Z`
  - This is a flow-level double trigger, not duplicate edge functions.

2) Fix repeated post-signup phone verification loop
- Update `src/contexts/AuthContext.tsx` (`updateCustomerProfile` create-path fallback):
  - When creating a missing `Customers` row, auto-populate from `user.user_metadata.phone_number`.
  - Set `phone_verified: true` when a phone exists from verified signup metadata.
  - Persist `phone_country_code` from metadata/default config.
- Update `src/pages/SignupPage.tsx`:
  - Replace hardcoded initial `+974` with `PHONE_COUNTRY_CODE`.
  - In profile-save step, include `whatsapp_number` and `phone_verified: true` in `updateCustomerProfile` payload so PhoneGuard does not force a second OTP cycle after signup.
- Keep `send-otp`/`verify-otp` functions intact (no deletion, no QA-impacting removal).

3) Reduce signup perceived slowness in profile completion step
- Update `src/pages/SignupPage.tsx`:
  - Make `update-email` invocation non-blocking for navigation (timeout-guarded or deferred).
  - Do not block `Profile saved successfully` + redirect on slow/500 email update.
- This removes the long wait caused by the `update-email` 500 path observed in logs.

4) Fix Kuwait address map UI text/currency issues
- Update `src/components/DeliveryZoneMap.tsx`:
  - Replace placeholder text:
    - from `"Search for a location in Qatar..."`
    - to dynamic `"Search for a location in ${COUNTRY_NAME}..."`
  - Replace hardcoded map search country:
    - from `country=kw`
    - to `country=${COUNTRY_ID}`.
  - Replace hardcoded delivery fee currency:
    - from `Delivery Fee: {deliveryZone.delivery_fee} QAR`
    - to dynamic currency using config/translation (KWD in Kuwait deployment).

5) Verify with focused checks
- OTP:
  - Run signup once and confirm only one OTP send for signup flow.
  - Confirm no immediate redirect to `/phone-setup` after successful signup/profile save.
- Speed:
  - Confirm profile-save no longer hangs when `update-email` fails/slow.
- Address map:
  - Confirm search placeholder says Kuwait.
  - Confirm zone fee renders `1 KWD` (not `1 QAR`) for KW zone.
- Logs:
  - Re-check `send-otp`, `verify-otp`, and `update-email` logs after fix to ensure behavior matches expected flow.

Technical details (file-level)
- `src/contexts/AuthContext.tsx`
  - Harden fallback profile creation fields (`whatsapp_number`, `phone_verified`, `phone_country_code`) from auth metadata.
- `src/pages/SignupPage.tsx`
  - Use `PHONE_COUNTRY_CODE` default.
  - Ensure profile update writes verified phone fields.
  - Make `update-email` non-blocking/timeout-safe.
- `src/components/DeliveryZoneMap.tsx`
  - Dynamic country placeholder text.
  - Dynamic mapbox country filter.
  - Dynamic delivery fee currency label.
- No edge function deletion.
- No QA function removal or breaking change.
