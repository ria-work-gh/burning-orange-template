class ProductCarousel extends HTMLElement {
  connectedCallback() {
    this.viewport = this.querySelector('.product-carousel-viewport');
    this.prevBtn = this.querySelector('.product-carousel-prev');
    this.nextBtn = this.querySelector('.product-carousel-next');
    this.slides = this.querySelectorAll('.product-carousel-slide');

    if (this.slides.length < 2) return;

    if (typeof window.EmblaCarousel === 'undefined') {
      var script = document.querySelector('script[src*="embla-carousel"]');
      if (script) {
        script.addEventListener('load', () => this._init(), { once: true });
      }
      return;
    }

    this._init();
  }

  _init() {
    this.embla = window.EmblaCarousel(this.viewport, {
      align: 'start',
      containScroll: 'trimSnaps',
      slidesToScroll: 1
    });

    this.classList.add('is-initialized');

    this._onSelect = this._updateButtons.bind(this);
    this._onPrevClick = () => this.embla.scrollPrev();
    this._onNextClick = () => this.embla.scrollNext();

    this.embla.on('select', this._onSelect);
    this.embla.on('init', this._onSelect);
    this.prevBtn.addEventListener('click', this._onPrevClick);
    this.nextBtn.addEventListener('click', this._onNextClick);

    this._updateButtons();
  }

  disconnectedCallback() {
    if (this.embla) {
      this.embla.off('select', this._onSelect);
      this.embla.destroy();
    }
    if (this.prevBtn) this.prevBtn.removeEventListener('click', this._onPrevClick);
    if (this.nextBtn) this.nextBtn.removeEventListener('click', this._onNextClick);
  }

  _updateButtons() {
    this.prevBtn.disabled = !this.embla.canScrollPrev();
    this.nextBtn.disabled = !this.embla.canScrollNext();
  }
}

customElements.define('product-carousel', ProductCarousel);
