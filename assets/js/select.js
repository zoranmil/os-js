/**
 * OPENSHOP FRAMEWORK - UNIVERSAL SELECTS v2.7.6
 * Podržava Single i Multiple selekciju, sa ili bez AJAX-a.
 * License: AGPL-3.0-or-later
 */
 function Selects(options) {
     this.defaultOptions = {
         option: null,
         issearch: false,
         placeholder: _P('Choose...'),
         searchPlaceholder: _P('Search...'),
         odabrano: _P('Selected'),
         ajax: null,
         onSelect: null
     };

     this.config = Object.assign({}, this.defaultOptions, options || {});
     this.config.option = typeof this.config.option === 'string' ?
         document.querySelector(this.config.option) : this.config.option;

     if (!this.config.option) return;

     if (this.config.ajax) {
         this.config.issearch = true;
     }

     // Provera da li je nativni select MULTIPLE
     this.ismultiselect = this.config.option.hasAttribute('multiple');
     this.ids = this.config.option.getAttribute("id") || 'sel-' + Math.floor(Math.random() * 1000);
     this.isDropdownOpen = false;
     this.create();
 }

 Selects.prototype.create = function() {
     // ISPRAVLJENO: Promenjeno searchplaceholder u searchPlaceholder (sa velikim P)
     let currentPlaceholder = this.config.placeholder || 'Choose...';
     let searchPlaceholder = this.config.searchPlaceholder || 'Search...';

     let html = `<button type="button" class="form-select text-start" role="combobox" aria-expanded="false">${currentPlaceholder}</button>
                 <ul class="dropdown-menu w-100" style="max-height: 280px; overflow-y: auto; display: none; position: absolute; z-index: 1050;">`;

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

     // 1. Prolazimo kroz sve opcije i generišemo strukturu koja savršeno odgovara tvom CSS-u
     for (var i = 0; i < opts.length; i++) {
         if (opts[i].selected) {
             selektovaneStavke.push({ value: opts[i].value, text: opts[i].textContent });
             singleTekst = opts[i].textContent;
         }

         var li = document.createElement('li');
         if (!this.ismultiselect) {
             // Ako je SINGLE select, koristimo tvoju klasu .active za narandžasti efekat
             var activeClass = opts[i].selected ? 'active' : '';
             li.innerHTML = '<a class="dropdown-item ' + activeClass + '" href="#" data-value="' + opts[i].value + '">' + opts[i].textContent + '</a>';
         } else {
             var checked = opts[i].selected ? 'checked' : '';
             // Ako je MULTIPLE, takođe dodajemo .active na ceo red da dobije suptilnu narandžastu pozadinu iz tvog CSS-a
             var activeClass = opts[i].selected ? 'active' : '';

             // UKLAPANJE SA TVOJIM CSS-om: Generišemo .form-check strukturu unutar .dropdown-item
             li.innerHTML = '<div class="dropdown-item ' + activeClass + '" data-value="' + opts[i].value + '">' +
                                '<div class="form-check w-100">' +
                                    '<input class="form-check-input" type="checkbox" ' + checked + '>' +
                                    '<label class="form-check-label">' + opts[i].textContent + '</label>' +
                                '</div>' +
                            '</div>';
         }
         this.config.rezultatiKontejner.appendChild(li);
     }

     // 2. Ažuriranje glavnog prikaza i bedževa unutar samog dugmeta
     if (!this.ismultiselect) {
         this.config.button.textContent = singleTekst;
     } else {
         if (selektovaneStavke.length > 0) {
             this.config.button.innerHTML = '';

             // Ređamo tagove u liniji i ostavljamo prostor (pe-5) za desnu Bootstrap strelicu
             this.config.button.className = "form-select text-start d-flex flex-wrap align-items-center gap-1 py-1 pe-5";

             selektovaneStavke.forEach(function(stavka) {
                 var badge = document.createElement('span');
                 // Koristimo tvoju narandžastu boju za bedževe u polju kako bi se slagala sa ostatkom selekta
                 badge.className = 'badge d-inline-flex align-items-center fw-normal px-2 py-1 text-white select-tag-item';
                 badge.style.backgroundColor = '#fb923c'; // Tvoja prepoznatljiva narandžasta boja!
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
                     e.stopPropagation(); // Sprečava otvaranje/zatvaranje dropdown-a na klik tastera X

                     for (var k = 0; k < self.config.option.options.length; k++) {
                         if (self.config.option.options[k].value === stavka.value) {
                             self.config.option.options[k].selected = false;
                             break;
                         }
                     }
                     self.renderujStavkeMenzija();
                     self.config.option.dispatchEvent(OS.Event('change'));
                 });

                 badge.appendChild(closeBtn);
                 self.config.button.appendChild(badge);
             });
         } else {
             this.config.button.className = "form-select text-start";
             this.config.button.textContent = this.config.placeholder;
         }
     }
 };


