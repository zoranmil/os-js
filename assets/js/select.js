/**
 * OPENSHOP FRAMEWORK - UNIVERSAL SELECTS v2.7.7
 * Core utilities & Select component
 */

// 1. Osiguraj da debounce postoji u OS
(function(OS) {
    if (typeof OS === 'undefined') return;
    if (!OS.debounce) {
        OS.debounce = function(f, w) {
            var t; return function() { 
                var c = this, a = arguments;
                clearTimeout(t); 
                t = setTimeout(function() { f.apply(c, a); }, w); 
            };
        };
    }
})(window.OpenShop || window.OS);

// 2. Glavna Selects funkcija
function Selects(options) {
    // ... tvoj kod ...
}

// 3. Metode (create, render, bindEvents...)
Selects.prototype.create = function() { ... };
Selects.prototype.renderujStavkeMenzija = function() { ... };

// 4. Bind events gde koristiš debounce
Selects.prototype.bindEvents = function() {
    const self = this;
    // ...
    if (this.config.issearch) {
        // Sada si siguran da OS.debounce postoji!
        const procesirajPretragu = OS.debounce((val) => {
            if (this.config.ajax) this.izvrsiAjaxPretragu(val);
            else { /* lokalna pretraga */ }
        }, 300);

        this.config.search.addEventListener('input', (e) => procesirajPretragu(e.target.value));
    }
    // ...
};

// 5. Registracija u framework
(function(OS) {
    if (typeof OS === 'undefined' || !OS.prototype) return;
    OS.prototype.Selects = function(options) {
        return this.each(function() {
            new Selects(Object.assign({ option: this }, options));
        });
    };
})(window.OpenShop || window.OS);
