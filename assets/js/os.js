(function(window)
{
   'use strict';

   var OpenShop = function(selector)
   {
      return new OpenShop.fn.init(selector);
   };

   OpenShop.fn = OpenShop.prototype = {
      constructor: OpenShop,

      init: function(selector)
      {
         if(!selector)
         {
            this.length = 0;
            return this;
         }
         if(typeof selector === 'function')
         {
            if(document.readyState !== 'loading')
            {
               selector();
            }
            else
            {
               document.addEventListener('DOMContentLoaded', selector);
            }
            this.length = 0;
            return this;
         }
         if(selector.nodeType || selector === window || selector === document)
         {
            this[0] = selector;
            this.length = 1;
            return this;
         }
         if(selector instanceof OpenShop)
         {
            return selector;
         }
         if(Array.isArray(selector) || selector instanceof NodeList || selector instanceof HTMLCollection)
         {
            this.length = selector.length;
            for(var i = 0; i < selector.length; i++)
            {
               this[i] = selector[i];
            }
            return this;
         }
         if(typeof selector === 'string')
         {
            var trimmed = selector.trim();
            if(trimmed.charAt(0) === '<' && trimmed.charAt(trimmed.length - 1) === '>')
            {
               var div = document.createElement('div');
               div.innerHTML = trimmed;
               var elements = div.childNodes;
               this.length = elements.length;
               for(var i = 0; i < elements.length; i++)
               {
                  this[i] = elements[i];
               }
            }
            else
            {
               try
               {
                  var elements = document.querySelectorAll(selector);
                  this.length = elements.length;
                  for(var i = 0; i < elements.length; i++)
                  {
                     this[i] = elements[i];
                  }
               }
               catch (e)
               {
                  this.length = 0;
               }
            }
         }
         else
         {
            this.length = 0;
         }
         return this;
      },

      each: function(callback)
      {
          for(var i = 0; i < this.length; i++)
          {

              if(callback.call(this[i], i, this[i]) === false) break;
          }
          return this;
      },

      html: function(htmlString)
      {
      if(htmlString === undefined) return this[0] ? this[0].innerHTML : '';
      return this.each(function()
      {
      if(!this) return;

      // Upisujemo HTML strukturu u trenutni element
      this.innerHTML = htmlString;

      // Pronalazimo sve <script> tagove unutar ubačenog sadržaja
      var scripts = this.querySelectorAll('script');

      for(var i = 0; i < scripts.length; i++)
      {
      var oldScript = scripts[i];
      var scriptCode = oldScript.textContent || oldScript.innerText || '';

      if(scriptCode.trim().length > 0)
      {
      try
      {
      // Automatski mapiramo lokalne funkcije u globalni window prostor
      var globalCode = scriptCode.replace(/function\s+([a-zA-Z0-9_]+)\s*\(/g, 'window.$1 = function(');
      window.eval(globalCode);
      }
      catch(e)
      {
      console.error("Greška u OS.html() globalnoj evaluaciji skripte:", e);
      }
      }

      // Brišemo iskorišćeni tag da ne prlja DOM
      if (oldScript.parentNode) oldScript.parentNode.removeChild(oldScript);
      }
      });
      },


      text: function(textString)
      {
         if(textString === undefined)
         {
            if(!this[0]) return '';
            return 'innerText' in this[0] ? this[0].innerText : this[0].textContent;
         }
         return this.each(function()
         {
            if(this)
            {
               if('innerText' in this)
               {
                  this.innerText = textString;
               }
               else
               {
                  this.textContent = textString;
               }
            }
         });
      },

      val: function(value)
      {
         if(value === undefined) return this[0] ? this[0].value : '';
         return this.each(function()
         {
            if(this) this.value = value;
         });
      },

      attr: function(name, value)
      {
         if(value === undefined) return this[0] ? this[0].getAttribute(name) : null;
         return this.each(function()
         {
            if(this) this.setAttribute(name, value);
         });
      },

      removeAttr: function(name)
      {
         return this.each(function()
         {
            if(this) this.removeAttribute(name);
         });
      },

      // --- PAMETNO DODATE METODE (Prvi blok) ---
      show: function() {
          return this.each(function() {
              if(this) this.style.display = '';
          });
      },

      // 2. Unapređena hide metoda
      hide: function() {
          return this.each(function() {
              if(this) this.style.display = 'none';
          });
      },

      remove: function()
      {
         return this.each(function()
         {
            if(this && this.parentNode)
            {
               this.parentNode.removeChild(this);
            }
         });
      },

      empty: function()
      {
         return this.each(function()
         {
            if(this) this.innerHTML = "";
         });
      },

      get: function(num)
      {
         if(num === undefined)
         {
            var el = [];
            for(var i = 0; i < this.length; i++)
            {
               el.push(this[i]);
            }
            return el;
         }
         return num < 0 ? this[num + this.length] : this[num];
      },

      is: function(selector)
      {
         if(!selector) return false;
         for(var i = 0; i < this.length; i++)
         {
            if(this[i] && typeof this[i].matches === "function")
            {
               if(this[i].matches(selector)) return true;
            }
         }
         return false;
      },

      addClass: function(c)
      {
         if(!c || typeof c !== 'string') return this;
         var classes = c.split(/\s+/).filter(Boolean);
         return this.each(function()
         {
            if(!this || !this.classList) return;
            for(var i = 0; i < classes.length; i++) this.classList.add(classes[i]);
         });
      },

      removeClass: function(c)
      {
         if(!c || typeof c !== 'string') return this;
         var classes = c.split(/\s+/).filter(Boolean);
         return this.each(function()
         {
            if(!this || !this.classList) return;
            for(var i = 0; i < classes.length; i++) this.classList.remove(classes[i]);
         });
      },

      toggleClass: function(className) {
          return this.each(function() {
              if(this) this.classList.toggle(className);
          });
      },
      hasClass: function(className) {
          if (!this[0]) return false;
          return this[0].classList.contains(className);
      },


      css: function(prop, value)
      {
         if(typeof prop === 'string' && value === undefined)
         {
            return this[0] ? window.getComputedStyle(this[0])[prop] : undefined;
         }
         if(typeof prop === 'object')
         {
            return this.each(function()
            {
               if(!this) return;
               for(var key in prop)
               {
                  if(prop.hasOwnProperty(key)) this.style[key] = prop[key];
               }
            });
         }
         return this.each(function()
         {
            if(this) this.style[prop] = value;
         });
      },

      find: function(selector)
      {
         var foundElements = [];
         this.each(function()
         {
            if(!this || !this.querySelectorAll) return;
            var els = this.querySelectorAll(selector);
            for(var i = 0; i < els.length; i++)
            {
               if(foundElements.indexOf(els[i]) === -1) foundElements.push(els[i]);
            }
         });
         return OpenShop(foundElements);
      },
      data: function(key, value) {
          // Ako ne prosledimo ništa, vraćamo undefined
          if (!key) return undefined;

          // 1. ČITANJE PODATKA (Getter) - Ako je prosleđen samo ključ
          if (value === undefined) {
              var el = this[0];
              if (!el) return undefined;

              // Čitamo iz nativnog dataset-a (pretvara npr. "moj-id" u "mojId")
              var camelKey = key.replace(/-([a-z])/g, function(g) { return g[1].toUpperCase(); });
              var dataVal = el.dataset[camelKey];

              // Ako je vrednost JSON (objekat/niz), automatski je parsiramo
              if (OpenShop.isJson(dataVal)) {
                  try { return JSON.parse(dataVal); } catch(e) { return dataVal; }
              }
              return dataVal;
          }

          // 2. UPISIVANJE PODATKA (Setter) - Ako su prosleđeni i ključ i vrednost
          return this.each(function() {
              if (!this) return;
              var camelKey = key.replace(/-([a-z])/g, function(g) { return g[1].toUpperCase(); });

              // Ako upisujemo objekat ili niz, pretvaramo ga u JSON string
              if (typeof value === 'object' && value !== null) {
                  this.dataset[camelKey] = JSON.stringify(value);
              } else {
                  this.dataset[camelKey] = value;
              }
          });
      },
      parent: function()
      {
         var parents = [];
         this.each(function()
         {
            if(this && this.parentNode && parents.indexOf(this.parentNode) === -1)
            {
               parents.push(this.parentNode);
            }
         });
         return OpenShop(parents);
      },

      on: function(event, selector, callback)
      {
         if(typeof selector === 'function')
         {
            callback = selector;
            selector = null;
         }
         return this.each(function()
         {
            if(!this || typeof this.addEventListener !== 'function') return;
            if(!selector)
            {
               this.addEventListener(event, callback);
            }
            else
            {
               this.addEventListener(event, function(e)
               {
                  var targetElement = e.target.closest(selector);
                  if(targetElement && this.contains(targetElement))
                  {
                     callback.call(targetElement, e);
                  }
               });
            }
         });
      },

      off: function(event, callback)
      {
         return this.each(function()
         {
            if(this && typeof this.removeEventListener === 'function')
            {
               this.removeEventListener(event, callback);
            }
         });
      },

      fadeIn: function(duration)
      {
         var ms = duration || 300;
         return this.each(function()
         {
            if(!this) return;
            this.style.removeProperty('transition');
            this.style.opacity = '0';
            this.style.display = 'block';
            var self = this;
            setTimeout(function()
            {
               self.style.transition = 'opacity ' + ms + 'ms ease';
               self.style.opacity = '1';
            }, 10);
         });
      },

      fadeOut: function(duration)
      {
         var ms = duration || 300;
         return this.each(function()
         {
            if(!this) return;
            this.style.transition = 'opacity ' + ms + 'ms ease';
            this.style.opacity = '0';
            var self = this;
            setTimeout(function()
            {
               self.style.display = 'none';
               self.style.removeProperty('transition');
            }, ms);
         });
      },

      slideDown: function(duration)
      {
         var ms = duration || 300;
         return this.each(function()
         {
            if(!this) return;
            this.style.removeProperty('display');
            var display = window.getComputedStyle(this).display;
            if(display === 'none') display = 'block';
            this.style.display = display;

            var height = this.offsetHeight;
            this.style.height = '0px';
            this.style.overflow = 'hidden';
            this.style.transition = 'height ' + ms + 'ms ease, padding ' + ms + 'ms ease, margin ' + ms + 'ms ease';

            var self = this;
            setTimeout(function()
            {
               self.style.height = height + 'px';
            }, 10);

            setTimeout(function()
            {
               self.style.removeProperty('height');
               self.style.removeProperty('overflow');
               self.style.removeProperty('transition');
            }, ms + 10);
         });
      },

      slideUp: function(duration)
      {
         var ms = duration || 300;
         return this.each(function()
         {
            if(!this) return;
            this.style.height = this.offsetHeight + 'px';
            this.style.overflow = 'hidden';
            this.style.transition = 'height ' + ms + 'ms ease, padding ' + ms + 'ms ease, margin ' + ms + 'ms ease';

            var self = this;
            setTimeout(function()
            {
               self.style.height = '0px';
            }, 10);

            setTimeout(function()
            {
               self.style.display = 'none';
               self.style.removeProperty('height');
               self.style.removeProperty('overflow');
               self.style.removeProperty('transition');
            }, ms + 10);
         });
      },

      slideToggle: function(duration)
      {
         return this.each(function()
         {
            if(!this) return;
            if(window.getComputedStyle(this).display === 'none')
            {
               OpenShop(this).slideDown(duration);
            }
            else
            {
               OpenShop(this).slideUp(duration);
            }
         });
      },

      trigger: function(event, extraData)
      {
         return this.each(function()
         {
            if(!this) return;
            var evt;
            if(typeof event === 'string')
            {
               evt = OpenShop.Event(event,
               {
                  detail: extraData
               });
            }
            else
            {
               evt = event;
            }
            this.dispatchEvent(evt);
         });
      },

      modal: function(action)
      {
         return this.each(function()
         {
            if(!this || !window.bootstrap) return;
            var instance = bootstrap.Modal.getOrCreateInstance(this);
            if(instance && typeof instance[action] === 'function') instance[action]();
         });
      },

      append: function(a)
      {
         return this.each(function()
         {
            if(!this) return;
            if(typeof a === "object" && a instanceof OpenShop)
            {
               if(a[0]) this.appendChild(a[0].cloneNode(true));
            }
            else if(typeof a === "object" && (a.nodeType || a instanceof NodeList || a instanceof HTMLCollection))
            {
               if(a.nodeType)
               {
                  this.appendChild(a.cloneNode(true));
               }
               else
               {
                  for(var i = 0; i < a.length; i++) this.appendChild(a[i].cloneNode(true));
               }
            }
            else if(typeof a === "string")
            {
               this.innerHTML += a;
            }
         });
      },

      prepend: function(a)
      {
         return this.each(function()
         {
            if(!this) return;
            if(typeof a === "object" && a instanceof OpenShop)
            {
               if(a[0]) this.insertBefore(a[0].cloneNode(true), this.firstChild);
            }
            else if(typeof a === "object" && (a.nodeType || a instanceof NodeList || a instanceof HTMLCollection))
            {
               if(a.nodeType)
               {
                  this.insertBefore(a.cloneNode(true), this.firstChild);
               }
               else
               {
                  for(var i = a.length - 1; i >= 0; i--) this.insertBefore(a[i].cloneNode(true), this.firstChild);
               }
            }
            else if(typeof a === "string")
            {
               this.innerHTML = a + this.innerHTML;
            }
         });
      },

      after: function(a)
      {
         return this.each(function()
         {
            if(!this || !this.parentNode) return;
            if(typeof a === "object" && a instanceof OpenShop)
            {
               if(a[0]) this.parentNode.insertBefore(a[0].cloneNode(true), this.nextSibling);
            }
            else if(typeof a === "object" && (a.nodeType || a instanceof NodeList || a instanceof HTMLCollection))
            {
               if(a.nodeType)
               {
                  this.parentNode.insertBefore(a.cloneNode(true), this.nextSibling);
               }
               else
               {
                  for(var i = a.length - 1; i >= 0; i--) this.parentNode.insertBefore(a[i].cloneNode(true), this.nextSibling);
               }
            }
            else if(typeof a === "string")
            {
               this.insertAdjacentHTML('afterend', a);
            }
         });
      },
      // Pakuje sve elemente forme u URL query string (Standardna Select2/jQuery logika)
      serialize: function()
      {
       var form = this[0];
       if (!form || form.tagName !== 'FORM') return '';
       var pairs = [];

       for (var i = 0; i < form.elements.length; i++) {
       var el = form.elements[i];
       if (!el.name || el.disabled || el.type === 'file' || el.type === 'reset' || el.type === 'submit' || el.type === 'button') continue;

       if (el.type === 'select-multiple') {
       for (var j = 0; j < el.options.length; j++) {
       if (el.options[j].selected) {
       pairs.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.options[j].value));
       }
       }
       } else if ((el.type !== 'checkbox' && el.type !== 'radio') || el.checked) {
       pairs.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value));
       }
       }
       return pairs.join('&');
      },

      // Automatski generiše FormData objekat iz forme, uključujući selektovane fajlove/slike
      serializeFormData: function()
      {
       var form = this[0];
       if (!form || form.tagName !== 'FORM') return new FormData();
       return new FormData(form);
      },

      // Bezbedno upisivanje HTML-a sa filtriranjem XSS skripti
      safeHtml: function(htmlString)
      {
       if(htmlString === undefined) return this[0] ? this[0].innerHTML : '';

       // Primitivni, ali brzi XSS sanitizer za produkciju
       var cleanString = htmlString
       .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '') // Brise <script> blokove
       .replace(/on\w+\s*=\s*['"][^'"]*['"]/gi, '')         // Brise inline evente (onerror, onclick, onload...)
       .replace(/javascript:\s*[^'"]*/gi, '');              // Brise pseudo-protokole

       return this.each(function()
       {
       if(this) this.innerHTML = cleanString;
       });
      },

      // Pretvara osetljive karaktere u HTML entitete (Korisno za tekstualni prikaz)
      escape: function(str) {
       if (!str) return '';
       return str.replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
      },
      // Dodaje klasu elementu i automatski je uklanja nakon X milisekundi (Idealno za "Uspešno sačuvano" animacije)
      addClassTemporarily: function(className, duration)
      {
       var ms = duration || 1500;
       return this.each(function()
       {
       if(!this || !this.classList) return;
       var self = this;
       self.classList.add(className);
       setTimeout(function() {
       self.classList.remove(className);
       }, ms);
       });
      },

      // Vraća sve elemente koji dele isti roditeljski čvor (Kao jQuery .siblings())
      siblings: function()
      {
       var siblingsElements = [];
       var el = this[0];
       if (!el || !el.parentNode) return OpenShop([]);

       var sibling = el.parentNode.firstChild;
       while (sibling) {
       if (sibling.nodeType === 1 && sibling !== el) {
       siblingsElements.push(sibling);
       }
       sibling = sibling.nextSibling;
       }
       return OpenShop(siblingsElements);
      },


   }; // Ovde se zatvara OpenShop.fn / OpenShop.prototype

   // --- STATIČKE METODE I POMOĆNE FUNKCIJE ---

   // Serijalizacija objekata u URL query string (rekurzivno)
   OpenShop.param = function(obj, prefix)
   {
      var pairs = [];
      for(var key in obj)
      {
         if(obj.hasOwnProperty(key))
         {
            var k = prefix ? prefix + "[" + key + "]" : key;
            var v = obj[key];
            if(v !== null && typeof v === "object")
            {
               pairs.push(OpenShop.param(v, k));
            }
            else if(v !== undefined)
            {
               pairs.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
            }
         }
      }
      return pairs.filter(Boolean).join("&");
   };

   OpenShop.isArray = function(o)
   {
      return Array.isArray(o);
   };

   OpenShop.inArray = function(key, arr)
   {
      if(!Array.isArray(arr)) return false;
      if(arr.indexOf(key) !== -1) return true;
      var stringKey = String(key);
      for(var i = 0; i < arr.length; i++)
      {
         if(String(arr[i]) === stringKey) return true;
      }
      return false;
   };

   OpenShop.isObj = function(str)
   {
      return typeof str === "object" && str !== null && !Array.isArray(str);
   };
   OpenShop.isJson = function(str)
   {
      if(typeof str !== 'string' || str.trim() === '') return false;
      try
      {
         var parsed = JSON.parse(str);
         return parsed !== null && typeof parsed === 'object';
      }
      catch (e)
      {
         return false;
      }
   };

   // Obrada serverskog odgovora (detekcija JSON ili čistog teksta)
   OpenShop.parseResponse = function(xhr, successCallback, errorCallback)
   {
      var response = xhr.responseText;
      var contentType = xhr.getResponseHeader('Content-Type') || '';
      if(contentType.indexOf('application/json') !== -1 || (response &&
            (response.trim().charAt(0) === '{' || response.trim().charAt(0) === '[')))
      {
         try
         {
            response = JSON.parse(response);
         }
         catch (e)
         {
            if(typeof errorCallback === 'function') errorCallback(xhr, 'parsererror', e);
            return;
         }
      }
      if(typeof successCallback === 'function') successCallback(response, xhr.status, xhr);
   };

   // Debounce funkcija za optimizaciju inputa / scrolla
   OpenShop.debounce = function(func, wait)
   {
      var timeout;
      return function()
      {
         var context = this,
            args = arguments;
         clearTimeout(timeout);
         timeout = setTimeout(function()
         {
            func.apply(context, args);
         }, wait);
      };
   };

   // HTTP GET zahtev
   OpenShop.get = function(url, data, success, error)
   {
      if(typeof data === 'function')
      {
         error = success;
         success = data;
         data = null;
      }
      OpenShop.ajax(
      {
         url: url,
         method: 'GET',
         data: data,
         success: success,
         error: error
      });
   };


   // HTTP GET JSON zahtev
   OpenShop.getJSON = function(url, data, success, error)
   {
      OpenShop.get(url, data, success, error);
   };

   OpenShop.post = function(url, data, success, error)
   {
      if(typeof data === 'function')
      {
         error = success;
         success = data;
         data = null;
      }
      OpenShop.ajax(
      {
         url: url,
         method: 'POST',
         data: data,
         success: success,
         error: error
      });
   };

   // HTTP POST JSON zahtev
   OpenShop.postJSON = function(url, data, success, error)
   {
      if(typeof data === 'function')
      {
         error = success;
         success = data;
         data = null;
      }
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function()
      {
         if(xhr.readyState === 4)
         {
            if(xhr.status >= 200 && xhr.status < 300)
            {
               OpenShop.parseResponse(xhr, success, error);
            }
            else if(typeof error === 'function')
            {
               error(xhr, xhr.statusText);
            }
         }
      };
      var payload = typeof data === 'string' ? data : (data ? JSON.stringify(data) : null);
      xhr.send(payload);
   };

   // Glavna AJAX omotnica
   // Glavna AJAX omotnica - POPRAVLJENA VERZIJA
   OpenShop.ajax = function(options)
   {
    var url = options.url;
    var method = (options.type || options.method || 'GET').toUpperCase();
    var fetchOptions = {
    method: method,
    headers: options.headers || {}
    };

    if(method === 'GET' && options.data)
    {
    var query = OpenShop.param(options.data);
    url += (url.indexOf('?') === -1 ? '?' : '&') + query;
    }

    if(method === 'POST' && options.data)
    {
    if(options.data instanceof FormData)
    {
    fetchOptions.body = options.data; // OVO JE FALILO - SADA PRENOSI FAJLOVE!
    }
    else if(options.contentType && options.contentType.indexOf('application/json') !== -1)
    {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
    }
    else
    {
    fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    fetchOptions.body = OpenShop.param(options.data);
    }
    }

    var statusCode; // Pamti status kod za error callback
    fetch(url, fetchOptions)
    .then(function(res)
    {
    statusCode = res.status;
    if(!res.ok) throw new Error(res.statusText);
    var contentType = res.headers.get('Content-Type') || '';
    if(contentType.indexOf('application/json') !== -1) return res.json();
    return res.text();
    })
    .then(function(response)
    {
    if(typeof options.success === 'function') options.success(response);
    })
    .catch(function(err)
    {
    if(typeof options.error === 'function')
    {
    // Sada prosleđuje pravi status kod (npr. 404, 500) umesto null
    options.error(statusCode, 'error', err);
    }
    });
   };


   // Funkcija za proširivanje objekata (Deep clone podržan)
   OpenShop.extend = OpenShop.fn.extend = function()
   {
      var options, name, src, copy, target = arguments[0] ||
         {},
         i = 1,
         length = arguments.length,
         deep = false;

      if(typeof target === "boolean")
      {
         deep = target;
         target = arguments[i] ||
         {};
         i++;
      }
      if(typeof target !== "object" && typeof target !== "function")
      {
         target = {};
      }
      if(i === length)
      {
         target = this;
         i--;
      }
      for(; i < length; i++)
      {
         if((options = arguments[i]) != null)
         {
            for(name in options)
            {
               if(options.hasOwnProperty(name))
               {
                  src = target[name];
                  copy = options[name];
                  if(target === copy) continue;
                  if(deep && copy && (typeof copy === "object" || Array.isArray(copy)))
                  {
                     var clone = src && (typeof src === "object" || Array.isArray(src)) ? src : (Array.isArray(copy) ? [] :
                     {});
                     target[name] = OpenShop.extend(deep, clone, copy);
                  }
                  else if(copy !== undefined)
                  {
                     target[name] = copy;
                  }
               }
            }
         }
      }
      return target;
   };

   // Fabrika prilagođenih DOM događaja
   OpenShop.Event = function(src, props)
   {
      if(typeof src === 'string')
      {
         var event = document.createEvent('CustomEvent');
         event.initCustomEvent(src, true, true, props);
         return event;
      }
      return src;
   };

   // Postavljanje prototipa za init i izlaganje na globalni nivo
   OpenShop.fn.init.prototype = OpenShop.fn;
   window.OpenShop = window.OS = window.OS_JS = OpenShop;

})(window); // Kraj cele IIFE omotnice
