/**
 * Immersive Text Web Component
 *
 * Splits a sentence into scattered text fragments with staggered indentation.
 * Zigzag layout offsets create an editorial, staggered feel.
 *
 * The merchant uses forward slashes to mark line breaks:
 *   "Built for / Sunlight / Stillness / and time" → four fragments.
 *
 * Both mobile and desktop split on "/" delimiters consistently.
 * If no slashes are present, the whole sentence renders as one fragment.
 *
 * Expected markup:
 *   <immersive-text data-text="Built for / Sunlight" class="immersive-type-block text-large">
 *     <p>Built for Sunlight</p>
 *   </immersive-text>
 */
var OFFSETS = ['-20%', '25%', '-10%', '20%', '-15%'];

class ImmersiveText extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    var text = this.dataset.text;
    if (!text || !text.trim()) return;

    var fragments = this.split(text);

    var container = document.createElement('div');
    container.className = 'immersive-text-scattered';
    container.setAttribute('aria-label', text.replace(/\//g, '').replace(/\s+/g, ' ').trim());

    for (var i = 0; i < fragments.length; i++) {
      var span = document.createElement('span');
      span.className = 'immersive-text-fragment';
      span.style.transform = 'translateX(' + OFFSETS[i % OFFSETS.length] + ')';
      span.textContent = fragments[i];
      span.setAttribute('aria-hidden', 'true');
      container.appendChild(span);
    }

    // Replace previous render (idempotent)
    var existing = this.querySelector('.immersive-text-scattered');
    if (existing) existing.remove();

    this.classList.add('is-scattered');
    this.appendChild(container);
  }

  /**
   * Split on "/" delimiters. If no slashes, return the sentence as one fragment.
   * @param {string} text
   * @returns {string[]}
   */
  split(text) {
    text = text.trim();

    if (text.indexOf('/') !== -1) {
      return text
        .split('/')
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
    }

    return [text];
  }
}

customElements.define('immersive-text', ImmersiveText);
