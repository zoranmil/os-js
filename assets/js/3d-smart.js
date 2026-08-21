/**
 * OPENSHOP FRAMEWORK - OS360InfinityViewer v3.0.0 (MASTER)
 * Sadrži: 360° Tečni Engine, Swiper Thumbs, CSS Geometriju, SEO HUD i POPUP ZOOM.
 */
window.OS_Modules = window.OS_Modules || {};

(function(OS) {
    if (typeof OS === 'undefined') return;

    // injectStyles();
    // --- TEČNI 360 ENGINE ---
    class Engine360 {
        constructor(container, settings) {
            this.container = container;
            this.settings = settings;
            this.views = {};
            this.viewOrder = [];
            this.currentIndex360 = 0;
            this.isPlaying = false;
            this.playInterval = null;
        }

        setup(data) {
            this.views = data;
            // Prihvata dinamički niz slika pod ključem 'frames'
            this.viewOrder = data.frames || [];
            this.currentIndex360 = 0;
            this.stopMovie();

            if (this.viewOrder.length === 0) return;

            let html = `
 <div class="os-3d-hud"><span class="os-3d-rec"></span><span id="hud-txt-html">FREJM 1</span></div>
 <div class="os-3d-loader" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:20;">
 <div class="spinner-border text-warning"></div>
 </div>
 <div class="os-3d-inner-wrap">
 ${this.viewOrder.map((src, idx) => `<img data-view="${idx}" class="${idx === 0 ? 'active-3d' : ''}" src="${src}">`).join('')}
 </div>`;

            this.container.innerHTML = html;

            // Preload mehanizam: Čeka da se svi frejmovi učitaju u RAM pre starta
            const imgs = this.container.querySelectorAll('img');
            let loaded = 0;
            imgs.forEach(img => {
                img.onload = () => {
                    if (++loaded >= imgs.length) {
                        const l = this.container.querySelector('.os-3d-loader');
                        if (l) l.remove();
                        this.setView(0);
                    }
                };
                if (img.complete) img.onload();
            });
        }
        setView(viewIndex) {
            const wrap = this.container.querySelector('.os-3d-inner-wrap');
            const target = this.container.querySelector(`img[data-view="${viewIndex}"]`);
            if (!target || !wrap) return;

            // --- OKIDANJE VIZUELNOG EFEKTA (FIKSIRANO) ---
            const fx = this.settings.transitionEffect;
            if (fx && fx !== 'none' && this.currentIndex360 !== parseInt(viewIndex)) {
                const fxClass = `fx-${fx}`;
                wrap.classList.add(fxClass);

                // Čistimo klasu brzo kako bi tranzicija radila tečno tokom neprekidnog drag-a
                setTimeout(() => wrap.classList.remove(fxClass), 150);
            }

            // Standardna munjevita smena slika iz RAM-a
            this.container.querySelectorAll('img').forEach(i => i.classList.remove('active-3d'));
            target.classList.add('active-3d');
            this.currentIndex360 = parseInt(viewIndex);

            // HUD ažuriranje stepeni
            const hud = this.container.querySelector('#hud-txt-html');
            if (hud) {
                const names = this.views.viewNames || {};
                const trenutniUgao = Math.round((viewIndex / this.viewOrder.length) * 360);
                hud.innerHTML = names[viewIndex] || `ROTACIJA: ${trenutniUgao}°`;
            }
        }


        playMovie(btn) {
            let wrap = this.container.querySelector('.os-3d-inner-wrap');
            if (!wrap) return;
            if (this.isPlaying) return this.stopMovie(btn);

            this.isPlaying = true;
            wrap.classList.add('is-playing');
            if (btn) {
                OS(btn).html('<i class="fa-solid fa-stop fa-xl"></i>').css('background', '#dc3545');
            }
            this.playInterval = setInterval(() => this.nextView(), this.settings.autoPlaySpeed);
        }

        stopMovie(btn) {
            if (this.playInterval) clearInterval(this.playInterval);
            this.isPlaying = false;
            const wrap = this.container.querySelector('.os-3d-inner-wrap');
            if (wrap) wrap.classList.remove('is-playing');
            if (btn) {
                OS(btn).html('<i class="fa-solid fa-play fa-xl"></i>').css('background', '#fb923c');
            }
        }

        nextView() {
            let sledeci = (this.currentIndex360 + 1) % this.viewOrder.length;
            this.setView(sledeci);
        }

        prevView() {
            let prethodni = (this.currentIndex360 - 1 + this.viewOrder.length) % this.viewOrder.length;
            this.setView(prethodni);
        }

        destroy() {
            this.stopMovie();
            this.container.innerHTML = '';
        }
    }
    // --- MAIN GALLERY CLASS ---
    window.OS_Modules.OS360InfinityViewer = class OS360InfinityViewer {
        constructor(target, options) {
            this.target = target;
            this.items = options.items || [];
            this.currentIndex = 0;
            this.uid = 'os360_' + Math.random().toString(36).substr(2, 9);
            this.settings = Object.assign({
                autoPlaySpeed: 150,
                arrowsType: 1
            }, options.config);
            this.threeD = null;
            this.swiperInstance = null;
            this.init();
        }

        init() {
            this.ensurePopup();
            this.renderHTML();
            this.threeD = new Engine360(this.target.querySelector('.os-3d-mount'), this.settings);
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
 <div class="swiper-slide"><img src="${item.is3d ? item.frames[0] : item.org}" class="gal-thumb-btn" data-idx="${i}"></div>
 `).join('');

            const navHTML = `<div class="os-main-nav os-prev"><i class="fa-solid fa-chevron-left"></i></div>
 <div class="os-main-nav os-next"><i class="fa-solid fa-chevron-right"></i></div>`;

            this.target.innerHTML = `
 <div class="os-smart-gal-wrapper">
 <div class="os-main-stage shadow-sm">
 <img class="os-2d-static img-fluid" style="display:none; cursor:zoom-in;">
 <div class="os-3d-mount" style="display:none;"></div>
 ${aType === 2 ? navHTML : ''}
 </div>
 <div class="os-controls-3d mt-4 text-center" style="display:none;">
 <div class="btn-group bg-white p-2 rounded-pill shadow-sm align-items-center" style="border: 1px solid #eee;">
 <button class="btn btn-link text-dark os-3d-nav-left"><i class="fa-solid fa-arrow-rotate-left"></i></button>
 <button class="btn btn-warning rounded-circle shadow mx-3 os-btn-play-trigger" style="width:65px; height:65px; background:#fb923c; border:none; color:#fff;"><i class="fa-solid fa-play fa-xl"></i></button>
 <button class="btn btn-link text-dark os-3d-nav-right"><i class="fa-solid fa-arrow-rotate-right"></i></button>
 </div>
 </div>
 <div class="swiper swiper-thumbs-gallery mt-3 overflow-hidden position-relative">
 <div class="swiper-wrapper">${thumbs}</div>
 ${aType === 1 ? navHTML : ''}
 </div>
 </div>`;
        }

        initSwiper() {
            const el = this.target.querySelector('.swiper-thumbs-gallery');
            if (el && window.OS_Modules.OSProductSwiper) {
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

            if (item.is3d) {
                $stage.find('.os-2d-static').hide();
                $stage.find('.os-3d-mount').show();
                $stage.find('.os-controls-3d').css({
                    visibility: 'visible',
                    opacity: 1
                }).show();
                this.threeD.setup(item);
            } else {
                $stage.find('.os-3d-mount').hide();
                $stage.find('.os-controls-3d').hide();
                $stage.find('.os-2d-static').attr('src', item.org).attr('data-pop', item.popup || item.org).show();
            }
            $stage.find('.gal-thumb-btn').removeClass('thumb-active');
            $stage.find(`.gal-thumb-btn[data-idx="${idx}"]`).addClass('thumb-active');
            if (this.swiperInstance) this.swiperInstance.goToSlide(idx);
        }
        bindEvents() {
            const self = this;
            const id = '#' + this.uid;
            const stage3D = id + ' .os-3d-mount';
            let isDragging = false,
                startX = 0;

            // --- NATIVNI DRAG & SWIPE MEHANIZAM (ISPRAVLJENI PARAMETRI) ---
            OS().live('mousedown touchstart', stage3D, function(e) {
                isDragging = true;
                startX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
                self.threeD.stopMovie(OS(id).find('.os-btn-play-trigger'));
            });

            // POPRAVKA: Prosleđujemo document ili krovni ID kao selektor da live funkcija ne pukne
            OS().live('mousemove touchmove', id, function(e) {
                if (!isDragging) return;
                let currentX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
                let diffX = startX - currentX;

                if (Math.abs(diffX) > 12) {
                    diffX > 0 ? self.threeD.nextView() : self.threeD.prevView();
                    startX = currentX;
                }
            });

            OS().live('mouseup touchend mouseleave', id, function() {
                isDragging = false;
            });

            // KLASIČNE KONTROLE
            OS().live('click', id + ' .os-btn-play-trigger', function(e) {
                const btn = e.target.closest('.os-btn-play-trigger');
                self.threeD.playMovie(btn);
            });

            OS().live('click', id + ' .os-3d-nav-left', () => this.threeD.prevView());
            OS().live('click', id + ' .os-3d-nav-right', () => this.threeD.nextView());
            OS().live('click', id + ' .os-next', function(e) {
                e.preventDefault();
                self.switchView(self.currentIndex + 1);
            });
            OS().live('click', id + ' .os-prev', function(e) {
                e.preventDefault();
                self.switchView(self.currentIndex - 1);
            });
            OS().live('click', id + ' .gal-thumb-btn', function(e) {
                self.switchView(parseInt(OS(e.target).attr('data-idx')));
            });

            // POPUP ZOOM
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
    };

    // --- BRIDGE ZA OPENSHOP PROTOKOL ---
    OS.prototype.Init360InfinityViewer = function(config) {
        return this.each(function() {
            const itemsAttr = OS(this).attr('data-items');
            if (itemsAttr && window.OS_Modules.OS360InfinityViewer) {
                this._360Viewer = new window.OS_Modules.OS360InfinityViewer(this, {
                    items: JSON.parse(itemsAttr),
                    config
                });
            }
        });
    };
})(window.OS);
