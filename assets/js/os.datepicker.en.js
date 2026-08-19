(function(OS) {
    'use strict';
    if (!OS) return;

    OS.dateLocales = OS.dateLocales || {};

    // Dodajemo engleski
    OS.dateLocales['en'] = {
        dani: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
        meseci: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
    };

    // Dodajemo srpski (da ne bi koristio hardkodovan fallback)
    OS.dateLocales['sr'] = {
        dani: ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'],
        meseci: ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
    };
})(window.OS || window.OpenShop); // IZMENA: Ovde koristimo oba naziva
