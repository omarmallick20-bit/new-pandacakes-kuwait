## Auto-Cycle Cake Detail Images

### Behavior
- Cake detail page (`src/pages/CakeDetailPage.tsx`) shows the main image + any `additional_images`.
- If only 1 image: render as today, no auto-switch.
- If 2+ images: auto-advance every **3500ms** in a loop.
- Transition is an **instant swap** — no glide, fade, or slide animation.
- Pause auto-cycle when the user manually interacts (clicks an arrow or a dot), then resume after one cycle interval. Dots and arrows continue to work.

### Approach
The current implementation uses Embla Carousel which always animates the slide. Since the requirement is "no glide / no fancy animation", the carousel is the wrong primitive here. Replace it with a simple state-driven image swap that preserves the existing arrows + dots UI.

### Technical changes

**File: `src/pages/CakeDetailPage.tsx`**

1. Remove `Carousel` / `CarouselContent` / `CarouselItem` / `CarouselPrevious` / `CarouselNext` usage and the `carouselApi` state for the multi-image branch.
2. Keep `currentSlide` state (already exists) as the single source of truth for which image is shown.
3. Render only the currently selected image inside the existing `aspect-square rounded-3xl` container — no transition classes, just `<img src={allImages[currentSlide]} ... />`.
4. Re-add the previous / next arrow buttons as plain styled `<button>` elements positioned over the image, using the same look as today's `CarouselPrevious` / `CarouselNext` (white circular buttons, `ChevronLeft` / `ChevronRight` from `lucide-react`). They update `currentSlide` with modulo wrap-around.
5. Keep the existing dots row (line 534–537) — switch its `onClick` from `carouselApi?.scrollTo(index)` to `setCurrentSlide(index)`.
6. Add a `useEffect` that, when `hasMultipleImages` is true, sets a `setInterval` every **3500 ms** to advance `currentSlide` to `(currentSlide + 1) % allImages.length`. Clear the interval on unmount and reset/restart it whenever the user manually changes the slide (so manual interaction doesn't cause a near-immediate auto-jump).
7. Reset `currentSlide` to `0` when `menuItem.id` changes (navigating between cakes).

### Files changed
- `src/pages/CakeDetailPage.tsx` — replace Embla carousel block with state-driven image swap + 3.5s auto-advance interval.

No other pages render cake images this way (only this detail page uses `additional_images`), so the change is isolated.
