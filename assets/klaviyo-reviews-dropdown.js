/**
 * Turns the Klaviyo reviews widget into a dropdown: .kl_reviews__summary is
 * the toggle area, .kl_reviews__reviews_list is the content. A secondary button
 * in the summary header is the accessible control. Klaviyo renders the widget
 * client-side (and can re-render it), so we wait for it to mount and re-apply
 * the button and ARIA attributes whenever its children change. Button labels
 * come from data-open-label / data-close-label on this script's tag.
 */
(function () {
  var script = document.currentScript;
  var OPEN_LABEL = (script && script.dataset.openLabel) || 'Open reviews';
  var CLOSE_LABEL = (script && script.dataset.closeLabel) || 'Close reviews';
  var WRAPPER_ID = 'klaviyo-product-reviews-wrapper';
  var LIST_ID = 'kl-reviews-list';
  var wrapper = null;
  var isOpen = false;

  function sync() {
    var summary = wrapper.querySelector('.kl_reviews__summary');
    var list = wrapper.querySelector('.kl_reviews__reviews_list');
    if (!summary || !list) return;

    wrapper.classList.add('is-dropdown');
    wrapper.classList.toggle('is-open', isOpen);

    list.id = LIST_ID;

    var header = summary.querySelector('.kl_reviews__summary__header');
    if (!header) return;

    var button = header.querySelector('.kl-reviews-toggle');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'button secondary kl-reviews-toggle';
      button.setAttribute('aria-controls', LIST_ID);
      header.appendChild(button);
    }

    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    var label = isOpen ? CLOSE_LABEL : OPEN_LABEL;
    if (button.textContent !== label) button.textContent = label;
  }

  function toggle() {
    isOpen = !isOpen;
    sync();
  }

  function isInteractive(target) {
    return target.closest('a, button, input, select, textarea');
  }

  function init() {
    wrapper = document.getElementById(WRAPPER_ID);
    if (!wrapper || wrapper.dataset.dropdownReady) return !!wrapper;
    wrapper.dataset.dropdownReady = 'true';

    wrapper.addEventListener('click', function (e) {
      if (e.target.closest('.kl-reviews-toggle')) return toggle();
      if (!e.target.closest('.kl_reviews__summary') || isInteractive(e.target)) return;
      toggle();
    });

    new MutationObserver(sync).observe(wrapper, { childList: true, subtree: true });
    sync();
    return true;
  }

  if (init()) return;

  var waiter = new MutationObserver(function () {
    if (init()) waiter.disconnect();
  });
  waiter.observe(document.body, { childList: true, subtree: true });
})();
