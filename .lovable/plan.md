

## Reduce Over-Aggressive Time Slot Buffer

### Problem
`isSlotUnavailableDueToPreparation` in `src/utils/timeSlots.ts` enforces a hardcoded `MINIMUM_BUFFER_MINUTES = 60` on top of the prep + delivery lead time. This means:
- At 9:01 PM with 90 min lead time, the order would be ready at 10:31 PM
- The 9–11 PM slot ends at 11 PM, leaving 29 min of buffer
- The code demands 60 min buffer → slot incorrectly blocked

The prep (30 min) and delivery (60 min) times already represent the real fulfillment timeline. An additional 60-minute buffer on top is excessive and blocks valid orders.

### Proposed Change

**File: `src/utils/timeSlots.ts`** (line 166)

Reduce `MINIMUM_BUFFER_MINUTES` from `60` to `15` (or remove it entirely, using `0`).

A small 15-minute buffer is reasonable as a safety margin without blocking valid slots. With 15 min buffer:
- Ready at 10:31 PM + 15 min = 10:46 PM < 11:00 PM → **slot available** ✓

### Alternative
If you'd prefer no extra buffer at all (trust the prep + delivery times completely), set it to `0`. The slot would then be available as long as the order can be ready before the slot ends.

### Technical Detail
Single constant change on one line in `src/utils/timeSlots.ts`. No other files affected — the function is already used everywhere via `generateTimeSlotsWithStatus`.

