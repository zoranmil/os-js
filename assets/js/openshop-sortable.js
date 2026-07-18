function OpenShopSortable(options) {
    this.defaultOptions = {
        el: null,
        connectWith: '',
        handle: '',              // Selektor za ikonicu (hvataljku)
        onDrop: null,
        onUpdate: null           // Okida se kada se redosled promeni
    };
    this.config = Object.assign({}, this.defaultOptions, options || {});
    if (!this.config.el) return;

    this.container = typeof this.config.el === 'string' ? document.querySelector(this.config.el) : this.config.el;
    this.draggedItem = null;
    this.init();
}

OpenShopSortable.prototype.init = function() {
    const self = this;
    const items = this.container.children;

    // 1. Postavljanje Draggable statusa na stavke
    this.refresh = function() {
        Array.from(this.container.children).forEach(item => {
            // Ako postoji 'handle', samo on pokreće drag, inače ceo item
            if (this.config.handle) {
                const handle = item.querySelector(this.config.handle);
                if (handle) handle.style.cursor = 'grab';
            }

            item.setAttribute('draggable', 'true');
            item.classList.add('os-sortable-item');

            item.addEventListener('dragstart', function(e) {
                self.draggedItem = this;
                this.classList.add('os-dragging');
                e.dataTransfer.effectAllowed = 'move';
                // Firefox fix
                e.dataTransfer.setData('text/plain', '');
            });

            item.addEventListener('dragend', function() {
                this.classList.remove('os-dragging');
                self.draggedItem = null;
                if (self.config.onUpdate) self.config.onUpdate();
            });
        });
    };

    this.refresh();

    // 2. Logika za preslaganje (Gde ubaciti element)
    const zones = [this.container];
    if (this.config.connectWith) {
        document.querySelectorAll(this.config.connectWith).forEach(z => zones.push(z));
    }

    zones.forEach(zone => {
      zone.addEventListener('dragover', function(e) {
          e.preventDefault();
          if (!self.draggedItem) return;

          // Obavezno proslediti: this, e.clientX, e.clientY
          const afterElement = self.getDragAfterElement(this, e.clientX, e.clientY);

          if (afterElement == null) {
              this.appendChild(self.draggedItem);
          } else {
              this.insertBefore(self.draggedItem, afterElement);
          }
      });
    });
};
OpenShopSortable.prototype.getDragAfterElement = function(container, x, y) {
    const draggableElements = [...container.children].filter(child => {
        return child.classList.contains('os-sortable-item') && !child.classList.contains('os-dragging');
    });

    // Proveravamo da li je kontejner horizontalni grid/flex ili vertikalna lista
    // Ako prva dva elementa imaju isti top, u pitanju je horizontalni/grid raspored
    let isHorizontal = false;
    if (draggableElements.length > 1) {
        isHorizontal = Math.abs(draggableElements[0].getBoundingClientRect().top - draggableElements[1].getBoundingClientRect().top) < 10;
    }

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();

        if (isHorizontal) {
            // Logika za slike (horizontalno/grid): Gledamo X osu i sredinu slike
            const boxCenter = box.left + box.width / 2;
            const offset = x - boxCenter;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
        } else {
            // Logika za dokumente (vertikalno): Gledamo Y osu i sredinu reda
            const boxCenter = box.top + box.height / 2;
            const offset = y - boxCenter;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
};




// Povezivanje na OS
OS.prototype.Sortable = function(options) {
    return this.each(function() {
        new OpenShopSortable(Object.assign({ el: this }, options));
    });
};
