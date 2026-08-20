// os-core.js
(function(window) {
    'use strict';

    var OpenShop = function(selector, context) {
        return new OpenShop.fn.init(selector, context);
    };

    OpenShop.fn = OpenShop.prototype = {
        constructor: OpenShop,
        init: function(selector, context) {
            if(!selector) { this.length = 0; return this; }
            if(typeof selector === 'function') {
                if(document.readyState !== 'loading') selector();
                else document.addEventListener('DOMContentLoaded', selector);
                this.length = 0; return this;
            }
            if(selector.nodeType || selector === window || selector === document) {
                this[0] = selector; this.length = 1; return this;
            }
            if(selector instanceof OpenShop) return selector;
            if(Array.isArray(selector) || selector instanceof NodeList || selector instanceof HTMLCollection) {
                this.length = selector.length;
                for(var i = 0; i < selector.length; i++) this[i] = selector[i];
                return this;
            }
            if(typeof selector === 'string') {
                var trimmed = selector.trim();
                if(trimmed.charAt(0) === '<' && trimmed.charAt(trimmed.length - 1) === '>') {
                    var div = document.createElement('div');
                    div.innerHTML = trimmed;
                    var elements = div.childNodes;
                    this.length = elements.length;
                    for(var i = 0; i < elements.length; i++) this[i] = elements[i];
                } else {
                    try {
                        var root = context || document;
                        var elements = root.querySelectorAll(selector);
                        this.length = elements.length;
                        for(var i = 0; i < elements.length; i++) this[i] = elements[i];
                    } catch (e) { this.length = 0; }
                }
            } else { this.length = 0; }
            return this;
        },
        each: function(callback) {
            for(var i = 0; i < this.length; i++) {
                if(callback.call(this[i], i, this[i]) === false) break;
            }
            return this;
        },
        get: function(num) {
            if(num === undefined) {
                var el = [];
                for(var i = 0; i < this.length; i++) el.push(this[i]);
                return el;
            }
            return num < 0 ? this[num + this.length] : this[num];
        },
        is: function(selector) {
            if(!selector) return false;
            for(var i = 0; i < this.length; i++) {
                if(this[i] && typeof this[i].matches === "function") {
                    if(this[i].matches(selector)) return true;
                }
            }
            return false;
        }
    };

    OpenShop.extend = OpenShop.fn.extend = function(obj) {
        for (var key in obj) this[key] = obj[key];
        return this;
    };

    OpenShop.fn.init.prototype = OpenShop.fn;
    window.OpenShop = window.OS = window.OS_JS = OpenShop;
})(window);
// os-manipulation.js
OS.fn.extend({
    live: function(events, selector, callback) {
        const evs = events.split(' ');
        evs.forEach(ev => {
            document.addEventListener(ev, function(e) {
                const target = e.target.closest(selector);
                if (target && document.body.contains(target)) {
                    callback.call(target, e, target);
                }
            }, true);
        });
        return this;
    },
    html: function(htmlString) {
            // 1. Getter mod: ako nema stringa, vrati innerHTML prvog elementa
            if (htmlString === undefined) return this[0] ? this[0].innerHTML : '';

            return this.each(function() {
                // PROVERA: Dozvoljavamo samo običnim elementima (nodeType 1) da primaju decu.
                // Ovo sprečava pucanje ako je selektor npr. OS(document)
                if (!this || this.nodeType !== 1) return;

                // 2. Parsiranje kroz šablon
                var template = document.createElement('template');
                template.innerHTML = htmlString;
                var sadrzaj = template.content;

                // 3. Brutalno čišćenje skripti
                var skripte = sadrzaj.querySelectorAll('script');
                skripte.forEach(s => s.remove());

                // 4. Čišćenje inline događaja (on*) i opasnih href-ova
                var sviElementi = sadrzaj.querySelectorAll('*');
                sviElementi.forEach(el => {
                    var attrs = el.attributes;
                    for (var i = attrs.length - 1; i >= 0; i--) {
                        var attrName = attrs[i].name.toLowerCase();
                        var attrValue = attrs[i].value.toLowerCase();

                        if (attrName.startsWith('on') || attrValue.includes('javascript:')) {
                            el.removeAttribute(attrs[i].name);
                        }
                    }
                });

                // 5. UBRIZGAVANJE (Fix za tvoju grešku)
                this.innerHTML = '';

                // Umesto appendChild(sadrzaj), pomeramo decu jednu po jednu iz fragmenta.
                // DocumentFragment se automatski prazni kako decu prebacujemo u 'this'.
                while (sadrzaj.firstChild) {
                    this.appendChild(sadrzaj.firstChild);
                }
            });
        },
    safeHtml: function(htmlString) {
        if(htmlString === undefined) return this[0] ? this[0].innerHTML : '';
        return this.each(function() { if(this) this.textContent = htmlString; });
    },
    selectedText: function() {
        var el = this[0];
        if (!el || el.tagName !== 'SELECT') return '';
        if (el.selectedIndex === -1) return '';
        return el.options[el.selectedIndex].text;
    },
    escape: function(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    text: function(s) {
        if(s === undefined) return this[0] ? (this[0].innerText || this[0].textContent) : '';
        return this.each(function() { this.innerText = s; });
    },
    val: function(value) {
        if (value === undefined) return this[0] ? this[0].value : '';
        return this.each(function() {
            if (!this) return;
            if (this.tagName === 'SELECT' && this.multiple && Array.isArray(value)) {
                for (var i = 0; i < this.options.length; i++) {
                    this.options[i].selected = (value.indexOf(this.options[i].value) !== -1);
                }
            } else { this.value = value; }
            this.dispatchEvent(new Event('change', { bubbles: true }));
            this.dispatchEvent(new Event('input', { bubbles: true }));
        });
    },
    attr: function(n, v) {
        if(v === undefined) return this[0] ? this[0].getAttribute(n) : null;
        return this.each(function() { if(this) this.setAttribute(n, v); });
    },
    removeAttr: function(n) {
        return this.each(function() { if(this) this.removeAttribute(n); });
    },
    data: function(key, value) {
        if (!key) return undefined;
        var camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        if (value === undefined) {
            var el = this[0]; if (!el) return undefined;
            var val = el.dataset[camelKey];
            try { return JSON.parse(val); } catch(e) { return val; }
        }
        return this.each(function() {
            if (!this) return;
            this.dataset[camelKey] = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
        });
    },
    prop: function(name, value) {
        if (value === undefined) return this[0] ? this[0][name] : undefined;
        return this.each(function() { this[name] = value; });
    }
});
// os-css.js
OS.fn.extend({
  css: function(prop, value) {
          // 1. GETTER: OS(el).css('background')
          if (typeof prop === 'string' && value === undefined) {
              // Proveravamo da li prvi element postoji i da li je tipa Element (1)
              if (!this[0] || this[0].nodeType !== 1) return undefined;
              return window.getComputedStyle(this[0])[prop];
          }

          // 2. SETTER: OS(el).css('color', 'red') ili OS(el).css({color: 'red'})
          return this.each(function() {
              // KLJUČNI FIX: Dozvoljavamo rad samo ako element ima .style property
              if (!this || this.nodeType !== 1 || !this.style) return;

              if (typeof prop === 'object') {
                  // Masovno postavljanje stilova preko objekta
                  for (var key in prop) {
                      if (prop.hasOwnProperty(key)) {
                          this.style[key] = prop[key];
                      }
                  }
              } else {
                  // Pojedinačno postavljanje stila
                  this.style[prop] = value;
              }
          });
      },
    addClass: function(c) {
        if(!c) return this;
        var cls = c.split(/\s+/).filter(Boolean);
        return this.each(function() { if(this.classList) cls.forEach(n => this.classList.add(n)); });
    },
    removeClass: function(c) {
        if(!c) return this;
        var cls = c.split(/\s+/).filter(Boolean);
        return this.each(function() { if(this.classList) cls.forEach(n => this.classList.remove(n)); });
    },
    toggleClass: function(c) { return this.each(function() { if(this) this.classList.toggle(c); }); },
    hasClass: function(c) { return this[0] ? this[0].classList.contains(c) : false; },
    addClassTemporarily: function(c, ms = 1500) {
        return this.each(function() {
            if(!this) return; this.classList.add(c);
            setTimeout(() => this.classList.remove(c), ms);
        });
    }
});
// os-effects.js
OS.fn.extend({
    remove: function() {
        return this.each(function() { if(this && this.parentNode) this.parentNode.removeChild(this); });
    },
    empty: function() {
        return this.each(function() { if(this) this.innerHTML = ""; });
    },
    hide: function() {
        return this.each(function() { this.style.display = 'none'; });
    },
    show: function(displayType) {
        return this.each(function() { this.style.display = displayType || 'block'; });
    },
    toggle: function(displayType) {
        return this.each(function() {
            if (window.getComputedStyle(this).display === 'none') { this.style.display = displayType || 'block'; }
            else { this.style.display = 'none'; }
        });
    },
    fadeIn: function(ms = 300, cb) {
        return this.each(function() {
            if(this._fT) clearTimeout(this._fT);
            this.style.removeProperty('transition');
            if (window.getComputedStyle(this).display === 'none') { this.style.opacity = '0'; this.style.display = 'block'; }
            var self = this;
            setTimeout(function() {
                self.style.transition = 'opacity ' + ms + 'ms ease';
                self.style.opacity = '1';
                self._fT = setTimeout(function() { if(cb) cb.call(self); }, ms);
            }, 20);
        });
    },
    fadeOut: function(ms = 300, cb) {
        return this.each(function() {
            if(this._fT) clearTimeout(this._fT);
            this.style.transition = 'opacity ' + ms + 'ms ease';
            this.style.opacity = '0';
            var self = this;
            this._fT = setTimeout(function() { self.style.display = 'none'; if(cb) cb.call(self); }, ms);
        });
    },
    slideDown: function(ms = 300, cb) {
        return this.each(function() {
            if(this._sT) clearTimeout(this._sT);
            this.style.removeProperty('display');
            var d = window.getComputedStyle(this).display;
            if(d === 'none') d = 'block';
            this.style.display = d; this.style.height = 'auto';
            var h = this.offsetHeight;
            this.style.height = '0px'; this.style.overflow = 'hidden';
            this.style.transition = `height ${ms}ms ease`;
            this.offsetHeight;
            this.style.height = h + 'px';
            var self = this;
            this._sT = setTimeout(function() {
                self.style.removeProperty('height');
                self.style.removeProperty('overflow');
                if(cb) cb.call(self);
            }, ms);
        });
    },
    slideUp: function(ms = 300, cb) {
        return this.each(function() {
            if(this._sT) clearTimeout(this._sT);
            this.style.height = this.offsetHeight + 'px';
            this.style.overflow = 'hidden';
            this.style.transition = `height ${ms}ms ease`;
            this.offsetHeight;
            this.style.height = '0px';
            var self = this;
            this._sT = setTimeout(function() {
                self.style.display = 'none';
                self.style.removeProperty('height');
                if(cb) cb.call(self);
            }, ms);
        });
    },
    find: function(s) {
        var res = [];
        this.each(function() {
            var els = this.querySelectorAll(s);
            for(var i = 0; i < els.length; i++) if(res.indexOf(els[i]) === -1) res.push(els[i]);
        });
        return OpenShop(res);
    },
    closest: function(s) {
        var res = [];
        this.each(function() {
            if (!this.closest) return;
            var el = this.closest(s);
            if (el && res.indexOf(el) === -1) res.push(el);
        });
        return OpenShop(res);
    },
    parent: function() {
        var p = [];
        this.each(function() { if(this && this.parentNode && p.indexOf(this.parentNode) === -1) p.push(this.parentNode); });
        return OpenShop(p);
    },
    next: function(selector) {
        var res = [];
        this.each(function() {
            var el = this.nextElementSibling;
            if (el && (!selector || el.matches(selector))) {
                if (res.indexOf(el) === -1) res.push(el);
            }
        });
        return OpenShop(res);
    },

    // Vraća prvi prethodni element
    prev: function(selector) {
        var res = [];
        this.each(function() {
            var el = this.previousElementSibling;
            if (el && (!selector || el.matches(selector))) {
                if (res.indexOf(el) === -1) res.push(el);
            }
        });
        return OpenShop(res);
    },

    // Vraća SVE sledeće elemente u nizu
    nextAll: function(selector) {
        var res = [];
        this.each(function() {
            var el = this.nextElementSibling;
            while (el) {
                if (!selector || el.matches(selector)) {
                    if (res.indexOf(el) === -1) res.push(el);
                }
                el = el.nextElementSibling;
            }
        });
        return OpenShop(res);
    },
    forEach: function(callback) {
        // Koristimo standardnu Array.prototype.forEach metodu nad elementima našeg objekta
        Array.prototype.forEach.call(this, callback);
        return this; // Vraćamo "this" radi ulančavanja (Method Chaining)
    },
    // Vraća SVE prethodne elemente u nizu
    prevAll: function(selector) {
        var res = [];
        this.each(function() {
            var el = this.previousElementSibling;
            while (el) {
                if (!selector || el.matches(selector)) {
                    if (res.indexOf(el) === -1) res.push(el);
                }
                el = el.previousElementSibling;
            }
        });
        return OpenShop(res);
    },
    siblings: function() {
        var s = []; var el = this[0];
        if (!el || !el.parentNode) return OpenShop([]);
        var child = el.parentNode.firstChild;
        while (child) {
            if (child.nodeType === 1 && child !== el) s.push(child);
            child = child.nextSibling;
        }
        return OpenShop(s);
    },
    eq: function(i) { return OpenShop(i < 0 ? this[i + this.length] : this[i]); }
});
// os-events.js
OS.fn.extend({
    on: function(ev, sel, fn) {
        if(typeof sel === 'function') { fn = sel; sel = null; }
        return this.each(function() {
            this.addEventListener(ev, function(e) {
                if(!sel) fn.call(this, e);
                else {
                    var t = e.target.closest(sel);
                    if(t && this.contains(t)) fn.call(t, e);
                }
            });
        });
    },
    before: function(a) {
            return this.each(function() {
                if (!this.parentNode) return;
                if (typeof a === "string") this.insertAdjacentHTML('beforebegin', a);
                else this.parentNode.insertBefore(a instanceof OpenShop ? a[0] : a, this);
            });
        },
    delay: function(ms, cb) {
                return this.each(function() {
                    setTimeout(() => cb.call(this), ms);
                });
         },
    bind: function(ev, sel, fn) { return this.on(ev, sel, fn); },
    off: function(ev, fn) { return this.each(function() { this.removeEventListener(ev, fn); }); },
    one: function(ev, sel, fn) {
        if(typeof sel === 'function') { fn = sel; sel = null; }
        return this.each(function() {
            var self = this;
            var handler = function(e) {
                self.removeEventListener(ev, handler);
                if(!sel) fn.call(self, e);
                else {
                    var t = e.target.closest(sel);
                    if(t && self.contains(t)) fn.call(t, e);
                }
            };
            this.addEventListener(ev, handler);
        });
    },
    trigger: function(ev, data) {
        return this.each(function() {
            var e = document.createEvent('CustomEvent');
            e.initCustomEvent(ev, true, true, data);
            this.dispatchEvent(e);
        });
    },
    append: function(a) {
        return this.each(function() {
            if (typeof a === "string") this.insertAdjacentHTML('beforeend', a);
            else this.appendChild(a instanceof OpenShop ? a[0] : a);
        });
    },
    prepend: function(a) {
        return this.each(function() {
            if (typeof a === "string") this.insertAdjacentHTML('afterbegin', a);
            else this.insertBefore(a instanceof OpenShop ? a[0] : a, this.firstChild);
        });
    },
    after: function(a) {
        return this.each(function() {
            if (!this.parentNode) return;
            if (typeof a === "string") this.insertAdjacentHTML('afterend', a);
            else this.parentNode.insertBefore(a instanceof OpenShop ? a[0] : a, this.nextSibling);
        });
    }
});
// os-utilities.js

OS.fn.extend({
  bs: function(plugin, action) {
      return this.each(function() {
          if (window.bootstrap && window.bootstrap[plugin]) {
              var instance = window.bootstrap[plugin].getOrCreateInstance(this);
              if (action) instance[action]();
          }
      });
  },
  loading: function(isLoading = true, html = null) {
      return this.each(function() {
          var $el = OS(this);
          if (isLoading) {
              this._oldHtml = $el.html(); // Pamti šta je pisalo (npr. "Kupi")
              this.disabled = true;
              $el.html(html || '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...');
          } else {
              this.disabled = false;
              if (this._oldHtml) $el.html(this._oldHtml); // Vraća stari tekst
          }
      });
    } ,
    serialize: function() {
        if (!this[0] || this[0].tagName !== 'FORM') return "";
        return new URLSearchParams(new FormData(this[0])).toString();
    },
    serializeObject: function() {
        var obj = {};
        this.each(function() {
            if (this.tagName !== 'FORM') return;
            var formData = new FormData(this);
            formData.forEach(function(value, key) {
                if (obj[key] !== undefined) {
                    if (!Array.isArray(obj[key])) { obj[key] = [obj[key]]; }
                    obj[key].push(value);
                } else { obj[key] = value; }
            });
        });
        return obj;
    },
    serializeFormData: function() {
        if (!this[0] || this[0].tagName !== 'FORM') return new FormData();
        return new FormData(this[0]);
    },
    modal: function(a) {
        return this.each(function() { if(window.bootstrap) bootstrap.Modal.getOrCreateInstance(this)[a](); });
    }
});

// Statičke metode klase
OS.param = function(obj, prefix) {
    var pairs = [];
    for(var key in obj) {
        if(obj.hasOwnProperty(key)) {
            var k = prefix ? prefix + "[" + key + "]" : key;
            var v = obj[key];
            if(v !== null && typeof v === "object") pairs.push(OpenShop.param(v, k));
            else if(v !== undefined) pairs.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
    }
    return pairs.filter(Boolean).join("&");
};

OS.ajax = function(opt) {
    var url = opt.url,
        method = (opt.type || opt.method || 'GET').toUpperCase();

    var fOpt = {
        method: method,
        headers: opt.headers || {}
    };

    if(method === 'GET' && opt.data) {
        url += (url.indexOf('?') === -1 ? '?' : '&') + this.param(opt.data);
    }

    if(method === 'POST' && opt.data) {
        if(opt.data instanceof FormData) {
            fOpt.body = opt.data;
        } else {
            if (!fOpt.headers['Content-Type']) {
                fOpt.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            fOpt.body = typeof opt.data === 'object' ? this.param(opt.data) : opt.data;
        }
    }

    // Kreiramo fetch promise
    var request = fetch(url, fOpt).then(r => {
        if (!r.ok) throw r;
        var cType = r.headers.get('Content-Type') || '';
        return (opt.dataType === 'json' || cType.includes('json')) ? r.json() : r.text();
    });

    // Podrška za stare success/error callback-ove unutar opt
    if (opt.success) request.then(opt.success);
    if (opt.error) request.catch(opt.error);

    // DODAVANJE .done, .fail, .always (jQuery style)
    request.done = function(fn) {
        request.then(fn);
        return request;
    };
    request.fail = function(fn) {
        request.catch(fn);
        return request;
    };
    request.always = function(fn) {
        request.finally(fn);
        return request;
    };

    return request;
};
OS.fn.extend({
    // Širina elementa (uključujući padding)
    width: function() {
        return this[0] ? this[0].clientWidth : 0;
    },

    // Visina elementa
    height: function() {
        return this[0] ? this[0].clientHeight : 0;
    },

    // Pozicija u odnosu na celu stranicu (veoma bitno!)
    offset: function() {
        if (!this[0]) return { top: 0, left: 0 };
        var rect = this[0].getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset
        };
    },

    // Skrolovanje do elementa ili postavljanje scroll pozicije
    scrollTop: function(val) {
        if (val === undefined) return this[0] === window ? window.pageYOffset : this[0].scrollTop;
        return this.each(function() {
            if (this === window) window.scrollTo(window.scrollX, val);
            else this.scrollTop = val;
        });
    }
});
OS.isArray = (v) => Array.isArray(v);
OS.isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// Obavezno osveži i ove skraćene metode da bi vraćale taj novi request objekt
OS.get = function(u, d, s) {
    if (typeof d === 'function') { s = d; d = null; }
    return this.ajax({ url: u, type: 'GET', data: d, success: s });
};

OS.post = function(u, d, s) {
    if (typeof d === 'function') { s = d; d = null; }
    return this.ajax({ url: u, type: 'POST', data: d, success: s });
};

OS.postJSON = function(u, d, s, e) {
    return this.ajax({
        url: u,
        type: 'POST',
        data: JSON.stringify(d),
        success: s,
        error: e,
        headers: {'Content-Type':'application/json'}
    });
};
OS.debounce = function(f, w) {
    var t; return function() { clearTimeout(t); t = setTimeout(() => f.apply(this, arguments), w); };
};

OS.isJson = function(str) {
    if(typeof str !== 'string' || str.trim() === '') return false;
    try { return JSON.parse(str) !== null; } catch (e) { return false; }
};

OS.Event = function(src, props) {
    if(typeof src === 'string') {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent(src, true, true, props);
        return event;
    }
    return src;
};

OS.Model = function(data, bindings) {
    const self = this;
    this.data = data;
    this.bindings = bindings; // Mapa selektora i ključeva

    return new Proxy(data, {
        set(target, key, value) {
            target[key] = value;

            // Kada se podatak promeni, automatski ažuriraj DOM
            if (self.bindings[key]) {
                const selector = self.bindings[key];
                const $el = OS(selector);

                if ($el.is('input, textarea, select')) {
                    $el.val(value);
                } else {
                    $el.html(value);
                }

                // Triggeruj custom event ako treba (npr. za kalkulacije)
                $el.trigger('os:model:updated', { key: key, value: value });
            }
            return true;
        }
    });
};

// Dodatak za automatsko vezivanje (Two-way binding)
OS.fn.extend({
    bindModel: function(model, key) {
        return this.each(function() {
            const $el = OS(this);
            // Slušaj promene u polju i piši u model
            $el.on('input change', function() {
                model[key] = $el.val();
            });
        });
    }
});
/**
 * OPENSHOP FRAMEWORK - UTILITY HELPERS v5.2.0
 * Fokus: JSON-to-HTML Bridge, Responsive Images & Templates
 */

// 🚀 DODAVANJE STATIČKIH METODA NA OS OBJEKAT
OS.extend(OS, {

    // 1. DŽEJSON MENADŽER: Siguran parse i stringify
    json: {
        parse: (s) => { try { return JSON.parse(s); } catch(e) { return {}; } },
        stringify: (o) => JSON.stringify(o)
    },

    // 2. TEMPLATE ENGINE (v1.0): Menja [[ključ]] sa vrednošću
    // IQ 185: Isto razmišljanje kao tvoja PHP Template klasa
    template: function(str, data) {
        return str.replace(/\[\[(\w+)\]\]/g, (match, key) => {
            return data[key] !== undefined ? data[key] : '';
        });
    },

    // 3. THUMBNAIL HELPER: Izvlači najbržu sliku iz JSON-a
    thumb: function(jsonData) {
        const d = (typeof jsonData === 'string') ? this.json.parse(jsonData) : jsonData;
        // Red prioriteta: small -> gallery_thumb -> mobile
        return SITE_ORG_URL + (d.small?.path || d.gallery_thumb?.path || d.mobile?.path || 'assets/site/images/no-image.webp');
    },

    // 4. PICTURE HELPER: Generiše punokrvni responzivni WebP tag
    // Hirurški vinklovano za mobilne (800px) i desktop (1920px)
    picture: function(jsonData, alt = '', className = 'img-fluid') {
        const d = (typeof jsonData === 'string') ? this.json.parse(jsonData) : jsonData;
        if (!d.original) return `<img src="${SITE_ORG_URL}assets/site/images/no-image.webp" class="${className}">`;

        const escAlt = OS().escape(alt);

        // Vinklovanje putanja (WebP vs Original)
        const mW = d.mobile?.webp || d.mobile?.path;
        const mO = d.mobile?.path;
        const dW = d.desktop?.webp || d.desktop?.path;
        const dO = d.desktop?.path;

        return `
            <picture>
                <source media="(max-width: 768px)" srcset="${SITE_ORG_URL}${mW}" type="image/webp">
                <source media="(max-width: 768px)" srcset="${SITE_ORG_URL}${mO}">
                <source srcset="${SITE_ORG_URL}${dW}" type="image/webp">
                <img src="${SITE_ORG_URL}${dO}" alt="${escAlt}" class="${className}" loading="lazy">
            </picture>
        `.replace(/>\s+</g, '><').trim(); // Minify u letu
    }
});
