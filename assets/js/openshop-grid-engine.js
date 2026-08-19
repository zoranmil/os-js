/**
 * OPENSHOP GRID ENGINE - FULL MODULE
 * Arhitektura: Zoran Milićević & Google AI
 * Karakteristike: Debounce, AbortController, Event Delegation
 */
 /**
  * ============================================================================
  * 🏁 OPENSHOP GRID ENGINE - FULL MODULE (v4.8 Final)
  * Arhitektura: Zoran Milićević & Google AI
  * Karakteristike: Debounce, AbortController, Event Delegation, Multi-Instance Safe
  * ============================================================================
  */
 (function(OS) {
     'use strict';

     OS.fn.gridFilter = function(options) {
         const settings = OS.extend({
             url: '',            // PHP Izvor podataka
             target: '',         // CSS selektor kontejnera (npr. '#tabela-proizvoda')
             wait: 400,          // Debounce pauza u ms
             extraFilters: null, // Funkcija koja vraća dodatne parametre {cat: 1, status: 'ok'}
             onSuccess: null     // Callback nakon svakog osvežavanja
         }, options);

         if (!settings.url || !settings.target) return this;

         const $target = OS(settings.target);

         /**
          * EVENT DELEGACIJA - Slušamo klikove na nivou kontejnera (Globalno za ceo plugin)
          * Pošto delegacija radi preko krovnog kontejnera, može ostati ovde jer preusmerava
          * događaj na aktivni element preko custom trigera ako zatreba, ali da bismo znali
          * koji input je pokrenuo promenu, vezujemo state direktno na DOM element meta.
          */

         // Klik na broj stranice
         $target.on('click', '.os-page-link', function(e) {
             e.preventDefault();
             const p = this.getAttribute('data-page');
             const activeInput = document.querySelector('[data-os-grid-active="true"]') || document.querySelector('input[type="text"]');
             if (p && activeInput) {
                 activeInput.dispatchEvent(new CustomEvent('goToPage', { detail: p }));
             }
         });

         // Klik na zaglavlje kolone za sortiranje
         $target.on('click', 'th[data-sort]', function() {
             const s = this.getAttribute('data-sort');
             const activeInput = document.querySelector('[data-os-grid-active="true"]') || document.querySelector('input[type="text"]');
             if (s && activeInput) {
                 activeInput.dispatchEvent(new CustomEvent('changeSort', { detail: s }));
             }
         });

         /**
          * POKRETANJE INSTANCI (Bezbedno za više nezavisnih gridova na istoj stranici)
          */
         return this.each(function() {
             const inputEl = this;
             const $input = OS(inputEl);
             let controller = null; // Izolovani kontroler za prekidanje starih AJAX zahteva ove instance

             // Izolovano inicijalno stanje za SVAKI input element pojedinačno
             let state = {
                 search: '',
                 page: 1,
                 sort: 'id',
                 order: 'DESC'
             };

             // Oznaka na elementu koja pomaže delegaciji da zna ko upravlja gridom
             inputEl.setAttribute('data-os-grid-active', 'true');

             /**
              * Glavna funkcija za povlačenje podataka (Fetch) - Izolovana
              */
             const updateGrid = () => {
                 // 1. Prekini prethodni zahtev ove instance ako još traje (Race Condition Protection)
                 if (controller) controller.abort();
                 controller = new AbortController();

                 // 2. Skupljanje svih parametara
                 let params = {
                     search: $input.val() ? $input.val().trim() : '',
                     page: state.page,
                     sort: state.sort,
                     order: state.order
                 };

                 // Dodaj eksterne filtere (npr. iz Select boxova)
                 if (typeof settings.extraFilters === 'function') {
                     params = OS.extend(params, settings.extraFilters.call(inputEl));
                 }

                 // 3. Vizuelni feedback preko tvog Notify Engine-a
                 if (OS.notify && typeof OS.notify.loading === 'function') {
                     OS.notify.loading(_P('Učitavanje...'));
                 }
                 $target.css('opacity', '0.5');

                 // 4. Slanje zahteva preko tvog OS.ajax drajvera
                 OS.ajax({
                     url: settings.url,
                     method: 'GET',
                     data: params,
                     signal: controller.signal, // Prosleđujemo signal za prekid
                     success: (response) => {
                         $target.html(response);
                         $target.css('opacity', '1');

                         if (OS.notify && typeof OS.notify.hide === 'function') {
                             OS.notify.hide();
                         }

                         if (settings.onSuccess) settings.onSuccess.call(inputEl, response);
                     },
                     error: (status, type, err) => {
                         if (type === 'abort') return; // Ignoriši ako smo sami prekinuli zahtev sa .abort()
                         $target.css('opacity', '1');
                         if (OS.notify && typeof OS.notify.error === 'function') {
                             OS.notify.error(_P('Greška pri komunikaciji sa serverom.'));
                         }
                     }
                 });
             };

             // Optimizovana izolovanu pretraga dok korisnik kuca (Debounce vezan za instancu)
             const debouncedSearch = OS.debounce(() => {
                 state.page = 1;
                 updateGrid();
             }, settings.wait);

             // Slušaoci za interne custom događaje (povezivanje delegacije sa izolovanim stanjem)
             inputEl.addEventListener('goToPage', (e) => {
                 state.page = parseInt(e.detail, 10);
                 updateGrid();
             });

             inputEl.addEventListener('changeSort', (e) => {
                 const s = e.detail;
                 if (state.sort === s) {
                     state.order = (state.order === 'DESC') ? 'ASC' : 'DESC';
                 } else {
                     state.sort = s;
                     state.order = 'ASC';
                 }
                 state.page = 1;
                 updateGrid();
             });

             // Osluškuj kucanje (input event pokriva i kucanje i brisanje i paste akcije)
             inputEl.addEventListener('input', debouncedSearch);

             // Dozvoli drugim elementima (npr. kategorijama) da osveže ovaj konkretan grid
             inputEl.addEventListener('triggerSearch', () => {
                 state.page = 1;
                 updateGrid();
             });

             // Prvo učitavanje pri otvaranju stranice za ovu instancu
             updateGrid();
         });
     };

 })(window.OS);

/*
Kako ovo inicijalizuješ na stranici (kad ustaneš):
code JavaScript

OS(function() {
    // Podesi grid na polju za pretragu
    OS('#search-field').gridFilter({
        url: 'get_data.php',
        target: '#table-container', // Ovde se upisuje HTML iz PHP-a
        extraFilters: function() {
            return {
                category_id: OS('#category-select').val(),
                status: OS('#status-select').val()
            };
        }
    });

    // Ako se promeni bilo koji select, samo "okini" pretragu na glavnom polju
    OS('#category-select, #status-select').on('change', function() {
        OS('#search-field').trigger('triggerSearch');
    });
});
*/
