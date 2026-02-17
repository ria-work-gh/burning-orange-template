/**
 * Cart Drawer Web Component
 * Cart event protocol: .claude/conventions/commerce.md
 * Accessibility (focus trap, ARIA): .claude/conventions/accessibility.md
 *
 * Top-slide drawer that displays the cart contents. Opens automatically
 * on add-to-cart and via the cart icon. On 'cart:updated', uses the pre-rendered
 * section HTML from the event (bundled section rendering, zero extra fetches).
 * On 'cart:item-added', falls back to a standalone section fetch since the
 * product form doesn't include section data. Implements focus trapping and
 * keyboard navigation.
 *
 * Expected markup:
 *   <cart-drawer id="cart-drawer" aria-hidden="true" role="dialog"
 *     aria-modal="true" aria-label="Cart">
 *     <button class="cart-close" data-close>Close</button>
 *     <div class="cart-drawer-inner">
 *       <div class="cart-items-section">
 *         <div class="cart-items-header">...</div>
 *         <div class="cart-items-list" data-items>...</div>
 *       </div>
 *       <div class="cart-checkout-section" data-checkout>...</div>
 *     </div>
 *   </cart-drawer>
 *   <button class="cart-backdrop" id="cart-backdrop"></button>
 */
class CartDrawer extends HTMLElement {
  connectedCallback() {
    this.closeBtn = this.querySelector('[data-close]');
    this.backdrop = document.getElementById('cart-backdrop');
    this.previouslyFocused = null;
    this.stale = false;

    this.handleKeydown = this.handleKeydown.bind(this);

    // Close button click
    this.closeBtn?.addEventListener('click', () => this.close());

    // Backdrop click closes drawer
    this.backdrop?.addEventListener('click', () => this.close());

    // Listen for cart events
    this._onItemAdded = () => this.refresh().then(() => this.open());
    this._onCartUpdated = (e) => {
      const html = e.detail?.sections?.['cart-drawer'];
      if (html) {
        this.renderFromHTML(html);
      } else if (this.isOpen) {
        this.refresh();
      } else {
        this.stale = true;
      }
    };

    document.addEventListener('cart:item-added', this._onItemAdded);
    document.addEventListener('cart:updated', this._onCartUpdated);
  }

  disconnectedCallback() {
    document.removeEventListener('cart:item-added', this._onItemAdded);
    document.removeEventListener('cart:updated', this._onCartUpdated);
  }

  /**
   * Whether the drawer is currently open.
   * @returns {boolean}
   */
  get isOpen() {
    return this.classList.contains('is-open');
  }

  /**
   * Open the cart drawer. Adds the is-open class, shows backdrop,
   * locks body scroll, traps focus, and listens for Escape key.
   */
  open() {
    if (this.stale) {
      this.refresh();
      this.stale = false;
    }

    this.previouslyFocused = document.activeElement;

    this.classList.add('is-open');
    this.setAttribute('aria-hidden', 'false');
    this.backdrop?.classList.add('is-visible');
    document.body.classList.add('drawer-open');

    document.addEventListener('keydown', this.handleKeydown);
    this.trapFocus();
  }

  /**
   * Close the cart drawer. Removes is-open class, hides backdrop,
   * unlocks body scroll, and returns focus to the trigger element.
   */
  close() {
    this.classList.remove('is-open');
    this.setAttribute('aria-hidden', 'true');
    this.backdrop?.classList.remove('is-visible');
    document.body.classList.remove('drawer-open');

    document.removeEventListener('keydown', this.handleKeydown);

    if (this.previouslyFocused) {
      this.previouslyFocused.focus();
      this.previouslyFocused = null;
    }
  }

  /**
   * Swap drawer DOM from a rendered section HTML string.
   * Replaces the items list and checkout section content.
   * @param {string} html - Full rendered section HTML.
   */
  renderFromHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newDrawer = doc.querySelector('cart-drawer');
    if (!newDrawer) return;

    // Replace items list content
    const currentItems = this.querySelector('[data-items]');
    const newItems = newDrawer.querySelector('[data-items]');
    if (currentItems && newItems) {
      currentItems.innerHTML = newItems.innerHTML;
    }

    // Replace checkout section content
    const currentCheckout = this.querySelector('[data-checkout]');
    const newCheckout = newDrawer.querySelector('[data-checkout]');
    if (currentCheckout && newCheckout) {
      currentCheckout.innerHTML = newCheckout.innerHTML;
    }
  }

  /**
   * Fetch fresh section HTML via AJAX section rendering and swap the DOM.
   * Used for 'cart:item-added' events where no bundled section data is
   * available, and as a fallback when the drawer is open but the event
   * doesn't include cart-drawer section HTML.
   */
  async refresh() {
    this.classList.add('is-loading');

    try {
      const sectionId = this.id || 'cart-drawer';
      const response = await fetch(`${window.location.pathname}?section_id=${sectionId}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) return;

      this.renderFromHTML(await response.text());
    } finally {
      this.classList.remove('is-loading');
    }
  }

  /**
   * Handle keydown events for Escape to close and Tab to trap focus.
   * @param {KeyboardEvent} e
   */
  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.close();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusableElements = this.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }

  /**
   * Move focus to the first focusable element inside the drawer
   * (typically the close button).
   */
  trapFocus() {
    const focusableElements = this.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }
}

customElements.define('cart-drawer', CartDrawer);
