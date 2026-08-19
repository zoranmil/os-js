/**
 * OPENSHOP FRAMEWORK - PRODUCT 3D INTERACTIVE VIEWER v1.2.1
 * DODATO: Tastatura (arrows), Error handling, Mobile scroll fix, Style guard.
 */
(function(OS) {
    if (typeof OS === 'undefined') return;

    function Product3D(element, options) {
        this.defaultOptions = {
            front: '', left: '', right: '', top: '', bottom: '',
            sensitivity: 15,
            zoomScale: 2.5,
            loadingText: typeof _P === 'function' ? _P('Loading 3D View...') : 'Loading 3D View...'
        };

        this.config = Object.assign({}, this.defaultOptions, options || {});
        this.$el = OS(element);
        this.rawEl = typeof element === 'string' ? document.querySelector(element) : element;

        if (!this.rawEl || !this.config.front) return;

        this.images = {};
        this.currentActive = 'front';
        this.isZoomed = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.init();
    }

    Product3D.prototype.init = function() {
        let self = this;

        // 1. STYLE GUARD: Sprečava dupliranje CSS-a u head-u
        if (!document.getElementById('os-3d-viewer-css')) {
            let style = document.createElement('style');
            style.id = 'os-3d-viewer-css';
            style.textContent = `
                @keyframes os3dPulsate {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 0.4; }
                }
                .os-3d-wrapper:focus { outline: none; box-shadow: 0 0 0 2px #fb923c; }
                .os-3d-wrapper { touch-action: none; transition: box-shadow 0.3s ease; }
                .os-3d-arrow {
                    position: absolute; z-index: 10; font-size: 20px; color: #fb923c;
                    background: rgba(255,255,255,0.9); width: 36px; height: 36px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: all 0.25s ease; animation: os3dPulsate 2s infinite ease-in-out;
                    pointer-events: none;
                }
                .os-3d-wrapper:hover .os-3d-arrow { opacity: 0; }
                .os-3d-wrapper img { transform-origin: center center; transition: opacity 0.15s ease, transform 0.1s ease-out; }
            `;
            document.head.appendChild(style);
        }

        // 2. HTML STRUKTURA (Dodat tabindex="0" za keyboard support)
        let html = `
            <div class="os-3d-wrapper" tabindex="0" aria-label="3D Product Viewer" style="position: relative; width: 100%; overflow: hidden; cursor: zoom-in; user-select: none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <div class="os-3d-loader" style="position: absolute; top:0; left:0; width:100%; height:100%; background:#fff; z-index:20; display:flex; align-items:center; justify-content:center; font-size:13px; color:#6c757d;">
                    <span class="spinner-border spinner-border-sm me-2 text-primary"></span>${this.config.loadingText}
                </div>
                ${this.config.top ? `<div class="os-3d-arrow" style="top: 15px; left: 50%; transform: translateX(-50%);">&#8593;</div>` : ''}
                ${this.config.bottom ? `<div class="os-3d-arrow" style="bottom: 15px; left: 50%; transform: translateX(-50%);">&#8595;</div>` : ''}
                ${this.config.left ? `<div class="os-3d-arrow" style="left: 15px; top: 50%; transform: translateY(-50%);">&#8592;</div>` : ''}
                ${this.config.right ? `<div class="os-3d-arrow" style="right: 15px; top: 50%; transform: translateY(-50%);">&#8594;</div>` : ''}
                <img data-view="front" src="${this.config.front}" style="display: block; width: 100%; height: auto; z-index: 2;">
                ${['left', 'right', 'top', 'bottom'].map(v => this.config[v] ? `<img data-view="${v}" src="${this.config[v]}" style="position: absolute; top:0; left:0; width: 100%; height: auto; opacity: 0; z-index: 1;">` : '').join('')}
            </div>
        `;

        this.rawEl.innerHTML = html;
        this.$wrapper = this.$el.find('.os-3d-wrapper');
        this.$loader = this.$el.find('.os-3d-loader');

        let ispisaneSlike = this.rawEl.querySelectorAll('.os-3d-wrapper img');
        let ucitanoSlika = 0;

        // 3. ERROR HANDLING: Brojač koji se okida i na uspeh i na grešku
        const checkDone = () => {
            ucitanoSlika++;
            if (ucitanoSlika >= ispisaneSlike.length) self.$loader.remove();
        };

        ispisaneSlike.forEach(img => {
            self.images[img.getAttribute('data-view')] = img;
            if (img.complete) checkDone();
            else {
                img.onload = checkDone;
                img.onerror = checkDone; // Skloni loader čak i ako slika pukne
            }
        });

        this.bindEvents();
    };

    Product3D.prototype.bindEvents = function() {
        const self = this;
        let rawWrapper = this.rawEl.querySelector('.os-3d-wrapper');
        let sveStrelice = this.rawEl.querySelectorAll('.os-3d-arrow');

        const promeniUgao = (novi) => {
            if (self.isZoomed || novi === self.currentActive || !self.images[novi]) return;
            Object.keys(self.images).forEach(k => {
                self.images[k].style.opacity = (k === novi) ? '1' : '0';
                self.images[k].style.zIndex = (k === novi) ? '2' : '1';
            });
            self.currentActive = novi;
        };

        // EVENT: MouseMove (Rotation & Zoom)
        OS(rawWrapper).on('mousemove', function(e) {
            let r = rawWrapper.getBoundingClientRect();
            let x = e.clientX - r.left, y = e.clientY - r.top;

            if (self.isZoomed) {
                self.images[self.currentActive].style.transformOrigin = `${(x/r.width)*100}% ${(y/r.height)*100}%`;
                self.images[self.currentActive].style.transform = `scale(${self.config.zoomScale})`;
            } else {
                let dx = x - r.width/2, dy = y - r.height/2;
                let s = self.config.sensitivity;
                let novi = 'front';
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx < -s) novi = 'left'; else if (dx > s) novi = 'right';
                } else {
                    if (dy < -s) novi = 'top'; else if (dy > s) novi = 'bottom';
                }
                promeniUgao(novi);
            }
        });

        // EVENT: Klik za Zoom
        OS(rawWrapper).on('click', function(e) {
            self.isZoomed = !self.isZoomed;
            rawWrapper.style.cursor = self.isZoomed ? 'zoom-out' : 'zoom-in';
            sveStrelice.forEach(a => a.style.display = self.isZoomed ? 'none' : '');
            if (!self.isZoomed) self.images[self.currentActive].style.transform = 'scale(1)';
        });

        // EVENT: Keyboard (Strelice na tastaturi)
        rawWrapper.onkeydown = (e) => {
            if (e.key === 'ArrowLeft') promeniUgao('left');
            else if (e.key === 'ArrowRight') promeniUgao('right');
            else if (e.key === 'ArrowUp') promeniUgao('top');
            else if (e.key === 'ArrowDown') promeniUgao('bottom');
            else if (e.key === 'Escape') { // Reset na front
                self.isZoomed = false;
                promeniUgao('front');
                self.images[self.currentActive].style.transform = 'scale(1)';
            }
        };

        // EVENT: Mobile Touch (Sprečava scroll stranice dok se rotira proizvod)
        OS(rawWrapper).on('touchstart', e => {
            self.touchStartX = e.touches[0].clientX;
            self.touchStartY = e.touches[0].clientY;
        });

        OS(rawWrapper).on('touchmove', e => {
            if (self.isZoomed) return;
            e.preventDefault(); // FIX: Sprečava mrdanje cele stranice na mobilnom

            let dx = e.touches[0].clientX - self.touchStartX;
            let dy = e.touches[0].clientY - self.touchStartY;
            let s = self.config.sensitivity;
            let novi = 'front';

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx < -s) novi = 'right'; else if (dx > s) novi = 'left';
            } else {
                if (dy < -s) novi = 'bottom'; else if (dy > s) novi = 'top';
            }
            promeniUgao(novi);
        }, { passive: false }); // Važno za e.preventDefault()

        OS(rawWrapper).on('mouseleave', () => {
            self.isZoomed = false;
            rawWrapper.style.cursor = 'zoom-in';
            promeniUgao('front');
            Object.keys(self.images).forEach(k => self.images[k].style.transform = 'scale(1)');
        });
    };

    OS.prototype.Product3D = function(options) {
        return this.each(function() { new Product3D(this, options); });
    };
})(window.OS);
