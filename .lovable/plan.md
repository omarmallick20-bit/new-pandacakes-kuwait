

## Make submit buttons clearly highlight when all fields are filled

### Problem
The submit buttons on Login, Signup, and Address Setup pages use `bg-tiffany` which maps to a light pastel teal (`hsl(180 35% 70%)`). Combined with `disabled:opacity-50`, the visual difference between enabled and disabled is too subtle — users can't tell when the form is ready.

### Solution
Replace the button background with `#1B9689` (a rich, saturated teal) for the enabled state, keeping the disabled state muted via the existing `disabled:opacity-50`.

Two approaches — I recommend **Option A** for minimal blast radius:

**Option A — Inline style override on each button:**
Change `bg-tiffany hover:bg-tiffany/90` → `bg-[#1B9689] hover:bg-[#1B9689]/90` on every submit button across the three pages. This keeps the `tiffany` CSS variable unchanged for other uses (badges, links, etc.).

**Option B — Update the CSS variable:**
Change `--tiffany-blue` from `180 35% 70%` to match `#1B9689` globally. This would affect every element using `bg-tiffany` site-wide, which may have unintended side effects.

### Files to modify (Option A)

1. **`src/pages/LoginPage.tsx`** — 2 submit buttons (email + phone tabs): `bg-tiffany` → `bg-[#1B9689]`
2. **`src/pages/SignupPage.tsx`** — 2 submit buttons (send OTP + save profile): `bg-tiffany` → `bg-[#1B9689]`
3. **`src/pages/AddressSetupPage.tsx`** — 1 submit button: `bg-tiffany` → `bg-[#1B9689]`

Each change is a single className swap per button — no logic changes needed.

