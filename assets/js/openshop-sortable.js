/**
 * OpenShop Framework — Modern E-Commerce Platform
 * NATIVNI ULTRA-BRZI SORTABLE ENGINE (GRID/MATRIX + NESTED PODRŠKA)
 */
function OpenShopSortable(options) {
    this.defaultOptions = {
        el: null,
        connectWith: '',
        handle: '',
        onDrop: null,
        onUpdate: null
    };
    this.config = Object.assign({}, this.defaultOptions, options || {});
    if (!this.config.el) return;

    var bazniEl = typeof this.config.el === 'string' ? document.querySelector(this.config.el) : this.config.el;
    this.container = bazniEl && bazniEl.tagName === 'TABLE' ? (bazniEl.querySelector('tbody') || bazniEl) : bazniEl;

    this.draggedItem = null;
    this.touchActive = false;
    this.init();
}

OpenShopSortable.prototype.init = function() {
    const self = this;

    this.refresh = function() {
        Array.from(self.container.children).forEach(item => {
            if (item.tagName === 'TR' && item.closest('thead')) return;
            if (item.classList.contains('os-sortable-item') && item.osListenersAttached) return;

            item.classList.add('os-sortable-item');
            item.osListenersAttached = true;

            if (self.config.handle) {
                const handleEl = Array.from(item.querySelectorAll(self.config.handle))
                    .find(h => h.closest('.os-sortable-item') === item);
                if (handleEl) {
                    handleEl.style.cursor = 'move';
                    handleEl.style.touchAction = 'none';
                    handleEl.addEventListener('mousedown', () => item.setAttribute('draggable', 'true'));
                    handleEl.addEventListener('mouseup', () => item.removeAttribute('draggable'));
                    handleEl.addEventListener('touchstart', (e) => self.handleTouchStart(e, item));
                }
            } else {
                item.setAttribute('draggable', 'true');
                item.style.touchAction = 'none';
                item.addEventListener('touchstart', (e) => self.handleTouchStart(e, item));
            }

            item.addEventListener('dragstart', function(e) {
                e.stopPropagation();
                self.draggedItem = this;

                if (this.tagName === 'TR') {
                    Array.from(this.children).forEach(cell => {
                        cell.style.width = window.getComputedStyle(cell).width;
                    });
                }

                this.classList.add('os-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
                window.getSelection().removeAllRanges();
            });

            item.addEventListener('dragend', function(e) {
                e.stopPropagation();
                if (this.tagName === 'TR') {
                    Array.from(this.children).forEach(cell => cell.style.width = '');
                }
                this.classList.remove('os-dragging');
                if (self.config.handle) this.removeAttribute('draggable');
                self.draggedItem = null;
                if (self.config.onUpdate) self.config.onUpdate();
            });
        });
    };

    this.refresh();

    this.container.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!self.draggedItem) return;

        const targetContainer = e.target.closest('[os-sortable-container]') || self.container;
        const afterElement = self.getDragAfterElement(targetContainer, e.clientX, e.clientY);

        if (afterElement == null) {
            targetContainer.appendChild(self.draggedItem);
        } else {
            targetContainer.insertBefore(self.draggedItem, afterElement);
        }
    });

    document.addEventListener('touchmove', function(e) {
        if (!self.touchActive || !self.draggedItem) return;
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        const elementUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!elementUnderFinger) return;

        const currentZone = elementUnderFinger.closest('[os-sortable-container]');
        if (currentZone) {
            const afterElement = self.getDragAfterElement(currentZone, touch.clientX, touch.clientY);
            if (afterElement == null) {
                currentZone.appendChild(self.draggedItem);
            } else {
                currentZone.insertBefore(self.draggedItem, afterElement);
            }
        }
    }, { passive: false });

    document.addEventListener('touchend', () => { if (self.touchActive) self.handleTouchEnd(); });
};

OpenShopSortable.prototype.handleTouchStart = function(e, item) {
    this.touchActive = true;
    this.draggedItem = item;
    item.classList.add('os-dragging');
};

OpenShopSortable.prototype.handleTouchEnd = function() {
    if (this.draggedItem) {
        this.draggedItem.classList.remove('os-dragging');
    }
    this.touchActive = false;
    this.draggedItem = null;
    if (this.config.onUpdate) this.config.onUpdate();
};

OpenShopSortable.prototype.getDragAfterElement = function(container, x, y) {
    var actualContainer = container.tagName === 'TABLE' ? (container.querySelector('tbody') || container) : container;

    const draggableElements = [...actualContainer.children].filter(child => {
        return (child.classList.contains('os-sortable-item') || child.classList.contains('external-event'))
            && !child.classList.contains('os-dragging') && !child.classList.contains('dragging');
    });

    let closestElement = null;
    let shortestDistance = Number.POSITIVE_INFINITY;
    let insertAfter = false;

    draggableElements.forEach(child => {
        const box = child.getBoundingClientRect();
        const boxCenterX = box.left + box.width / 2;
        const boxCenterY = box.top + box.height / 2;

        const distance = Math.sqrt(Math.pow(x - boxCenterX, 2) + Math.pow(y - boxCenterY, 2));

        if (distance < shortestDistance) {
            shortestDistance = distance;
            closestElement = child;

            if (x > boxCenterX && Math.abs(y - boxCenterY) < box.height / 2) {
                insertAfter = true;
            } else if (y > boxCenterY && Math.abs(x - boxCenterX) < box.width / 2) {
                insertAfter = true;
            } else {
                insertAfter = false;
            }
        }
    });

    return (closestElement && insertAfter) ? closestElement.nextElementSibling : closestElement;
};

