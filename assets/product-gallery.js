/**
 * Product Gallery Web Component
 *
 * Wraps Embla Carousel for product media with auto-width horizontal scroll,
 * variant-driven slide changes, and video pause on slide leave.
 *
 * Expected markup:
 *   <product-gallery aria-roledescription="carousel" aria-label="...">
 *     <div class="product-gallery-viewport">
 *       <div class="product-gallery-container">
 *         <div class="product-gallery-slide" data-media-id="..." data-media-type="...">...</div>
 *       </div>
 *     </div>
 *     <div class="product-gallery-live-region" aria-live="polite"></div>
 *   </product-gallery>
 */
class ProductGallery extends HTMLElement {
  connectedCallback() {
    this.slides = this.querySelectorAll('.product-gallery-slide');
    this.liveRegion = this.querySelector('.product-gallery-live-region');
    this.viewport = this.querySelector('.product-gallery-viewport');

    if (this.slides.length < 2) return;

    if (typeof window.EmblaCarousel === 'undefined') {
      const script = document.querySelector('script[src*="embla-carousel"]');
      if (script) {
        script.addEventListener('load', () => this._init(), { once: true });
      }
      return;
    }

    this._init();
  }

  _init() {
    this.embla = window.EmblaCarousel(this.viewport, {
      align: 'center',
      containScroll: 'trimSnaps',
      loop: true
    });

    this.classList.add('is-initialized');

    this._onSelect = this._onSlideChange.bind(this);
    this._onVariantChanged = (e) => this._handleVariantChange(e.detail.variant);

    this.embla.on('select', this._onSelect);
    document.addEventListener('product:variant-changed', this._onVariantChanged);

    this._onSlideChange();
  }

  disconnectedCallback() {
    if (this.embla) {
      this.embla.off('select', this._onSelect);
      this.embla.destroy();
    }

    document.removeEventListener('product:variant-changed', this._onVariantChanged);
  }

  _onSlideChange() {
    var index = this.embla.selectedScrollSnap();
    var previousIndex = this.embla.previousScrollSnap();

    // Pause media on previous slide
    if (index !== previousIndex) {
      this._pauseSlideMedia(previousIndex);
    }

    // Update slides aria-hidden
    this.slides.forEach(function (slide, i) {
      if (i === index) {
        slide.removeAttribute('aria-hidden');
      } else {
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    // Announce to screen readers
    if (this.liveRegion) {
      var current = this.slides[index];
      if (current) {
        this.liveRegion.textContent = current.getAttribute('aria-label') || '';
      }
    }
  }

  _handleVariantChange(variant) {
    if (!variant || !variant.featured_media) return;

    var mediaId = String(variant.featured_media.id);
    var slideIndex = Array.from(this.slides).findIndex(
      function (slide) { return slide.dataset.mediaId === mediaId; }
    );

    if (slideIndex !== -1) {
      this.embla.scrollTo(slideIndex);
    }
  }

  _pauseSlideMedia(index) {
    var slide = this.slides[index];
    if (!slide) return;

    var mediaType = slide.dataset.mediaType;

    if (mediaType === 'video') {
      var video = slide.querySelector('video');
      if (video) video.pause();
    }

    if (mediaType === 'external_video') {
      var iframe = slide.querySelector('iframe');
      if (!iframe) return;

      var src = iframe.src || '';
      if (src.includes('youtube.com')) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      } else if (src.includes('vimeo.com')) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ method: 'pause' }),
          '*'
        );
      }
    }
  }
}

customElements.define('product-gallery', ProductGallery);
