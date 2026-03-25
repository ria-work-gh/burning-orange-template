/**
 * Hotspot Image Web Component
 *
 * Positioned markers on an image that reveal popover cards.
 * Hover to show on desktop, click to toggle on all devices.
 * Only one hotspot open at a time. Popovers are clamped
 * within the container bounds.
 */
class HotspotImage extends HTMLElement {
  connectedCallback() {
    this.container = this.querySelector('.hotspot-container');
    this.activeId = null;
    this.lastTrigger = null;

    var hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var points = this.querySelectorAll('.hotspot-point');

    points.forEach((point) => {
      var marker = point.querySelector('[data-hotspot]');

      if (hasHover) {
        point.addEventListener('mouseenter', () => this.show(point));
        point.addEventListener('mouseleave', () => this.hide(point));
      }

      marker.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle(point);
      });
    });

    this._onDocClick = (e) => {
      if (!e.target.closest('.hotspot-point')) {
        this.closeAll();
      }
    };
    document.addEventListener('click', this._onDocClick);

    this._onKeydown = (e) => {
      if (e.key === 'Escape' && this.activeId) {
        var trigger = this.querySelector('[data-hotspot="' + this.activeId + '"]');
        this.closeAll();
        if (trigger) trigger.focus();
      }
    };
    document.addEventListener('keydown', this._onKeydown);

    this.cardsViewport = this.querySelector('.hotspot-cards-viewport');
    if (this.cardsViewport) {
      this._mobileQuery = window.matchMedia('(max-width: 749px)');
      this._onMobileChange = () => this._handleMobileCards();
      this._mobileQuery.addEventListener('change', this._onMobileChange);
      this._handleMobileCards();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKeydown);
    if (this._mobileQuery) {
      this._mobileQuery.removeEventListener('change', this._onMobileChange);
    }
    if (this.emblaCards) {
      this.emblaCards.destroy();
    }
  }

  _handleMobileCards() {
    if (this._mobileQuery.matches) {
      if (!this.emblaCards) this._initCards();
    } else {
      if (this.emblaCards) {
        this.emblaCards.destroy();
        this.emblaCards = null;
      }
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
    if (!this._mobileQuery.matches) return;
    this.emblaCards = window.EmblaCarousel(this.cardsViewport, {
      align: 'start',
      containScroll: 'trimSnaps'
    });
  }

  show(point) {
    this.closeAll();

    var marker = point.querySelector('[data-hotspot]');
    var popover = point.querySelector('.hotspot-popover');

    this.lastTrigger = marker;
    point.classList.add('is-active');
    marker.setAttribute('aria-expanded', 'true');
    popover.removeAttribute('aria-hidden');
    popover.classList.add('is-active');
    this.clamp(point, popover);
    this.activeId = marker.dataset.hotspot;
  }

  hide(point) {
    var marker = point.querySelector('[data-hotspot]');
    var popover = point.querySelector('.hotspot-popover');

    point.classList.remove('is-active');
    marker.setAttribute('aria-expanded', 'false');
    popover.setAttribute('aria-hidden', 'true');
    popover.classList.remove('is-active');
    popover.style.removeProperty('transform');

    if (this.activeId === marker.dataset.hotspot) {
      this.activeId = null;
    }
  }

  clamp(point, popover) {
    if (!this.container) return;

    var containerRect = this.container.getBoundingClientRect();
    var pointRect = point.getBoundingClientRect();

    var pointX = pointRect.left - containerRect.left + pointRect.width / 2;
    var pointY = pointRect.top - containerRect.top + pointRect.height / 2;

    var expandedW = window.innerWidth <= 749 ? 250 : 300;
    var expandedH = 200;

    var offsetX = -50;
    var offsetY = -50;

    var leftEdge = pointX - (expandedW / 2);
    if (leftEdge < 0) {
      offsetX = -50 + (Math.abs(leftEdge) / expandedW) * 100;
    }

    var rightEdge = pointX + (expandedW / 2);
    if (rightEdge > containerRect.width) {
      offsetX = -50 - ((rightEdge - containerRect.width) / expandedW) * 100;
    }

    var topEdge = pointY - (expandedH / 2);
    if (topEdge < 0) {
      offsetY = -50 + (Math.abs(topEdge) / expandedH) * 100;
    }

    var bottomEdge = pointY + (expandedH / 2);
    if (bottomEdge > containerRect.height) {
      offsetY = -50 - ((bottomEdge - containerRect.height) / expandedH) * 100;
    }

    popover.style.transform = 'translate(' + offsetX + '%, ' + offsetY + '%) scale(1)';
  }

  toggle(point) {
    var marker = point.querySelector('[data-hotspot]');
    var id = marker.dataset.hotspot;

    if (this.activeId === id) {
      this.hide(point);
    } else {
      this.show(point);
    }
  }

  closeAll() {
    this.querySelectorAll('.hotspot-point').forEach((p) => this.hide(p));
    this.activeId = null;
  }
}

customElements.define('hotspot-image', HotspotImage);
