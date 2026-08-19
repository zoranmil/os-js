/**
 * OPENSHOP FRAMEWORK - THE MODULAR E-COMMERCE ENGINE
 *
 * Copyright (c) 2024-2026 Zoran Milićević <milicevic.zoran@gmail.com>
 * Built in collaboration with Google AI (Advanced Architecture & Optimization)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * @category   E-commerce
 * @package    OpenShop
 * @author     Zoran Milićević
 * @version    2.7.0
 * @license    AGPL-3.0-or-later
 */
 /**
  * OpenShop Framework - Modularni modul za galeriju i dokumente
  * Integrisano sa OS jezgrom, OS.notify sistemom i OS Sortable
  */
  (function(OS) {
      // Bezbednosna provera: Ako OpenShop framework nije učitan, prekida se izvršavanje
      if (typeof OS === 'undefined' || !OS.prototype) return;

      // 1. DEFINICIJA GLAVNE FUNKCIJE PLUGINA
      function OSColorPickerInstance(element, callback) {
          if (!element) return;
          this.element = element;
          this.callback = callback;
          this.init();
      }

      OSColorPickerInstance.prototype.init = function() {
          var self = this;
          var el = this.element;

          // Sprečavamo dupliranje pickera na istom polju
          if (el.getAttribute('data-has-picker')) return;
          el.setAttribute('data-has-picker', 'true');

          // Pomoćna funkcija 1: Pretvara HSL u HEX (za klizače)
          function hslToHex(h, s, l) {
              l /= 100;
              var a = (s * Math.min(l, 1 - l)) / 100;
              var f = function(n) {
                  var k = (n + h / 30) % 12;
                  var color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                  return Math.round(255 * color).toString(16).padStart(2, '0');
              };
              return '#' + f(0) + f(8) + f(4);
          }

          // Pomoćna funkcija 2: PAMETNI DODATAK - Pretvara postojeći HEX u HSL (da povuče boju)
          function hexToHsl(hex) {
              hex = hex.replace(/^#/, '');
              if (hex.length === 3) {
                  hex = hex + hex + hex + hex + hex + hex;
              }
              var r = parseInt(hex.substring(0, 2), 16) / 255;
              var g = parseInt(hex.substring(2, 4), 16) / 255;
              var b = parseInt(hex.substring(4, 6), 16) / 255;

              var max = Math.max(r, g, b), min = Math.min(r, g, b);
              var h, s, l = (max + min) / 2;

              if (max === min) {
                  h = s = 0; // Akromatska (siva, crna, bela)
              } else {
                  var d = max - min;
                  s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                  switch (max) {
                      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                      case g: h = (b - r) / d + 2; break;
                      case b: h = (r - g) / d + 4; break;
                  }
                  h /= 6;
              }
              return {
                  h: Math.round(h * 360),
                  s: Math.round(s * 100),
                  l: Math.round(l * 100)
              };
          }

          // Čitamo postojeću boju iz polja, ako je nema stavljamo belu kao default
          var initialHex = el.value && /^#([0-9A-F]{3}){1,2}$/i.test(el.value.trim()) ? el.value.trim() : '#FFFFFF';
          var initialHsl = hexToHsl(initialHex);
          // Kreiramo kontejner (dropdown popup)
          var pickerPopup = document.createElement('div');
          pickerPopup.className = 'os-custom-picker';

          // Stilovi za moderan i čist izgled popupa
          Object.assign(pickerPopup.style, {
              position: 'absolute',
              zIndex: '10000',
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              display: 'none',
              width: '240px',
              marginTop: '5px',
              boxSizing: 'border-box'
          });

          // Predefinisane brze e-commerce nijanse
          var presetColors = [
              '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
              '#ffff00', '#ff00ff', '#00ffff', '#fd7e14', '#6c757d'
          ];

          // Generisanje HTML strukture sa preuzetim početnim vrednostima za klizače
          var html = '<div style="font-size:11px; font-weight:bold; color:#6c757d; text-transform:uppercase; margin-bottom:8px; font-family:sans-serif; user-select:none;">'+_P('Quick selection')+':</div>';
          html += '<div class="os-preset-grid" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:6px; margin-bottom:12px;">';
          presetColors.forEach(function(color) {
              html += '<div class="os-preset-color" data-hex="' + color + '" style="background-color:' + color + '; height:22px; border-radius:4px; cursor:pointer; border:1px solid rgba(0,0,0,0.1);"></div>';
          });
          html += '</div>';

          html += '<div style="font-size:11px; font-weight:bold; color:#6c757d; text-transform:uppercase; margin-bottom:6px; font-family:sans-serif; user-select:none;">'+_P('Hue (Spectrum)')+':</div>';
          html += '<div style="margin-bottom:10px;"><input type="range" class="os-hue-slider" min="0" max="360" value="' + initialHsl.h + '" style="width:100%; -webkit-appearance:none; height:8px; border-radius:4px; background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%); outline:none; cursor:pointer;"></div>';

          html += '<div style="font-size:11px; font-weight:bold; color:#6c757d; text-transform:uppercase; margin-bottom:6px; font-family:sans-serif; user-select:none;">'+_P('Saturation')+':</div>';
          html += '<div style="margin-bottom:10px;"><input type="range" class="os-sat-slider" min="0" max="100" value="' + initialHsl.s + '" style="width:100%; -webkit-appearance:none; height:8px; border-radius:4px; background: linear-gradient(to right, #808080, #ff0000); outline:none; cursor:pointer;"></div>';

          html += '<div style="font-size:11px; font-weight:bold; color:#6c757d; text-transform:uppercase; margin-bottom:6px; font-family:sans-serif; user-select:none;">'+_P('Brightness')+':</div>';
          html += '<div style="margin-bottom:12px;"><input type="range" class="os-light-slider" min="0" max="100" value="' + initialHsl.l + '" style="width:100%; -webkit-appearance:none; height:8px; border-radius:4px; background: linear-gradient(to right, #000000, #ff0000 50%, #ffffff 100%); outline:none; cursor:pointer;"></div>';

          html += '<div style="font-size:11px; font-weight:bold; color:#6c757d; text-transform:uppercase; margin-bottom:6px; font-family:sans-serif; user-select:none;">Custom HEX:</div>';
          html += '<div style="display:flex; gap:6px;">';
          html += '<input type="text" class="os-picker-hex-input" value="' + initialHex + '" style="width:100%; border:1px solid #ced4da; border-radius:4px; padding:6px 8px; font-size:13px; font-weight:bold; text-transform:uppercase; box-sizing:border-box;">';
          html += '</div>';

          pickerPopup.innerHTML = html;

          // Pozicioniranje
          el.parentNode.style.position = 'relative';
          el.parentNode.appendChild(pickerPopup);

          var hueSlider = pickerPopup.querySelector('.os-hue-slider');
          var satSlider = pickerPopup.querySelector('.os-sat-slider');
          var lightSlider = pickerPopup.querySelector('.os-light-slider');
          var hexInput = pickerPopup.querySelector('.os-picker-hex-input');

          // Funkcija za osvežavanje gradijenata na podlogama klizača
          function updateSliderBackgrounds(h, s, l) {
              satSlider.style.background = 'linear-gradient(to right, ' + hslToHex(h, 0, l) + ', ' + hslToHex(h, 100, l) + ')';
              lightSlider.style.background = 'linear-gradient(to right, #000000, ' + hslToHex(h, s, 50) + ' 50%, #ffffff 100%)';
          }

          // Inicijalno postavljanje pozadina gradijenata
          updateSliderBackgrounds(initialHsl.h, initialHsl.s, initialHsl.l);

          function handleSliderChange() {
              var hex = hslToHex(parseInt(hueSlider.value), parseInt(satSlider.value), parseInt(lightSlider.value));
              hexInput.value = hex;
              updateSliderBackgrounds(parseInt(hueSlider.value), parseInt(satSlider.value), parseInt(lightSlider.value));
              if (typeof self.callback === 'function') self.callback.call(el, hex);
          }

          // Otvaranje popupa na klik na polje
          el.addEventListener('click', function(e) {
              e.stopPropagation();
              document.querySelectorAll('.os-custom-picker').forEach(function(p) { p.style.display = 'none'; });
              pickerPopup.style.display = 'block';
          });

          // Event 1: Klik na brzu kockicu (Ažurira i klizače unazad)
          OS(pickerPopup).find('.os-preset-color').on('click', function() {
              var hex = this.getAttribute('data-hex');
              hexInput.value = hex;

              var clickedHsl = hexToHsl(hex);
              hueSlider.value = clickedHsl.h;
              satSlider.value = clickedHsl.s;
              lightSlider.value = clickedHsl.l;
              updateSliderBackgrounds(clickedHsl.h, clickedHsl.s, clickedHsl.l);

              if (typeof self.callback === 'function') self.callback.call(el, hex);
              pickerPopup.style.display = 'none';
          });

          // Event 2: Pomeranje bilo kog od 3 klizača
          OS(pickerPopup).find('.os-hue-slider, .os-sat-slider, .os-light-slider').on('input', handleSliderChange);

          // Event 3: Ručni unos u tekstualno polje (Takođe ažurira klizače unazad)
          OS(pickerPopup).find('.os-picker-hex-input').on('input', function() {
              var hex = this.value.trim();
              if (hex.length > 0 && hex.charAt(0) !== '#') {
                  hex = '#' + hex;
                  this.value = hex;
              }
              if (/^#([0-9A-F]{3}){1,2}$/i.test(hex)) {
                  var typedHsl = hexToHsl(hex);
                  hueSlider.value = typedHsl.h;
                  satSlider.value = typedHsl.s;
                  lightSlider.value = typedHsl.l;
                  updateSliderBackgrounds(typedHsl.h, typedHsl.s, typedHsl.l);

                  if (typeof self.callback === 'function') self.callback.call(el, hex);
              }
          });

          // Zatvaranje popupa ako se klikne bilo gde van njega
          document.addEventListener('click', function(e) {
              if (!pickerPopup.contains(e.target) && e.target !== el) {
                  pickerPopup.style.display = 'none';
              }
          });
      };

      // 2. POVEZIVANJE NA OPENSHOP PROTOTIP KAO METODA
      OS.prototype.ColorPicker = function(callback) {
          return this.each(function() {
              new OSColorPickerInstance(this, callback);
          });
      };

  })(window.OpenShop || window.OS);


  (function(OS) {
      // Bezbednosna provera: Ako framework nije učitan, prekidamo
      if (typeof OS === 'undefined' || !OS.prototype) return;

      // DEFINICIJA NOVOG PLUGINA
      OS.prototype.SmartColorUI = function() {
          // Pomoćna funkcija unutar plugina za računanje kontrasta teksta
          function getContrastColor(hexColor) {
              var hex = hexColor.replace('#', '');
              var r = parseInt(hex.substring(0, 2), 16);
              var g = parseInt(hex.substring(2, 4), 16);
              var b = parseInt(hex.substring(4, 6), 16);
              var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
              return (yiq >= 128) ? '#000000' : '#ffffff';
          }

          // Prolazimo kroz sve elemente koji su selektovani (podržava višestruki izbor)
          return this.each(function() {
              var el = this; // Tvoj tekstualni input (npr. #color)
              var parentGroup = el.closest('.input-group'); // Pronalazi Bootstrap grupu
              var siviKvadrat = parentGroup ? parentGroup.querySelector('.input-group-text') : null;

              // Funkcija koja osvežava stilove na ekranu
              function primeniStilove(novaBoja) {
                  var hexOznacen = novaBoja.toUpperCase();
                  var kontrastnaBoja = getContrastColor(hexOznacen);

                  // Ažuriranje vrednosti tekstualnog polja
                  el.value = hexOznacen;
                  el.setAttribute('data-color', hexOznacen);

                  // Nadjačavanje Bootstrap focus i readonly stilova pomoću !important
                  el.style.setProperty('background-color', hexOznacen, 'important');
                  el.style.setProperty('color', kontrastnaBoja, 'important');

                  // Prilagođavanje levog kvadrata sa ikonicom pipete
                  if (siviKvadrat) {
                      siviKvadrat.style.setProperty('background-color', hexOznacen, 'important');

                      var ikonica = siviKvadrat.querySelector('.pipeta-ikona');
                      if (ikonica) {
                          // Ako je boja tamna, invertujemo CSS ikonicu u belu boju radi vidljivosti
                          ikonica.style.filter = (kontrastnaBoja === '#ffffff') ? 'invert(1) brightness(2)' : 'none';
                      }
                  }
              }

              // 1. Primenjujemo stil inicijalno na osnovu trenutne vrednosti u inputu (npr. #ffffff)
              if (el.value) {
                  primeniStilove(el.value);
              }

              // 2. Pozivamo tvoj postojeći OpenShop ColorPicker i hvatamo promenu boje kroz callback
              OS(el).ColorPicker(function(izabranaBoja) {
                  primeniStilove(izabranaBoja);
              });
          });
      };
  })(window.OpenShop || window.OS);
