/**
 * OpenShop Slider Cleaner Plugin v1.0.0
 * Automatski uklanja tamne maske sa slajdova i neutrališe range inpute.
 */
(function(OS) {
    'use strict';

    // Provera da li je glavna OpenShop biblioteka uopšte učitana
    if (!OS) {
        console.error("OpenShop Cleaner Plugin: Glavna OS biblioteka nije pronađena!");
        return;
    }

    // Proširujemo funkcionalnost dodavanjem nove metode na OS prototip
    OS.fn.cleanSliderLayout = function(options) {
        // Podrazumevana podešavanja plugina
        var settings = OS.extend({
            removeOverlay: true,      // Skida inline background-color masku
            disableRangeInputs: true, // Isključuje range inpute da ne prljaju formu
            textShadow: '1px 1px 3px rgba(0,0,0,0.8)' // Dodaje senku na tekst radi čitljivosti
        }, options);

        return this.each(function() {
            var $wrapper = OS(this);

            // 1. Korak: Skidanje tamne maske sa slajdova
            if (settings.removeOverlay) {
                // Pronalazimo elemente koji imaju inline stil za pozadinu
                $wrapper.find('[style*="background-color"]').each(function() {
                    // Preko vaše .css() metode resetujemo pozadinu na providnu
                    OS(this).css('backgroundColor', 'transparent');

                    // Ako unutar slajda ima teksta, dodajemo mu senku da ostane čitljiv
                    if (settings.textShadow) {
                        OS(this).find('h1, h2, h3, h4, p, span').css('textShadow', settings.textShadow);
                    }
                });
            }

            // 2. Korak: Neutralisanje range inputa unutar ovog modula/forme
            if (settings.disableRangeInputs) {
                $wrapper.find('input[type="range"]').each(function() {
                    // Dodajemo disabled atribut (vaša .serialize() metoda sa str. 25 ih sada preskače)
                    OS(this).attr('disabled', 'true');
                    // Opciono ih sakrivamo sa ekrana
                    OS(this).css('display', 'none');
                });
            }
        });
    };

})(window.OpenShop || window.OS); // Automatski mapira vašu globalnu promenljivu sa str. 39
