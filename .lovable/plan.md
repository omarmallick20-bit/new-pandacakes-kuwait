

## Analysis: Sender ID Configuration vs FCC Registration

### The Problem

Your current `send-otp/index.ts` has this sender ID logic (line 196-197):

```text
INFOSMS_COUNTRIES = ['91', '20', '216', '213', '961', '977']
→ These get sender ID: "InfoSMS"
→ Everything else gets: "PANDA CAKES"
```

This means **KSA (966) currently sends with "PANDA CAKES"** — but according to FCC's email, KSA is registered under **"InfoSMS"** (International), NOT "PANDA CAKES". That is why KSA OTPs are failing.

### FCC Registration vs Current Code — Full Mapping

| Country | Code | FCC Registered Sender | Current Code Sender | Status |
|---------|------|----------------------|---------------------|--------|
| **KSA** | **966** | **InfoSMS** | **PANDA CAKES** | **WRONG — causes failure** |
| India | 91 | Not in new list | InfoSMS | Needs review |
| Egypt | 20 | Not in new list | InfoSMS | Needs review |
| Tunisia | 216 | Not in new list | InfoSMS | Needs review |
| Algeria | 213 | Not in new list | InfoSMS | Needs review |
| Lebanon | 961 | Not in new list | InfoSMS | Needs review |
| Nepal | 977 | Not in new list | InfoSMS | Needs review |
| Sri Lanka | 94 | PANDA CAKES | PANDA CAKES | OK |
| Korea | 82 | PANDA CAKES | PANDA CAKES | OK |
| Thailand | 66 | PANDA CAKES | PANDA CAKES | OK |
| Japan | 81 | PANDA CAKES | PANDA CAKES | OK |
| UK | 44 | PANDA CAKES | PANDA CAKES | OK |
| Ireland | 353 | PANDA CAKES | PANDA CAKES | OK |
| France | 33 | PANDA CAKES | PANDA CAKES | OK |
| Germany | 49 | PANDA CAKES | PANDA CAKES | OK |
| Spain | 34 | PANDA CAKES | PANDA CAKES | OK |
| Netherlands | 31 | PANDA CAKES | PANDA CAKES | OK |
| Turkey | 90 | PANDA CAKES | PANDA CAKES | OK |
| Greece | 30 | PANDA CAKES | PANDA CAKES | OK |
| Poland | 48 | PANDA CAKES | PANDA CAKES | OK |
| Ukraine | 380 | PANDA CAKES | PANDA CAKES | OK |
| Belarus | 375 | PANDA CAKES | PANDA CAKES | OK |
| Slovakia | 421 | PANDA CAKES | PANDA CAKES | OK |
| Czech Republic | 420 | PANDA CAKES | PANDA CAKES | OK |
| USA | 1 | PANDA CAKES | PANDA CAKES | OK |
| Mexico | 52 | PANDA CAKES | PANDA CAKES | OK |
| Argentina | 54 | PANDA CAKES | PANDA CAKES | OK |
| Brazil | 55 | PANDA CAKES | PANDA CAKES | OK |
| New Zealand | 64 | PANDA CAKES | PANDA CAKES | OK |
| Australia | 61 | PANDA CAKES | PANDA CAKES | OK |
| Jordan | 962 | PANDA CAKES | PANDA CAKES | OK |
| Iraq | 964 | PANDA CAKES | PANDA CAKES | OK |
| Qatar | 974 | Not in list | PANDA CAKES | May need checking |
| Kuwait | 965 | Not in list | PANDA CAKES | May need checking |

### Root Cause of KSA Failure

KSA (`966`) must use sender ID `InfoSMS`, but the code sends it as `PANDA CAKES`. FCC rejects it because `PANDA CAKES` is not registered for KSA.

### The Screenshot You Shared

The image shows a different version of the code (possibly from another project) that already has `966` in `INFOSMS_COUNTRIES` and includes a fallback sender mechanism. Your current deployed `send-otp` does NOT have either of these.

### Plan

**File: `supabase/functions/send-otp/index.ts`** — Update the `INFOSMS_COUNTRIES` array and sender ID logic:

1. **Add `966` to `INFOSMS_COUNTRIES`** so KSA uses `InfoSMS` sender ID
2. **Keep the existing countries** (`91`, `20`, `216`, `213`, `961`, `977`) unless you want to remove any
3. **Redeploy** the edge function

The fix is a single-line change on line 196:
```typescript
// Before:
const INFOSMS_COUNTRIES = ['91', '20', '216', '213', '961', '977'];

// After:
const INFOSMS_COUNTRIES = ['91', '20', '216', '213', '961', '977', '966'];
```

### Important Notes

- **Qatar (974) and Kuwait (965)** are not in either FCC sender ID list you shared. These likely work because they are local/GCC routes with different rules. If they are currently working, no change needed.
- The old countries (India, Egypt, Tunisia, Algeria, Lebanon, Nepal) using `InfoSMS` are also not in the new FCC lists. If OTPs to those countries are working, leave them. If not, they may need sender ID registration with FCC.
- No fallback sender mechanism is needed unless you want extra resilience — the simple fix of adding `966` to the array should resolve KSA failures immediately.

