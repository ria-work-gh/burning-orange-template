/**
 * Hotspot Image Web Component
 *
 * Positioned markers on an image that expand into message cards.
 * Hover to show on desktop, click to toggle on all devices.
 * Only one hotspot open at a time. Expanded markers are clamped
 * within the container bounds.
 */
class HotspotImage extends HTMLElement {
  connectedCallback() {
    this.markers = this.querySelectorAll('[data-hotspot]');
    this.container = this.querySelector('.hotspot-container');
    this.activeId = null;

    var hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    this.markers.forEach((marker) => {
      if (hasHover) {
        marker.addEventListener('mouseenter', () => this.show(marker));
        marker.addEventListener('mouseleave', () => this.hide(marker));
      }
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

    this.cardsViewport = this.querySelector('.hotspot-cards-viewport');
    if (this.cardsViewport) {
      this._initCards();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocClick);
    if (this.emblaCards) {
      this.emblaCards.destroy();
    }
  }

  _initCards() {
    if (typeof window.EmblaCarousel === 'undefined') {
      var script = document.querySelector('script[src*="embla-carousel"]');
      if (script) {
        script.addEventListener('load', () => this._initEmblaCards(), { once: true });
      }
      return;
    }
    this._initEmblaCards();
  }

  _initEmblaCards() {
    this.emblaCards = window.EmblaCarousel(this.cardsViewport, {
      align: 'start',
      containScroll: 'trimSnaps'
    });
  }

  show(marker) {
    this.closeAll();
    this.clamp(marker);
    marker.classList.add('is-active');
    this.activeId = marker.dataset.hotspot;
  }

  hide(marker) {
    marker.classList.remove('is-active');
    marker.style.removeProperty('transform');
    if (this.activeId === marker.dataset.hotspot) {
      this.activeId = null;
    }
  }

  clamp(marker) {
    if (!this.container) return;

    var containerRect = this.container.getBoundingClientRect();
    var containerW = containerRect.width;
    var containerH = containerRect.height;

    // Marker position in pixels
    var xPercent = parseFloat(marker.style.left);
    var yPercent = parseFloat(marker.style.top);
    var markerX = (xPercent / 100) * containerW;
    var markerY = (yPercent / 100) * containerH;

    // Expanded size
    var expandedW = window.innerWidth <= 749 ? 250 : 300;
    var expandedH = 200; // approximate max content height

    // Default transform is translate(-50%, -50%) — box centered on point
    var offsetX = -50;
    var offsetY = -50;

    // Left edge: markerX - (expandedW / 2) should be >= 0
    var leftEdge = markerX - (expandedW / 2);
    if (leftEdge < 0) {
      // Shift right: reduce the negative translate
      var shiftPx = Math.abs(leftEdge);
      offsetX = -50 + (shiftPx / expandedW) * 100;
    }

    // Right edge: markerX + (expandedW / 2) should be <= containerW
    var rightEdge = markerX + (expandedW / 2);
    if (rightEdge > containerW) {
      var shiftPx = rightEdge - containerW;
      offsetX = -50 - (shiftPx / expandedW) * 100;
    }

    // Top edge: markerY - (expandedH / 2) should be >= 0
    var topEdge = markerY - (expandedH / 2);
    if (topEdge < 0) {
      var shiftPx = Math.abs(topEdge);
      offsetY = -50 + (shiftPx / expandedH) * 100;
    }

    // Bottom edge: markerY + (expandedH / 2) should be <= containerH
    var bottomEdge = markerY + (expandedH / 2);
    if (bottomEdge > containerH) {
      var shiftPx = bottomEdge - containerH;
      offsetY = -50 - (shiftPx / expandedH) * 100;
    }

    marker.style.transform = 'translate(' + offsetX + '%, ' + offsetY + '%)';
  }

  toggle(marker) {
    var id = marker.dataset.hotspot;
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
