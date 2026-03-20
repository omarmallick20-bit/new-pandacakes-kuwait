

## Address Form Layout + Arabic Translations

### Changes

#### 1. `src/i18n/translations.ts` — Add missing address form translations

Add to both `en` and `ar` sections:

| Key | English | Arabic |
|-----|---------|--------|
| `addr_label` | Address Label | عنوان المكان |
| `addr_area` | Area | المنطقة |
| `addr_block` | Block | قطعة |
| `addr_street` | Street | شارع |
| `addr_house` | House | منزل |
| `addr_landmarks` | Additional Details / Near Landmarks (Optional) | تفاصيل إضافية / معالم قريبة (اختياري) |
| `addr_landmarks_hint` | Help us find you easier by adding nearby landmarks | ساعدنا في العثور عليك بسهولة بإضافة معالم قريبة |
| `addr_country` | Country | الدولة |
| `addr_map_label` | Choose Location on Map | اختر الموقع على الخريطة |
| `addr_location_selected` | Location Selected | تم تحديد الموقع |
| `addr_map_warning` | Please tap on the map or use "Use My Location" to set delivery coordinates | يرجى النقر على الخريطة أو استخدام "استخدم موقعي" لتحديد إحداثيات التوصيل |
| `addr_outside_zone` | This location is outside our delivery area | هذا الموقع خارج منطقة التوصيل |
| `addr_outside_zone_desc` | Please select a different location or contact us for assistance | يرجى اختيار موقع مختلف أو التواصل معنا للمساعدة |
| `addr_no_delivery` | No delivery to this location | لا يوجد توصيل لهذا الموقع |
| `addr_pick_different` | Please pick a different location on the map within our delivery zones | يرجى اختيار موقع مختلف على الخريطة ضمن مناطق التوصيل |
| `addr_save_continue` | Save Address & Continue | حفظ العنوان والمتابعة |
| `addr_skip` | Skip for now | تخطي الآن |
| `addr_skip_msg` | You can add your address later before placing an order | يمكنك إضافة عنوانك لاحقاً قبل تقديم الطلب |
| `addr_cancel` | Cancel | إلغاء |
| `addr_deleting` | Deleting... | جاري الحذف... |
| `addr_delete` | Delete | حذف |
| `loc_share_title` | Share Your Location | شارك موقعك |
| `loc_share_desc` | For accurate delivery, please share your current location. This helps our drivers find you easily. | للتوصيل الدقيق، يرجى مشاركة موقعك الحالي. هذا يساعد السائقين في العثور عليك بسهولة. |
| `loc_use_current` | Use My Current Location | استخدم موقعي الحالي |
| `loc_detecting` | Detecting Location... | جاري تحديد الموقع... |
| `loc_enter_manual` | Enter address manually instead | أدخل العنوان يدوياً بدلاً من ذلك |
| `addr_setup_title` | Add Your Address | أضف عنوانك |
| `addr_setup_desc` | We need your delivery address to complete your account setup | نحتاج عنوان التوصيل لإكمال إعداد حسابك |

Also add to `variantTranslations` in `useTranslation.ts`:
- `Avenue` → `جادة`
- `Apartment` → `شقة`

#### 2. `src/components/AddressManager.tsx` — Layout + translations

- **Two-field row**: Place Area and Block side-by-side using `grid grid-cols-2 gap-4`
- Replace all hardcoded English labels/placeholders with `t()` calls
- Replace hardcoded button text (Cancel, Delete, Deleting...) with `t()` calls

#### 3. `src/pages/AddressSetupPage.tsx` — Same layout + translations

- Place Area and Block side-by-side
- Replace all hardcoded English strings with `t()` calls

#### 4. `src/components/LocationPrompt.tsx` — Full Arabic translation

- Accept `t` function as prop (or use `useTranslation` directly)
- Replace hardcoded "Share Your Location", "Use My Current Location", "Detecting Location...", "Enter address manually instead" with `t()` calls

### Field order preserved
Area → Block (same row) → Street → House → Landmarks → Country

