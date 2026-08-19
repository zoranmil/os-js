/**
 * OPENSHOP FRAMEWORK - RANGE SLIDER ENGINE v1.3.0
 * Arhitektura: Zoran Milićević & OpenShop Core
 * Podržava: Dual Handles, Step Precision, Touch Events, Smart Suffix (Currency)
 * License: AGPL-3.0-or-later
 */

class OSRange {
    constructor(element, options) {
        this.el = element; // Nativni DOM element
        this.$el = OS(element); // OpenShop wrapper

        // 1. Podrazumevane vrednosti (Defaults)
        this.defaults = {
            suffix: ' RSD',
            step: 1,
            onChange: null,
            onAfterChange: null
        };

        // 2. Spajanje konfiguracije
        this.config = Object.assign({}, this.defaults, options || {});

        // 3. Logika prioriteta za valutu (Sufiks): HTML data-atribut > JS config > Default
        const htmlSuffix = this.$el.data('suffix');
        this.suffix = (htmlSuffix !== undefined && htmlSuffix !== null) ? htmlSuffix : this.config.suffix;

        // 4. Parametri (Min, Max, Start vrednosti)
        this.minLimit = parseFloat(this.$el.data('min')) || 0;
        this.maxLimit = parseFloat(this.$el.data('max')) || 100;
        this.currentMin = parseFloat(this.$el.data('start-min')) || this.minLimit;
        this.currentMax = parseFloat(this.$el.data('start-max')) || this.maxLimit;

        // 5. Sigurna Step logika (Sprečava "toString" undefined error)
        let rawStep = parseFloat(this.$el.data('step'));
        this.step = !isNaN(rawStep) ? rawStep : (this.config.step || 1);

        // Računanje preciznosti decimala na osnovu step-a
        const stepStr = this.step.toString();
        this.precision = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;

        // 6. DOM Reference
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
        // Početno snap-ovanje i iscrtavanje interfejsa
        this.currentMin = this.snapToStep(this.currentMin);
        this.currentMax = this.snapToStep(this.currentMax);
        this.updateUI();

        // Vezivanje događaja (Miš + Touch)
        this.bindEvents(this.handleMin, false);
        this.bindEvents(this.handleMax, true);
        this.bindTrackClick();
    }

    /**
     * Magnetno poravnanje vrednosti na osnovu definisanog koraka (Step)
     */
    snapToStep(val) {
        const steps = Math.round((val - this.minLimit) / this.step);
        let snapped = this.minLimit + (steps * this.step);
        snapped = Math.max(this.minLimit, Math.min(this.maxLimit, snapped));
        return parseFloat(snapped.toFixed(this.precision));
    }

    /**
     * Računanje vrednosti na osnovu fizičke pozicije klika/dodira
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

        // Pomeranje ručica i aktivne trake
        if (this.handleMin) this.handleMin.style.left = pctMin + '%';
        if (this.handleMax) this.handleMax.style.left = pctMax + '%';
        if (this.rangeTrack) {
            this.rangeTrack.style.left = pctMin + '%';
            this.rangeTrack.style.width = (pctMax - pctMin) + '%';
        }

        // Ažuriranje tooltipova (Ispis brojeva sa valutom)
        const displaySuffix = this.suffix;
        if (this.tooltipMin) this.tooltipMin.innerText = this.currentMin.toLocaleString() + displaySuffix;
        if (this.tooltipMax) this.tooltipMax.innerText = this.currentMax.toLocaleString() + displaySuffix;

        // Ažuriranje spoljnih labela (Od: Do:) ako postoje u DOM-u
        const minLabel = OS('#minVal');
        const maxLabel =  OS('#maxVal');
        if (minLabel) minLabel.innerText = this.currentMin.toLocaleString();
        if (maxLabel) maxLabel.innerText = this.currentMax.toLocaleString();

        // Pozivanje callback funkcije dok se vuče
        if (typeof this.config.onChange === 'function') {
            this.config.onChange(this.currentMin, this.currentMax);
        }
    }

    bindEvents(handle, isMax) {
        const onStart = (e) => {
            e.preventDefault();
            this.el.classList.add('is-dragging');

            // Z-Index Fix: Ručica koja se vuče je uvek na vrhu
            this.handleMin.style.zIndex = isMax ? 1 : 2;
            this.handleMax.style.zIndex = isMax ? 2 : 1;

            const onMove = (me) => {
                const x = me.touches ? me.touches[0].clientX : me.clientX;
                const val = this.getValueFromX(x);

                if (isMax) {
                    this.currentMax = Math.max(this.currentMin + this.step, val);
                } else {
                    this.currentMin = Math.min(this.currentMax - this.step, val);
                }
                this.updateUI();
            };

            const onEnd = () => {
                this.el.classList.remove('is-dragging');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);

                // Finalni događaji (za AJAX filtriranje)
                this.$el.trigger('range:changed', { min: this.currentMin, max: this.currentMax });
                if (typeof this.config.onAfterChange === 'function') {
                    this.config.onAfterChange(this.currentMin, this.currentMax);
                }
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
            if (e.target.classList.contains('os-slider-handle')) return;
            const val = this.getValueFromX(e.clientX);

            if (Math.abs(val - this.currentMin) < Math.abs(val - this.currentMax)) {
                this.currentMin = Math.min(this.currentMax - this.step, val);
            } else {
                this.currentMax = Math.max(this.currentMin + this.step, val);
            }
            this.updateUI();

            if (typeof this.config.onAfterChange === 'function') {
                this.config.onAfterChange(this.currentMin, this.currentMax);
            }
        });
    }
}

/**
 * OPENSHOP BRIDGE
 * Povezivanje na OS prototip: OS('#id').OSRange({...})
 */
(function(OS) {
    if (typeof OS === 'undefined' || !OS.prototype) return;

    OS.prototype.OSRange = function(options) {
        return this.each(function() {
            if (!this.osRangeInstance) {
                this.osRangeInstance = new OSRange(this, options);
            }
        });
    };
})(window.OpenShop || window.OS);
