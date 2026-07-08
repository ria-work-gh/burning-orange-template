/**
 * Notify Me (Back in Stock) Web Component
 *
 * Rendered in place of the disabled add-to-cart button when a variant is sold
 * out (see snippets/back-in-stock-form.liquid). Captures an email and subscribes
 * it to Klaviyo's Back in Stock feature for the current variant, so Klaviyo
 * auto-sends a notification when Shopify syncs that variant's inventory back
 * above zero.
 *
 * Lives INSIDE the product <form>, so its trigger is type="button" (never a
 * submit) and it intercepts Enter to avoid submitting the add-to-cart form. It
 * re-initialises automatically on variant change because product-form.js swaps
 * the buy-buttons region's innerHTML, which re-upgrades this element.
 *
 * Pre-launch: if no Klaviyo public API key is set, the network call is skipped
 * and success is simulated so the flow stays testable (stub mode).
 *
 * Expected markup:
 *   <notify-me data-variant-id="123" data-klaviyo-key="ABC123">
 *     <input type="email" data-notify-email>
 *     <button type="button" data-notify-submit>Notify me</button>
 *     <p data-notify-success hidden>...</p>
 *     <p data-notify-error hidden>...</p>
 *   </notify-me>
 */

// Klaviyo API revision — see https://developers.klaviyo.com/en/reference/api_overview
const KLAVIYO_REVISION = '2024-10-15';

class NotifyMe extends HTMLElement {
  connectedCallback() {
    this.emailInput = this.querySelector('[data-notify-email]');
    this.submitButton = this.querySelector('[data-notify-submit]');
    this.successMessage = this.querySelector('[data-notify-success]');
    this.errorMessage = this.querySelector('[data-notify-error]');
    if (!this.emailInput || !this.submitButton) return;

    this.onSubmit = () => this.subscribe();
    this.onKeydown = (e) => {
      if (e.key === 'Enter') {
        // Prevent implicit submission of the surrounding add-to-cart form.
        e.preventDefault();
        this.subscribe();
      }
    };

    this.submitButton.addEventListener('click', this.onSubmit);
    this.emailInput.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback() {
    this.submitButton?.removeEventListener('click', this.onSubmit);
    this.emailInput?.removeEventListener('keydown', this.onKeydown);
  }

  async subscribe() {
    this.clearError();

    if (!this.emailInput.checkValidity()) {
      this.emailInput.reportValidity();
      return;
    }

    const email = this.emailInput.value.trim();
    const variantId = this.dataset.variantId;
    const companyId = this.dataset.klaviyoKey;

    this.submitButton.classList.add('is-loading');
    this.submitButton.disabled = true;
    this.emailInput.disabled = true;

    try {
      // No API key yet (pre-launch stub): simulate success so the flow is testable.
      if (!companyId) {
        console.warn('[notify-me] No Klaviyo public API key set — skipping subscribe (stub mode).');
        this.showSuccess();
        return;
      }

      const response = await fetch(
        `https://a.klaviyo.com/client/back-in-stock-subscriptions/?company_id=${encodeURIComponent(companyId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            revision: KLAVIYO_REVISION
          },
          body: JSON.stringify({
            data: {
              type: 'back-in-stock-subscription',
              attributes: {
                channels: ['EMAIL'],
                profile: {
                  data: {
                    type: 'profile',
                    attributes: { email }
                  }
                }
              },
              relationships: {
                variant: {
                  data: {
                    type: 'catalog-variant',
                    id: `$shopify:::$default:::${variantId}`
                  }
                }
              }
            }
          })
        }
      );

      if (!response.ok) throw new Error(`Klaviyo responded ${response.status}`);

      this.showSuccess();
    } catch (error) {
      console.error('[notify-me] Subscribe failed:', error);
      this.showError();
    } finally {
      this.submitButton.classList.remove('is-loading');
      // Keep the fields locked once subscribed; otherwise re-enable for a retry.
      if (!this.classList.contains('is-subscribed')) {
        this.submitButton.disabled = false;
        this.emailInput.disabled = false;
      }
    }
  }

  showSuccess() {
    this.classList.add('is-subscribed');
    this.emailInput.disabled = true;
    this.submitButton.disabled = true;
    if (this.successMessage) this.successMessage.hidden = false;
  }

  showError() {
    if (this.errorMessage) this.errorMessage.hidden = false;
  }

  clearError() {
    if (this.errorMessage) this.errorMessage.hidden = true;
  }
}

customElements.define('notify-me', NotifyMe);
