/**
 * OPENSHOP FRAMEWORK - DATEPICKER v2.9.8 (ULTIMATE)
 * Podržava: locale (EN/SR), disablePast, disableWeekends, onSelect.
 * License: AGPL-3.0-or-later
 */

(function(OS) {
    'use strict';
    if (!OS) return;

    // 1. REČNIK LOKALIZACIJA
    OS.dateLocales = {
        'en': {
            dani: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
            meseci: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        'sr': {
            dani: ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'],
            meseci: ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
        }
    };

    // 2. POMOĆNE FUNKCIJE
    function parseDatum(str, format) {
        if (!str || typeof str !== 'string') return null;
        const sep = format.match(/[./-]/) ? format.match(/[./-]/)[0] : '/';
        const fParts = format.split(sep), dParts = str.split(sep);
        if (fParts.length !== dParts.length) return null;
        let d=1, m=0, y=new Date().getFullYear();
        fParts.forEach((p, i) => {
            const v = parseInt(dParts[i], 10);
            if (p.includes('DD')) d = v;
            if (p.includes('MM')) m = v - 1;
            if (p.includes('YYYY')) y = v;
        });
        const dt = new Date(y, m, d);
        return isNaN(dt.getTime()) ? null : dt;
    }

    function primeniFormat(date, formatStr) {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        return formatStr.replace('YYYY', date.getFullYear()).replace('MM', mm).replace('DD', dd);
    }

    // 3. MAIN PLUGIN
    OS.fn.DatePicker = function(options) {
        const defaults = {
            locale: 'sr',
            format: 'DD/MM/YYYY',
            disablePast: false,
            disableWeekends: false, // NOVO: Podrška za vikende
            onSelect: null
        };

        // Sigurno spajanje opcija
        const config = Object.assign({}, defaults, options || {});

        return this.each(function() {
            const input = this;
            if (input.dataset.datepickerInitialized) return;
            input.dataset.datepickerInitialized = 'true';
            input.readOnly = true;

            // Određivanje jezika (Prioritet: JS opcija > HTML data atribut > Default sr)
            const lang = config.locale || input.dataset.locale || 'sr';
            const lok = OS.dateLocales[lang] || OS.dateLocales['sr'];

            const danas = new Date(); danas.setHours(0,0,0,0);
            const pickerEl = document.createElement('div');
            pickerEl.className = 'os-datepicker-container shadow-lg';
            pickerEl.style.display = 'none';
            pickerEl.style.zIndex = '2050';
            document.body.appendChild(pickerEl);

            let selektovani = parseDatum(input.value, config.format);
            let pGodina = selektovani ? selektovani.getFullYear() : danas.getFullYear();
            let pMesec = selektovani ? selektovani.getMonth() : danas.getMonth();

            const render = () => {
                if (pMesec > 11) { pMesec = 0; pGodina++; }
                if (pMesec < 0) { pMesec = 11; pGodina--; }

                let html = `
                    <div class="os-dp-header">
                        <button type="button" class="os-dp-btn os-dp-prev">&lsaquo;</button>
                        <span class="os-dp-title">${lok.meseci[pMesec]} ${pGodina}</span>
                        <button type="button" class="os-dp-btn os-dp-next">&rsaquo;</button>
                    </div>
                    <div class="os-dp-weekdays">${lok.dani.map(dan => `<div>${dan}</div>`).join('')}</div>
                    <div class="os-dp-days">`;

                let prviDan = new Date(pGodina, pMesec, 1).getDay();
                let prazna = prviDan === 0 ? 6 : prviDan - 1;
                for (let i = 0; i < prazna; i++) html += '<div class="os-dp-empty"></div>';

                const danaUMesecu = new Date(pGodina, pMesec + 1, 0).getDate();
                for (let dan = 1; dan <= danaUMesecu; dan++) {
                    const t = new Date(pGodina, pMesec, dan);
                    const danUnedelji = t.getDay(); // 0 = Nedelja, 6 = Subota
                    let klasa = 'os-dp-day';

                    // Logika za Danas / Selektovano
                    if (dan === danas.getDate() && pMesec === danas.getMonth() && pGodina === danas.getFullYear()) klasa += ' os-dp-today';
                    if (selektovani && dan === selektovani.getDate() && pMesec === selektovani.getMonth() && pGodina === selektovani.getFullYear()) klasa += ' os-dp-selected';

                    // LOGIKA ZA ONEMOGUĆAVANJE (Disabled)
                    if (config.disablePast && t < danas) {
                        klasa += ' os-dp-disabled';
                    } else if (config.disableWeekends && (danUnedelji === 0 || danUnedelji === 6)) {
                        klasa += ' os-dp-disabled';
                    }

                    html += `<div class="${klasa}" data-dan="${dan}">${dan}</div>`;
                }
                pickerEl.innerHTML = html + '</div>';

                // Listeners za navigaciju
                pickerEl.querySelector('.os-dp-prev').onclick = (e) => { e.stopPropagation(); pMesec--; render(); };
                pickerEl.querySelector('.os-dp-next').onclick = (e) => { e.stopPropagation(); pMesec++; render(); };

                // Klik na dan
                pickerEl.querySelectorAll('.os-dp-day:not(.os-dp-disabled)').forEach(el => {
                    el.onclick = function(e) {
                        e.stopPropagation();
                        selektovani = new Date(pGodina, pMesec, parseInt(this.dataset.dan));
                        const formatiran = primeniFormat(selektovani, config.format);
                        input.value = formatiran;
                        pickerEl.style.display = 'none';
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        if (config.onSelect) config.onSelect(formatiran, selektovani);
                    };
                });
            };

            const pozicioniraj = () => {
                const rect = input.getBoundingClientRect();
                pickerEl.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                pickerEl.style.left = (rect.left + window.scrollX) + 'px';
            };

            OS(input).on('click', (e) => {
                e.stopPropagation();
                render(); pozicioniraj();
                pickerEl.style.display = 'block';
            });

            document.addEventListener('click', (e) => {
                if (!pickerEl.contains(e.target) && e.target !== input) pickerEl.style.display = 'none';
            });
        });
    };
})(window.OS || window.OpenShop);
