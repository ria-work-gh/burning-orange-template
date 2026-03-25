# Hotspot Image Section — Critical Analysis

> Audit of `sections/hotspot-image.liquid` and `assets/hotspot-image.js` against WCAG 2.1 AA, performance best practices, responsive design, and animation quality.

---

## Summary of Issues Found

| # | Category | Severity | Issue |
|---|----------|----------|-------|
| 1 | A11y | **Critical** | Invalid HTML: block elements (`<h3>`, `<p>`, `<div>`) inside `<button>` |
| 2 | A11y | **Critical** | Missing `aria-expanded` on hotspot triggers |
| 3 | A11y | **Critical** | Missing `aria-label` on hotspot buttons — screen readers announce nothing meaningful |
| 4 | A11y | **High** | No Escape key support to close open hotspot |
| 5 | A11y | **High** | No focus return to trigger after closing |
| 6 | A11y | **Medium** | Missing `alt` text on the hotspot image |
| 7 | Performance | **High** | Animating `width` and `max-height` triggers layout on every frame |
| 8 | Performance | **Medium** | Image missing `srcset`/`sizes` — serves 2000px image to all viewports |
| 9 | Responsive | **High** | Hotspot positions break when image is cropped via `object-fit: cover` (fill mode) |
| 10 | Responsive | **Medium** | Touch targets may overlap/cluster on small screens with no mitigation |
| 11 | Animation | **Medium** | `prefers-reduced-motion` rule targets `.hotspot-popover` (doesn't exist) and misses key selectors |
| 12 | CSS | **Low** | Hardcoded color `hsla(45, 33%, 85%, 0.85)` used twice instead of a token |
| 13 | i18n | **Low** | No translation keys — section has no user-facing text to translate (but `aria-label` will need one) |
| 14 | Schema | **Low** | Missing `color_scheme` default value |

---

## 1. Invalid HTML: Block Content Inside `<button>` (Critical)

### What's happening

```liquid
<button class="hotspot-marker" ...>
  <svg>...</svg>
  <div class="hotspot-content">          <!-- ❌ <div> inside <button> -->
    <h3 class="hotspot-title">...</h3>   <!-- ❌ <h3> inside <button> -->
    <p class="hotspot-description">...</p> <!-- ❌ <p> inside <button> -->
  </div>
</button>
```

### Why it's a problem

Per the HTML spec, `<button>` only accepts **phrasing content** — no `<div>`, `<h3>`, or `<p>`. Browsers render it, but:
- Screen readers flatten all content into a single accessible name string, stripping heading semantics
- The `<h3>` won't be announced as a heading, breaking the heading hierarchy
- Validators flag it as invalid HTML

### Best practice

Separate the trigger button from the popover content. The button should contain only the visual indicator (plus icon) and an `aria-label`. The popover content lives as a sibling element:

```html
<button class="hotspot-marker" aria-expanded="false" aria-controls="hotspot-{id}">
  <svg ...></svg>
  <span class="visually-hidden">{{ block.settings.title }}</span>
</button>
<div class="hotspot-content" id="hotspot-{id}" hidden>
  <h3>...</h3>
  <p>...</p>
</div>
```

---

## 2. Missing `aria-expanded` (Critical)

### What's happening

The hotspot buttons toggle a popover open/closed, but have no `aria-expanded` attribute. Screen reader users have no way to know whether a hotspot is currently showing its content.

### Best practice (Disclosure pattern — W3C APG)

```html
<button aria-expanded="false" aria-controls="hotspot-content-{id}">
```

JS must toggle `aria-expanded` between `"true"` and `"false"` when showing/hiding.

---

## 3. Missing `aria-label` on Hotspot Buttons (Critical)

### What's happening

```html
<button class="hotspot-marker" data-hotspot="abc123">
  <svg aria-hidden="true" focusable="false">...</svg>
  <!-- content is hidden (opacity: 0) in collapsed state -->
</button>
```

The only visible content is an SVG marked `aria-hidden`. The text content inside `.hotspot-content` is visually hidden (opacity: 0) but still technically in the accessibility tree — however, it creates a confusing announcement like "View details for Pagoda Lamp Some description text, button" all as one flattened string.

### Best practice

Each button needs a descriptive `aria-label`:

```liquid
<button
  class="hotspot-marker"
  aria-label="{{ block.settings.title | default: 'Hotspot' }}"
  aria-expanded="false"
  aria-controls="hotspot-{{ block.id }}"
>
```

---

## 4. No Escape Key Support (High)

### What's happening

The JS handles click and hover events, plus document click to close. But there is no keyboard handler for the Escape key to close an open popover.

### Best practice

Per WCAG and the Disclosure pattern, Escape should close the currently open popover and return focus to the trigger button:

```js
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && this.activeId) {
    var activeMarker = this.querySelector('[data-hotspot="' + this.activeId + '"]');
    this.hide(activeMarker);
    activeMarker.focus();
  }
});
```

---

## 5. No Focus Management (High)

### What's happening

When a popover closes (via document click or clicking another hotspot), focus is not returned to the trigger. This leaves keyboard users stranded.

### Best practice

After closing a popover, return focus to the button that opened it — especially when closed via Escape or external click while the trigger had focus.

---

## 6. Missing Image `alt` Text (Medium)

### What's happening

```liquid
{{ section.settings.image | image_url: width: 2000 | image_tag:
    class: 'hotspot-image', loading: 'lazy',
    width: section.settings.image.width,
    height: section.settings.image.height
}}
```

No `alt` attribute is specified. Shopify's `image_tag` will use the image's `alt` field from the media library, which may be empty. For a hotspot section where the image is the primary content, a descriptive alt is essential.

### Best practice

Add an `alt` text setting to the schema, or at minimum use the image object's alt:

```liquid
{{ section.settings.image | image_url: width: 2000 | image_tag:
    alt: section.settings.image.alt | default: '',
    ...
}}
```

If the image is decorative and the hotspot cards convey the information, use `alt: ''`.

---

## 7. Animating `width` and `max-height` — Layout Thrashing (High)

### What's happening

```css
.hotspot-marker {
  transition: width 0.3s ease 0.15s, max-height 0.3s ease 0.15s, background-color 0.3s ease 0.15s;
}
.hotspot-marker.is-active {
  width: 300px;
  max-height: 300px;
}
```

The expand/collapse animates `width` and `max-height`. Both properties trigger **layout recalculation** on every animation frame. The browser must:
1. Recalculate the geometry of the marker element
2. Check if neighboring elements are affected
3. Repaint the affected region

This is significantly more expensive than animating `transform` and `opacity`, which are compositor-only properties (GPU-accelerated, no layout/paint).

### Best practice

Use `transform: scale()` with `opacity` for the popover appearance, or use the `grid-template-rows: 0fr → 1fr` technique (already used in this codebase per commit 547a951 for accordion animations):

**Option A — Transform-based (recommended for this case):**
```css
.hotspot-content {
  position: absolute;
  width: 300px;
  opacity: 0;
  transform: scale(0.96);
  transform-origin: center;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.hotspot-marker.is-active .hotspot-content {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
```

The marker button stays at its fixed dot size. The popover content is a separate element that fades in with a subtle scale, positioned relative to the marker. No layout-triggering properties animate.

**Option B — Keep the expanding box but use `transform: scaleX/scaleY`:**
Visually similar to the current effect, but GPU-composited.

---

## 8. Image Missing `srcset`/`sizes` (Medium)

### What's happening

```liquid
{{ section.settings.image | image_url: width: 2000 | image_tag: ... }}
```

This serves a 2000px-wide image to all devices. On a 375px mobile screen, the browser downloads ~4x more data than needed.

### Best practice

Use Shopify's `image_tag` with `sizes` and `widths`:

```liquid
{{ section.settings.image | image_url: width: 2000 | image_tag:
    sizes: '(min-width: 900px) 1000px, 100vw',
    widths: '400,600,800,1000,1400,2000',
    loading: 'lazy',
    ...
}}
```

This generates a `srcset` with multiple resolutions. The browser picks the optimal size.

---

## 9. Hotspot Positions Break with `object-fit: cover` (High)

### What's happening

When `image_fill` is enabled:
```css
.hotspot-section-fill .hotspot-image {
  width: 100%; height: 100%;
  object-fit: cover;
}
```

Hotspot positions are set as `left: X%; top: Y%` relative to the **container**, but `object-fit: cover` crops the image. The hotspot at 30% from the left of the container may not align with 30% of the visible image because the image is cropped differently at different viewport sizes.

### The disconnect

- `left: 50%; top: 50%` positions the marker at the center of the **container**
- `object-fit: cover` may crop the image so that the visual center is shifted
- Hotspots placed on specific features (a product, a detail) will drift off-target as the viewport changes

### Best practice options

1. **Don't use `object-fit: cover` with hotspots** — use `contain` so the image and container have the same coordinate system
2. **Provide per-breakpoint coordinates** — add `x_mobile`/`y_mobile` settings to the block schema so merchants can adjust positions
3. **Use `object-position` paired with coordinate compensation** — complex and fragile

Option 1 is simplest and most reliable. Option 2 is most flexible for merchants.

---

## 10. Touch Target Clustering (Medium)

### What's happening

On mobile, markers shrink to 32×32px. If a merchant places two hotspots close together (e.g., 5% apart on a 375px image = ~19px apart), the targets overlap and become difficult to tap individually.

### WCAG 2.5.8 Target Size (Minimum)

Targets must be at least 24×24 CSS pixels, with 24px of spacing from adjacent targets. The current 32px markers meet the size requirement, but spacing is not enforced.

### Best practice

- The mobile cards fallback (`mobile_cards` setting) already solves this by hiding markers entirely — consider making this the default mobile behavior
- If keeping markers on mobile, add a minimum distance check in JS that shifts overlapping markers apart, or group nearby hotspots into a single cluster marker

---

## 11. Incomplete `prefers-reduced-motion` Handling (Medium)

### What's happening

```css
@media (prefers-reduced-motion: reduce) {
  .hotspot-marker,
  .hotspot-popover {    /* ← .hotspot-popover doesn't exist */
    transition: none;
  }
}
```

The selector `.hotspot-popover` targets a class that doesn't exist in the section. Meanwhile, `.hotspot-plus` and `.hotspot-content` both have transitions that are NOT disabled by this rule.

### Best practice

Target all animated elements:

```css
@media (prefers-reduced-motion: reduce) {
  .hotspot-marker,
  .hotspot-plus,
  .hotspot-content {
    transition: none;
  }
}
```

Note: `base.css` has a global `prefers-reduced-motion` rule using `*` selector with `!important`, which should catch these. But the section-level rule suggests intent to handle it locally — it should be correct either way.

---

## 12. Hardcoded Colors (Low)

### What's happening

```css
.hotspot-marker.is-active {
  background-color: hsla(45, 33%, 85%, 0.85);
}
.hotspot-card {
  background-color: hsla(45, 33%, 85%, 0.85);
}
```

This warm beige is used in two places but isn't a design token. It also doesn't adapt to color schemes — in `scheme-2` (dark background), the popover would have a light background regardless.

### Best practice

Either define as a token or derive from the color scheme:

```css
background-color: color-mix(in srgb, var(--color-bg) 85%, transparent);
```

---

## 13. No Translation Keys (Low)

The section has no hardcoded user-facing strings currently — titles and descriptions come from block settings, which is correct. However, when `aria-label` is added to the markers (see issue #3), it will need a translation key:

```json
{
  "sections": {
    "hotspot_image": {
      "hotspot_label": "View details: {{ title }}"
    }
  }
}
```

---

## 14. Missing `color_scheme` Default (Low)

```json
{ "type": "color_scheme", "id": "color_scheme", "label": "Color scheme" }
```

Other sections in this codebase include `"default": "scheme-1"`. Omitting it means Shopify picks the first scheme, which is the same result — but being explicit is more consistent.

---

## Additional Observations

### Embla Carousel Dependency for Mobile Cards

The mobile cards carousel depends on `window.EmblaCarousel` being loaded globally. The section doesn't load Embla itself — it listens for a script with `src*="embla-carousel"` to finish loading. If the hotspot section appears on a page with no other carousel section that loads Embla, the cards won't be swipeable. They'll still be scrollable (CSS `overflow` + `display: flex`), but won't snap.

**Recommendation:** Either load Embla explicitly in this section when `mobile_cards` is enabled, or ensure the CSS-only scroll works well enough without JS (add `scroll-snap-type` and `scroll-snap-align`).

### `overflow: hidden` on Container

The container has no explicit `overflow: hidden`, but the section has `overflow: hidden` implicitly via the marker's own `overflow: hidden`. The expanded popover content is inside the marker, so it's contained. However, this means the expanded content can't visually overflow the marker's bounds — text that exceeds `max-height: 300px` is clipped silently.

### No Empty State

When no image is set (`section.settings.image == blank`), the section renders an empty `<hotspot-image>` wrapper with hotspot markers floating in a 85vh void. Consider hiding the section or showing a placeholder.

### `disabled_on` Includes `"templates": ["index"]`

The hotspot section is disabled on the index (home) template. This seems intentionally restrictive — worth confirming this is desired, as hotspot sections are commonly used on home pages.

---

## Prioritized Recommendations

### Must Fix (before shipping)

1. **Restructure HTML** — separate trigger button from popover content; no block elements inside `<button>`
2. **Add `aria-expanded`** and `aria-controls` to hotspot buttons
3. **Add `aria-label`** to each hotspot button
4. **Add Escape key** handler to close popovers
5. **Fix `prefers-reduced-motion`** to target correct selectors

### Should Fix

6. **Replace `width`/`max-height` animation** with `transform`/`opacity`
7. **Add `srcset`/`sizes`** to the image for responsive loading
8. **Address `object-fit: cover` coordinate drift** — either remove fill mode or add per-breakpoint positions
9. **Add focus return** to trigger when popover closes
10. **Make Embla loading explicit** or add CSS scroll-snap fallback for mobile cards

### Nice to Have

11. Extract hardcoded popover color to a token
12. Add `color_scheme` default to schema
13. Add empty state handling when no image is set
14. Add `alt` text setting to schema
