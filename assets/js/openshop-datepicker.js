(function(OS) {
    'use strict';

    if (!OS) return;

    const DANI = ['Ne', 'Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su'];
    const MESECI = [
        'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
        'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
    ];

    OS.fn.DatePicker = function(options) {
        // Pametne podrazumevane opcije
        const defaults = {
            format: 'YYYY-MM-DD',
            disablePast: false, // Ako je true, zabranjuje biranje dana u prošlosti
            onSelect: null      // Callback funkcija nakon izbora datuma
        };

        const config = OS.extend({}, defaults, options || {});

        return this.each(function() {
            const input = this;
            if (!input || input.tagName !== 'INPUT') return;

            if (input.dataset.datepickerInitialized) return;
            input.dataset.datepickerInitialized = 'true';
            input.readOnly = true;
            input.style.cursor = 'pointer';

            const danas = new Date();
            danas.setHours(0,0,0,0);

            // Inicijalno stanje preuzimamo iz input polja ako već postoji datum unutra
            let selektovaniDatum = null;
            if (input.value && input.value.trim() !== '') {
                const parsed = new Date(input.value);
                if (!isNaN(parsed.getTime())) {
                    selektovaniDatum = parsed;
                    selektovaniDatum.setHours(0,0,0,0);
                }
            }

            // Kalendar otvaramo na selektovanom datumu ili na današnjem danu
            let prikazanaGodina = selektovaniDatum ? selektovaniDatum.getFullYear() : danas.getFullYear();
            let prikazaniMesec = selektovaniDatum ? selektovaniDatum.getMonth() : danas.getMonth();

            // Pravimo HTML kontejner i prebacujemo ga u body radi apsolutnog pozicioniranja
            const pickerEl = document.createElement('div');
            pickerEl.className = 'os-datepicker-container';
            pickerEl.style.display = 'none';
            document.body.appendChild(pickerEl);

            // Funkcija za dinamičko računanje pozicije ekrana
            function pozicionirajPicker() {
                const rect = input.getBoundingClientRect();
                pickerEl.style.top = (rect.bottom + window.scrollY) + 'px';
                pickerEl.style.left = (rect.left + window.scrollX) + 'px';
            }

            // Otvaranje / zatvaranje na klik
            OS(input).on('click', function(e) {
                e.stopPropagation();

                const sviKalendari = document.querySelectorAll('.os-datepicker-container');
                sviKalendari.forEach(el => { if (el !== pickerEl) el.style.display = 'none'; });

                if (pickerEl.style.display === 'none') {
                    pozicionirajPicker();
                    render();
                    pickerEl.style.display = 'block';
                } else {
                    pickerEl.style.display = 'none';
                }
            });

            // Slušamo promenu veličine prozora ili skrola da popravimo poziciju
            window.addEventListener('resize', pozicionirajPicker);
            window.addEventListener('scroll', pozicionirajPicker, true);

            document.addEventListener('click', function(e) {
                if (!pickerEl.contains(e.target) && e.target !== input) {
                    pickerEl.style.display = 'none';
                }
            });

            // GLAVNI RENDERER
            function render() {
                let html = '<div class="os-dp-header">';
                html += '<button type="button" class="os-dp-btn-prev">&lt;</button>';
                html += '<span class="os-dp-title">' + MESECI[prikazaniMesec] + ' ' + prikazanaGodina + '</span>';
                html += '<button type="button" class="os-dp-btn-next">&gt;</button>';
                html += '</div>';

                html += '<div class="os-dp-weekdays">';
                DANI.forEach(dan => { html += '<div>' + dan + '</div>'; });
                html += '</div>';

                html += '<div class="os-dp-days">';

                const prviDanIndex = new Date(prikazanaGodina, prikazaniMesec, 1).getDay();
                const ukupnoDana = new Date(prikazanaGodina, prikazaniMesec + 1, 0).getDate();

                // Prazna polja na početku meseca
                for (let i = 0; i < prviDanIndex; i++) {
                    html += '<div class="os-dp-empty"></div>';
                }

                // Generisanje dana sa proverama za prošlost i selekciju
                for (let dan = 1; dan <= ukupnoDana; dan++) {
                    const trenutniZapis = new Date(prikazanaGodina, prikazaniMesec, dan);
                    let klasa = 'os-dp-day';
                    let disabledAttr = '';

                    // 1. Provera za zabranu prošlosti
                    if (config.disablePast && trenutniZapis < danas) {
                        klasa += ' os-dp-disabled';
                        disabledAttr = ' data-disabled="true"';
                    }

                    // 2. Provera da li je to trenutno izabrani datum iz baze
                    if (selektovaniDatum && dan === selektovaniDatum.getDate() && prikazaniMesec === selektovaniDatum.getMonth() && prikazanaGodina === selektovaniDatum.getFullYear()) {
                        klasa += ' os-dp-selected';
                    }

                    // 3. Isticanje današnjeg dana
                    if (dan === danas.getDate() && prikazaniMesec === danas.getMonth() && prikazanaGodina === danas.getFullYear()) {
                        klasa += ' os-dp-today';
                    }

                    html += '<div class="' + klasa + '" data-dan="' + dan + '"' + disabledAttr + '>' + dan + '</div>';
                }

                html += '</div>';
                pickerEl.innerHTML = html;

                // NAVIGACIJA KROZ MESECE
                pickerEl.querySelector('.os-dp-btn-prev').onclick = function(e) {
                    e.stopPropagation();
                    prikazaniMesec--;
                    if (prikazaniMesec < 0) { prikazaniMesec = 11; prikazanaGodina--; }
                    render();
                };

                pickerEl.querySelector('.os-dp-btn-next').onclick = function(e) {
                    e.stopPropagation();
                    prikazaniMesec++;
                    if (prikazaniMesec > 11) { prikazaniMesec = 0; prikazanaGodina++; }
                    render();
                };

                // KLIK NA DAN
                const daniElements = pickerEl.querySelectorAll('.os-dp-day:not(.os-dp-disabled)');
                daniElements.forEach(el => {
                    el.onclick = function(e) {
                        e.stopPropagation();
                        const izabranDan = this.dataset.dan;

                        const mm = (prikazaniMesec + 1) < 10 ? '0' + (prikazaniMesec + 1) : (prikazaniMesec + 1);
                        const dd = izabranDan < 10 ? '0' + izabranDan : izabranDan;

                        const konacanDatum = prikazanaGodina + '-' + mm + '-' + dd;
                        input.value = konacanDatum;

                        // Ažuriramo stanje selekcije u memoriji
                        selektovaniDatum = new Date(prikazanaGodina, prikazaniMesec, izabranDan);

                        pickerEl.style.display = 'none';

                        // Okidamo nativni change događaj za tvoj OS.ajax
                        input.dispatchEvent(new Event('change', { bubbles: true }));

                        // Ako je definisana eksterna funkcija u inicijalizaciji, izvršavamo je
                        if (typeof config.onSelect === 'function') {
                            config.onSelect(konacanDatum);
                        }
                    };
                });
            }
        });
    };
})(window.OpenShop);
