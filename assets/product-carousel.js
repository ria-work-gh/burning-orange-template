class ProductCarousel extends HTMLElement {
  connectedCallback() {
    this.viewport = this.querySelector('.product-carousel-viewport');
    this.prevBtn = this.querySelector('.product-carousel-prev');
    this.nextBtn = this.querySelector('.product-carousel-next');
    this.slides = this.querySelectorAll('.product-carousel-slide');
    this.controls = this.querySelector('.product-carousel-controls');
    this.liveRegion = this.querySelector('.product-carousel-live');

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

    this._onStateChange = this._updateState.bind(this);
    this._onPrevClick = () => this.embla.scrollPrev();
    this._onNextClick = () => this.embla.scrollNext();

    this.embla.on('select', this._onStateChange);
    this.embla.on('init', this._onStateChange);
    this.embla.on('reInit', this._onStateChange);
    this.prevBtn.addEventListener('click', this._onPrevClick);
    this.nextBtn.addEventListener('click', this._onNextClick);

    this._updateState();
  }

  disconnectedCallback() {
    if (this.embla) {
      this.embla.off('select', this._onStateChange);
      this.embla.off('reInit', this._onStateChange);
      this.embla.destroy();
    }
    if (this.prevBtn) this.prevBtn.removeEventListener('click', this._onPrevClick);
    if (this.nextBtn) this.nextBtn.removeEventListener('click', this._onNextClick);
  }

  _updateState() {
    var canPrev = this.embla.canScrollPrev();
    var canNext = this.embla.canScrollNext();

    this.prevBtn.disabled = !canPrev;
    this.nextBtn.disabled = !canNext;
    this.classList.toggle('is-scrollable', canPrev || canNext);

    this._announce();
  }

  _announce() {
    var inView = this.embla.slidesInView();
    if (!inView.length || !this.liveRegion) return;

    var first = inView[0] + 1;
    var last = inView[inView.length - 1] + 1;
    var total = this.slides.length;
    var template = this.liveRegion.dataset.announceTemplate;

    if (template) {
      this.liveRegion.textContent = template
        .replace('[first]', first)
        .replace('[last]', last)
        .replace('[total]', total);
    }
  }
}

customElements.define('product-carousel', ProductCarousel);
