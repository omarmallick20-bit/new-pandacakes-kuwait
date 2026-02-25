

# Kuwait Content Update — Terms, Privacy, Refund, BakePoints, Contact

This plan replaces all Qatar-specific legal/policy content, BakePoints logic, and contact details with their Kuwait equivalents. All documents will be fully translated to Arabic with phone numbers kept in LTR format.

---

## Technical Details

### 1. Terms & Conditions (`src/pages/TermsPage.tsx`) — Full content replacement

**English section** (lines 236-458): Replace all content with the uploaded Kuwait T&C file. Key differences from Qatar version:
- Company registered in "State of Kuwait", registration number 428943
- Website: www.pandacakes.me
- Phone: +965 50018008 (all occurrences)
- Opening hours: 8am to 9pm Sunday to Saturday
- Currency: QAR in section 4.1 stays as-is per the uploaded file (the file literally says "QAR" — this appears to be a typo in the source doc but we'll keep it faithful)
- Delivery section 3.4: "Kuwait" instead of "Qatar"
- Section 8.1: Delivery cost reference to "Barwa Village" removed — the uploaded file says "from our shop which located at Barwa Village" which seems Qatar-specific but it's in the Kuwait file, so we keep it as provided
- Section 8.7: Phone +965 50018008
- Section 14.2: "laws of The State of Kuwait"
- Hyperlinks preserved: Privacy Policy (`/privacy-policy`), Refund Policy (`/refund-policy`), Tap Payments ToS

**Arabic section** (lines 27-234): Full translation of the Kuwait T&C. All phone numbers wrapped in `<span dir="ltr">+965 50018008</span>` to prevent RTL reversal. Key Arabic changes:
- "دولة الكويت" instead of "دولة قطر"
- Registration: ٤٢٨٩٤٣
- Phone: +965 50018008
- www.pandacakes.me
- "قوانين دولة الكويت" in governing law

---

### 2. Privacy Policy (`src/pages/PrivacyPolicyPage.tsx`) — Full content replacement

**English section** (lines 106-183): Replace with uploaded Kuwait privacy policy:
- Location: "Ardiya Herafiya, Kuwait"
- Contact: +965 50018008, kw@pandacakes.me
- Governing law: "The State of Kuwait"

**Arabic section** (lines 27-103): Full Arabic translation:
- "العردية الحرفية، الكويت"
- Phone in `<span dir="ltr">+965 50018008</span>`
- Email: kw@pandacakes.me
- "قوانين دولة الكويت"

---

### 3. Refund Policy (`src/pages/RefundPolicyPage.tsx`) — Full content replacement

**English section** (lines 69-112): Replace with uploaded Kuwait refund policy:
- All phone numbers: +965 50018008 (sections 3, 4, and contact box)

**Arabic section** (lines 27-67): Full Arabic translation:
- All phone numbers in `<span dir="ltr">+965 50018008</span>`

---

### 4. BakePoints Info Modal (`src/components/BakePointsInfoModal.tsx`)

Update the modal content to reflect Kuwait BakePoints logic from the uploaded file:
- Line 71: "QAR 1" → "KWD 1", "1 BakePoint" → "10 BakePoints"
- Line 77: "Talabat, Snoonu, Rafeeq, Bleems" → "Talabat, Keeta, Deliveroo"
- Line 100: "50 BakePoints" → "500 BakePoints", "QAR 1" → "KWD 1"

The modal currently has no Arabic support (it's English-only). We should add language-aware rendering so Arabic users see Arabic content. Add `useTranslation` hook and conditionally render Arabic/English content, with phone numbers protected in `<span dir="ltr">`.

---

### 5. Points Display Utility (`src/utils/pointsDisplay.ts`)

- Line 4: Comment → "Kuwait-based website"
- Line 21-28: Update `getPointsRedemptionInfo` return:
  - `rate: 500` (500 BakePoints = 1 KWD, per the uploaded file)
  - `currency: 'KWD'`
  - `currencySymbol: 'د.ك'`
- Line 48: `getCurrencyForOrder` → `return 'KWD'`
- Line 52: `getCurrencySymbol` → `return 'د.ك'`

---

### 6. Contact Page (`src/pages/ContactPage.tsx`)

- Line 13: WhatsApp URL → `https://api.whatsapp.com/send/?phone=96550018008&text&type=phone_number&app_absent=0`
- Lines 67-74: Phone numbers → `+965 5001 8008` and `+965 5575 6675` (with clipboard values `+96550018008` and `+96555756675`)
- Lines 87-98: Social links:
  - TikTok → `https://www.tiktok.com/@pandacakes.kw`
  - Instagram → `https://www.instagram.com/pandacakes.kw`
  - Facebook → `https://www.facebook.com/PandaCakes.kw/`
- Line 113: Map iframe → the Kuwait embed URL provided by user

---

### 7. Translations (`src/i18n/translations.ts`)

- `contact_address`: `'Ardiya Herafiya, Kuwait'` (EN), `'العردية الحرفية، الكويت'` (AR)
- `contact_hours`: Already correct ("8:00 AM – 9:00 PM")

---

### Summary: 7 files changed

| File | Change |
|------|--------|
| `TermsPage.tsx` | Full Kuwait T&C content (EN + AR) |
| `PrivacyPolicyPage.tsx` | Full Kuwait privacy policy (EN + AR) |
| `RefundPolicyPage.tsx` | Full Kuwait refund policy (EN + AR) |
| `BakePointsInfoModal.tsx` | Kuwait BakePoints logic + AR translation |
| `pointsDisplay.ts` | Rate 500, KWD currency |
| `ContactPage.tsx` | Kuwait phone/social/map |
| `translations.ts` | Contact address string |

