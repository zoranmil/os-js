/**
 * OPENSHOP FRAMEWORK - OS3DSmartGalery v2.6.2 (MASTER)
 * Sadrži: 3D Engine, Swiper Thumbs, CSS Injection, SEO HUD i POPUP ZOOM.
 */

// 1. OSIGURAVAMO NAMESPACE ODMAH
window.OS_Modules = window.OS_Modules || {};

(function(OS) {
    if (typeof OS === 'undefined') return;

    // 2. EXECUTIVE CSS (Dodati stilovi za Popup)
    const injectStyles = () => {
        if (document.getElementById('os-3d-gal-master-styles')) return;
        const style = document.createElement('style');
        style.id = 'os-3d-gal-master-styles';
        style.innerHTML = `
            .os-smart-gal-wrapper { width: 100%; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; position: relative; }
            .os-main-stage {
                position: relative; width: 100%; aspect-ratio: 1 / 1;
                background: #fff; border-radius: 12px; overflow: hidden;
                display: flex; align-items: center; justify-content: center;
                border: 1px solid #eee; min-height: 350px;
            }
            .os-2d-static, .os-3d-mount {
                position: absolute; inset: 0; width: 100%; height: 100%;
                object-fit: contain; display: flex; align-items: center; justify-content: center;
                transition: opacity 0.4s ease;
            }
            .os-3d-inner-wrap { position: relative; width: 100%; height: 100%; }
            .os-3d-inner-wrap img {
                position: absolute; inset: 0; width: 100%; height: 100%;
                object-fit: contain; opacity: 0; transform: scale(1);
                transition: opacity 0.4s ease-out, transform 1.5s cubic-bezier(0.1, 0, 0.3, 1);
            }
            .os-3d-inner-wrap img.active-3d { opacity: 1; z-index: 2; }
            .os-3d-inner-wrap.is-playing img.active-3d { transform: scale(1.1); }

            /* HUD */
            .os-3d-hud {
                position: absolute; top: 15px; left: 15px; z-index: 10;
                background: rgba(0,0,0,0.6); color: #fff; padding: 5px 12px; border-radius: 20px;
                font-size: 12px; font-family: monospace; pointer-events: none; backdrop-filter: blur(4px);
            }
            .os-3d-rec { display: inline-block; width: 8px; height: 8px; background: #ff0000; border-radius: 50%; margin-right: 6px; }
            .is-playing .os-3d-rec { animation: os-blink 1s infinite; }
            @keyframes os-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

            /* NAV ARROWS */
            .os-main-nav {
                z-index: 99; cursor: pointer; width: 40px; height: 40px;
                background: rgba(255,255,255,0.9); border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                position: absolute; top: 50%; transform: translateY(-50%);
                box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: 0.2s;
            }
            .os-main-nav.os-prev { left: 10px; }
            .os-main-nav.os-next { right: 10px; }
            .os-main-nav:hover { background: #fb923c; color: #fff; }

            /* SWIPER THUMBS */
            .swiper-thumbs-gallery { width: 100%; padding: 0 45px !important; margin-top: 15px; position: relative; overflow:hidden; }
            .swiper-thumbs-gallery .swiper-wrapper { display: flex !important; flex-direction: row !important; }
            .swiper-thumbs-gallery .swiper-slide { width: 80px !important; flex-shrink: 0; }
            .gal-thumb-btn { cursor: pointer; border: 2px solid #eee; transition: 0.3s; width: 75px; height: 75px; object-fit: cover; border-radius: 8px; }
            .thumb-active { border-color: #fb923c !important; }

            /* 3D CONTROLS */
            .os-controls-3d { min-height: 80px; transition: 0.3s; }

            /* POPUP (ZOOM) STYLE */
            .os-uni-popup { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 99999; display: none; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
            .os-uni-popup.is-open { display: flex; }
            .os-uni-popup-content { position: relative; max-width: 90%; max-height: 90%; }
            .os-uni-popup-img { max-width: 100%; max-height: 100%; border-radius: 10px; box-shadow: 0 0 30px rgba(0,0,0,0.5); }
            .os-uni-popup-close { position: absolute; top: -45px; right: 0; background: none; border: none; color: #fff; font-size: 40px; cursor: pointer; line-height: 1; }
        `;
        document.head.appendChild(style);
    };

    // --- INTERNAL 3D ENGINE ---
    class Internal3D {
        constructor(container, settings) {
            this.container = container;
            this.settings = settings;
            this.views = {};
            this.currentActive = 'front';
            this.isPlaying = false;
            this.playInterval = null;
            this.viewOrder = [];
        }

        setup(data) {
            this.views = data;
            this.viewOrder = ['front', 'left', 'top', 'right', 'bottom'].filter(v => data[v]);
            this.stopMovie();

            let html = `
                <div class="os-3d-hud"><span class="os-3d-rec"></span><span id="hud-txt-html">FRONT</span></div>
                <div class="os-3d-loader" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:20;"><div class="spinner-border text-warning"></div></div>
                <div class="os-3d-inner-wrap">
                    ${this.viewOrder.map(v => `<img data-view="${v}" class="${v==='front'?'active-3d':''}" src="${this.views[v]}">`).join('')}
                </div>`;
            this.container.innerHTML = html;

            const imgs = this.container.querySelectorAll('img');
            let loaded = 0;
            imgs.forEach(img => {
                img.onload = () => { if (++loaded >= imgs.length) {
                    const l = this.container.querySelector('.os-3d-loader'); if(l) l.remove();
                    this.setView('front');
                }};
                if (img.complete) img.onload();
            });
        }

        setView(view) {
            const wrap = this.container.querySelector('.os-3d-inner-wrap');
            const target = this.container.querySelector(`img[data-view="${view}"]`);
            if (!target || !wrap) return;

            // --- OKIDANJE EFEKTA ---
            const fx = this.settings.transitionEffect;
            if (fx && fx !== 'none') {
                const fxClass = `fx-${fx}`;
                wrap.classList.add(fxClass);
                // Čistimo klasu nakon što animacija završi da bismo mogli ponovo da je okinemo
                setTimeout(() => wrap.classList.remove(fxClass), 450);
            }

            // Standardna promena slike
            this.container.querySelectorAll('img').forEach(i => i.classList.remove('active-3d'));
            target.classList.add('active-3d');
            this.currentActive = view;

            // HUD update...
            const hud = this.container.querySelector('#hud-txt-html');
            const names = this.views.viewNames || {};
            if (hud) hud.innerHTML = names[view] || view.toUpperCase();
        }

        playMovie(btn) {
          // 1. Odbrambeni mehanizam: Ako wrap ne postoji, potraži ga ponovo u kontejneru
          let wrap = this.container.querySelector('.os-3d-inner-wrap');

          if (!wrap) {
              // Ako ga i dalje nema, znači da trenutno nije učitan 3D model
              console.warn("[Internal3D] Pokušaj Play-a na nepostojećem wrapperu. Proveri is3d status.");
              return;
          }

          if (this.isPlaying) return this.stopMovie(btn);

          this.isPlaying = true;
          wrap.classList.add('is-playing');

          if(btn) {
              OS(btn).html('<i class="fa-solid fa-stop fa-xl"></i>')
                     .css('background', '#dc3545');
          }

          this.playInterval = setInterval(() => this.nextView(), this.settings.autoPlaySpeed);
      }

        stopMovie(btn) {
            // 1. STOP: Čistimo tajmer
            if(this.playInterval) clearInterval(this.playInterval);

            this.isPlaying = false;

            // 2. RESET EFEKATA: Sklanjamo scale/zoom klasu
            const wrap = this.container.querySelector('.os-3d-wrapper');
            if(wrap) wrap.classList.remove('is-playing');

            // 3. UI RESET: Vraćamo tvoj originalni stil
            if(btn) {
                OS(btn)
                    .html('<i class="fa-solid fa-play fa-xl"></i>') // Vraćamo PLAY ikonu
                    .css('background', '#fb923c')                  // Vraćamo tvoju narandžastu
                    .css('box-shadow', '0 4px 10px rgba(0,0,0,0.1)'); // Vraćamo originalnu senku
            }
        }

        nextView() { let i = (this.viewOrder.indexOf(this.currentActive) + 1) % this.viewOrder.length; this.setView(this.viewOrder[i]); }
        prevView() { let i = (this.viewOrder.indexOf(this.currentActive) - 1 + this.viewOrder.length) % this.viewOrder.length; this.setView(this.viewOrder[i]); }
    }

    // --- MAIN GALLERY CLASS ---
    window.OS_Modules.OS3DSmartGalery = class OS3DSmartGalery {
        constructor(target, options) {
          //  injectStyles();
            this.target = target;
            this.items = options.items || [];
            this.currentIndex = 0;
            this.uid = 'osgal_' + Math.random().toString(36).substr(2, 9);
            this.settings = Object.assign({ autoPlaySpeed: 2000, arrowsType: 1 }, options.config);
            this.threeD = null;
            this.swiperInstance = null;
            this.init();
        }

        init() {
            this.ensurePopup(); // DODATO
            this.renderHTML();
            this.threeD = new Internal3D(this.target.querySelector('.os-3d-mount'), this.settings);
            this.initSwiper();
            this.switchView(0);
            this.bindEvents();
        }

        ensurePopup() {
            if (!document.getElementById('osUniAutoPopup')) {
                document.body.insertAdjacentHTML('beforeend', `
                <div id="osUniAutoPopup" class="os-uni-popup">
                    <div class="os-uni-popup-content"><button class="os-uni-popup-close">&times;</button><img class="os-uni-popup-img" src=""></div>
                </div>`);
            }
        }

        renderHTML() {
            const aType = this.settings.arrowsType;
            this.target.id = this.uid;
            let thumbs = this.items.map((item, i) => `
                <div class="swiper-slide"><img src="${item.is3d ? item.front : item.org}" class="gal-thumb-btn" data-idx="${i}"></div>
            `).join('');

            const mainNav = aType === 2 ? `
                <div class="os-main-nav os-prev"><i class="fa-solid fa-chevron-left"></i></div>
                <div class="os-main-nav os-next"><i class="fa-solid fa-chevron-right"></i></div>` : '';

            const thumbNav = aType === 1 ? `
                <div class="os-main-nav os-prev"><i class="fa-solid fa-chevron-left"></i></div>
                <div class="os-main-nav os-next"><i class="fa-solid fa-chevron-right"></i></div>` : '';

            this.target.innerHTML = `
                <div class="os-smart-gal-wrapper">
                    <div class="os-main-stage shadow-sm">
                        <img class="os-2d-static img-fluid" style="display:none; cursor:zoom-in;">
                        <div class="os-3d-mount" style="display:none;"></div>
                        ${mainNav}
                    </div>
                    <div class="os-controls-3d mt-4 text-center" style="display:none;">
                        <div class="btn-group bg-white p-2 rounded-pill shadow-sm align-items-center" style="border: 1px solid #eee;">
                            <button class="btn btn-link text-dark os-3d-nav-left"><i class="fa-solid fa-chevron-left"></i></button>
                            <button class="btn btn-link text-dark os-3d-nav-top"><i class="fa-solid fa-chevron-up"></i></button>
                            <button class="btn btn-warning rounded-circle shadow mx-3 os-btn-play-trigger" style="width:65px; height:65px; background:#fb923c; border:none; color:#fff;"><i class="fa-solid fa-play fa-xl"></i></button>
                            <button class="btn btn-link text-dark os-3d-nav-bottom"><i class="fa-solid fa-chevron-down"></i></button>
                            <button class="btn btn-link text-dark os-3d-nav-right"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                    </div>
                    <div class="swiper swiper-thumbs-gallery mt-3 overflow-hidden position-relative">
                        <div class="swiper-wrapper">${thumbs}</div>
                        ${thumbNav}
                    </div>
                </div>`;
        }

        initSwiper() {
            const el = this.target.querySelector('.swiper-thumbs-gallery');
            if (el && window.OS_Modules.OSProductSwiper) {
                // DIREKTNO INSTANCIRANJE DA BISMO DOBILI PRISTUP METODAMA
                this.swiperInstance = new window.OS_Modules.OSProductSwiper(el, {
                    slidesPerView: 4,
                    spaceBetween: 10,
                    loop: false
                });
            }
        }
        switchView(idx) {
            if (idx < 0) idx = this.items.length - 1;
            if (idx >= this.items.length) idx = 0;
            this.currentIndex = idx;
            const item = this.items[idx];
            const $stage = OS(this.target);
            const fx = this.settings.transitionEffect;

            // Dodajemo FX na ceo stage pre promene
            if (fx && fx !== 'none') {
                $stage.find('.os-main-stage').addClass(`fx-${fx}`);
                setTimeout(() => $stage.find('.os-main-stage').removeClass(`fx-${fx}`), 450);
            }
            if (item.is3d) {
                $stage.find('.os-2d-static').hide();
                $stage.find('.os-3d-mount').show();
                $stage.find('.os-controls-3d').css({visibility: 'visible', opacity: 1}).show();
                this.threeD.setup(item);
            } else {
                $stage.find('.os-3d-mount').hide();
                $stage.find('.os-controls-3d').hide();
                $stage.find('.os-2d-static').attr('src', item.org).attr('data-pop', item.popup || item.org).show();
            }

            $stage.find('.gal-thumb-btn').removeClass('thumb-active');
           $stage.find(`.gal-thumb-btn[data-idx="${idx}"]`).addClass('thumb-active');
           this.swiperInstance.goToSlide(idx);

        }

        bindEvents() {
          const self = this;
          const id = '#' + this.uid;
          OS().live('click', id + ' .os-btn-play-trigger', function(e) {

              const btn = e.target.closest('.os-btn-play-trigger');
              self.threeD.playMovie(btn);
          });
          OS().live('click', id + ' .os-btn-play-trigger', function(e) {
            if(  this.isPlaying !== false){
              const btn = e.target.closest('.os-btn-play-trigger');
              self.threeD.stopMovie(btn);
            }

          });
          // KLIK NA NEXT: Gura wrapper za jedno mesto napred
            OS().live('click', id + ' .os-next', function(e) {
                e.preventDefault();
                if (self.swiperInstance) {
                    // Povećavamo index za 1 i kažemo Swiperu da se pomeri
                    let noviIndex = self.swiperInstance.currentIndex + 1;

                    // Graničnik: Ne dajemo mu da ide u prazan prostor
                    const maxIndex = self.items.length - self.swiperInstance.currentSlidesPerView;
                    if (noviIndex > maxIndex) noviIndex = maxIndex;

                    self.swiperInstance.goToSlide(noviIndex);

                    // Opciono: Ažuriraj i veliku sliku da prati pomeranje
                    self.switchView(noviIndex);
                }
            });

            // KLIK NA PREV: Gura wrapper za jedno mesto nazad
            OS().live('click', id + ' .os-prev', function(e) {
                e.preventDefault();
                if (self.swiperInstance) {
                    let noviIndex = self.swiperInstance.currentIndex - 1;

                    // Graničnik: Ne dajemo mu da ide ispod nule
                    if (noviIndex < 0) noviIndex = 0;

                    self.swiperInstance.goToSlide(noviIndex);

                    // Opciono: Ažuriraj i veliku sliku
                    self.switchView(noviIndex);
                }
            });

            // Klik na samu sličicu ostaje isti
            OS().live('click', id + ' .gal-thumb-btn', function() {
                self.switchView(parseInt(OS(this).attr('data-idx')));
            });

            OS().live('click', id + ' .os-prev', () => this.switchView(this.currentIndex - 1));
            OS().live('click', id + ' .os-next', () => this.switchView(this.currentIndex + 1));
            OS().live('click', id + ' .os-3d-nav-left', () => this.threeD.setView('left'));
            OS().live('click', id + ' .os-3d-nav-right', () => this.threeD.setView('right'));
            OS().live('click', id + ' .os-3d-nav-top', () => this.threeD.setView('top'));
            OS().live('click', id + ' .os-3d-nav-bottom', () => this.threeD.setView('bottom'));
            OS().live('click', id + ' .os-btn-play-trigger', (e) => this.threeD.playMovie(e.currentTarget));
            OS().live('click', id + ' .gal-thumb-btn', (e) => this.switchView(parseInt(OS(e.target).attr('data-idx'))));

            // POPUP DOGAĐAJI
            OS().live('click', id + ' .os-2d-static', function() {
                const src = OS(this).attr('data-pop');
                if (src) {
                    OS('.os-uni-popup-img').attr('src', src);
                    OS('#osUniAutoPopup').addClass('is-open');
                }
            });

            OS().live('click', '.os-uni-popup-close, #osUniAutoPopup', () => OS('#osUniAutoPopup').removeClass('is-open'));
        }
        destroy() {
            if (this.threeD) this.threeD.destroy();
            if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') this.swiperInstance.destroy();
            this.target.removeAttribute('id');
            this.target.innerHTML = '';
        }
        reinit(newOptions = {}) {
         this.destroy();
        this.currentActiveIndex = 0;
        this.settings = Object.assign(this.settings, newOptions);
        this.init();
       }
    };

    // --- PLUGIN ATTACH ---
    OS.prototype.Init3DSmartGalery = function(config) {
        return this.each(function() {
            const itemsAttr = OS(this).attr('data-items');
            if (itemsAttr && window.OS_Modules.OS3DSmartGalery) {
                const items = JSON.parse(itemsAttr);
                this._smartGalery = new window.OS_Modules.OS3DSmartGalery(this, { items, config });
            }
        });
    };
})(window.OS);
