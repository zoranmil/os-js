/**
 * OPENSHOP FRAMEWORK - THE MODULAR E-COMMERCE ENGINE
 *
 * Copyright (c) 2024-2026 Zoran Milićević <milicevic.zoran@gmail.com>
 * Built in collaboration with Google AI (Advanced Architecture & Optimization)
 *
 * @category   E-commerce
 * @package    OpenShop
 * @author     Zoran Milićević
 * @version    2.7.0
 * @license    AGPL-3.0-or-later
 */

function OpenShopSortable(options) {
    this.defaultOptions = {
        el: null,                // Glavni kontejner (roditelj) u kome se nalaze liste
        connectWith: '',         // Selektor za drugu listu sa kojom se deli sadržaj
        onDrop: null             // Akcija (callback) koja se okida kada se stavka spusti
    };
    this.config = Object.assign({}, this.defaultOptions, options || {});
    if (!this.config.el) return;

    this.container = typeof this.config.el === 'string' ? document.querySelector(this.config.el) : this.config.el;
    this.draggedItem = null;

    this.init();
}

OpenShopSortable.prototype.init = function() {
    const self = this;

    // 1. Pronalazimo sve elemente (kartice/stavke) unutar ove liste
    // Pretpostavljamo da su stavke direktna deca ili imaju specifičnu klasu (npr. .sortable-item)
    const items = this.container.children;

    // 2. Omogućavamo da svaka stavka bude prenosiva (draggable)
    Array.from(items).forEach(item => {
        item.setAttribute('draggable', 'true');
        item.style.cursor = 'grab';

        // Početak prevlačenja
        item.addEventListener('dragstart', function(e) {
            self.draggedItem = this;
            this.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });

        // Kraj prevlačenja
        item.addEventListener('dragend', function() {
            this.style.opacity = '1';
            self.draggedItem = null;
        });
    });

    // 3. Postavljamo zone za spuštanje (Drop Zones) na trenutnu listu i povezanu listu
    const zones = [this.container];
    if (this.config.connectWith) {
        const connectedZone = document.querySelector(this.config.connectWith);
        if (connectedZone) zones.push(connectedZone);
    }

    zones.forEach(zone => {
        // Dozvoljavamo spuštanje preko preventDefault-a
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        // Kada stavka pređe preko zone (opciono za vizuelni efekat)
        zone.addEventListener('dragenter', function(e) {
            e.preventDefault();
        });

        // Kada se stavka konačno spusti u zonu
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            if (self.draggedItem) {
                // Prebacujemo element fizički u novi kontejner unutar DOM-a
                this.appendChild(self.draggedItem);

                // Ako je programer zadao akciju, okidamo callback
                if (typeof self.config.onDrop === 'function') {
                    self.config.onDrop(self.draggedItem, this);
                }
            }
        });
    });
};

/* ==========================================================================
   OpenShop Ekstenzija - Povezivanje na glavni OS prototip
   ========================================================================== */
(function(OS) {
    if (typeof OS === 'undefined' || !OS.prototype) return;

    OS.prototype.Sortable = function(options) {
        return this.each(function() {
            new OpenShopSortable(Object.assign({ el: this }, options));
        });
    };
})(OpenShop);
