/**
 * OPENSHOP FRAMEWORK - OS360InfinityViewer v3.0.0 (MASTER)
 * Sadrži: 360° Tečni Engine, Swiper Thumbs, CSS Geometriju, SEO HUD i POPUP ZOOM.
 */
window.OS_Modules = window.OS_Modules || {};
class EnginePanorama {
    constructor(container, settings) {
        this.container = container;
        this.settings = settings;
        this.type = 1; // 1 = Kocka, 2 = Jedna slika
        this.lon = 0;
        this.lat = 0;

        // Parametri za Tip 1 (Kocka)
        this.currentPerspective = 280;

        // Parametri za Tip 2 (Jedna slika)
        this.currentZoom = 1;
    }

    setup(data) {
        // Čitamo panType iz JSON-a, ako ne postoji podrazumeva se 1 (Kocka)
        this.type = parseInt(data.panorama.panType) || 1;
        this.lon = 0;
        this.lat = 0;
        this.currentPerspective = 280;
        this.currentZoom = 1;

        if (this.type === 1) {
            // --- RENDER ZA TIP 1: KOCKA (6 SLIKA) ---
            const p = data.panorama || {};
            let html = `
            <div class="os-panorama-stage" style="perspective: 280px; width: 320px; height: 320px; margin: 0 auto; position: relative; overflow: hidden; background: #000;">
                <div class="os-cube">
                    <div class="os-cube-face face-front" style="background-image:url('${p.front || ''}')"></div>
                    <div class="os-cube-face face-right" style="background-image:url('${p.right || ''}')"></div>
                    <div class="os-cube-face face-back" style="background-image:url('${p.back || ''}')"></div>
                    <div class="os-cube-face face-left" style="background-image:url('${p.left || ''}')"></div>
                    <div class="os-cube-face face-top" style="background-image:url('${p.top || ''}')"></div>
                    <div class="os-cube-face face-bottom" style="background-image:url('${p.bottom || ''}')"></div>
                </div>
            </div>`;
            this.container.innerHTML = html;
        } else {
            // --- RENDER ZA TIP 2: SFERNA (1 SLIKA) ---
            const slika = data.panorama.file || '';
            let html = `
            <div class="os-panorama-stage" style="width: 420px; height: 520px; margin: 0 auto; overflow: hidden; position: relative; background: #fff;">
                <div class="os-panorama-canvas" style="
                    width: 100%; height: 100%; position: absolute;
                    background-image: url('${slika}');
                      background-size: auto 100%;  background-position: 0px center;background-repeat: repeat-x;
                    transition: transform 0.1s ease-out;
                "></div>
            </div>`;
            this.container.innerHTML = html;
        }
        this.updateRotation();
    }
    rotate(diffX, diffY) {
        if (this.type === 1) {
            this.lon += diffX * 0.15;
            this.lat -= diffY * 0.15;
            this.lat = Math.max(-85, Math.min(85, this.lat));
        } else {
            // KORIGOVANO ZA 1280px: Smanjen multiplikator na 0.3 radi prirodnijeg i težeg osećaja pod prstom
            this.lon -= diffX * 0.3;
            this.lat -= diffY * 0.15;///bio je 0.15
          this.lat = Math.max(-50, Math.min(0, this.lat));
        }
        this.updateRotation();
    }

    zoom(iznos) {
        if (this.type === 1) {
            this.currentPerspective += iznos;
            this.currentPerspective = Math.max(120, Math.min(350, this.currentPerspective));
            const stage = this.container.querySelector('.os-panorama-stage');
            if (stage) stage.style.perspective = `${this.currentPerspective}px`;
        } else {
            // KORIGOVANO ZA 1280px: Pošto je slika oštra i velika, dozvoljavamo dublji makro zum (do 3x uvećanja)
            this.currentZoom += iznos > 0 ? -0.15 : 0.15;
            this.currentZoom = Math.max(1, Math.min(3.0, this.currentZoom));
            this.updateRotation();
        }
    }


    updateRotation() {
        if (this.type === 1) {
            const cube = this.container.querySelector('.os-cube');
            if (cube) cube.style.transform = `rotateX(${this.lat}deg) rotateY(${this.lon}deg)`;
        } else {
            const canvas = this.container.querySelector('.os-panorama-canvas');
            if (canvas) {
                canvas.style.backgroundPositionX = `${this.lon}px`;
                canvas.style.transform = `translateY(${this.lat}px) scale(${this.currentZoom})`;
            }
        }
    }

