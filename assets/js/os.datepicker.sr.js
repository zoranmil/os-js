(function(OS) {
    'use strict';
    if (!OS) return;

    // Inicijalizujemo skladište za jezike ako već ne postoji
    OS.dateLocales = OS.dateLocales || {};

    OS.dateLocales['sr'] = {
        dani: ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'],
        meseci: [
            'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
            'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
        ],
      
    };
})(window.OpenShop);
