

## Fix BakePoints earning rate for Kuwait

### Problem
The `award_loyalty_points` database trigger awards points using Qatar's rate for ALL countries: `FLOOR(total_amount)` — meaning 1 currency unit = 1 BakePoint. Kuwait requires **1 KWD = 10 BakePoints**.

### What's already correct
- **Redemption logic** (`redeem_bakepoints`): correctly uses 500 points = 1 KWD for KW, 50 points = 1 QAR for QA
- **Balance query** (`get_available_bakepoints`): correctly filters by `country_id` — Kuwait users only see Kuwait-earned points
- **Frontend** (`CheckoutModal`, `ProfileModal`): correctly passes `COUNTRY_ID` to RPCs and uses correct redemption rates
- **Address filtering**: correctly filters by `country_id`

### What needs fixing

**Database migration** — Update `award_loyalty_points()` trigger to use country-specific earning rates:

```sql
-- Kuwait: 1 KWD = 10 BakePoints
-- Qatar: 1 QAR = 1 BakePoint
IF NEW.country_id = 'kw' THEN
  points_to_award := FLOOR(NEW.total_amount * 10);
ELSE
  points_to_award := FLOOR(NEW.total_amount);
END IF;
```

Also update the description text to reflect the correct rate per country.

**Frontend copy fix** — The `BakePointsInfoModal.tsx` already correctly states "1 KWD = 10 BakePoints" and "500 BakePoints = 1 KWD". No frontend changes needed.

### Important note
This is a shared database with Qatar. The migration updates the trigger function to handle both countries correctly — Qatar logic remains unchanged (1 QAR = 1 point). Only Kuwait orders (where `country_id = 'kw'`) will use the new 10x rate.

