/**
 * =========================================================================
 * OPENSHOP (OS) VALIDATOR PLUGIN - TEHNIČKA DOKUMENTACIJA & API v1.2.0
 * =========================================================================
 * Copyright (c) 2026 Zoran Milićević & Gemini AI (Google Architectural Assistant)
 * License: AGPL-3.0-or-later
 *
 * 1. HTML / DOM STRUKTURA ZA POLJA I PRIKAZ GREŠAKA:
 * Svako polje koje se validira mora imati definisan "name" atribut.
 * Plugin automatski podržava tri različita načina za prikazivanje greške:
 *
 * A) Bootstrap 5/6 Standardni Način:
 *    <div class="mb-3">
 *        <input type="text" name="product_name" class="form-control">
 *        <div class="invalid-feedback"></div>
 *    </div>
 *
 * B) OpenShop Univerzalni Način (Preko data-for atributa):
 *    <div class="form-group">
 *        <input type="text" name="product_sku">
 *        <span class="error-poruka" data-for="product_sku"></span>
 *    </div>
 *
 * C) OpenShop Custom Komponente (Selects & TagsInput):
 *    Komponente automatski preuzimaju crveni okvir (border-color), a element za
 *    ispis greške se postavlja odmah ispod kontejnera komponente:
 *    <select name="gender" multiple id="pol"></select>
 *    <span class="error-poruka" data-for="gender"></span>
 *
 * =========================================================================
 * 2. JAVASCRIPT INICIJALIZACIJA (API POZIV):
 *
 * OS('#productForm').validateForm({
 *     'product_name': 'required|min:3|max:100',
 *     'product_sku':  'required|numeric',
 *     'product_tags': 'required' // Podržava naš novi TagsInput
 * }, function(cistiPodaci) {
 *     // [Callback 1] - Izvršava se ako je forma 100% VALIDNA.
 *     // Ovde šalješ podatke na server preko tvog frameworka:
 *     OS.postJSON('/noviajax/save-product.php', cistiPodaci, function(odgovor) {
 *          Notifymsg('Uspeh', 'Proizvod je uspešno sačuvan!');
 *     });
 * }, function(sveGreske) {
 *     // [Callback 2] - Opciono: Izvršava se ako ima grešaka na formi.
 *     console.log('Validacija nije prošla. Spisak grešaka:', sveGreske);
 * });
 *
 * =========================================================================
 * 3. DOSTUPNA VALIDACIONA PRAVILA:
 *
 *   • required   -> Polje ne sme biti prazno. Kod "multiple" select-a proverava
 *                   da li je izabrana barem jedna stavka iz liste.
 *   • email      -> Polje mora biti u formatu validne email adrese (sadrži @).
 *   • numeric    -> Polje sme da sadrži isključivo numeričke vrednosti (brojeve).
 *   • min:broj   -> Minimalni dozvoljeni broj karaktera u polju (npr. min:3).
 *   • max:broj   -> Maksimalni dozvoljeni broj karaktera u polju (npr. max:50).
 *
 * =========================================================================
 */

