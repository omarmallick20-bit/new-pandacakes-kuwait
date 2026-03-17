

## Highlight "Use My Current Location" Button in DeliveryZoneMap

### What Changes

Make the "Use My Current Location" button visually stand out with a pulsing border/glow effect and tiffany styling so users immediately recognize it as the recommended action.

### Technical Approach

**File: `src/components/DeliveryZoneMap.tsx` (~line 576-585)**

Change the button from `variant="outline"` to a more prominent style:
- Use tiffany border with a subtle pulse animation to draw attention
- Add a tiffany background tint and bolder text
- Add a small helper text below: "Recommended for accurate delivery"

```tsx
<Button
  type="button"
  variant="outline"
  onClick={handleUseCurrentLocation}
  disabled={isGeocoding}
  className="w-full border-2 border-tiffany text-tiffany hover:bg-tiffany/10 font-semibold animate-pulse-subtle"
>
  <Crosshair className="mr-2 h-4 w-4" />
  Use My Current Location
</Button>
<p className="text-xs text-center text-tiffany/70">
  📍 Recommended for accurate delivery
</p>
```

**File: `src/index.css`** — Add a subtle pulse animation (gentle border glow, not distracting):
```css
@keyframes pulse-subtle {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--tiffany-blue) / 0.4); }
  50% { box-shadow: 0 0 0 4px hsl(var(--tiffany-blue) / 0.1); }
}
.animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
```

This makes the button clearly the primary action without being obnoxious, while the helper text reinforces why users should click it.

