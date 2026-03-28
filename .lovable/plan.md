

## Fix Delivery Time Display + Remove WhatsApp Section

### Two issues found

**1. Delivery time shows wrong slot**

The PaymentSuccessPage (lines 34-38, 432-436) does two things wrong:
- Uses `date-fns` `format()` on the UTC-parsed timestamp **without converting to Kuwait timezone** — so the displayed time depends on the user's browser timezone instead of always showing Kuwait time (UTC+3)
- Adds a hardcoded `+ 3 hours` to create the slot end time, which is incorrect for slots that aren't 3 hours long (e.g., the 9–11 PM slot is only 2 hours)

The fix: Use the `delivery_time_slot` label already stored in `cake_details` (from the recent delivery-time-slot persistence fix). Fall back to timezone-correct formatting using `toZonedTime` only if the label isn't available.

Same fix needed in the toast (lines 34-38).

**2. WhatsApp Confirmation section**

Lines 336-341 and 464-480 show a fake WhatsApp confirmation card. No actual WhatsApp integration sends these messages. Remove the entire section.

### File: `src/pages/PaymentSuccessPage.tsx`

1. **Import** `toZonedTime` from `date-fns-tz` and add `KUWAIT_TIMEZONE = 'Asia/Kuwait'`
2. **Toast (lines 34-38)**: Read `delivery_time_slot` from `orderDetails.cake_details`. If present, display it directly. Otherwise, convert `estimated_delivery_time` to Kuwait time using `toZonedTime` before formatting.
3. **Delivery info display (lines 432-438)**: Same logic — prefer `cake_details.delivery_time_slot` label, fall back to timezone-aware formatting. Also read `cake_details.delivery_date` for the date portion if available.
4. **Remove WhatsApp block**: Delete lines 336-341 (message variable) and lines 464-480 (WhatsApp card). Remove `MessageCircle` from imports.

### Result
- Delivery time always shows the slot the customer actually selected (e.g., "12:00 PM - 03:00 PM")
- Times are always in Kuwait timezone regardless of user's browser
- No misleading WhatsApp confirmation UI