/**
 * 🚀 DVOSTRANO PREBACIVANJE IZMEĐU DVE KOLONE - FIXED
 */
OS.initDualColumnDnD = function(sourceSel, targetSel, options) {
    var config = Object.assign({ handle: '', onUpdate: null }, options || {});
    var sourceContainer = typeof sourceSel === 'string' ? document.querySelector(sourceSel) : sourceSel;
    var targetContainer = typeof targetSel === 'string' ? document.querySelector(targetSel) : targetSel;

    if (!sourceContainer || !targetContainer) return;

    var actualSource = sourceContainer.tagName === 'TABLE' ? (sourceContainer.querySelector('tbody') || sourceContainer) : sourceContainer;
    var actualTarget = targetContainer.tagName === 'TABLE' ? (targetContainer.querySelector('tbody') || targetContainer) : targetContainer;

    actualSource.setAttribute('os-sortable-container', 'true');
    actualTarget.setAttribute('os-sortable-container', 'true');

    var globalDraggedItem = null;

    // 1. KLJUČNA FUNKCIJA: Dodavanje draggable atributa
    function osveziKlaseStavki() {
        [actualSource, actualTarget].forEach(container => {
            Array.from(container.children).forEach(item => {
                if (item.tagName === 'TR' && item.closest('thead')) return;

                item.classList.add('os-sortable-item', 'external-event');

                // BITNO: Bez ovoga dragstart NEĆE da se okinuti
                item.setAttribute('draggable', 'true');

                if (item.tagName === 'TR') {
                    item.style.display = 'table-row';
                    Array.from(item.children).forEach(cell => {
                        if (cell.tagName === 'TD') cell.style.display = 'table-cell';
                    });
                }
            });
        });
    }

    function onDragStart(e) {
        var item = e.target.closest('.os-sortable-item');
        if (!item) return;

        // 2. PROVERA HANDLE-A: Ako postoji handle, a nismo kliknuli na njega, otkaži drag
        if (config.handle) {
            var handle = e.target.closest(config.handle);
            if (!handle) {
                e.preventDefault();
                return;
            }
        }

        globalDraggedItem = item;

        // Fiksiranje širina ćelija za tabele
        if (item.tagName === 'TR') {
            Array.from(item.children).forEach(c => c.style.width = window.getComputedStyle(c).width);
        }

        item.classList.add('os-dragging', 'dragging');

        // Firefox zahteva setData da bi drag radio
        e.dataTransfer.setData('text/plain', '');
    }

    function onDragEnd(e) {
        if (globalDraggedItem) {
            if (globalDraggedItem.tagName === 'TR') {
                Array.from(globalDraggedItem.children).forEach(c => c.style.width = '');
            }
            globalDraggedItem.classList.remove('os-dragging', 'dragging');
        }
        globalDraggedItem = null;
        if (config.onUpdate) config.onUpdate();
    }

    [actualSource, actualTarget].forEach(container => {
        // Slušamo na nivou kontejnera (delegacija)
        container.addEventListener('dragstart', onDragStart);

        container.addEventListener('dragover', function(e) {
            e.preventDefault(); // Neophodno da bi 'drop' radio
            if (!globalDraggedItem) return;

            // Koristimo tvoju Pitagorinu funkciju iz OpenShopSortable
            var after = OpenShopSortable.prototype.getDragAfterElement(this, e.clientX, e.clientY);

            if (after == null) {
                this.appendChild(globalDraggedItem);
            } else {
                this.insertBefore(globalDraggedItem, after);
            }
        });

        container.addEventListener('dragend', onDragEnd);

        container.addEventListener('drop', function(e) {
            e.preventDefault();
            // Pozivamo tvoj UX osigurač
            if (typeof prikaziUpozorenjeZaCuvanje === 'function') {
                prikaziUpozorenjeZaCuvanje();
            }
        });
    });

    osveziKlaseStavki();
};

if (typeof OS !== 'undefined' && OS.prototype) {
    OS.prototype.Sortable = function(options) {
        return this.each(function() {
            this.setAttribute('os-sortable-container', 'true');
            if (this.osSortableInstance) this.osSortableInstance.refresh();
            else this.osSortableInstance = new OpenShopSortable(Object.assign({ el: this }, options));
        });
    };
    OS.prototype.initDualColumnDnD = OS.initDualColumnDnD;
}
