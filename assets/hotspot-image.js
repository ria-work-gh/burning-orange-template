/**
 * Hotspot Image Web Component
 *
 * Positioned markers on an image with title/description popovers.
 * Hover to show on desktop, click to toggle on all devices.
 * Only one popover open at a time.
 *
 * Expected markup:
 *   <hotspot-image>
 *     <div class="hotspot-container">
 *       <img class="hotspot-image" ...>
 *       <button class="hotspot-marker" data-hotspot="id">
 *         <div class="hotspot-popover">...</div>
 *       </button>
 *     </div>
 *   </hotspot-image>
 */
class HotspotImage extends HTMLElement {
  connectedCallback() {
    this.markers = this.querySelectorAll('[data-hotspot]');
    this.activeId = null;

    this.markers.forEach((marker) => {
      marker.addEventListener('mouseenter', () => this.show(marker));
      marker.addEventListener('mouseleave', () => this.hide(marker));
      marker.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle(marker);
      });
    });

    this._onDocClick = (e) => {
      if (!e.target.closest('[data-hotspot]')) {
        this.closeAll();
      }
    };
    document.addEventListener('click', this._onDocClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocClick);
  }

  show(marker) {
    this.closeAll();
    marker.classList.add('is-active');
    const popover = marker.querySelector('.hotspot-popover');
    if (popover) popover.setAttribute('aria-hidden', 'false');
    this.activeId = marker.dataset.hotspot;
  }

  hide(marker) {
    marker.classList.remove('is-active');
    const popover = marker.querySelector('.hotspot-popover');
    if (popover) popover.setAttribute('aria-hidden', 'true');
    if (this.activeId === marker.dataset.hotspot) {
      this.activeId = null;
    }
  }

  toggle(marker) {
    const id = marker.dataset.hotspot;
    if (this.activeId === id) {
      this.hide(marker);
    } else {
      this.show(marker);
    }
  }

  closeAll() {
    this.markers.forEach((m) => this.hide(m));
    this.activeId = null;
  }
}

customElements.define('hotspot-image', HotspotImage);
