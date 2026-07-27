class OSSlider {
    constructor(el, options = {}) {
        this.container = OS(el);
        if (!this.container.length) return;

        this.slides = this.container.find('.os-slide-div');
        this.total = this.slides.length;
        this.currentIndex = 0;
        this.progressTimer = null;

        // Default opcije
        this.config = {
            loop: true,
            delay: 6000,
           swipeThreshold: 70, // Pikseli za aktivaciju promene
            onMove: null,
            ...options
        };

        this.init();
    }

    init() {
        this.createDots();
        this.bindEvents();
        this.bindTouchEvents(); // 🚀 Mobilni pokreti
         this.bindMouseEvents(); // 🚀 NOVO: Desktop prevlačenje
        this.updateUI();
    }

    stop() {
        if (this.progressTimer) {
            cancelAnimationFrame(this.progressTimer);
        }
    }

    createDots() {
        const dotsWrap = this.container.find('.slider-dots');
        let html = '';
        for (let i = 0; i < this.total; i++) html += `<div class="dot" data-index="${i}"></div>`;
        dotsWrap.html(html);
        this.dots = dotsWrap.find('.dot');
    }

    updateUI() {
        this.stop();

        // RESET STILOVA
        this.slides.each(function() {
            OS(this).find('.title, .desc, .sub-desc, .action-group, .content-box, img').css({
                opacity: '', transform: '', transition: '', filter: ''
            });
        });

        this.slides.removeClass('active');
        this.dots.removeClass('active');

        const activeSlide = OS(this.slides.get(this.currentIndex));
        activeSlide.addClass('active');

        if(this.dots.get(this.currentIndex)) {
            OS(this.dots.get(this.currentIndex)).addClass('active');
        }

        const sceneName = activeSlide.attr('data-os-scene');
        if (sceneName && window.OSSliderScenes[sceneName]) {
            window.OSSliderScenes[sceneName](activeSlide);
        }
        // 🚀 KLJUČNI DEO: Emitovanje "onMove" događaja
         const state = {
             index: this.currentIndex,
             total: this.total,
             element: activeSlide.get(0),
             scene: sceneName
         };

         // A) Poziv kroz callback opciju
         if (typeof this.config.onMove === 'function') {
             this.config.onMove(state);
         }
         // B) Poziv kroz tvoj OpenShop .trigger sistem (Custom Event)
        this.container.trigger('osSlider:changed', state);
        this.startProgressBar();
    }

    move(dir = 'next') {
        this.currentIndex = (dir === 'next') ? (this.currentIndex + 1) % this.total : (this.currentIndex - 1 + this.total) % this.total;
        this.updateUI();
    }
         /* 🚀 DESKTOP MOUSE DRAG ENGINE
        */
        bindMouseEvents() {
            const el = this.container.get(0);
            if (!el) return;

            // 🧠 IQ 185: Definišemo lokalne funkcije kako bismo ih bezbedno skinuli sa window-a
            const onMouseMove = (e) => {
                if (!this.isMouseDown) return;
                e.preventDefault(); // Sprečava nativno selektovanje slika i teksta tokom prevlačenja
            };

            const onMouseUp = (e) => {
                if (!this.isMouseDown) return;
                this.isMouseDown = false;

                // Vraćamo kursor u prvobitno stanje
                this.container.css('cursor', 'grab');

                // 🧹 ČISTIMO MEMORIJU: Odmah uklanjamo window slušaoce da ne guše aplikaciju
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);

                let endX = e.clientX;
                let diff = this.startX - endX;

                // Provera da li je pomeraj dovoljno veliki za promenu slajda
                if (Math.abs(diff) > this.config.swipeThreshold) {
                    if (diff > 0) {
                        this.move('next');
                    } else {
                        this.move('prev');
                    }
                } else {
                    // Ako je bio samo običan klik, nastavi autoplay
                    this.startProgressBar();
                }
            };

            // Glavni okidač na samom slider kontejneru
            el.addEventListener('mousedown', (e) => {
                // Ignorišemo desni i srednji klik (reagujemo samo na levi taster miša)
                if (e.button !== 0) return;

                this.isMouseDown = true;
                this.startX = e.clientX;
                this.stop(); // Pauziramo autoplay dok korisnik drži slajd

                this.container.css('cursor', 'grabbing');

                // 🔥 VEZUJEMO SE NA WINDOW: Drag radi čak i ako korisnik izleti mišem van slidera
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }

    startProgressBar() {
        const bar = this.container.find('.os-slider-progress');
        let start = null;

        this.stop();

        // IQ 185: Koristimo this.config.loop jer si ga definisao u opcijama
        if(this.config.loop){
           const animate = (timestamp) => {
               if (!start) start = timestamp;
               const progress = timestamp - start;
               const pct = Math.min((progress / this.config.delay) * 100, 100);

               bar.css('width', pct + '%');

               if (pct < 100) {
                   this.progressTimer = requestAnimationFrame(animate);
               } else {
                   this.move('next');
               }
           };
           this.progressTimer = requestAnimationFrame(animate);
        }
    }

    // 🚀 NOVO: Detekcija pokreta prstom
    bindTouchEvents() {
        let xDown = null;
        let yDown = null;

        const el = this.container.get(0);

        el.addEventListener('touchstart', (evt) => {
            xDown = evt.touches[0].clientX;
            yDown = evt.touches[0].clientY;
            this.stop(); // Pauziraj dok korisnik drži
        }, {passive: true});

        el.addEventListener('touchend', (evt) => {
            if (!xDown || !yDown) return;

            let xUp = evt.changedTouches[0].clientX;
            let yUp = evt.changedTouches[0].clientY;

            let xDiff = xDown - xUp;
            let yDiff = yDown - yUp;

            // Proveri da li je pokret bio horizontalan
            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                if (Math.abs(xDiff) > this.config.swipeThreshold) {
                    if (xDiff > 0) {
                        this.move('next'); /* Swipe ulevo */
                    } else {
                        this.move('prev'); /* Swipe udesno */
                    }
                }
            }

            xDown = null;
            yDown = null;
            this.startProgressBar(); // Nastavi nakon puštanja
        }, {passive: true});
    }

    bindEvents() {
        this.container.on('click', '.os-next', () => this.move('next'));
        this.container.on('click', '.os-prev', () => this.move('prev'));
        this.container.on('click', '.dot', (e) => {
            this.currentIndex = parseInt(OS(e.target).attr('data-index'));
            this.updateUI();
        });

        this.container.on('mouseenter', () => this.stop());
        this.container.on('mouseleave', () => this.startProgressBar());
    }
}

// OS Plugin Bridge
OS.prototype.Slider = function(options) {
    return this.each(function() { new OSSlider(this, options); });
};
