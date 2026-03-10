

## Plan: Universal Button Color System — #1B9689 Active / Dull Tiffany Default

### What You Want
- **Default state** for all action buttons: dull tiffany blue (the existing `--tiffany-blue` CSS variable)
- **Ready/active state** (when form inputs are filled and user can proceed): `#1B9689`
- This applies to every button across the entire site

### Approach

**1. Update the button component's `default` variant** in `src/components/ui/button.tsx`:
- Change the `default` variant from dark foreground to **dull tiffany blue** (`bg-tiffany text-white hover:bg-tiffany/90`)
- This will automatically apply to all buttons using the default variant across the entire app

**2. Add a new CSS utility class** for the "ready" state in `src/index.css`:
- No new class needed — buttons that already use `bg-[#1B9689]` are already correct for the active state

**3. Update specific button variants:**
- `sunshine` and `hero` variants → change to use `bg-[#1B9689]` when active
- `default` variant → dull tiffany as base, with conditional `bg-[#1B9689]` override when not disabled

**4. The cleanest approach: CSS-driven disabled/enabled styling**
- Make the `default` button variant use `bg-tiffany/60 text-white` as its base (dull tiffany)
- Add an `enabled:bg-[#1B9689]` or use the existing `disabled:opacity-50` pattern
- Actually, the simplest: make default = `bg-[#1B9689] text-white hover:bg-[#1B9689]/90` and disabled state shows dull tiffany via `disabled:bg-tiffany/60 disabled:opacity-100`

### Files to Change

**`src/components/ui/button.tsx`** — Core change:
- `default` variant: `"bg-tiffany/60 text-white hover:bg-tiffany/70 enabled:bg-[#1B9689] enabled:hover:bg-[#1B9689]/90"`
- Override the global `disabled:opacity-50` to `disabled:opacity-100` so disabled buttons show dull tiffany (not faded)
- Update `sunshine` and `hero` variants similarly

**`src/pages/LoginPage.tsx`** — Remove hardcoded `bg-[#1B9689]` classes from both login buttons (lines 197, 240), let the default variant handle it. Add conditional disabled logic based on whether email+password or phone+password are filled.

**`src/pages/SignupPage.tsx`** — Remove hardcoded `bg-[#1B9689]` from Send Code button (line 498) and Save Profile button (line 691). The disabled prop already controls when fields are incomplete.

**`src/pages/AddressSetupPage.tsx`** — Remove hardcoded `bg-[#1B9689]` from Save Address button (line 353). Already has proper disabled logic.

**`src/pages/PhoneSetupPage.tsx`** — The Send Verification Code button (line 392) uses bare `className="w-full"` with no color. Will inherit the new default variant behavior.

**`src/components/ForgotPasswordModal.tsx`** — Check and update any submit buttons.

**`src/components/CheckoutModal.tsx`** — Update proceed/pay buttons.

**`src/components/OrderConfirmationModal.tsx`** — Update Next/Confirm buttons.

**`src/pages/CartPage.tsx`** — Update checkout button.

**`src/pages/OrderPage.tsx`** — Buttons that use `bg-tiffany` hardcoded should switch to default variant.

**`src/components/PaymentModal.tsx`** — `hero` variant buttons need the same treatment.

**`src/components/AddressManager.tsx`** — Any save/add buttons.

**`src/pages/ContactPage.tsx`** — `sunshine` variant buttons.

**`src/pages/ReviewsPage.tsx`** — `hero` variant button.

### Summary of the Pattern

| State | Color | How |
|-------|-------|-----|
| Button disabled (info not yet provided) | Dull tiffany `hsl(180 35% 70%)` | `disabled:bg-tiffany disabled:opacity-70` |
| Button enabled (ready to proceed) | `#1B9689` | `bg-[#1B9689] hover:bg-[#1B9689]/90` |

All buttons across the app will follow this pattern through the centralized button component variant system, with hardcoded color overrides removed from individual pages.

