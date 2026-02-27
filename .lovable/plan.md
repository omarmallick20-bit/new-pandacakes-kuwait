

# Update OG/Preview Image to New Panda Cakes Logo

## What's Needed

The uploaded logo needs to become the default OG (Open Graph) preview image shown when the site URL is shared on WhatsApp, Instagram, Facebook, etc. Since this is a Vercel deployment, the image must be in the `public/` folder and referenced by absolute path.

Additionally, `api/og.ts` still contains Qatar references that need to be updated to Kuwait.

## Implementation

### Step 1: Copy uploaded image to `public/`
Copy `user-uploads://image-3.png` → `public/og-image.png`

### Step 2: Update `index.html` OG meta tags (lines 22-30)
- `og:image` → `/og-image.png`
- `og:site_name` → `PANDA CAKES Kuwait`
- `twitter:image` → `/og-image.png`
- Update title/description references from Qatar to Kuwait

### Step 3: Update `api/og.ts` (Vercel edge OG handler)
- Line 43: `'PANDA CAKES I Qatar I...'` → `'PANDA CAKES I Kuwait I...'`
- Line 44: `'PANDA CAKES Qatar'` → `'PANDA CAKES Kuwait'`
- Line 45: fallback image `logo.png` → `og-image.png`
- Line 47: `QAR` → `KWD`
- Line 68: `og:site_name` → `PANDA CAKES Kuwait`
- Line 70: `product:price:currency` → `KWD`

### Summary
| # | File | Change |
|---|------|--------|
| 1 | `public/og-image.png` | New file — copy uploaded logo |
| 2 | `index.html` | Update OG image path + Kuwait branding |
| 3 | `api/og.ts` | Fix Qatar→Kuwait references, update fallback image |

