/**
 * Newsletter Popup Web Component
 *
 * Slides in from the right after a configurable delay. Dismisses on close
 * button click and saves state to sessionStorage so it doesn't reappear
 * during the same session.
 *
 * Expected markup:
 *   <newsletter-popup data-delay="5000" aria-hidden="true">
 *     <button data-close>Close</button>
 *     ...
 *   </newsletter-popup>
 */
class NewsletterPopup extends HTMLElement {
  connectedCallback() {
    this.closeBtn = this.querySelector('[data-close]');
    this.delay = parseInt(this.dataset.delay, 10) || 5000;

    this.closeBtn?.addEventListener('click', () => this.dismiss());

    if (Shopify.designMode) {
      this.onSectionSelect = (e) => {
        if (e.target.contains(this)) this.show();
      };
      this.onSectionDeselect = (e) => {
        if (e.target.contains(this)) this.hide();
      };
      document.addEventListener('shopify:section:select', this.onSectionSelect);
      document.addEventListener('shopify:section:deselect', this.onSectionDeselect);
      return;
    }

    if (sessionStorage.getItem('newsletter-popup-dismissed')) return;

    this.timer = setTimeout(() => this.show(), this.delay);
  }

  disconnectedCallback() {
    if (this.timer) clearTimeout(this.timer);
    if (Shopify.designMode) {
      document.removeEventListener('shopify:section:select', this.onSectionSelect);
      document.removeEventListener('shopify:section:deselect', this.onSectionDeselect);
    }
  }

  show() {
    this.classList.add('is-visible');
    this.setAttribute('aria-hidden', 'false');
  }

  hide() {
    this.classList.remove('is-visible');
    this.setAttribute('aria-hidden', 'true');
  }

  dismiss() {
    this.hide();
    sessionStorage.setItem('newsletter-popup-dismissed', '1');
  }
}

customElements.define('newsletter-popup', NewsletterPopup);