    destroy() {
        this.container.innerHTML = '';
    }
}


(function(OS) {
    if (typeof OS === 'undefined') return;

    // injectStyles();
    // --- TEČNI 360 ENGINE ---
    class Engine360 {
        constructor(container, settings) {
            this.container = container;
            this.settings = settings;
            this.views = {};
            this.viewOrder = [];
            this.currentIndex360 = 0;
            this.isPlaying = false;
            this.playInterval = null;
        }

        setup(data) {
            this.views = data;
            // Prihvata dinamički niz slika pod ključem 'frames'
            this.viewOrder = data.frames || [];
            this.currentIndex360 = 0;
            this.stopMovie();

            if (this.viewOrder.length === 0) return;

            let html = `
 <div class="os-3d-hud"><span class="os-3d-rec"></span><span id="hud-txt-html">FREJM 1</span></div>
 <div class="os-3d-loader" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:20;">
 <div class="spinner-border text-warning"></div>
 </div>
 <div class="os-3d-inner-wrap">
 ${this.viewOrder.map((src, idx) => `<img data-view="${idx}" class="${idx === 0 ? 'active-3d' : ''}" src="${src}">`).join('')}
 </div>`;

            this.container.innerHTML = html;

            // Preload mehanizam: Čeka da se svi frejmovi učitaju u RAM pre starta
            const imgs = this.container.querySelectorAll('img');
            let loaded = 0;
            imgs.forEach(img => {
                img.onload = () => {
                    if (++loaded >= imgs.length) {
                        const l = this.container.querySelector('.os-3d-loader');
                        if (l) l.remove();
                        this.setView(0);
                    }
                };
                if (img.complete) img.onload();
            });
        }
        setView(viewIndex) {
            const wrap = this.container.querySelector('.os-3d-inner-wrap');
            const target = this.container.querySelector(`img[data-view="${viewIndex}"]`);
            if (!target || !wrap) return;

            // --- OKIDANJE VIZUELNOG EFEKTA (FIKSIRANO) ---
            const fx = this.settings.transitionEffect;
            if (fx && fx !== 'none' && this.currentIndex360 !== parseInt(viewIndex)) {
                const fxClass = `fx-${fx}`;
                wrap.classList.add(fxClass);

                // Čistimo klasu brzo kako bi tranzicija radila tečno tokom neprekidnog drag-a
                setTimeout(() => wrap.classList.remove(fxClass), 150);
            }

            // Standardna munjevita smena slika iz RAM-a
            this.container.querySelectorAll('img').forEach(i => i.classList.remove('active-3d'));
            target.classList.add('active-3d');
            this.currentIndex360 = parseInt(viewIndex);

            // HUD ažuriranje stepeni
            const hud = this.container.querySelector('#hud-txt-html');
            if (hud) {
                const names = this.views.viewNames || {};
                const trenutniUgao = Math.round((viewIndex / this.viewOrder.length) * 360);
                hud.innerHTML = names[viewIndex] || `ROTACIJA: ${trenutniUgao}°`;
            }
        }


        playMovie(btn) {
            let wrap = this.container.querySelector('.os-3d-inner-wrap');
            if (!wrap) return;
            if (this.isPlaying) return this.stopMovie(btn);

            this.isPlaying = true;
            wrap.classList.add('is-playing');
            if (btn) {
                OS(btn).html('<i class="fa-solid fa-stop fa-xl"></i>').css('background', '#dc3545');
            }
            this.playInterval = setInterval(() => this.nextView(), this.settings.autoPlaySpeed);
        }

        stopMovie(btn) {
            if (this.playInterval) clearInterval(this.playInterval);
            this.isPlaying = false;
            const wrap = this.container.querySelector('.os-3d-inner-wrap');
            if (wrap) wrap.classList.remove('is-playing');
            if (btn) {
                OS(btn).html('<i class="fa-solid fa-play fa-xl"></i>').css('background', '#fb923c');
            }
        }

        nextView() {
            let sledeci = (this.currentIndex360 + 1) % this.viewOrder.length;
            this.setView(sledeci);
        }

        prevView() {
            let prethodni = (this.currentIndex360 - 1 + this.viewOrder.length) % this.viewOrder.length;
            this.setView(prethodni);
        }

        destroy() {
            this.stopMovie();
            this.container.innerHTML = '';
        }
    }
    // --- MAIN GALLERY CLASS ---
    window.OS_Modules.OS360InfinityViewer = class OS360InfinityViewer {
      constructor(target, options) {
       this.target = target;
       this.items = options.items || [];
       this.currentIndex = 0;
       this.uid = 'os360_' + Math.random().toString(36).substr(2, 9);
       this.settings = Object.assign({ autoPlaySpeed: 150, arrowsType: 1 }, options.config);

       // Inicijalizujemo promenljive kao null radi bezbednosti
       this.threeD = null;
       this.panoramaEngine = null; // DODATO: Čist baseline bez greške
       this.swiperInstance = null;

       this.init();
      }

      init() {
       this.ensurePopup();
       this.renderHTML(); // Ova metoda generiše .os-3d-mount u DOM-u

       // Tek ovde bezbedno pravimo instance jer elementi sada postoje u targetu
       this.threeD = new Engine360(this.target.querySelector('.os-3d-mount'), this.settings);
       this.panoramaEngine = new EnginePanorama(this.target.querySelector('.os-3d-mount'), this.settings); // PREMEŠTENO OVDE

       this.initSwiper();
       this.switchView(0);
       this.bindEvents();
      }

        ensurePopup() {
            if (!document.getElementById('osUniAutoPopup')) {
                document.body.insertAdjacentHTML('beforeend', `
 <div id="osUniAutoPopup" class="os-uni-popup">
 <div class="os-uni-popup-content"><button class="os-uni-popup-close">&times;</button><img class="os-uni-popup-img" src=""></div>
 </div>`);
            }
        }

        renderHTML() {
            const aType = this.settings.arrowsType;
            this.target.id = this.uid;
            let thumbs = this.items.map((item, i) => `
 <div class="swiper-slide"><img src="${item.is3d ? item.frames[0] : item.org}" class="gal-thumb-btn" data-idx="${i}"></div>
 `).join('');

            const navHTML = `<div class="os-main-nav os-prev"><i class="fa-solid fa-chevron-left"></i></div>
 <div class="os-main-nav os-next"><i class="fa-solid fa-chevron-right"></i></div>`;

            this.target.innerHTML = `
 <div class="os-smart-gal-wrapper">
 <div class="os-main-stage shadow-sm">
 <img class="os-2d-static img-fluid" style="display:none; cursor:zoom-in;">
 <div class="os-3d-mount" style="display:none;"></div>
 ${aType === 2 ? navHTML : ''}
 </div>
 <div class="os-controls-pan-3d mt-4 text-center" style="display:none;">
 <div class="btn-group bg-white p-2 rounded-pill shadow-sm align-items-center" style="border: 1px solid #eee;">
 <button class="btn btn-link text-dark os-pan-zoom-out"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
 <button class="btn btn-link text-dark os-pan-left"><i class="fa-solid fa-arrow-left"></i></button>
 <button class="btn btn-link text-dark os-pan-top"><i class="fa-solid fa-arrow-up"></i></button>
 <button class="btn btn-link text-dark os-pan-bottom"><i class="fa-solid fa-arrow-down"></i></button>
 <button class="btn btn-link text-dark os-pan-right"><i class="fa-solid fa-arrow-right"></i></button>
 <button class="btn btn-link text-dark os-pan-zoom-in"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
 </div>
 </div>
 <div class="os-controls-3d mt-4 text-center" style="display:none;">
 <div class="btn-group bg-white p-2 rounded-pill shadow-sm align-items-center" style="border: 1px solid #eee;">
 <button class="btn btn-link text-dark os-3d-nav-left"><i class="fa-solid fa-arrow-rotate-left"></i></button>
 <button class="btn btn-warning rounded-circle shadow mx-3 os-btn-play-trigger" style="width:65px; height:65px; background:#fb923c; border:none; color:#fff;"><i class="fa-solid fa-play fa-xl"></i></button>
 <button class="btn btn-link text-dark os-3d-nav-right"><i class="fa-solid fa-arrow-rotate-right"></i></button>
 </div>
 </div>
 <div class="swiper swiper-thumbs-gallery mt-3 overflow-hidden position-relative">
 <div class="swiper-wrapper">${thumbs}</div>
 ${aType === 1 ? navHTML : ''}
 </div>
 </div>`;
        }

        initSwiper() {
            const el = this.target.querySelector('.swiper-thumbs-gallery');
            if (el && window.OS_Modules.OSProductSwiper) {
                this.swiperInstance = new window.OS_Modules.OSProductSwiper(el, {
                    slidesPerView: 4,
                    spaceBetween: 10,
                    loop: false
                });
            }
        }

        switchView(idx) {
            if (idx < 0) idx = this.items.length - 1;
            if (idx >= this.items.length) idx = 0;
            this.currentIndex = idx;
            const item = this.items[idx];
            const $stage = OS(this.target);

            // === OVO JE KLJUČNA LINIJA ZA POPRAVKU ===
            // Čim se pokrene promena slajda, brišemo i dugme "Detalji" i sve tačke sa ekrana!
            OS('.os-specifikacije-top-meni, .os-hotspot-tacka').remove();

            // Resetujemo prethodne engine-e (ovde se nastavlja tvoj postojeći fabrički kod)
            if (this.threeD) this.threeD.stopMovie();

            if (item.isPanorama) {
                $stage.find('.os-2d-static').hide();
                $stage.find('.os-3d-mount').show();
                $stage.find('.os-controls-3d').hide();
                $stage.find('.os-controls-pan-3d').show();
                this.panoramaEngine.setup(item);
            } else if (item.is3d) {
                $stage.find('.os-2d-static').hide();
                $stage.find('.os-3d-mount').show();
                $stage.find('.os-controls-pan-3d').hide();
                $stage.find('.os-controls-3d').show();
                this.threeD.setup(item);
              } else {
                  $stage.find('.os-3d-mount').hide();
                  $stage.find('.os-controls-3d').hide();
                  $stage.find('.os-controls-pan-3d').hide();
                  $stage.find('.os-2d-static').attr('src', item.org).attr('data-pop', item.popup || item.org).show();

                  // Čistimo sve stare elemente sa bine da se ne dupliraju
                  OS('.os-specifikacije-top-meni, .os-hotspot-tacka').remove();

                  // A) RENDER GLAVNOG DUGMETA NA VRHU SLIKE
                  if (item.opisi) {
                      const konfiguracija = {
                          naslovPopupa: item.popapnaslov || 'Specifikacije',
                          podaci: item.opisi
                      };
                      const spakovaniPodaci = encodeURIComponent(JSON.stringify(konfiguracija));
                      const tekstDugmeta = item.naslov || 'Detalji';

                      let opisiHTML = `
                          <div class="os-specifikacije-top-meni">
                              <button class="btn btn-sm os-detalji-glavni-btn" data-spec="${spakovaniPodaci}">
                                  <i class="fa-solid fa-list-ul me-1"></i> ${tekstDugmeta}
                              </button>
                          </div>`;

                      $stage.find('.os-main-stage').append(opisiHTML);
                      setTimeout(() => OS('.os-specifikacije-top-meni').addClass('is-visible'), 50);
                  }

                  // B) RENDER INTERAKTIVNIH PULSIRAJUĆIH TAČAKA (NA ISTOJ SLICI)
                  if (item.hotspots) {
                      item.hotspots.forEach((tacka) => {
                          const podaciTacke = encodeURIComponent(JSON.stringify(tacka));

                          let hotspotHTML = `
                              <div class="os-hotspot-tacka"
                                   style="top: ${tacka.top}; left: ${tacka.left};"
                                   data-hotspot="${podaciTacke}">
                                   <span class="os-hotspot-pulse"></span>
                              </div>`;

                          $stage.find('.os-main-stage').append(hotspotHTML);
                      });
                  }
              }



            $stage.find('.gal-thumb-btn').removeClass('thumb-active');
            $stage.find(`.gal-thumb-btn[data-idx="${idx}"]`).addClass('thumb-active');
            if(this.swiperInstance) this.swiperInstance.goToSlide(idx);
        }

        bindEvents() {
            const self = this;
            const id = '#' + this.uid;
            const stage3D = id + ' .os-3d-mount';
            let isDragging = false,
                startX = 0 ,  startY = 0;
                OS().live('mousemove touchmove', id, function(e) {
                    if (!isDragging) return;
                    let currentX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
                    let currentY = e.pageY || (e.touches ? e.touches[0].pageY : 0);

                    let diffX = startX - currentX;
                    let diffY = startY - currentY; // Potrebno nam je i Y pomeranje za panoramu

                    const trenutniItem = self.items[self.currentIndex];

                    if (trenutniItem.isPanorama) {
                        // Panorama koristi i X i Y pomeranje za slobodan pogled
                        self.panoramaEngine.rotate(diffX, diffY);
                        startX = currentX;
                        startY = currentY;
                    } else {
                        // Klasičan 360 proizvod menja frejmove samo na X osu
                        if (Math.abs(diffX) > 12) {
                            diffX > 0 ? self.threeD.nextView() : self.threeD.prevView();
                            startX = currentX;
                        }
                    }
                });
            // --- NATIVNI DRAG & SWIPE MEHANIZAM (ISPRAVLJENI PARAMETRI) ---
            OS().live('mousedown touchstart', stage3D, function(e) {
                isDragging = true;
                startX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
                self.threeD.stopMovie(OS(id).find('.os-btn-play-trigger'));
            });

            // POPRAVKA: Prosleđujemo document ili krovni ID kao selektor da live funkcija ne pukne
            OS().live('mousemove touchmove', id, function(e) {
                if (!isDragging) return;
                let currentX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
                let diffX = startX - currentX;

                if (Math.abs(diffX) > 12) {
                    diffX > 0 ? self.threeD.nextView() : self.threeD.prevView();
                    startX = currentX;
                }
            });

            OS().live('mouseup touchend mouseleave', id, function() {
                isDragging = false;
            });
            /*
            // RAZVOJNI ALAT: Klikni bilo gde na sliku da dobiješ tačne procente za JSON
OS().live('click', '.os-main-stage .os-2d-static', function(e) {
    const $slika = OS(this);
    const offset = $slika.offset(); // Pozicija slike na ekranu

    // Računamo tačnu poziciju klika u pikselima u odnosu na ivice slike
    const klikX = e.pageX - offset.left;
    const klikY = e.pageY - offset.top;

    // Pretvaramo piksele u procente u zavisnosti od trenutne veličine slike
    const procenatLeft = Math.round((klikX / $slika.width()) * 100);
    const procenatTop = Math.round((klikY / $slika.height()) * 100);

    // Ispisujemo gotov JSON blok u konzoli browsera (F12)
    console.log(`%c GOTOV HOTSPOT ZA JSON:`, 'background: #fb923c; color: #fff; font-weight: bold; padding: 4px;');
    console.log(JSON.stringify({
        "top": procenatTop + "%",
        "left": procenatLeft + "%",
        "naslov": "OVDE UPIŠI NASLOV",
        "tekst": "OVDE UPIŠI OPIS"
    }, null, 2));

    // Opciono: Izbacujemo i brz alert na ekranu da možeš odmah da prepišeš
    OS.notify.alert(`Kliknuto!\ntop: "${procenatTop}%"\nleft: "${procenatLeft}%"`);
});
*/
            // KLIK NA PRAZAN PROSTOR SLIKE (OBIČAN ZOOM)
            OS().live('click', id + ' .os-2d-static', function(e) {
                const trenutniItem = self.items[self.currentIndex];

                // Ako ima aktivne tačke, nemoj otvarati običan zoom
                if (trenutniItem && trenutniItem.hotspots) {
                    e.preventDefault();
                    return false;
                }

                const src = OS(this).attr('data-pop');
                if (src) {
                    let $popupContent = OS('#osUniAutoPopup .os-uni-popup-content');

                    // SIGURNOST: Brišemo zaostali tekst i nasilno palimo sliku
                    $popupContent.find('.os-tekstualna-specifikacija').remove();
                    $popupContent.find('.os-uni-popup-img').attr('src', src).show();

                    OS('#osUniAutoPopup').addClass('is-open');
                }
            });
            // --- POPRAVKA ZA ZATVARANJE POPUP-A I REFREŠOVANJE SADRŽAJA ---
            OS().live('click', '.os-uni-popup-close, #osUniAutoPopup', function(e) {
                // Proveravamo da li je kliknuto na samu tekstualnu karticu
                // ako jeste, ignorisemo klik da se popup ne ugasi slucajno dok korisnik cita tekst
                if (OS(e.target).closest('.os-tekstualna-specifikacija').length > 0) {
                    return;
                }

                let $popupContent = OS('#osUniAutoPopup .os-uni-popup-content');

                // 1. Potpuno brišemo tekstualne tabele ili opise tačaka iz prošlog klika
                $popupContent.find('.os-tekstualna-specifikacija').remove();

                // 2. Vraćamo fabričku sliku u život (skidamo joj display:none)
                $popupContent.find('.os-uni-popup-img').show();

                // 3. Skidamo klasu za otvaranje kako bi se prozor sakrio
                OS('#osUniAutoPopup').removeClass('is-open');
            });

            // EVENT 1: KLIK NA GLAVNO DUGME "DETALJI"
            OS().live('click', id + ' .os-detalji-glavni-btn', function(e) {
                e.preventDefault();
                const siroviPodaci = OS(this).attr('data-spec');
                if (siroviPodaci) {
                    const konfig = JSON.parse(decodeURIComponent(siroviPodaci));
                    let $popupContent = OS('#osUniAutoPopup .os-uni-popup-content');
                    $popupContent.find('.os-uni-popup-img').hide();
                    $popupContent.find('.os-tekstualna-specifikacija').remove();

                    let tabelaHTML = `
                        <div class="os-tekstualna-specifikacija">
                            <h4 style="color:#fb923c; margin-bottom:20px; font-weight:600; font-size:20px; letter-spacing:0.5px;">${konfig.naslovPopupa}</h4>
                            <table style="width:100%; border-collapse: collapse; text-align:left; font-size:15px;">`;
                    for (const [kljuc, vrednost] of Object.entries(konfig.podaci)) {
                        tabelaHTML += `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <td style="padding: 12px 8px; color: #a3a3a3; font-weight:600; width:35%; font-family:monospace;">${kljuc}:</td>
                                <td style="padding: 12px 8px; color: #ffffff;">${vrednost}</td>
                            </tr>`;
                    }
                    tabelaHTML += `</table></div>`;
                    $popupContent.append(tabelaHTML);
                    OS('#osUniAutoPopup').addClass('is-open');
                }
            });

            // EVENT 2: KLIK NA POJEDINAČNU TAČKU (HOTSPOT)
            OS().live('click', id + ' .os-hotspot-tacka', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Zaustavlja prenos klika na pozadinsku sliku
                const siroviPodaci = OS(this).attr('data-hotspot');
                if (siroviPodaci) {
                    const podaci = JSON.parse(decodeURIComponent(siroviPodaci));
                    let $popupContent = OS('#osUniAutoPopup .os-uni-popup-content');
                    $popupContent.find('.os-uni-popup-img').hide();
                    $popupContent.find('.os-tekstualna-specifikacija').remove();

                    let sadrzajHTML = `
                        <div class="os-tekstualna-specifikacija text-center p-4">
                            <h4 style="color:#fb923c; margin-bottom:15px; font-weight:600; font-size:18px;">${podaci.naslov}</h4>
                            <p style="color:#ffffff; font-size:15px; line-height:1.6; margin:0;">${podaci.tekst}</p>
                        </div>`;
                    $popupContent.append(sadrzajHTML);
                    OS('#osUniAutoPopup').addClass('is-open');
                }
            });





            OS().live('click', id + ' .os-pan-zoom-in', function(e) {
          e.preventDefault();
          if (self.panoramaEngine && self.items[self.currentIndex].isPanorama) {
              self.panoramaEngine.zoom(-30); // Smanjenjem perspektive približavamo sliku (Zoom In)
          }
          });

          OS().live('click', id + ' .os-pan-zoom-out', function(e) {
          e.preventDefault();
          if (self.panoramaEngine && self.items[self.currentIndex].isPanorama) {
              self.panoramaEngine.zoom(30); // Povećanjem perspektive udaljavamo sliku (Zoom Out)
          }
          });
            // KONTROLE STRELICA ZA PANORAMU (KLIK DOGAĐAJI)
            OS().live('click', id + ' .os-pan-left', function(e) {
            e.preventDefault();
            if (self.panoramaEngine && self.items[self.currentIndex].isPanorama) {
            self.panoramaEngine.rotate(-150, 0); // Rotacija ulevo
            }
            });

            OS().live('click', id + ' .os-pan-right', function(e) {
            e.preventDefault();
            if (self.panoramaEngine && self.items[self.currentIndex].isPanorama) {
            self.panoramaEngine.rotate(150, 0); // Rotacija udesno
            }
            });

            OS().live('click', id + ' .os-pan-top', function(e) {
            e.preventDefault();
            if (self.panoramaEngine && self.items[self.currentIndex].isPanorama) {
            self.panoramaEngine.rotate(0, -150); // Pogled nagore
            }
            });

            OS().live('click', id + ' .os-pan-bottom', function(e) {
            e.preventDefault();
            if (self.panoramaEngine && self.items[self.currentIndex].isPanorama) {
            self.panoramaEngine.rotate(0, 150); // Pogled nadole
            }
            });
            // KLASIČNE KONTROLE
            OS().live('click', id + ' .os-btn-play-trigger', function(e) {
                const btn = e.target.closest('.os-btn-play-trigger');
                self.threeD.playMovie(btn);
            });

            OS().live('click', id + ' .os-3d-nav-left', () => this.threeD.prevView());
            OS().live('click', id + ' .os-3d-nav-right', () => this.threeD.nextView());
            OS().live('click', id + ' .os-next', function(e) {
                e.preventDefault();
                self.switchView(self.currentIndex + 1);
            });
            OS().live('click', id + ' .os-prev', function(e) {
                e.preventDefault();
                self.switchView(self.currentIndex - 1);
            });
            OS().live('click', id + ' .gal-thumb-btn', function(e) {
                self.switchView(parseInt(OS(e.target).attr('data-idx')));
            });

            // POPUP ZOOM
            OS().live('click', id + ' .os-2d-static', function() {
                const src = OS(this).attr('data-pop');
                if (src) {
                    OS('.os-uni-popup-img').attr('src', src);
                    OS('#osUniAutoPopup').addClass('is-open');
                }
            });
            OS().live('click', '.os-uni-popup-close, #osUniAutoPopup', () => OS('#osUniAutoPopup').removeClass('is-open'));
        }
        reinit(newOptions = {}) {
         // 1. Pokrećemo hirurško čišćenje svih instanci i RAM-a
         this.destroy();

         // 2. Resetujemo indeks na početnu prvu sliku
         this.currentIndex = 0;

         // 3. Spajamo stare konfiguracije sa eventualno novim opcijama brzine ili strelica
         this.settings = Object.assign(this.settings, newOptions.config || {});

         // 4. Ako su prosleđeni novi artikli (npr. novi proizvod), ažuriramo niz
         if (newOptions.items) {
             this.items = newOptions.items;
         }

         // 5. Ponovo pokrećemo ceo vizuelni sistem sa novim podacima
         this.init();
        }
        destroy() {
         // 1. Uništavamo spoljašnji 360 engine ako postoji
         if (this.threeD && typeof this.threeD.destroy === 'function') {
             this.threeD.destroy();
         }

         // 2. Uništavamo unutrašnji panorama engine (DODATO)
         if (this.panoramaEngine && typeof this.panoramaEngine.destroy === 'function') {
             this.panoramaEngine.destroy();
         }

         // 3. Uništavamo Swiper instancu za sličice
         if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') {
             this.swiperInstance.destroy();
         }

         // 4. Čistimo DOM i ID atribute kontejnera
         this.target.removeAttribute('id');
         this.target.innerHTML = '';
        }
    };

    // --- BRIDGE ZA OPENSHOP PROTOKOL ---
    OS.prototype.Init360InfinityViewer = function(config) {
        return this.each(function() {
            const itemsAttr = OS(this).attr('data-items');
            if (itemsAttr && window.OS_Modules.OS360InfinityViewer) {
                this._360Viewer = new window.OS_Modules.OS360InfinityViewer(this, {
                    items: JSON.parse(itemsAttr),
                    config
                });
            }
        });
    };
})(window.OS);
