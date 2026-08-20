/**
 * OSProductSwiper v1.1.2
 * Independent Swiper replacement for product carousels.
 * Fixed: No white space when loop is false.
 */
 if (!window.OS_Modules) {
    window.OS_Modules = {};
}
if (!window.OS_Modules.OSProductSwiper) {
window.OS_Modules.OSProductSwiper =class OSProductSwiper {
    constructor(selector, options = {}) {
        this.container = selector;
        if (!this.container) return;

        // Default configuration
        this.settings = Object.assign({
            slidesPerView: 1,
            spaceBetween: 20,
            loop: true,
            hideArrowsOnMobile: true,
            simulateTouch: true,
            autoplay: { delay: 3000, disableOnInteraction: true },
            pagination: { el: null, clickable: true },
            navigation: { nextEl: null, prevEl: null },
            breakpoints: {}
        }, options);

        this.wrapper = this.container.querySelector('.swiper-wrapper');
        this.originalSlides = Array.from(this.container.querySelectorAll('.swiper-slide'));
        if (this.originalSlides.length === 0 || !this.wrapper) return;

        // Internal states
        this.currentIndex = 0;
        this.clonedCount = 0;
        this.startX = 0;
        this.currentTranslate = 0;
        this.prevTranslate = 0;
        this.isDragging = false;
        this.currentSlidesPerView = this.settings.slidesPerView;
        this.autoplayTimer = null;

        this.init();
    }

    init() {
        this.wrapper.style.display = 'flex';
        this.wrapper.style.willChange = 'transform';
        this.wrapper.style.transition = 'transform 0.3s ease-out';

        // Reset wrapper in case of re-init
        this.wrapper.querySelectorAll('.swiper-slide-duplicate').forEach(el => el.remove());

        if (this.settings.loop) {
            const maxVisible = Math.max(
                ...Object.values(this.settings.breakpoints).map(b => b.slidesPerView || 1),
                this.settings.slidesPerView
            );
            this.clonedCount = Math.max(maxVisible, 4);

            const endClones = this.originalSlides.slice(-this.clonedCount).map(el => el.cloneNode(true));
            const startClones = this.originalSlides.slice(0, this.clonedCount).map(el => el.cloneNode(true));

            endClones.forEach(clone => {
                clone.classList.add('swiper-slide-duplicate');
                this.wrapper.insertBefore(clone, this.wrapper.firstChild);
            });
            startClones.forEach(clone => {
                clone.classList.add('swiper-slide-duplicate');
                this.wrapper.appendChild(clone);
            });

            this.currentIndex = this.clonedCount;
        } else {
            this.clonedCount = 0;
            this.currentIndex = 0;
        }

        this.allSlides = Array.from(this.wrapper.querySelectorAll('.swiper-slide'));

        this.updateResponsiveSettings();
        this.initPagination();
        this.initNavigation();
        this.initTouchEvents();
        this.toggleArrowsVisibility();

        window.addEventListener('resize', () => {
            this.updateResponsiveSettings();
            this.updateLayout();
            this.toggleArrowsVisibility();
        });

        this.updateLayout(false);
        this.startAutoplay();
    }

    updateResponsiveSettings() {
        const windowWidth = window.innerWidth;
        let activeBreakpoint = {
            slidesPerView: this.settings.slidesPerView,
            spaceBetween: this.settings.spaceBetween
        };

        const sortedBreakpoints = Object.keys(this.settings.breakpoints).map(Number).sort((a, b) => a - b);
        sortedBreakpoints.forEach(breakpoint => {
            if (windowWidth >= breakpoint) {
                activeBreakpoint = Object.assign({}, activeBreakpoint, this.settings.breakpoints[breakpoint]);
            }
        });

        this.currentSlidesPerView = activeBreakpoint.slidesPerView;
        this.currentSpaceBetween = activeBreakpoint.spaceBetween;
    }

    updateLayout(animate = true) {
        const containerWidth = this.container.clientWidth;
        const totalGapsWidth = (this.currentSlidesPerView - 1) * this.currentSpaceBetween;
        this.slideWidth = (containerWidth - totalGapsWidth) / this.currentSlidesPerView;

        this.allSlides.forEach((slide, idx) => {
            slide.style.width = `${this.slideWidth}px`;
            slide.style.marginRight = idx < this.allSlides.length - 1 ? `${this.currentSpaceBetween}px` : '0px';
        });

        this.wrapper.style.transition = animate ? 'transform 0.3s ease-out' : 'none';

        // Final position calculation
        this.currentTranslate = -this.currentIndex * (this.slideWidth + this.currentSpaceBetween);

        this.setTransform(this.currentTranslate);
        this.prevTranslate = this.currentTranslate;

        this.updateDots();
    }

    setTransform(translate) {
        this.wrapper.style.transform = `translateX(${translate}px)`;
    }

    checkLoopBounds() {
        if (!this.settings.loop) return;

        if (this.currentIndex >= this.originalSlides.length + this.clonedCount) {
            this.currentIndex = this.clonedCount;
            this.updateLayout(false);
        } else if (this.currentIndex < this.clonedCount) {
            this.currentIndex = this.originalSlides.length + this.clonedCount - 1;
            this.updateLayout(false);
        }
    }

    goToSlide(index, animate = true) {
        let targetIndex = index;

        // Logic for loop: false -> prevent showing white space
        if (!this.settings.loop) {
            const maxIndex = this.originalSlides.length - this.currentSlidesPerView;
            if (targetIndex < 0) targetIndex = 0;
            if (targetIndex > maxIndex) targetIndex = maxIndex;
        }

        this.currentIndex = targetIndex;
        this.updateLayout(animate);

        if (this.settings.loop && animate) {
            setTimeout(() => this.checkLoopBounds(), 305);
        }
    }

    initPagination() {
        if (!this.settings.pagination || !this.settings.pagination.el) return;
        this.paginationContainer = document.querySelector(this.settings.pagination.el);
        if (!this.paginationContainer) return;

        this.paginationContainer.innerHTML = '';
        this.originalSlides.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.className = 'swiper-pagination-bullet';
            if (this.settings.pagination.clickable) {
                dot.style.cursor = 'pointer';
                dot.addEventListener('click', () => {
                    this.stopAutoplay();
                    const targetIndex = this.settings.loop ? this.clonedCount + idx : idx;
                    this.goToSlide(targetIndex);
                    this.handleAutoplayInteraction();
                });
            }
            this.paginationContainer.appendChild(dot);
        });
    }

    updateDots() {
        if (!this.paginationContainer) return;

        let activeIndex = this.currentIndex;
        if (this.settings.loop) {
            activeIndex = (this.currentIndex - this.clonedCount) % this.originalSlides.length;
            if (activeIndex < 0) activeIndex = this.originalSlides.length + activeIndex;
        } else {
            // For loop false, index is literal
            activeIndex = this.currentIndex;
        }

        Array.from(this.paginationContainer.children).forEach((dot, idx) => {
            dot.classList.toggle('swiper-pagination-bullet-active', idx === activeIndex);
        });
    }

    initNavigation() {
        if (!this.settings.navigation) return;

        const nextBtn = document.querySelector(this.settings.navigation.nextEl);
        const prevBtn = document.querySelector(this.settings.navigation.prevEl);

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.stopAutoplay();
                this.goToSlide(this.currentIndex + 1);
                this.handleAutoplayInteraction();
            });
            this.nextBtn = nextBtn;
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.stopAutoplay();
                this.goToSlide(this.currentIndex - 1);
                this.handleAutoplayInteraction();
            });
            this.prevBtn = prevBtn;
        }
    }

    toggleArrowsVisibility() {
        if (!this.settings.hideArrowsOnMobile) return;
        const isMobile = window.innerWidth < 768;
        const display = isMobile ? 'none' : 'flex';
        if (this.nextBtn) this.nextBtn.style.display = display;
        if (this.prevBtn) this.prevBtn.style.display = display;
    }

    initTouchEvents() {
        const getX = (e) => e.touches ? e.touches[0].clientX : e.clientX;

        const dragStart = (e) => {
            if (e.type === 'mousedown' && e.target.closest('a, button')) return;
            this.stopAutoplay();
            this.isDragging = true;
            this.startX = getX(e);
            this.wrapper.style.transition = 'none';
            if (this.settings.simulateTouch && !e.touches) this.container.style.cursor = 'grabbing';
        };

        const dragMove = (e) => {
            if (!this.isDragging) return;
            const currentX = getX(e);
            let move = currentX - this.startX;
            let targetTranslate = this.prevTranslate + move;

            // Resistance when loop is false and reaching edges
            if (!this.settings.loop) {
                const maxTranslate = -(this.originalSlides.length - this.currentSlidesPerView) * (this.slideWidth + this.currentSpaceBetween);
                if (targetTranslate > 0 || targetTranslate < maxTranslate) {
                    move /= 3; // Add friction
                    targetTranslate = this.prevTranslate + move;
                }
            }

            this.setTransform(targetTranslate);
        };

        const dragEnd = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            if (this.settings.simulateTouch) this.container.style.cursor = 'grab';

            const finalX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
            const movedBy = finalX - this.startX;
            const threshold = this.slideWidth / 4;

            if (movedBy < -threshold) {
                this.goToSlide(this.currentIndex + 1);
            } else if (movedBy > threshold) {
                this.goToSlide(this.currentIndex - 1);
            } else {
                this.goToSlide(this.currentIndex);
            }
            this.handleAutoplayInteraction();
        };

        this.container.addEventListener('touchstart', dragStart, { passive: true });
        this.container.addEventListener('touchmove', (e) => {
            if (this.isDragging) dragMove(e);
        }, { passive: true });
        this.container.addEventListener('touchend', dragEnd);

        if (this.settings.simulateTouch) {
            this.container.style.cursor = 'grab';
            this.container.addEventListener('mousedown', dragStart);
            window.addEventListener('mousemove', dragMove);
            window.addEventListener('mouseup', dragEnd);
        }
    }
    destroy() {
        console.log("[OSProductSwiper] Pokrećem potpuno čišćenje i uništavanje instance slajdera.");

        // 1. Zaustavi autoplay tajmer ako je aktivan
        this.stopAutoplay();

        // 2. Ukloni globalne EventListener-e sa window nivoa (za resize i miš)
        // Napomena: Da bi window.removeEventListener radio savršeno za resize,
        // u init() metodi bi tvoj resize listener trebalo da bude imenovan (npr. this.handleResize)
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }

        // 3. Ukloni EventListener-e sa samog kontejnera za miša i dodir (Touch events)
        if (this.container) {
            // Vraćamo podrazumevani kursor pretraživača
            this.container.style.cursor = '';

            // Pošto su u initTouchEvents korišćene inline ili arrow funkcije,
            // najbrži i najsigurniji način da očistimo sve touch/mouse događaje sa kontejnera
            // bez curenja memorije u JS-u jeste kloniranje samog čvora (Node)
            const stariKontejner = this.container;
            const noviKontejner = stariKontejner.cloneNode(true);
            stariKontejner.parentNode.replaceChild(noviKontejner, stariKontejner);
        }

        // 4. Ukloni EventListener-e sa navigacionih strelica (Next i Prev dugmići)
        if (this.nextBtn) {
            const noviNext = this.nextBtn.cloneNode(true);
            this.nextBtn.parentNode.replaceChild(noviNext, this.nextBtn);
        }
        if (this.prevBtn) {
            const noviPrev = this.prevBtn.cloneNode(true);
            this.prevBtn.parentNode.replaceChild(noviPrev, this.prevBtn);
        }

        // 5. Oslobodi reference u RAM memoriji za đubretara (Garbage Collector)
        this.container = null;
        this.wrapper = null;
        this.originalSlides = [];
        this.allSlides = [];
        this.nextBtn = null;
        this.prevBtn = null;
        this.paginationContainer = null;

        console.log("[OSProductSwiper] Instanca je uspešno obrisana iz RAM-a.");
    }

    startAutoplay() {
        if (!this.settings.autoplay || !this.settings.autoplay.delay) return;
        this.stopAutoplay();
        this.autoplayTimer = setInterval(() => {
            if (!this.settings.loop) {
                const maxIndex = this.originalSlides.length - this.currentSlidesPerView;
                if (this.currentIndex >= maxIndex) {
                    this.goToSlide(0); // Restart or stop
                    return;
                }
            }
            this.goToSlide(this.currentIndex + 1);
        }, this.settings.autoplay.delay);
    }

    stopAutoplay() {
        if (this.autoplayTimer) clearInterval(this.autoplayTimer);
    }

    handleAutoplayInteraction() {
        if (this.settings.autoplay && !this.settings.autoplay.disableOnInteraction) {
            this.startAutoplay();
        }
    }
}

OS.prototype.OSProductSwiper = function(options) {
    return this.each(function() {
        new window.OS_Modules.OSProductSwiper(this, options);
    });
};
}
