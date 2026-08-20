/**
 * OPENSHOP FRAMEWORK - PRODUCT 3D INTERACTIVE VIEWER v1.6.2 (FINAL)
 * Arhitektura: Zoran Milićević & OpenShop Engine
 * Karakteristike: Centriran Layout, Smart Responsive, HUD HTML Support, Cinematic Play.
 */
(function(OS) {
    if (typeof OS === 'undefined') return;

    function Product3D(element, options) {
        this.defaultOptions = {
            front: '', left: '', right: '', top: '', bottom: '',
            sensitivity: 15,
            zoomScale: 2.2,
            autoPlaySpeed: 1800,
            viewNames: {
                front: 'MASTER FRONT VIEW',
                left: 'LEFT SIDE PROFILE',
                right: 'RIGHT SIDE PROFILE',
                top: 'TOP AERODYNAMICS',
                bottom: 'BASE CONSTRUCTION'
            }
        };

        this.config = Object.assign({}, this.defaultOptions, options || {});
        this.$el = OS(element);
        this.rawEl = typeof element === 'string' ? document.querySelector(element) : element;

        this.images = {};
        this.currentActive = 'front';
        this.isZoomed = false;
        this.isPlaying = false;
        this.playInterval = null;

        if (!this.rawEl || !this.config.front) return;
        this.init();
    }
    Product3D.prototype.destroy = function() {
        console.log("[Product3D] Pokrećem čišćenje resursa i oslobađanje RAM memorije...");

        // 1. Zaustavi autoplay ako je bioskopski mod ostao upaljen
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
        }

        // 2. Skidanje Event Listenera sa krovnog omotača (odveži sve što je bindEvents zakačio)
        let wrapper = this.rawEl.querySelector('.os-3d-wrapper');
        if (wrapper) {
            // Kreiranjem novog klona bez događaja i zamenom starog, najsigurnije čistimo memoriju
            let cleanWrapper = wrapper.cloneNode(true);
            wrapper.parentNode.replaceChild(cleanWrapper, wrapper);
        }

        // 3. Oslobađanje referenci nad slikama da proradi Garbage Collector
        for (let key in this.images) {
            if (this.images.hasOwnProperty(key)) {
                this.images[key].onload = null;
                this.images[key].onerror = null;
                this.images[key] = null;
            }
        }
        this.images = {};
        this.hud = null;

        // 4. Potpuno pražnjenje HTML-a unutar glavnog kontejnera
        this.rawEl.innerHTML = '';

        console.log("[Product3D] Memorijski štit uspešno aktiviran. Kontejner je čist.");
    };
    Product3D.prototype.init = function() {
        let self = this;

        if (!document.getElementById('os-3d-master-css')) {
            let style = document.createElement('style');
            style.id = 'os-3d-master-css';
            style.textContent = `
                .os-3d-wrapper {
                    position: relative; width: 100%; max-width: 650px;
                    aspect-ratio: 1 / 1; margin: 0 auto; overflow: hidden;
                    background: #fff; border-radius: 12px; border: 1px solid #eee; touch-action: none;
                }

                .os-3d-wrapper img {
                    position: absolute; top: 0; left: 0; right: 0; bottom: 0; margin: auto;
                    max-width: 95%; max-height: 95%; width: auto !important; height: auto !important;
                    object-fit: contain; opacity: 0; z-index: 1; transform: scale(1);
                    transition: opacity 0.4s ease-out, transform 1.5s cubic-bezier(0.1, 0, 0.3, 1);
                }

                .os-3d-wrapper img.active-view { opacity: 1; z-index: 2; }
                .is-playing img.active-view { transform: scale(1.12); }

                .os-3d-vignette {
                    position: absolute; inset: 0; z-index: 5; opacity: 0; transition: opacity 1s;
                    background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.4) 100%); pointer-events: none;
                }
                .is-playing .os-3d-vignette { opacity: 1; }

                .os-3d-hud {
                    position: absolute; top: 20px; left: 20px; z-index: 10;
                    opacity: 0.7; transition: opacity 0.5s, transform 0.3s; pointer-events: none;
                }

                .os-3d-wrapper:hover .os-3d-hud, .is-playing .os-3d-hud {
                    opacity: 1; transform: scale(1.05);
                }

                #os-hud-text {
                    color: #fff; font-family: 'Courier New', monospace; letter-spacing: 2px;
                    text-transform: uppercase; text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                }

                .os-3d-rec {
                    display: inline-block; width: 8px; height: 8px; background: red;
                    border-radius: 50%; margin-right: 8px; display: none;
                }
                .is-playing .os-3d-rec { display: inline-block; animation: os-blink 1s infinite; }

                @keyframes os-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .os-3d-loader { background: #fff; z-index: 20; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
            `;
            document.head.appendChild(style);
        }

        this.rawEl.innerHTML = `
            <div class="os-3d-wrapper rounded-4 shadow-lg">
                <div class="os-3d-vignette"></div>
                <div class="os-3d-hud">
                    <div class="d-flex align-items-center">
                        <span class="os-3d-rec"></span>
                        <span id="os-hud-text"></span>
                    </div>
                </div>
                <div class="os-3d-loader"><div class="spinner-grow text-warning"></div></div>
                <img data-view="front" class="active-view" src="${this.config.front}">
                ${['left', 'right', 'top', 'bottom'].map(v => this.config[v] ? `<img data-view="${v}" src="${this.config[v]}">` : '').join('')}
            </div>
        `;

        this.hud = this.rawEl.querySelector('#os-hud-text');
        if(this.hud) this.hud.innerHTML = this.config.viewNames.front;

        let ucitano = 0;
        let imgs = this.rawEl.querySelectorAll('img');
        const removeLoader = () => { const l = this.rawEl.querySelector('.os-3d-loader'); if(l) l.remove(); };

        imgs.forEach(img => {
            this.images[img.dataset.view] = img;
            img.onload = img.onerror = () => { ucitano++; if(ucitano >= imgs.length) removeLoader(); };
            if(img.complete) img.onload();
        });

        this.bindEvents();
    };

    Product3D.prototype.setView = function(view) {
        if (!this.images[view] || view === this.currentActive) return;

        Object.keys(this.images).forEach(k => this.images[k].classList.remove('active-view'));
        this.images[view].classList.add('active-view');
        this.currentActive = view;

        if(this.hud) {
            this.hud.innerHTML = this.config.viewNames[view] || view;
            // Kratki flash efekat HUD-a pri promeni
            this.hud.parentElement.style.opacity = "1";
            setTimeout(() => { this.hud.parentElement.style.opacity = ""; }, 1500);
        }
    };

    Product3D.prototype.playMovie = function(btn) {
        const wrapper = this.rawEl.querySelector('.os-3d-wrapper');
        if (this.isPlaying) {
            clearInterval(this.playInterval);
            this.isPlaying = false;
            wrapper.classList.remove('is-playing');
            btn.innerHTML = '<i class="fa-solid fa-play"></i>';
            btn.classList.replace('btn-danger', 'btn-warning');
            this.setView('front');
            return;
        }

        this.isPlaying = true;
        wrapper.classList.add('is-playing');
        btn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        btn.classList.replace('btn-warning', 'btn-danger');

        const order = ['front', 'left', 'top', 'right', 'bottom'].filter(v => this.images[v]);
        let i = 0;
        this.playInterval = setInterval(() => {
            i = (i + 1) % order.length;
            this.setView(order[i]);
        }, this.config.autoPlaySpeed);
    };

    Product3D.prototype.bindEvents = function() {
        const self = this;
        const wrapper = this.rawEl.querySelector('.os-3d-wrapper');

        OS(wrapper).on('mousemove', (e) => {
            if (self.isPlaying) return;
            let r = wrapper.getBoundingClientRect();
            let dx = e.clientX - r.left - r.width/2, dy = e.clientY - r.top - r.height/2;
            let s = self.config.sensitivity;
            let novi = 'front';
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx < -s) novi = 'left'; else if (dx > s) novi = 'right';
            } else {
                if (dy < -s) novi = 'top'; else if (dy > s) novi = 'bottom';
            }
            self.setView(novi);
        });

        OS(wrapper).on('click', function(e) {
            if (self.isPlaying) return;
            self.isZoomed = !self.isZoomed;
            wrapper.style.cursor = self.isZoomed ? 'zoom-out' : 'zoom-in';
            if (!self.isZoomed) self.images[self.currentActive].style.transform = 'scale(1)';
        });
    };

    OS.prototype.Product3D = function(options) {
        return this.each(function() {
            if (!this.os3dInstance) this.os3dInstance = new Product3D(this, options);
        });
    };
})(window.OS);
