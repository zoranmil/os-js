/**
 * OPENSHOP FRAMEWORK - PLUGIN: NATIVE TAGS INPUT
 * Copyright (c) 2026 Zoran Milićević
 * License: AGPL-3.0-or-later
 */
(function(OS) {
    'use strict';

    if (!OS) return;

    function OSTagsInput(elementSelector, options) {
        // Ako je prosleđen selektor string, umotavamo ga, ako je već DOM element, uzimamo ga direktno
        this.element = typeof elementSelector === 'string' ? OS(elementSelector)[0] : elementSelector;
        if (!this.element) return;

        // Pravimo OS instancu za potrebe tvojih metoda .css(), .val() itd.
        this.$element = OS(this.element);

        this.options = OS.extend({
            placeholder: typeof _P === 'function' ? _P('Add tag...') : 'Add tag...',
            duplicateClass: 'is-invalid'
        }, options || {});

        var currentVal = this.$element.val(); // Tvoj metod sa stranice 4
        this.tags = currentVal ? currentVal.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];

        this.init();
    }

    OSTagsInput.prototype.init = function() {
        var self = this;

        // Sakrivamo originalni input preko tvog .css() metoda (Stranica 5)
        this.$element.css('display', 'none');

        // Kreiranje omotača i unutrašnjeg inputa preko tvog HTML string parsera (Stranica 2)
        this.$wrapper = OS('<div class="form-control d-flex flex-wrap align-items-center gap-1" style="cursor: text;"></div>');
        this.wrapper = this.$wrapper[0];

        var placeholderText = this.tags.length === 0 ? this.options.placeholder : '';
        this.$input = OS('<input type="text" class="border-0 flex-grow-1 p-0 m-0" style="outline: none; box-shadow: none; min-width: 120px;" placeholder="' + placeholderText + '">');
        this.input = this.$input[0];

        // Sastavljanje strukture u DOM-u
        this.wrapper.appendChild(this.input);
        this.element.parentNode.insertBefore(this.wrapper, this.element.nextSibling);

        // Renderuj početne tagove ako ih ima
        this.renderTags();

        // Kačenje događaja preko tvog .on() sistema (Stranica 6)
        this.$wrapper.on('click', function() {
            self.input.focus();
        });

        this.$input.on('keydown', function(e) {
            var value = self.input.value.trim();

            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                if (value) {
                    self.addTag(value);
                }
            }

            // Ako je polje prazno, Backspace briše poslednji ubačeni tag
            if (e.key === 'Backspace' && value === '' && self.tags.length > 0) {
                self.removeTag(self.tags.length - 1);
            }
        });

        this.$input.on('input', function() {
            self.$wrapper.removeClass(self.options.duplicateClass);
        });
    };

    OSTagsInput.prototype.renderTags = function() {
        var self = this;

        // Čistimo stare renderovane značke (Badges) unutar omotača
        var oldTags = this.wrapper.querySelectorAll('.badge');
        for (var i = 0; i < oldTags.length; i++) {
            oldTags[i].remove();
        }

        // Prolazimo kroz niz i renderujemo značke
        this.tags.forEach(function(tag, index) {
            var $badge = OS('<span class="badge bg-primary d-inline-flex align-items-center fw-normal py-1 px-2 text-white">' + tag + ' </span>');
            var $closeBtn = OS('<span class="ms-1 text-white fw-bold" style="cursor: pointer; font-size: 14px;">&times;</span>');

            var badgeEl = $badge[0];
            var closeEl = $closeBtn[0];

            OS(closeEl).on('click', function(e) {
                e.stopPropagation(); // Sprečava otvaranje tastature/fokusa na klik za brisanje
                self.removeTag(index);
            });

            badgeEl.appendChild(closeEl);
            self.wrapper.insertBefore(badgeEl, self.input);
        });

        // Upisivanje nove vrednosti u skriveni input preko tvog .val() metoda (Stranica 4)
        this.$element.val(this.tags.join(','));

        // Dinamička kontrola placeholder teksta
        this.input.placeholder = this.tags.length === 0 ? this.options.placeholder : '';
    };

    OSTagsInput.prototype.addTag = function(value) {
        if (this.tags.indexOf(value) !== -1) {
            this.$wrapper.addClass(this.options.duplicateClass);
            return;
        }

        this.tags.push(value);
        this.input.value = '';
        this.renderTags();

        // Slanje i obaveštavanje forme o promeni stanja kroz tvoju OS.Event fabriku (Stranica 14)
        this.element.dispatchEvent(OS.Event('change'));
    };

    OSTagsInput.prototype.removeTag = function(index) {
        this.tags.splice(index, 1);
        this.renderTags();
        this.element.dispatchEvent(OS.Event('change'));
    };

    // Registracija na tvoj OpenShop prototip (Stranica 15)
    OS.fn.tagsInput = function(options) {
        return this.each(function() {
            if (!this.osTagsInputInstance) {
                this.osTagsInputInstance = new OSTagsInput(this, options);
            }
        });
    };

})(window.OpenShop || window.OS);
