
Investigation result

Root cause summary

The recurring OTP problem is not coming from the database changing the FCC key, and it is not being caused by the Saudi duplicate payment functions.

The actual issue is in the OTP edge-function layer:

1. The FCC key is read as a raw runtime secret and is never stored in the database.
2. The OTP function does not normalize the key at all (`Deno.env.get('FCC_API_KEY')` with no `.trim()`), so if the stored secret ever contains invisible whitespace/newlines, FCC will reject it exactly as received.
3. More importantly, the function currently collapses multiple FCC failure types into an “invalid credentials / invalid key” style error. In practice, proxy/IP-whitelist/auth-route failures can be reported the same way as a bad key.
4. Kuwait and Saudi OTP traffic share the Kuwait proxy path in code, so issues on that route can repeatedly look like “invalid API key” even when the key itself is fine.

What I verified

1. No database corruption path
- `FCC_API_KEY` is a Supabase Edge Function runtime secret, not a DB column.
- `phone_verifications` has no triggers.
- I found no DB function, trigger, or code path that can overwrite or mutate the FCC key.

2. Only one code path uses the FCC key
- The only repo reference to `FCC_API_KEY` is in `supabase/functions/send-otp/index.ts`.
- It is read once with:
  `const fccApiKey = Deno.env.get('FCC_API_KEY');`
- It is then sent unchanged in:
  - query param `P`
  - header `X-API-KEY`

3. No sanitization is applied
- Unlike some other secrets in the codebase (for example `TAP_SECRET_KEY` is trimmed), `FCC_API_KEY` is not trimmed or normalized before use.
- So there is no safe-guard against hidden spaces/newlines.

4. The key is currently valid at runtime
Recent logs show successful sends with the same loaded secret:
- `send-otp` loaded prefix `1ed48461...`, length `36`, and succeeded
- `send-otp-qa` also loaded prefix `1ed48461...`, length `36`, and succeeded

That means the key is not currently “corrupted” in the runtime environment.

5. The error classification is misleading
In `send-otp/index.ts`, this block is the main problem:
- response starting with `30` becomes:
  `FCC rejected request - IP not whitelisted or invalid credentials`

So the system does not distinguish:
- actual invalid API key
- proxy/IP whitelist rejection
- other upstream FCC auth-route issues

Why this keeps recurring

The recurring behavior fits this pattern:

- The key itself is not being changed by the database or by Saudi duplicate payment functions.
- OTP requests for Kuwait/Saudi depend on the KW proxy route:
  - `countryId === 'kw' || countryId === 'sa'`
  - uses `HTTPS_PROXY_KW` / `HTTP_PROXY_KW`
- If FCC rejects that route intermittently, the function surfaces it as a credentials/key-style error.
- Re-entering the same key can appear to “fix” it temporarily, but that does not prove the key changed; it more likely coincides with the next runtime/proxy path succeeding.

Saudi duplicate function review

What does not interfere:
- The repo only has Saudi/Kuwait duplicate Tap payment functions:
  - `tap-create-charge-kw`
  - `tap-webhook-kw`
  - `tap-check-status-kw`
  - `tap-retry-payment-kw`
- These do not use `FCC_API_KEY`.
- They do not participate in OTP sending.

What is worth noting:
- I found an additional deployed OTP endpoint receiving traffic:
  - `send-otp-qa`
- It is not in this repo, but it exists in the connected Supabase project and is actively being called.
- It shares the same project-level FCC secret.
- It does not overwrite the key, but it does mean there are multiple live OTP endpoints in the same Supabase project, which can make behavior look inconsistent across environments.

Exact conclusion

The root cause is not DB mutation and not Saudi duplicate payment functions.

The root cause is that the OTP function is misreporting FCC upstream/proxy/auth failures as “invalid key”-type failures, while also sending the FCC key with no normalization at all. So:
- there is no evidence the key is being changed over time
- there is strong evidence the app’s error handling is blaming the key for failures that can come from the KW/SA proxy/auth path
- there is also a secondary risk that hidden whitespace in the stored secret would fail because the key is never trimmed

If you want, the next step should be to hard-audit the live OTP endpoints (`send-otp` and the unexpected `send-otp-qa`) and then patch the OTP function so it:
- trims/normalizes the FCC secret
- logs exact FCC failure codes
- separates invalid-key errors from proxy/IP-whitelist errors
- confirms which frontend/environment is still calling `send-otp-qa`
