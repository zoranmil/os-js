(function(OS) {
    'use strict';
    if (!OS) return;

    // FIX: Dodata provera za format da ne puca na .match() (Linija 9)
    function parseDatum(str, format) {
        if (!format || typeof format !== 'string') format = 'DD/MM/YYYY';
        if (!str || typeof str !== 'string') return null;

        const sepMatch = format.match(/[./-]/);
        if (!sepMatch) return null;

        const separator = sepMatch[0];
        const deloviFormata = format.split(separator);
        const deloviDatuma = str.split(separator);

        if (deloviDatuma.length !== deloviFormata.length) return null;

        let d = 1, m = 0, y = new Date().getFullYear();
        deloviFormata.forEach((part, i) => {
            const val = parseInt(deloviDatuma[i], 10);
            if (isNaN(val)) return;
            if (part.includes('DD')) d = val;
            if (part.includes('MM')) m = val - 1;
            if (part.includes('YYYY')) y = val;
        });

        const date = new Date(y, m, d);
        return isNaN(date.getTime()) ? null : date;
    }

    // FIX: Dodata provera za formatStr (Linija 28)
    function primeniFormat(date, formatStr) {
        if (!formatStr || typeof formatStr !== 'string') formatStr = 'DD/MM/YYYY';
        if (!(date instanceof Date) || isNaN(date.getTime())) return '';

        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return formatStr.replace('YYYY', yyyy).replace('MM', mm).replace('DD', dd);
    }

    OS.fn.DatePicker = function(options) {
        const defaults = {
            locale: 'sr',
            format: 'DD/MM/YYYY',
            disablePast: false,
            onSelect: null
        };

        // Osiguravamo da config uvek ima validne vrednosti
        const config = OS.extend({}, defaults, options || {});
        if (!config.format) config.format = 'DD/MM/YYYY';

        const lokalizacija = (OS.dateLocales && OS.dateLocales[config.locale])
            ? OS.dateLocales[config.locale]
            : {
                dani: ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'],
                meseci: ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
            };

        return this.each(function() {
            const input = this;
            if (input.dataset.datepickerInitialized) return;
            input.dataset.datepickerInitialized = 'true';
            input.readOnly = true;

            const danas = new Date(); danas.setHours(0,0,0,0);
            const pickerEl = document.createElement('div');
            pickerEl.className = 'os-datepicker-container shadow-lg';
            pickerEl.style.display = 'none';
            pickerEl.style.zIndex = '10000'; // Da bude iznad svih elemenata
            document.body.appendChild(pickerEl);

            let selektovaniDatum = parseDatum(input.value, config.format);
            let prikazanaGodina = selektovaniDatum ? selektovaniDatum.getFullYear() : danas.getFullYear();
            let prikazaniMesec = selektovaniDatum ? selektovaniDatum.getMonth() : danas.getMonth();

            const render = () => {
                // Zaštita od prelivanja meseci
                if (prikazaniMesec > 11) { prikazaniMesec = 0; prikazanaGodina++; }
                if (prikazaniMesec < 0) { prikazaniMesec = 11; prikazanaGodina--; }

                let html = `
                    <div class="os-dp-header">
                        <button type="button" class="os-dp-btn os-dp-prev">&lsaquo;</button>
                        <span class="os-dp-title">${lokalizacija.meseci[prikazaniMesec]} ${prikazanaGodina}</span>
                        <button type="button" class="os-dp-btn os-dp-next">&rsaquo;</button>
                    </div>
                    <div class="os-dp-weekdays">${lokalizacija.dani.map(dan => `<div>${dan}</div>`).join('')}</div>
                    <div class="os-dp-days">`;

                let prviDan = new Date(prikazanaGodina, prikazaniMesec, 1).getDay();
                let praznaPolja = prviDan === 0 ? 6 : prviDan - 1;
                for (let i = 0; i < praznaPolja; i++) html += '<div class="os-dp-empty"></div>';

                const ukupnoDana = new Date(prikazanaGodina, prikazaniMesec + 1, 0).getDate();
                for (let dan = 1; dan <= ukupnoDana; dan++) {
                    const t = new Date(prikazanaGodina, prikazaniMesec, dan);
                    let klasa = 'os-dp-day';
                    if (dan === danas.getDate() && prikazaniMesec === danas.getMonth() && prikazanaGodina === danas.getFullYear()) klasa += ' os-dp-today';
                    if (selektovaniDatum && dan === selektovaniDatum.getDate() && prikazaniMesec === selektovaniDatum.getMonth() && prikazanaGodina === selektovaniDatum.getFullYear()) klasa += ' os-dp-selected';
                    if (config.disablePast && t < danas) klasa += ' os-dp-disabled';
                    html += `<div class="${klasa}" data-dan="${dan}">${dan}</div>`;
                }
                pickerEl.innerHTML = html + '</div>';

                pickerEl.querySelector('.os-dp-prev').onclick = (e) => {
                    e.stopPropagation(); prikazaniMesec--; render();
                };
                pickerEl.querySelector('.os-dp-next').onclick = (e) => {
                    e.stopPropagation(); prikazaniMesec++; render();
                };

                pickerEl.querySelectorAll('.os-dp-day:not(.os-dp-disabled)').forEach(el => {
                    el.onclick = function(e) {
                        e.stopPropagation();
                        selektovaniDatum = new Date(prikazanaGodina, prikazaniMesec, parseInt(this.dataset.dan));
                        input.value = primeniFormat(selektovaniDatum, config.format);
                        zatvori();
                        // Okidamo change event da bi OS.Store (Proxy) video promenu
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        if (config.onSelect) config.onSelect(input.value, selektovaniDatum);
                    };
                });
            };

            function pozicioniraj() {
                const rect = input.getBoundingClientRect();
                const isMobile = window.innerWidth < 500;
                let overlay = document.getElementById('os-dp-overlay');

                if (isMobile) {
                    pickerEl.classList.add('os-dp-mobile');
                    if (!overlay) {
                        overlay = document.createElement('div'); overlay.id = 'os-dp-overlay';
                        document.body.appendChild(overlay);
                    }
                    overlay.style.display = 'block';
                } else {
                    pickerEl.classList.remove('os-dp-mobile');
                    const spaceBelow = window.innerHeight - rect.bottom;
                    pickerEl.style.top = (spaceBelow < 320 ? rect.top + window.scrollY - 330 : rect.bottom + window.scrollY + 5) + 'px';
                    pickerEl.style.left = (rect.left + window.scrollX) + 'px';
                    if (overlay) overlay.style.display = 'none';
                }
            }

            function zatvori() {
                pickerEl.style.display = 'none';
                let overlay = document.getElementById('os-dp-overlay');
                if (overlay) overlay.style.display = 'none';
            }

            OS(input).on('click', (e) => {
                e.stopPropagation();
                // Reset na selektovani datum pri otvaranju
                const d = selektovaniDatum || danas;
                prikazanaGodina = d.getFullYear();
                prikazaniMesec = d.getMonth();
                render(); pozicioniraj(); pickerEl.style.display = 'block';
            });

            document.addEventListener('click', (e) => {
                if (!pickerEl.contains(e.target) && e.target !== input) zatvori();
            });
        });
    };
})(window.OS || window.OpenShop);
