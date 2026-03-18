# Multi-Type Cart Upsell System

## Context

The cart currently has a single upsell type ("complete the collection"). We need three upsell types with priority ordering. All discounts are applied server-side by Shopify automatic discounts — the theme surfaces incentive messaging and the right products. `cart-totals.liquid` already displays applied discounts via `cart.discount_applications`.

---

## Architecture: Single-File Orchestrator + Card Snippets

All detection and priority logic lives in `cart-upsells.liquid` (avoids Liquid's `render` scope isolation problem). Card rendering extracted to snippets.

**Three passes in priority order, sharing a global `upsell_limit`:**

1. **Bundle (Type 3)** — "Save with a set" — highest priority
2. **Pair discount (Type 1)** — "Add a second chair and save 10%"
3. **Complete collection (Type 2)** — general cross-sell, suppressed when bundle offered for same collection

---

## Detection Logic

**Type 3 — Bundle ("Save with a set"):**
- For each tagged collection (saffra/viridis/rubra) in cart items
- Find product with `product.type == 'Bundles'` in that collection
- Show if: bundle exists, is available, not already in cart, cart has 2+ individual items from that collection
- Record collection as "bundle-offered" → suppresses Type 2 for same collection
- **Swap behavior:** Adding the bundle also removes individual items from that collection (see `bundle-add.js` below)
- Liquid builds a JSON array of line item keys (`item.key`) for items in the bundle's collection, passed via `data-remove-keys` on the button

**Type 1 — Pair ("Add a second and save 10%"):**
- For each cart item where `product.type` matches configured setting (e.g. "Woven Lounge Chair")
- Count items of that type in cart — **trigger only when count == 1**
- Show the **same product** as the upsell (same variant ID — quick-add increments quantity to 2)
- Shopify automatic discount kicks in at qty >= 2
- Show with incentive message: "Save {{ percent }}%"

**Type 2 — Collection ("Complete the collection"):**
- Existing logic (iterate tagged collections, find siblings not in cart)
- Skip if collection was "bundle-offered" by Type 3
- Skip bundle products (covered by Type 3)

### Priority & Suppression

- Global `upsell_limit` (default 3) constrains total cards across all types
- Each type fills remaining slots in order: Type 3 → Type 1 → Type 2
- Type 3 suppresses Type 2 for the same collection
- Type 1 is independent (product-type-based, not collection-based)

---

## Files to Create

### `assets/bundle-add.js` — New Web Component for bundle swap

Handles the two-step cart operation: add bundle → remove individual items.

```js
class BundleAdd extends HTMLElement {
  connectedCallback() {
    this.button = this.querySelector('button');
    if (!this.button) return;
    this.button.addEventListener('click', () => this.handleAdd());
  }

  async handleAdd() {
    const variantId = parseInt(this.button.dataset.variantId);
    const removeKeys = JSON.parse(this.button.dataset.removeKeys || '[]');

    this.button.classList.add('is-loading');
    this.button.disabled = true;

    try {
      // Step 1: Add the bundle
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
      });

      // Step 2: Remove individual items + get fresh section HTML
      const updates = {};
      removeKeys.forEach(key => { updates[key] = 0; });

      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ updates, sections: ['cart-drawer'] })
      });

      const data = await response.json();
      // Dispatch cart:updated with bundled section HTML — drawer swaps content in one shot
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { cart: data, sections: data.sections }
      }));
    } catch (error) {
      const card = this.closest('.upsell-card');
      window.location.href = card?.querySelector('a')?.href;
    } finally {
      this.button.classList.remove('is-loading');
      this.button.disabled = false;
    }
  }
}
customElements.define('bundle-add', BundleAdd);
```

**Why `cart:updated` instead of `cart:item-added`:** The `/cart/update.js` response includes `sections['cart-drawer']` HTML. By dispatching `cart:updated`, the drawer's `renderFromHTML()` uses the bundled HTML directly — zero extra fetches.

**Why two requests (add then update) instead of one:** Shopify's `/cart/update.js` only updates existing line items — it can't add new ones. `/cart/add.js` can't remove items. So two sequential requests are necessary.

---

## Files to Modify

### `snippets/cart-upsells.liquid` — Rewrite as 3-pass orchestrator

Shared preamble builds `cart_handles`, resolves collections per cart item, counts items per product type. Three clearly-commented passes, each using `capture` blocks. Groups wrapped in `.cart-upsells-group` with per-type headings. Empty groups render nothing. Entire block renders nothing if total `upsell_count == 0`.

For bundle pass: also builds `remove_keys` (JSON array of `item.key` values for individual items in the bundle's collection) and passes to the card snippet.

### `snippets/cart-upsell-card.liquid` — Add `message` and `remove_keys` params

- `message` (optional): accent-colored line below price (e.g. "Save 10%"). Used by Type 1 and Type 3.
- `remove_keys` (optional): when present, wraps button in `<bundle-add>` instead of `<quick-add>`, adds `data-remove-keys` attribute. Used by Type 3 only.

```liquid
{%- if remove_keys != blank -%}
  <bundle-add>
    <button type="button" class="button upsell-add-button text-cap"
      data-variant-id="{{ product.selected_or_first_available_variant.id }}"
      data-remove-keys="{{ remove_keys }}"
      aria-label="{{ 'cart.upsells.add_item' | t: title: product.title }}">
      {{ 'cart.upsells.add' | t }}
    </button>
  </bundle-add>
{%- else -%}
  <quick-add>
    <button type="button" class="button upsell-add-button text-cap"
      data-variant-id="{{ product.selected_or_first_available_variant.id }}"
      aria-label="{{ 'cart.upsells.add_item' | t: title: product.title }}">
      {{ 'cart.upsells.add' | t }}
    </button>
  </quick-add>
{%- endif -%}
```

### `sections/cart-drawer.liquid` — Schema + script additions

**Schema:** Add per-type settings under existing `show_upsells` master toggle:

```json
{ "type": "header", "content": "Pair discount" },
{ "type": "checkbox", "id": "show_pair_upsells", "label": "Show pair discount upsells", "default": true,
  "info": "Shows 'add another' for qualifying product type" },
{ "type": "text", "id": "pair_product_type", "label": "Product type for pair discount",
  "default": "Woven Lounge Chair", "info": "Must match product type exactly" },
{ "type": "range", "id": "pair_discount_percent", "label": "Pair discount % (display only)",
  "min": 5, "max": 50, "step": 5, "default": 10 },
{ "type": "header", "content": "Bundle upsell" },
{ "type": "checkbox", "id": "show_bundle_upsells", "label": "Show bundle upsells", "default": true },
{ "type": "range", "id": "bundle_discount_percent", "label": "Bundle discount % (display only)",
  "min": 5, "max": 50, "step": 5, "default": 20 },
{ "type": "header", "content": "Collection cross-sell" },
{ "type": "checkbox", "id": "show_collection_upsells", "label": "Show collection cross-sell", "default": true }
```

**Render call:** Pass all settings to `cart-upsells`:
```liquid
{% render 'cart-upsells', cart: cart, limit: section.settings.upsells_limit,
   show_pair_upsells: section.settings.show_pair_upsells,
   pair_product_type: section.settings.pair_product_type,
   pair_discount_percent: section.settings.pair_discount_percent,
   show_bundle_upsells: section.settings.show_bundle_upsells,
   bundle_discount_percent: section.settings.bundle_discount_percent,
   show_collection_upsells: section.settings.show_collection_upsells %}
```

**Script:** Add `<script src="{{ 'bundle-add.js' | asset_url }}" defer></script>`

### `sections/main-cart.liquid` — Mirror schema + script

Same settings as cart-drawer. Default `upsells_limit` stays at 4.

### `locales/en.default.json` — New translation keys

```json
"upsells": {
  "heading_collection": "Complete the collection",
  "heading_pair": "Add another and save {{ percent }}%",
  "heading_bundle": "Save with a set",
  "save_percent": "Save {{ percent }}%",
  "add": "Add",
  "add_item": "Add {{ title }} to cart"
}
```

### `.claude/CLAUDE.md` — Update snippet ownership + add bundle-add.js

---

## Drawer Layout (200px column)

Vertical stack with micro-headings per group. `.cart-upsells-wrapper` already has `overflow-y: auto`.

```
┌──────────────────────┐
│ SAVE WITH A SET       │  heading (detail size, muted)
│ [img] Bundle    [Add] │  compact card + "Save 20%" badge
│       Save 20%        │
│                       │
│ ADD ANOTHER AND       │
│ SAVE 10%              │  heading
│ [img] Same chair[Add] │  compact card (same product, increments qty)
│       Save 10%        │
│                       │
│ COMPLETE THE          │
│ COLLECTION            │  heading (only if no bundle for this collection)
│ [img] Sibling   [Add] │  compact card
└──────────────────────┘
```

---

## Implementation Order

1. `locales/en.default.json` — add new translation keys
2. `assets/bundle-add.js` — create bundle swap Web Component
3. `snippets/cart-upsell-card.liquid` — add `message` + `remove_keys` params
4. `snippets/cart-upsells.liquid` — rewrite as 3-pass orchestrator
5. `sections/cart-drawer.liquid` — add schema settings, update render call, add bundle-add.js script
6. `sections/main-cart.liquid` — mirror schema settings, update render call, add script
7. `.claude/CLAUDE.md` — update snippet ownership table

## Verification

1. **Type 1 (pair):** Cart with 1 "Woven Lounge Chair" → shows same product with "Save 10%" → click Add → qty goes to 2, Shopify discount applies, upsell disappears (count now 2)
2. **Type 3 (bundle):** Cart with 2+ saffra individual items → bundle card appears → click Add → bundle added, individuals removed, cart refreshes cleanly
3. **Type 3 suppression:** When bundle shown for saffra → no Type 2 "complete collection" for saffra
4. **Type 2 (collection):** Cart with 1 saffra item (not qualifying for pair) → shows other saffra products
5. **Bundle already in cart:** No Type 3 for that collection
6. **Multiple collections:** Cart with saffra + viridis items → upsells from both, respecting global limit
7. **Theme editor:** Toggle each type off → verify it disappears; adjust percentages → verify messaging updates
8. **Mobile:** Drawer columns go vertical below 1024px → upsells stack properly
9. **Error fallback:** If bundle-add fails → navigates to bundle product page
