window.pid= '1';
 window.sid = '1';
class OSProductGallery {
    constructor(options) {
        this.config = {
            productId: 0,
            valueId: 0,
            ajaxUrl: '',
            orderUrl: '',
            imageContainer: '.hex-grid',
            ...options
        };

        this.imgNow = 0;
        this.imgQueue = null;
        this.activeImageId = null;
        this.imgRatio = 1; // Odnos prirodne i prikazane veličine slike
        this.imgSelected = 1;

        this.init();
    }

    init() {
        // Ako je body već učitan, ubaci odmah, u suprotnom sačekaj DOMContentLoaded
        if (document.body) {
            this.renderCropModalHtml();
        } else {
            document.addEventListener('DOMContentLoaded', () => this.renderCropModalHtml());
        }

        // 1. Aktivacija Sortable sistema
        if (OS(this.config.imageContainer).length > 0) {
            OS(this.config.imageContainer).Sortable({
                handle: '.portlet-header',
                onUpdate: () => {
                    const btn = document.getElementById('btnSaveOrder');
                    if (btn) btn.disabled = false;
                }
            });
        }

        this.bindEvents();
    }

    /**
     * Centralna delegacija događaja (Brisanje i Kadriranje)
     */
    bindEvents() {
        document.addEventListener('click', (e) => {
            // A) Dugme za brisanje
            const delBtn = e.target.closest('.delete-img-btn');
            if (delBtn) {
                this.confirmDelete(delBtn.getAttribute('data-id'));
                return;
            }

            // B) Dugme za kadriranje (Crop)
            const cropBtn = e.target.closest('.crop-trigger');
            if (cropBtn) {
                this.openCropEditor(cropBtn.getAttribute('data-id'));
                return;
            }
        });

        // C) Čuvanje rasporeda
        const saveBtn = document.getElementById('btnSaveOrder');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveSortOrder(saveBtn);
        }
    }

    // ==========================================================================
    // 🚀 UPLOAD ENGINE (Asinhroni Queue)
    // ==========================================================================

    uploadImages(files) {
      if (typeof window.DEMO !== 'undefined') {
        OS.notify.info(_P('Demo mod'));
        return;
    }
        if (this.imgQueue !== null) return;
        this.imgQueue = Array.from(files);
        this.imgNow = 0;

        OS.notify.loading(_P('Učitavanje slika...'));
        this.runImageUpload();
    }

    runImageUpload() {
      if (typeof window.DEMO !== 'undefined') {
      OS.notify.info(_P('Demo mod'));
      return;
  }
			OS.notify.wait('Upload slike...');
        const tempId = 'new_' + Date.now();
        this.renderPlaceholder(tempId);

        const formData = new FormData();
        formData.append('file-upload', this.imgQueue[this.imgNow]);
        formData.append('pid', this.config.productId);
        formData.append('sid', this.config.valueId);
        formData.append('op', 'upload');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', this.config.ajaxUrl, true);

        if (xhr.upload) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    const bar = document.getElementById(`bar${tempId}`);
                    if (bar) bar.style.width = pct + '%';
                }
            };
        }

        xhr.onload = () => {
            try {
                const res = JSON.parse(xhr.responseText);
                const placeholder = document.getElementById(`sl${tempId}`);
              OS.notify.closeWait();
                if (res.err === 0) {
                    // Transformacija u stalni element
                    placeholder.id = `sl${res.id}`;
                    placeholder.setAttribute('data-id', res.id);
                    placeholder.setAttribute('data-json', JSON.stringify(res.meta_json || {}));

                    placeholder.querySelector('.crop-trigger').setAttribute('data-id', res.id);
                    placeholder.querySelector('.delete-img-btn').setAttribute('data-id', res.id);

                    const img = placeholder.querySelector('.image');
                    img.src = res.image;
                    img.style.display = 'block';
                    placeholder.querySelector('.meter').style.display = 'none';
                } else {
                    placeholder.remove();
                    OS.notify.error(res.msg || 'Greška pri prenosu');
                }
            } catch (e) { console.error("JSON Error", e); }

            this.finalizeStep();
        };
        xhr.send(formData);
    }

    finalizeStep() {
        this.imgNow++;
        if (this.imgNow < this.imgQueue.length) {
            this.runImageUpload();
        } else {
            this.imgQueue = null;
            OS.notify.hide();
            OS.notify.success(_P('Sve slike su sačuvane!'));
            OS(this.config.imageContainer).Sortable(); // Re-init engine
        }
    }

    renderPlaceholder(id) {
      const html = `
      <div class="hex-grid__item border rounded p-2 text-center os-sortable-item" id="sl${id}" data-id="0" data-json="">
          <div class="img-operations d-flex justify-content-between mb-2" id="box${id}">
              <a class="portlet-header text-secondary" href="javascript:void(0)">
                  <i class="os-icon os-icon-arrows"></i>
              </a>
              <div class="d-flex gap-2">
                  <a class="crop-img-btn text-primary crop-trigger" href="javascript:void(0)" data-id="${id}" title="Kadriraj sliku">
                      <i class="material-icons-outlined" style="font-size: 1.1rem;">crop</i>
                  </a>
                  <a class="delete-img-btn text-danger" href="javascript:void(0)" data-id="${id}" title="Obriši sliku">
                      <i class="os-icon os-icon-trash"></i>
                  </a>
              </div>
          </div>
          <div id="sl_img_holder${id}" class="text-center mb-2">
              <img class="image img-fluid rounded" style="display:none" width="187">
          </div>
          <div class="meter animate">
              <span id="bar${id}" style="width: 0%"></span>
          </div>
      </div>`;
      document.querySelector(this.config.imageContainer).insertAdjacentHTML('beforeend', html);
  }

    // ==========================================================================
    // 🎯 CROP ENGINE (High-Resolution Support)
    // ==========================================================================
    renderCropModalHtml() {
        // Provera da modal slučajno već ne postoji na stranici da ne bismo duplirali ID-jeve
        if (document.getElementById('cropModal')) return;

        const modalHtml = `
        <div id="cropModal" class="openshop-crop-overlay" style="display: none;">
            <div class="card openshop-crop-card">
                <div class="card-header bg-white d-flex justify-content-between align-items-center p-3" style="border-bottom: 1px solid #f1f5f9;">
                    <h5 class="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style="font-size: 1.1rem; letter-spacing: -0.01em;">
                        <i class="os-icon os-custom-crop"></i>
                        Kadriranje slike
                    </h5>
                    <button type="button" id="closeCropModalTopBtn" class="openshop-close-btn" title="Zatvori">
                        <i class="os-icon os-icon-close"></i>
                    </button>
                </div>

                <div class="card-body p-0 d-flex align-items-center justify-content-center openshop-crop-workspace">
                    <div id="cropWorkspace" style="position: relative; display: inline-block;">
                        <img id="imageToCrop" src="" style="max-width: 100%; max-height: 400px; display: block; pointer-events: none;">
                        <div id="cropSelector">
                            <!-- Uglovi za kadriranje -->
                            <div class="crop-handle nw" data-dir="nw"></div>
                            <div class="crop-handle ne" data-dir="ne"></div>
                            <div class="crop-handle sw" data-dir="sw"></div>
                            <div class="crop-handle se" data-dir="se"></div>
                            <!-- Ivice za kadriranje -->
                            <div class="crop-handle n" data-dir="n"></div>
                            <div class="crop-handle e" data-dir="e"></div>
                            <div class="crop-handle s" data-dir="s"></div>
                            <div class="crop-handle w" data-dir="w"></div>
                            <div id="cropResizer"></div>
                        </div>
                    </div>
                </div>

                <div class="card-footer bg-white d-flex justify-content-end gap-2 p-3" style="border-top: 1px solid #f1f5f9;">
                    <button type="button" id="resetToOriginalBtn" class="btn btn-outline-danger px-3 fw-medium" style="border-radius: 6px; font-size: 0.9rem;">
                        Vrati original
                    </button>
                    <button type="button" id="cancelCropModalBtn" class="btn btn-light border text-secondary px-4 fw-medium" style="border-radius: 6px; font-size: 0.9rem;">
                        Otkaži
                    </button>
                    <button type="button" id="saveCropBtn" class="btn btn-primary d-flex align-items-center gap-2 px-4 fw-medium" style="border-radius: 6px; font-size: 0.9rem; background: #047bf8; border-color: #047bf8;">
                        <i class="os-icon os-icon-save" style="filter: brightness(0) invert(1); width: 14px; height: 14px;"></i>
                        Sačuvaj rez
                    </button>
                </div>
            </div>
        </div>`;


      // Bezbedno ubacivanje unutar body elementa
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Vezivanje akcija zatvaranja
      const topClose = document.getElementById('closeCropModalTopBtn');
      const bottomCancel = document.getElementById('cancelCropModalBtn');

      if (topClose) topClose.onclick = () => this.closeCropModal();
      if (bottomCancel) bottomCancel.onclick = () => this.closeCropModal();

    }
    openCropEditor(id) {

        this.activeImageId = id;
        const mainBox = document.getElementById(`sl${id}`);
        if (!mainBox) return;

        // 🧠 Čitamo JSON "mozak" slike iz HTML atributa
        let imageData = {};
        try { imageData = JSON.parse(mainBox.getAttribute('data-json') || '{}'); } catch(e) {}

        const imgElement = document.getElementById('imageToCrop');
        const modal = document.getElementById('cropModal');

        // 🚀 LOGIKA ZA PRONALAŽENJE NAJVEĆE SLIKE (BEZ ORIGINALA)
        // Spisak svih optimizovanih veličina poređanih po prioritetu od najveće ka najmanjoj
        const dozvoljeneVelicine = ['large', 'medium', 'gallery_main', 'mobile', 'small'];
        let najrezaSlika = null;
        let maksimalnaSirina = 0;

        // Prolazimo kroz JSON i tražimo onu koja ima najveći 'width'
        dozvoljeneVelicine.forEach(velicina => {
            if (imageData[velicina] && imageData[velicina].path && imageData[velicina].width) {
                if (imageData[velicina].width > maksimalnaSirina) {
                    maksimalnaSirina = imageData[velicina].width;
                    najrezaSlika = imageData[velicina].path;
                }
            }
        });

        // Putanja do najveće slike spremne za ekran
        const sourcePath = najrezaSlika;

        // Ako nismo našli nijednu od optimizovanih, javljamo grešku i prekidamo funkciju
        if (!sourcePath) return OS.notify.error('Nije pronađena nijedna optimizovana slika za kadriranje');

        // 🎯 Postavljanje tvoje zastavice da je slika uspešno izabrana i spremna
        this.imgSelected = 1;

        // Otvaranje modala i priprema prikaza
        imgElement.style.opacity = '0.3';
        imgElement.src = window.base_path + sourcePath;
        modal.style.display = 'block';

        imgElement.onload = () => {
            imgElement.style.opacity = '1';

            // 📐 KALKULACIJA RATIO ODNOSA (Pikseli velike slike vs Pikseli na ekranu)
            this.imgRatio = imgElement.naturalWidth / imgElement.offsetWidth;

            const selector = document.getElementById('cropSelector');
            if (selector) {
                Object.assign(selector.style, {
                    top: '0px',
                    left: '0px',
                    width: imgElement.offsetWidth + 'px',  // Tačna širina originala na ekranu
                    height: imgElement.offsetHeight + 'px' // Tačna visina originala na ekranu
                });
            }

            // Pokretanje event-a za pomeranje i promenu veličine selektora
            this.initCustomCropEvents();
        };

        // Vezivanje komandi za dugmiće u modalu (pokreće se samo jednom po otvaranju)
        document.getElementById('saveCropBtn').onclick = () => this.saveCrop();
        document.getElementById('resetToOriginalBtn').onclick = () => this.resetCrop();
    }

    initCustomCropEvents() {
        const selector = document.getElementById('cropSelector');
        const workspace = document.getElementById('cropWorkspace');

        if (!selector || !workspace) return;

        let isDragging = false;
        let currentHandle = null; // Prati smer ručice: 'n', 's', 'e', 'w', 'nw', itd.
        let startX, startY, startW, startH, startL, startT;

        // A) POMERANJE CELOG SELEKTORA (Drag unutar granica radnog prostora)
        selector.onmousedown = (e) => {
            // Ako je kliknuta ručica za resize, preskoči drag cele kutije
            if (e.target.classList.contains('crop-handle')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startL = selector.offsetLeft;
            startT = selector.offsetTop;

            e.preventDefault();
        };

        // B) HVATANJE POJEDINAČNIH RUČICA (Resize kroz 8 smerova)
        document.querySelectorAll('.crop-handle').forEach(handle => {
            handle.onmousedown = (e) => {
                currentHandle = handle.getAttribute('data-dir'); // Čitamo 'nw', 'se', 'n'...
                startX = e.clientX;
                startY = e.clientY;
                startW = selector.offsetWidth;
                startH = selector.offsetHeight;
                startL = selector.offsetLeft;
                startT = selector.offsetTop;

                e.preventDefault();
                e.stopPropagation(); // Zaustavlja prenos klika na ceo selektor
            };
        });

        // C) POMERANJE MIŠA (Zajednički kalkulator pomeranja na nivou celog prozora)
        window.onmousemove = (e) => {
            if (!isDragging && !currentHandle) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // 1. Logika za Drag (pomeranje celog kvadrata)
            if (isDragging) {
                let nl = Math.max(0, Math.min(startL + dx, workspace.offsetWidth - selector.offsetWidth));
                let nt = Math.max(0, Math.min(startT + dy, workspace.offsetHeight - selector.offsetHeight));

                selector.style.left = nl + 'px';
                selector.style.top = nt + 'px';
            }

            // 2. Logika za Resize (promena veličine u zavisnosti od izabrane ručice)
            if (currentHandle) {
                let newWidth = startW;
                let newHeight = startH;
                let newLeft = startL;
                let newTop = startT;

                // Smer Istok (desna ivica)
                if (currentHandle.includes('e')) {
                    newWidth = Math.min(startW + dx, workspace.offsetWidth - startL);
                }

                // Smer Jug (donja ivica)
                if (currentHandle.includes('s')) {
                    newHeight = Math.min(startH + dy, workspace.offsetHeight - startT);
                }

                // Smer Zapad (leva ivica - pomera i širinu i levu poziciju)
                if (currentHandle.includes('w')) {
                    const constrainedDx = Math.max(dx, -startL); // Ne dozvoljava prelazak preko nule
                    newWidth = Math.max(30, startW - constrainedDx); // Minimalna širina 30px
                    newLeft = startL + (startW - newWidth);
                }

                // Smer Sever (gornja ivica - pomera i visinu i gornju poziciju)
                if (currentHandle.includes('n')) {
                    const constrainedDy = Math.max(dy, -startT); // Ne dozvoljava prelazak preko nule
                    newHeight = Math.max(30, startH - constrainedDy); // Minimalna visina 30px
                    newTop = startT + (startH - newHeight);
                }

                // Primena novih dimenzija u realnom vremenu uz dvostruko osiguranje (min 30px)
                if (newWidth >= 30) {
                    selector.style.width = newWidth + 'px';
                    selector.style.left = newLeft + 'px';
                }
                if (newHeight >= 30) {
                    selector.style.height = newHeight + 'px';
                    selector.style.top = newTop + 'px';
                }
            }
        };

        // D) OTPUŠTANJE MIŠA (Prekid svih akcija)
        window.onmouseup = () => {
            isDragging = false;
            currentHandle = null;
        };
    }


    saveCrop() {
      if (typeof window.DEMO !== 'undefined') {
      OS.notify.info(_P('Demo mod'));
      return;
  }
        OS.notify.wait('Obrađujem slike...');
        const id = this.activeImageId;
        const selector = document.getElementById('cropSelector');

        if (!selector) return;

        // Payload sa parametrima koje tvoj PHP backend direktno prihvata
        const payload = {
            op: 'crop_image_save',
            id: id,
            pid: this.config.productId,
            type: this.imgSelected, // 1 = Krop iz velike verzije, 2 = Vrati čist original
            x: Math.round(selector.offsetLeft * this.imgRatio),
            y: Math.round(selector.offsetTop * this.imgRatio),
            w: Math.round(selector.offsetWidth * this.imgRatio),
            h: Math.round(selector.offsetHeight * this.imgRatio)
        };

        OS.notify.loading(_P('Obrađujem sliku...'));

        // Slanje čistog objekta bez JSON.stringify (baš kako tvoj OS.post sistem voli)
        OS.postJSON(this.config.ajaxUrl, payload, (res) => {
            OS.notify.hide();
            if (res && res.err === 0) {
                // Ažuriramo grid stavku i data-json sa novim stanjem sa servera
                const mainBox = document.getElementById(`sl${id}`);
                if (mainBox) {
                    const imgNode = mainBox.querySelector('img.image');
                    if (imgNode) {
                        imgNode.src = res.image + '?v=' + Date.now();
                    }
                    mainBox.setAttribute('data-json', JSON.stringify(res.new_json || res.reset_json || {}));
                }
                this.closeCropModal();
                this.isResetRequested = false;
                OS.notify.closeWait();
                OS.notify.success(_P('Promene su sačuvane.'));
            } else {
                OS.notify.error((res && res.msg) || 'Greška pri čuvanju kropa.');
            }
        });
    }

  resetCrop() {
    // 1. Čitamo originalne podatke koje već imamo u HTML-u
    const id = this.activeImageId;
    const mainBox = document.getElementById(`sl${id}`);
    if (!mainBox) return;

    // 🚀 TIP 2: Eksplicitno markiramo da idemo na ORIGINAL


    let imageData = {};
    try { imageData = JSON.parse(mainBox.getAttribute('data-json') || '{}'); } catch(e) {}
    const originalPath = imageData.original ? imageData.original.path : '';

    if (!originalPath) return OS.notify.error('Original nije pronađen.');

    // 2. TRENUTNA VIZUELNA PROMENA (Učitavamo sirovi original)
    const imgElement = document.getElementById('imageToCrop');
    imgElement.src = window.base_path + originalPath;
       this.imgSelected = 2;
    // 3. RESETUJEMO SELEKTOR NA "PUN KADAR" PREKO CELOG ORIGINALA
    imgElement.onload = () => {
        // Ponovo računamo ratio za učitani original
        this.imgRatio = imgElement.naturalWidth / imgElement.offsetWidth;
  this.imgSelected = 2;
        const selector = document.getElementById('cropSelector');
        if (selector) {
            Object.assign(selector.style, {
                top: '0px',
                left: '0px',
                width: imgElement.offsetWidth + 'px',  // Tačna širina originala na ekranu
                height: imgElement.offsetHeight + 'px' // Tačna visina originala na ekranu
            });
        }
        this.initCustomCropEvents();
    };

    // 4. MARKIRAMO STANJE: Korisnik želi reset
    this.isResetRequested = true;

    OS.notify.success(_P('Prikazan original. Kliknite na "Sačuvaj" da potvrdite.'));
}


    closeCropModal() {
        document.getElementById('cropModal').style.display = 'none';
    }

    // ==========================================================================
    // 🛠️ SORT & DELETE
    // ==========================================================================

    saveSortOrder(btn) {
      if (typeof window.DEMO !== 'undefined') {
        OS.notify.info(_P('Demo mod'));
         return;
      }
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="os-icon os-icon-refresh anim-spin"></i> Čuvanje...'; // Popravljena klasa za loader ikonu

        // 🚀 ŠALJEMO ČIST NIZ: PHP voli strukturu data[index][ključ]
        const payload = {
            op: 'ordering'
        };

        document.querySelectorAll(`${this.config.imageContainer} .hex-grid__item`).forEach((item, i) => {
            payload[`data[${i}][id]`] = item.getAttribute('data-id');
            payload[`data[${i}][order]`] = i;
        });

        // Koristimo payload objekat direktno, bez JSON.stringify
        OS.post(this.config.orderUrl, payload, () => {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            OS.notify.success(_P('Redosled sačuvan'));
        });
    }

    confirmDelete(id) {
        OS.notify.confirm2(_P('Obrisati sliku?'), () => {
          if (typeof window.DEMO !== 'undefined') {
          OS.notify.info(_P('Demo mod'));
          return;
      }
            OS.post(this.config.ajaxUrl, { op: 'delete', id: id }, () => {
                document.getElementById(`sl${id}`).remove();
                OS.notify.success(_P('Obrisano'));
            });
        });
    }
}