Selects.prototype.bindEvents = function() {
    // Otvaranje / Zatvaranje menija
    this.config.button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isDropdownOpen = !this.isDropdownOpen;
        this.config.dropdown.style.display = this.isDropdownOpen ? 'block' : 'none';
        if (this.isDropdownOpen && this.config.issearch) {
            setTimeout(() => this.config.search.focus(), 50);
        }
    });

    // Klik na stavku
    this.config.dropdown.addEventListener('click', (e) => {
        let stavka = e.target.closest('.dropdown-item');
        if (stavka) {
            e.preventDefault();
            let vrednost = stavka.getAttribute('data-value');

            if (!this.ismultiselect) {
                // --- LOGIKA ZA SINGLE SELECT ---
                this.didoption.value = vrednost;
                this.isDropdownOpen = false;
                this.config.dropdown.style.display = 'none';
                this.renderujStavkeMenzija();

                if (typeof this.config.onSelect === 'function') {
                    this.config.onSelect(vrednost, this.didoption);
                }
            } else {
                // --- LOGIKA ZA MULTIPLE SELECT ---
                // Pronađi odgovarajuću opciju u skrivenom selectu i obrni joj stanje
                for (let i = 0; i < this.didoption.options.length; i++) {
                    if (this.didoption.options[i].value === vrednost) {
                        this.didoption.options[i].selected = !this.didoption.options[i].selected;
                        break;
                    }
                }

                // Osveži iscrtavanje checkboxova na ekranu (Meni ostaje OTVOREN)
                this.renderujStavkeMenzija();

                // Okidanje nativnog change događaja da forma zna da je došlo do promene
                this.didoption.dispatchEvent(new Event('change', { bubbles: true }));

                // Poziv onSelect funkcije sa nizom svih trenutno izabranih ID-jeva
                if (typeof this.config.onSelect === 'function') {
                    let sviIzabrani = Array.from(this.didoption.options).filter(o => o.selected).map(o => o.value);
                    this.config.onSelect(sviIzabrani, this.didoption);
                }
            }
        }
    });

    // Pretraga
    if (this.config.issearch) {
        let tajmer;
        this.config.search.addEventListener('input', (e) => {
            let val = e.target.value;

            if (this.config.ajax) {
                clearTimeout(tajmer);
                tajmer = setTimeout(() => {
                    this.izvrsiAjaxPretragu(val);
                }, this.config.ajax.delay || 250);
            } else {
                let pretvoreno = val.toLowerCase();
                let sveStavke = this.config.rezultatiKontejner.querySelectorAll('.dropdown-item');
                sveStavke.forEach(el => {
                    let li = el.closest('li');
                    if (li) li.style.display = el.textContent.toLowerCase().includes(pretvoreno) ? '' : 'none';
                });
            }
        });
        this.config.search.addEventListener('click', (e) => e.stopPropagation());
    }

    // Zatvaranje klikom sa strane
    document.addEventListener('click', (e) => {
        if (!this.config.button.contains(e.target) && this.isDropdownOpen) {
            if (this.config.issearch && this.config.search.contains(e.target)) return;
            this.isDropdownOpen = false;
            this.config.dropdown.style.display = 'none';
        }
    });
};

Selects.prototype.izvrsiAjaxPretragu = function(pojam) {
    if (!this.config.ajax || pojam.trim().length < (this.config.ajax.minimumInputLength || 1)) return;

    const ajaxConf = this.config.ajax;
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
        let procesirani = typeof ajaxConf.processResults === 'function' ? ajaxConf.processResults(odgovor) : { results: [] };

        if (!this.ismultiselect) {
            // Ako je single, očisti sve i upiši novo
            this.didoption.innerHTML = '';
        } else {
            // Ako je multiple, zadržavamo one koje su već štiklirane da ih pretraga ne obriše
            let neotkazaneOpcije = Array.from(this.didoption.options).filter(o => o.selected);
            this.didoption.innerHTML = '';
            neotkazaneOpcije.forEach(opt => this.didoption.appendChild(opt));
        }

        procesirani.results.forEach(stavka => {
            // Preskačemo ako je već ubačena (kod multiple režima)
            if (Array.from(this.didoption.options).some(o => o.value == stavka.id)) return;

            let opt = document.createElement('option');
            opt.value = stavka.id;
            opt.textContent = stavka.text;
            this.didoption.appendChild(opt);
        });

        this.renderujStavkeMenzija();
    })
    .catch(err => console.error("Selects Mrežna Greška:", err));
};

(function(OS) {
    if (typeof OS === 'undefined' || !OS.prototype) return;
    OS.prototype.Selects = function(options) {
        return this.each(function() {
            new Selects(Object.assign({ option: this }, options));
        });
    };
})(window.OpenShop || window.OS);
