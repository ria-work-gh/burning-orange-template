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
    if (popover) {
      popover.setAttribute('aria-hidden', 'false');
      this._clampPopover(popover);
    }
    this.activeId = marker.dataset.hotspot;
  }

  hide(marker) {
    marker.classList.remove('is-active');
    const popover = marker.querySelector('.hotspot-popover');
    if (popover) {
      popover.setAttribute('aria-hidden', 'true');
      popover.style.removeProperty('left');
      popover.style.removeProperty('transform');
      popover.style.removeProperty('bottom');
      popover.style.removeProperty('top');
      popover.style.removeProperty('margin-bottom');
      popover.style.removeProperty('margin-top');
    }
    if (this.activeId === marker.dataset.hotspot) {
      this.activeId = null;
    }
  }

  _clampPopover(popover) {
    popover.style.removeProperty('left');
    popover.style.removeProperty('transform');
    popover.style.removeProperty('bottom');
    popover.style.removeProperty('top');
    popover.style.removeProperty('margin-bottom');
    popover.style.removeProperty('margin-top');

    const rect = popover.getBoundingClientRect();
    const bounds = this.querySelector('.hotspot-container').getBoundingClientRect();

    // Flip below the marker if the popover overflows the top of the container
    if (rect.top < bounds.top) {
      popover.style.bottom = 'auto';
      popover.style.top = '100%';
      popover.style.marginBottom = '0';
      popover.style.marginTop = 'var(--spacing-1)';
    }

    // Re-measure after potential vertical flip
    const rect2 = popover.getBoundingClientRect();
    const overflowRight = rect2.right - bounds.right;
    const overflowLeft = bounds.left - rect2.left;

    if (overflowRight > 0) {
      popover.style.left = `calc(50% - ${overflowRight}px)`;
      popover.style.transform = 'translateX(-50%)';
    } else if (overflowLeft > 0) {
      popover.style.left = `calc(50% + ${overflowLeft}px)`;
      popover.style.transform = 'translateX(-50%)';
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
