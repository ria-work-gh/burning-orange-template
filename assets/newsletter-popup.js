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
    if (sessionStorage.getItem('newsletter-popup-dismissed')) return;

    this.closeBtn = this.querySelector('[data-close]');
    this.delay = parseInt(this.dataset.delay, 10) || 5000;

    this.closeBtn?.addEventListener('click', () => this.dismiss());

    this.timer = setTimeout(() => this.show(), this.delay);
  }

  disconnectedCallback() {
    if (this.timer) clearTimeout(this.timer);
  }

  show() {
    this.classList.add('is-visible');
    this.setAttribute('aria-hidden', 'false');
  }

  dismiss() {
    this.classList.remove('is-visible');
    this.setAttribute('aria-hidden', 'true');
    sessionStorage.setItem('newsletter-popup-dismissed', '1');
  }
}

customElements.define('newsletter-popup', NewsletterPopup);