(function(OS) {
    'use strict';
    if (!OS) return;

    // 1. AUTOMATSKO UBACIVANJE CSS STILOVA ZA GREŠKE
    (function injectStyles() {
        var styleId = 'os-validator-styles';
        if (document.getElementById(styleId)) return;
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Kompatibilnost i dodatak za Bootstrap .is-invalid klasu */
            .is-invalid {
                border-color: #dc3545 !important;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://w3.org' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5' stroke-width='1'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4v3.6h-.4zM6 8.4a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2z'/%3e%3c/svg%3e") !important;
                background-repeat: no-repeat !important;
                background-position: right calc(0.375em + 0.1875rem) center !important;
                background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem) !important;
            }
            /* Podrška za farbanje naših custom OpenShop komponenti u crveno */
            .is-invalid + .form-control.d-flex.flex-wrap,
            .is-invalid + .select-container button.form-select {
                border-color: #dc3545 !important;
                box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25) !important;
            }
            .is-invalid:focus {
                border-color: #dc3545 !important;
                box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25) !important;
            }
            /* Stil za našu .error-poruka klasu */
            .error-poruka {
                display: none;
                width: 100%;
                margin-top: 0.25rem;
                font-size: 0.875em;
                color: #dc3545;
                font-weight: 500;
            }
            /* Automatski prikaži poruku ako je prethodni nativni ili skriveni input nevalidan */
            .is-invalid ~ .error-poruka,
            .is-invalid + .error-poruka,
            .is-invalid + .select-container ~ .error-poruka,
            .is-invalid + .form-control ~ .error-poruka {
                display: block !important;
            }
        `;
        document.head.appendChild(style);
    })();

    // 2. LOGIKA ZA PROVERU PRAVILA
    function proveriPravilo(vrednost, pravilo, parametar, poljeIme) {
        // Popravljena slovna greška iz PDF-a (sada je pravilno poljeIme)
        var lepoIme = poljeIme.replace('_', ' ');

        // Ako je vrednost niz (od multiple select-a), pretvaramo u prosto polje za proveru praznine
        var proveraVrednosti = Array.isArray(vrednost) ? (vrednost.length > 0 ? 'ima' : '') : vrednost;

        switch (pravilo) {
            case 'required':
                if (proveraVrednosti === '') {
                    return _P('The field') + ' ' + lepoIme + ' ' + _P('is required.');
                }
                break;
            case 'email':
                if (proveraVrednosti !== '' && proveraVrednosti.indexOf('@') === -1) {
                    return _P('The email address is not valid.');
                }
                break;
            case 'min':
                if (proveraVrednosti !== '' && proveraVrednosti.length < parseInt(parametar, 10)) {
                    return _P('Minimum length is') + ' ' + parametar + ' ' + _P('characters.');
                }
                break;
            case 'max':
                if (proveraVrednosti !== '' && proveraVrednosti.length > parseInt(parametar, 10)) {
                    return _P('Maximum length is') + ' ' + parametar + ' ' + _P('characters.');
                }
                break;
            case 'numeric':
                if (proveraVrednosti !== '' && isNaN(Number(proveraVrednosti))) {
                    return _P('The field must be a number.');
                }
                break;
        }
        return null;
    }

    // 3. PROŠIRENJE OPENSHOP BIBLIOTEKE
    OS.fn.extend({
        validateForm: function(pravila, onValid, onInvalid) {
            return this.each(function() {
                var $forma = OS(this);
                if (this.tagName !== 'FORM') return;

                $forma.on('submit', function(e) {
                    e.preventDefault(); // Zaustavi standardno slanje forme

                    var greske = {};
                    var podaci = {};
                    var imaGresaka = false;

                    // Resetovanje starih grešaka i crvenih okvira pre nove provere
                    $forma.find('input, textarea, select').removeClass('is-invalid');
                    $forma.find('.error-poruka, .invalid-feedback').html('');

                    // Prolazak kroz sva zadata pravila
                    for (var polje in pravila) {
                        if (!pravila.hasOwnProperty(polje)) continue;

                        var $element = $forma.find('[name="' + polje + '"]');
                        if (!$element.length) continue;

                        // BEZBEDNA PROVERA: Čistimo samo ako je vrednost tekst (string), ako je niz sačuvaj ga celog
                        var sirovaVrednost = $element.val();
                        var vrednost = (typeof sirovaVrednost === 'string') ? sirovaVrednost.trim() : sirovaVrednost;

                        podaci[polje] = vrednost;

                        // Razbijanje višestrukih pravila (npr. 'required|min:3')
                        var pojedinacnaPravila = pravila[polje].split('|');
                        for (var i = 0; i < pojedinacnaPravila.length; i++) {
                            var pravilo = pojedinacnaPravila[i];
                            var parametar = null;

                            if (pravilo.indexOf(':') !== -1) {
                                var delovi = pravilo.split(':');
                                pravilo = delovi[0];
                                parametar = delovi[1];
                            }

                            var poruka = proveriPravilo(vrednost, pravilo, parametar, polje);
                            if (poruka) {
                                imaGresaka = true;
                                if (!greske[polje]) greske[polje] = [];
                                greske[polje].push(poruka);
                            }
                        }

                        // Ako polje ima grešku, dodaj is-invalid i upiši tekst
                        if (greske[polje]) {
                            $element.addClass('is-invalid');

                            // Traženje kontejnera za ispis greške (univerzalni ili Bootstrap način)
                            var $errorSpan = $forma.find('.error-poruka[data-for="' + polje + '"], [name="' + polje + '"] ~ .invalid-feedback');

                            // Specijalni dodatak za naše custom komponente: ako je sakriven, traži poruku iza njegovog kontejnera
                            if (!$errorSpan.length) {
                                $errorSpan = $forma.find('[name="' + polje + '"] ~ .select-container ~ .error-poruka');
                            }

                            if ($errorSpan.length) {
                                $errorSpan.html(greske[polje][0]); // Upisujemo prvu grešku iz niza
                                $errorSpan.css('display', 'block'); // Eksplicitno je prikazujemo
                            }
                        }
                    }

                    // Slanje rezultata nazad kroz callback funkcije
                    if (imaGresaka) {
                        if (typeof onInvalid === 'function') onInvalid.call(this, greske);
                    } else {
                        if (typeof onValid === 'function') onValid.call(this, podaci);
                    }
                });
            });
        }
    });
})(window.OpenShop || window.OS);
