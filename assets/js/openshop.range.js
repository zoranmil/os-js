/**
 * OPENSHOP RANGE SLIDER ENGINE
 * Arhitektura: Zoran Milićević & Google AI
 * Klasa za upravljanje dvostrukim klizačima (Price Range)
 */
class OSRange {
    constructor(element, options) {
        this.el = element; // Nativni DOM element
        this.$el = OS(element); // OS wrapper

        // 1. Konfiguracija (Spajanje defaulta i korisničkih opcija)
        this.defaults = {
            suffix: ' RSD',
            step: 1,
            onChange: null
        };
        this.config = OS.extend({}, this.defaults, options);

        // 2. Stanje (State)
        this.minLimit = parseFloat(this.$el.data('min')) || 0;
        this.maxLimit = parseFloat(this.$el.data('max')) || 100;
        this.currentMin = parseFloat(this.$el.data('start-min')) || this.minLimit;
        this.currentMax = parseFloat(this.$el.data('start-max')) || this.maxLimit;
        this.step = parseFloat(this.$el.data('step')) || this.config.step;

        // 3. Elementi (DOM reference)
        this.rangeTrack = this.$el.find('.os-slider-range')[0];
        this.handleMin = this.$el.find('.handle-min')[0];
        this.handleMax = this.$el.find('.handle-max')[0];
        this.tooltipMin = this.handleMin ? this.handleMin.querySelector('.os-slider-tooltip') : null;
        this.tooltipMax = this.handleMax ? this.handleMax.querySelector('.os-slider-tooltip') : null;

        if (this.handleMin && this.handleMax) {
            this.init();
        }
    }

    init() {
        // Početno ravnanje i iscrtavanje
        this.currentMin = this.snapToStep(this.currentMin);
        this.currentMax = this.snapToStep(this.currentMax);
        this.updateUI();

        // Vezivanje događaja (Binding)
        this.bindEvents(this.handleMin, false);
        this.bindEvents(this.handleMax, true);
        this.bindTrackClick();
    }

    /**
     * Magnetno privlačenje na najbliži korak (Step)
     */
    snapToStep(val) {
        const steps = Math.round((val - this.minLimit) / this.step);
        const snapped = this.minLimit + (steps * this.step);
        return Math.max(this.minLimit, Math.min(this.maxLimit, snapped));
    }

    /**
     * Računanje vrednosti na osnovu X pozicije miša ili prsta
     */
    getValueFromX(clientX) {
        const rect = this.el.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const rawValue = this.minLimit + (pct / 100) * (this.maxLimit - this.minLimit);
        return this.snapToStep(rawValue);
    }

    updateUI() {
        const span = this.maxLimit - this.minLimit;
        const pctMin = ((this.currentMin - this.minLimit) / span) * 100;
        const pctMax = ((this.currentMax - this.minLimit) / span) * 100;

        // Pomeranje ručica i trake
        this.handleMin.style.left = pctMin + '%';
        this.handleMax.style.left = pctMax + '%';
        this.rangeTrack.style.left = pctMin + '%';
        this.rangeTrack.style.width = (pctMax - pctMin) + '%';

        // Ažuriranje teksta u tooltipovima
        if (this.tooltipMin) this.tooltipMin.innerText = Math.round(this.currentMin) + this.config.suffix;
        if (this.tooltipMax) this.tooltipMax.innerText = Math.round(this.currentMax) + this.config.suffix;

        // Pozivanje callback funkcije ako postoji
        if (this.config.onChange) {
            this.config.onChange(Math.round(this.currentMin), Math.round(this.currentMax));
        }
    }

    bindEvents(handle, isMax) {
        const self = this;

        const onStart = (e) => {
            e.preventDefault();
            this.el.classList.add('is-dragging');

            const onMove = (me) => {
                const x = me.touches ? me.touches[0].clientX : me.clientX;
                const val = self.getValueFromX(x);

                if (isMax) {
                    self.currentMax = Math.max(self.currentMin, val);
                } else {
                    self.currentMin = Math.min(self.currentMax, val);
                }
                self.updateUI();
            };

            const onEnd = () => {
                this.el.classList.remove('is-dragging');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);

                // Okidanje custom eventa kroz OpenShop jezgro
                self.$el.trigger('range:changed', { min: self.currentMin, max: self.currentMax });
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: false });
    }

    bindTrackClick() {
        this.el.addEventListener('mousedown', (e) => {
            // Ignoriši ako je kliknuto na samu ručicu
            if (e.target.classList.contains('os-slider-handle')) return;

            const val = this.getValueFromX(e.clientX);
            if (Math.abs(val - this.currentMin) < Math.abs(val - this.currentMax)) {
                this.currentMin = val;
            } else {
                this.currentMax = val;
            }
            this.updateUI();
            this.$el.trigger('range:changed', { min: this.currentMin, max: this.currentMax });
        });
    }
}

/**
 * POVEZIVANJE NA OPENSHOP PROTOTIP
 * Da bi mogao da pozoveš OS('#price').range()
 */
(function(OS) {
    if (!OS) return;
    OS.prototype.range = function(options) {
        return this.each(function() {
            // IQ 185: Čuvamo instancu u elementu da je ne bismo duplirali
            if (!this.osRangeInstance) {
                this.osRangeInstance = new OSRange(this, options);
            }
        });
    };
})(window.OS || window.OpenShop);
