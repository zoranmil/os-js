/**
 * OPENSHOP FRAMEWORK - UNIVERSAL SELECTS v3.1.0
 * Potpuno integrisan sa OpenShop DOM engine-om (zoranmil/shopera).
 * Ispravljeno dinamičko čitanje minimumInputLength i uslovni Eager Loading na osnovu vrednosti 0.
 * License: AGPL-3.0-or-later
 */
(function(OS) {
    if (typeof OS === 'undefined') return;

    function Selects(options) {
        this.defaultOptions = {
            option: null,
            issearch: false,
            placeholder: typeof _P === 'function' ? _P('Choose...') : 'Choose...',
            searchPlaceholder: typeof _P === 'function' ? _P('Search...') : 'Search...',
            odabrano: typeof _P === 'function' ? _P('Selected') : 'Selected',
            loadingText: typeof _P === 'function' ? _P('Loading...') : 'Loading...',
            noResultsText: typeof _P === 'function' ? _P('No results found') : 'No results found',
            minimumInputLength: 0, // Podrazumevano je 0 (odmah vuče podatke pri kliku)
            ajax: null,
            onSelect: null,
            maxHeight: '280px'
        };

        this.config = Object.assign({}, this.defaultOptions, options || {});
        this.config.option = typeof this.config.option === 'string' ?
            document.querySelector(this.config.option) : this.config.option;

        if (!this.config.option) return;

        if (this.config.ajax) {
            this.config.issearch = true;
        }

        this.ismultiselect = this.config.option.hasAttribute('multiple');
        this.ids = this.config.option.getAttribute("id") || 'sel-' + Math.floor(Math.random() * 1000);
        this.isDropdownOpen = false;
        this.create();
    }

    Selects.prototype.create = function() {
        let currentPlaceholder = this.config.placeholder || 'Choose...';
        let searchPlaceholder = this.config.searchPlaceholder || 'Search...';

        let html = `<button type="button" class="form-select text-start" role="combobox" aria-expanded="false">${currentPlaceholder}</button>
                    <ul class="dropdown-menu w-100" id="${this.ids}-list" style="max-height: ${this.config.maxHeight}; overflow-y: auto; display: none; position: absolute; z-index: 1050;">`;

        if (this.config.issearch) {
            html += `<li class="p-2 select-search-box" style="position: sticky; top: 0; background: #fff; z-index: 10;">
                        <input type="text" class="form-control form-control-sm select-search" placeholder="${searchPlaceholder}" autocomplete="off">
                     </li>`;
        }
        html += '<div class="select-rezultati-ul"></div></ul>';
        html += `<div style="display:none !important;"></div>`;

        let element = document.createElement('div');
        element.className = "select-container";
        element.style.position = "relative";
        element.innerHTML = html;

        this.config.option.replaceWith(element);
        element.lastChild.appendChild(this.config.option);

        this.didoption = this.config.option;
        this.config.button = element.querySelector('button');
        this.config.dropdown = element.querySelector('ul');
        this.config.rezultatiKontejner = element.querySelector('.select-rezultati-ul');
        this.config.search = element.querySelector('.select-search');

        this.renderujStavkeMenzija();
        this.bindEvents();
    };

    Selects.prototype.renderujStavkeMenzija = function() {
        var self = this;
        var opts = this.config.option.options || [];
        if (!this.config.rezultatiKontejner) return;
        this.config.rezultatiKontejner.innerHTML = '';
        var selektovaneStavke = [];
        var singleTekst = this.config.placeholder;

        for (var i = 0; i < opts.length; i++) {
            if (opts[i].selected) {
                selektovaneStavke.push({ value: opts[i].value, text: opts[i].textContent });
                singleTekst = opts[i].textContent;
            }

            var li = document.createElement('li');
            if (!this.ismultiselect) {
                var activeClass = opts[i].selected ? 'active' : '';
                li.innerHTML = '<a class="dropdown-item ' + activeClass + '" href="#" data-value="' + opts[i].value + '">' + opts[i].textContent + '</a>';
            } else {
                var checked = opts[i].selected ? 'checked' : '';
                var activeClass = opts[i].selected ? 'active' : '';
                li.innerHTML = '<div class="dropdown-item ' + activeClass + '" data-value="' + opts[i].value + '">' +
                               '<div class="form-check w-100">' +
                               '<input class="form-check-input" type="checkbox" ' + checked + ' style="pointer-events: none;">' +
                               '<label class="form-check-label w-100">' + opts[i].textContent + '</label>' +
                               '</div>' +
                               '</div>';
            }
            this.config.rezultatiKontejner.appendChild(li);
        }

        if (!this.ismultiselect) {
            this.config.button.textContent = singleTekst;
        } else {
            this.renderTags(selektovaneStavke);
        }
    };

    Selects.prototype.renderTags = function(stavke) {
        var self = this;
        if (stavke.length > 0) {
            this.config.button.innerHTML = '';
            this.config.button.className = "form-select text-start d-flex flex-wrap align-items-center gap-1 py-1 pe-5";
            stavke.forEach(function(stavka) {
                var badge = document.createElement('span');
                badge.className = 'badge d-inline-flex align-items-center fw-normal px-2 py-1 text-white select-tag-item';
                badge.style.backgroundColor = '#fb923c';
                badge.style.fontSize = '12px';
                badge.style.userSelect = 'none';
                badge.textContent = stavka.text + ' ';

                var closeBtn = document.createElement('span');
                closeBtn.innerHTML = '&times;';
                closeBtn.className = 'ms-1 text-white fw-bold select-close-btn';
                closeBtn.style.cursor = 'pointer';
                closeBtn.style.fontSize = '14px';
                closeBtn.style.lineHeight = '1';

                closeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    for (var k = 0; k < self.config.option.options.length; k++) {
                        if (self.config.option.options[k].value === stavka.value) {
                            self.config.option.options[k].selected = false;
                            break;
                        }
                    }
                    self.renderujStavkeMenzija();
                    if (typeof OS.Event === 'function') {
                        self.config.option.dispatchEvent(OS.Event('change'));
                    } else {
                        self.config.option.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                badge.appendChild(closeBtn);
                self.config.button.appendChild(badge);
            });
        } else {
            this.config.button.className = "form-select text-start";
            this.config.button.textContent = this.config.placeholder;
        }
    };
    Selects.prototype.bindEvents = function() {
        const self = this;

        // 1. OTVARANJE MENIJA (Preko OS selektora)
        OS(this.config.button).on('click', (e) => {
            e.stopPropagation();

            // Zatvara sve ostale aktivne dropdown menije na stranici pre otvaranja trenutnog
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== self.config.dropdown) menu.style.display = 'none';
            });

            this.isDropdownOpen = !this.isDropdownOpen;
            this.config.dropdown.style.display = this.isDropdownOpen ? 'block' : 'none';

            if (this.isDropdownOpen) {
                // Resetuje tekst pretrage i vidljivost lokalnih stavki
                if (this.config.issearch && this.config.search) {
                    this.config.search.value = '';
                    if (this.config.rezultatiKontejner) {
                        this.config.rezultatiKontejner.querySelectorAll('li').forEach(li => {
                            li.style.display = '';
                        });
                        let staraPoruka = this.config.rezultatiKontejner.querySelector('.select-no-results');
                        if (staraPoruka) staraPoruka.remove();
                    }
                    setTimeout(() => this.config.search.focus(), 50);
                }

                // ISPRAVLJENO: Eager Loading se pokreće SAMO ako je minimumInputLength eksplicitno podešen na 0
                if (this.config.ajax && parseInt(this.config.minimumInputLength) === 0) {
                    this.izvrsiAjaxPretragu('');
                }
            }
        });

        // 2. KLIK NA STAVKU (Zadržana originalna delegacija iz Core-a)
        OS(this.config.dropdown).on('click', '.dropdown-item', function(e) {
            e.preventDefault();
            const vrednost = this.getAttribute('data-value');
            if (!vrednost) return;

            if (!self.ismultiselect) {
                self.didoption.value = vrednost;
                self.isDropdownOpen = false;
                self.config.dropdown.style.display = 'none';
            } else {
                const opt = Array.from(self.didoption.options).find(o => o.value == vrednost);
                if (opt) opt.selected = !opt.selected;
            }
            self.renderujStavkeMenzija();
            self.didoption.dispatchEvent(new Event('change', { bubbles: true }));
            if (typeof self.config.onSelect === 'function') {
                const result = self.ismultiselect ?
                    Array.from(self.didoption.options).filter(o => o.selected).map(o => o.value) :
                    vrednost;
                self.config.onSelect(result, self.didoption);
            }
        });

        // 3. ASINHRONA / LOKALNA PRETRAGA (Uz OS.debounce)
        if (this.config.issearch) {
            const procesirajPretragu = OS.debounce((val) => {
                const pretvoreno = val.toLowerCase().trim();
                const minLength = parseInt(self.config.minimumInputLength) || 0;

                if (this.config.ajax) {
                    // ISPRAVLJENO: Ako je upit dovoljno dug, šalje se na server.
                    // Izuzetak je prazan string kada je dozvoljen Eager Loading (minLength === 0).
                    if (pretvoreno.length >= minLength || (pretvoreno.length === 0 && minLength === 0)) {
                        this.izvrsiAjaxPretragu(val);
                    } else {
                        // Pametni lokalni filter za ono što je trenutno učitano na formi
                        let vidljivoStavki = 0;
                        if (self.config.rezultatiKontejner) {
                            self.config.rezultatiKontejner.querySelectorAll('li').forEach(li => {
                                if (li.classList.contains('select-no-results') || li.classList.contains('select-loading-item')) return;
                                const mečuje = li.textContent.toLowerCase().includes(pretvoreno);
                                li.style.display = mečuje ? '' : 'none';
                                if (mečuje) vidljivoStavki++;
                            });
                            self.prikaziNoResultsPoruku(vidljivoStavki === 0 && pretvoreno.length > 0);
                        }
                    }
                } else {
                    // Standardna lokalna pretraga za statičke opcije
                    let vidljivoStavki = 0;
                    if (self.config.rezultatiKontejner) {
                        self.config.rezultatiKontejner.querySelectorAll('li').forEach(li => {
                            if (li.classList.contains('select-no-results')) return;
                            const mečuje = li.textContent.toLowerCase().includes(pretvoreno);
                            li.style.display = mečuje ? '' : 'none';
                            if (mečuje) vidljivoStavki++;
                        });
                        self.prikaziNoResultsPoruku(vidljivoStavki === 0);
                    }
                }
            }, this.config.ajax ? (this.config.ajax.delay || 300) : 100);

            OS(this.config.search).on('input', (e) => {
                procesirajPretragu(e.target.value);
            });
            OS(this.config.search).on('click', (e) => e.stopPropagation());
        }

        // 4. ZATVARANJE KLIKOM VAN ELEMENTA + ČIŠĆENJE INPUTA
        document.addEventListener('click', (e) => {
            if (!this.config.button.contains(e.target) && this.isDropdownOpen) {
                if (this.config.issearch && this.config.search.contains(e.target)) return;
                this.isDropdownOpen = false;
                this.config.dropdown.style.display = 'none';
                if (this.config.search) this.config.search.value = '';
            }
        });
    };

    // Pomoćna metoda za prikaz "Nema rezultata"
    Selects.prototype.prikaziNoResultsPoruku = function(prikazi) {
        let staraPoruka = this.config.rezultatiKontejner.querySelector('.select-no-results');
        if (staraPoruka) staraPoruka.remove();

        if (prikazi) {
            let li = document.createElement('li');
            li.className = 'p-2 text-muted text-center select-no-results small';
            li.textContent = this.config.noResultsText;
            this.config.rezultatiKontejner.appendChild(li);
        }
    };

    // AJAX izvršavanje pretrage
    Selects.prototype.izvrsiAjaxPretragu = function(pojam) {
        if (!this.config.ajax) return;
        const self = this;
        const ajaxConf = this.config.ajax;

        this.config.rezultatiKontejner.innerHTML = `<li class="p-2 text-muted text-center select-loading-item small"><i class="spinner-border spinner-border-sm me-2"></i>${this.config.loadingText}</li>`;

        let slanjePodataka = typeof ajaxConf.data === 'function' ? ajaxConf.data({ term: pojam }) : {};
        const formData = new URLSearchParams();
        for (let kljuc in slanjePodataka) {
            formData.append(kljuc, slanjePodataka[kljuc]);
        }

        fetch(ajaxConf.embed_url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: formData.toString()
        })
        .then(res => res.json())
        .then(odgovor => {
            let procesirani = typeof ajaxConf.processResults === 'function' ?
                ajaxConf.processResults(odgovor) : { results: [] };

            if (!this.ismultiselect) {
                this.didoption.innerHTML = '';
            } else {
                let neotkazaneOpcije = Array.from(this.didoption.options).filter(o => o.selected);
                this.didoption.innerHTML = '';
                neotkazaneOpcije.forEach(opt => this.didoption.appendChild(opt));
            }

            procesirani.results.forEach(stavka => {
                if (Array.from(this.didoption.options).some(o => o.value == stavka.id)) return;
                let opt = document.createElement('option');
                opt.value = stavka.id;
                opt.textContent = stavka.text;
                this.didoption.appendChild(opt);
            });

            this.renderujStavkeMenzija();
            this.prikaziNoResultsPoruku(procesirani.results.length === 0);
        })
        .catch(err => {
            console.error("Selects Mrežna Greška:", err);
            this.config.rezultatiKontejner.innerHTML = `<li class="p-2 text-danger text-center small">Greška pri učitavanju</li>`;
        });
    };

    (function(OS) {
        if (typeof OS === 'undefined' || !OS.prototype) return;
        OS.prototype.Selects = function(options) {
            return this.each(function() {
                new Selects(Object.assign({ option: this }, options));
            });
        };
    })(window.OpenShop || window.OS);
})(window.OS);
