/**
 * OPENSHOP FRAMEWORK - THE MODULAR E-COMMERCE ENGINE
 *
 * Copyright (c) 2024-2026 Zoran Milićević <milicevic.zoran@gmail.com>
 * Built in collaboration with Google AI (Advanced Architecture & Optimization)
 *
 * @category   E-commerce
 * @package    OpenShop
 * @author     Zoran Milićević
 * @version    2.7.0
 * @license    AGPL-3.0-or-later
 */
/**
 * DODATAK ZA OPENSHOP NOTIFY - ALERT & CONFIRM MODAL
 */
(function(OS) {
    if (typeof OS === 'undefined') return;

    // Skladište za keširane DOM reference
  let elements = {
      toastEl: null, bodyEl: null, actionsEl: null, confirmBtn: null, closeBtn: null,
      modalEl: null, modalTitle: null, modalBody: null, modalConfirmBtn: null, modalCancelBtn: null,
      waitModalEl: null // 🌟 Nova referenca za tvoj potpuno nezavisni wait prozor
  };
  let timer = null;
  let waitInterval = null; // 🌟 Tajmer za pomeranje progres bara

    /**
     * Proverava i kreira HTML strukturu dinamički u DOM-u (Zero-HTML)
     */
    function _ensureHtmlExists() {
        // --- 1. PROVERA TOAST STRUKTURE ---
        elements.toastEl = document.getElementById('os-toast');
        if (!elements.toastEl) {
            const tContainer = document.createElement('div');
            tContainer.className = "toast-container position-fixed bottom-0 end-0 p-3";
            tContainer.style.zIndex = "2300";
            tContainer.innerHTML = `
            <div id="os-toast" class="toast align-items-center text-white border-0 shadow-lg" role="alert" style="display: none; opacity: 0; transition: opacity 0.3s ease-in-out;">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center" id="os-toast-body"></div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" id="os-toast-close-btn"></button>
                </div>
                <div id="os-toast-actions" class="p-2 border-top border-white-50 d-none text-end">
                    <button type="button" class="btn btn-sm btn-light me-2" id="os-toast-confirm-btn">${_P('Confirm')}</button>
                    <button type="button" class="btn btn-sm btn-outline-light" id="os-toast-cancel-btn">${_P('Cancel')}</button>
                </div>
            </div>`;
            document.body.appendChild(tContainer);

            OS('#os-toast-close-btn').on('click', () => OS.notify.hide());
            OS('#os-toast-cancel-btn').on('click', () => OS.notify.hide());
        }

        // --- 2. PROVERA MODAL STRUKTURE ---
        elements.modalEl = document.getElementById('os-modal');
        if (!elements.modalEl) {
            const mContainer = document.createElement('div');
            mContainer.id = "os-modal-container";
            mContainer.innerHTML = `
            <div class="modal fade" id="os-modal" tabindex="-1" aria-hidden="true" style="z-index: 2200;">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content shadow-lg border-0">
                        <div class="modal-header border-0">
                            <h5 class="modal-title fw-bold" id="os-modal-title">${_P('Notification')}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body fs-5" id="os-modal-body"></div>
                        <div class="modal-footer border-0">
                            <button type="button" class="btn btn-secondary" id="os-modal-cancel-btn" data-bs-dismiss="modal">${_P('Cancel')}</button>
                            <button type="button" class="btn btn-primary px-4" id="os-modal-confirm-btn">${_P('OK')}</button>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.appendChild(mContainer.firstElementChild);

            // Rešenje baga za gubitak sinhronizacije kada se modal zatvori na X ili klikom sa strane
            document.addEventListener('hidden.bs.modal', function (event) {
                if (event.target.id === 'os-modal') {
                    _reset();
                }
            });
        }
        elements.waitModalEl = document.getElementById('os-wait-modal');
  if (!elements.waitModalEl) {
      const wContainer = document.createElement('div');
      wContainer.id = "os-wait-modal-container";
      wContainer.innerHTML = `
      <div class="modal fade" id="os-wait-modal" tabindex="-1" aria-hidden="true" style="z-index: 2400;">
          <div class="modal-dialog modal-dialog-centered modal-sm">
              <div class="modal-content shadow-lg border-0 py-3">
                  <div class="modal-body text-center">
                      <h5 class="fw-bold text-secondary mb-3" id="os-wait-modal-title">Molimo sačekajte...</h5>
                      <div class="progress" style="height: 12px; margin: 0 10px;">
                          <div id="os-wait-progressbar" class="progress-bar progress-bar-striped progress-bar-animated bg-success"
                               role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
                               style="width: 0%; transition: width 0.2s ease-in-out;">
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>`;
      document.body.appendChild(wContainer.firstElementChild);
      elements.waitModalEl = document.getElementById('os-wait-modal');
  }
    }
    /**
     * Mapira elemente u unutrašnju memoriju radi maksimalnih performansi
     */
    function _init() {
        _ensureHtmlExists();

        // Keširanje Toast elemenata
        elements.toastEl = document.getElementById('os-toast');
        elements.bodyEl = document.getElementById('os-toast-body');
        elements.actionsEl = document.getElementById('os-toast-actions');
        elements.confirmBtn = document.getElementById('os-toast-confirm-btn');
        elements.closeBtn = document.getElementById('os-toast-close-btn');

        // Keširanje Modal elemenata
        elements.modalEl = document.getElementById('os-modal');
        elements.modalTitle = document.getElementById('os-modal-title');
        elements.modalBody = document.getElementById('os-modal-body');
        elements.modalConfirmBtn = document.getElementById('os-modal-confirm-btn');
        elements.modalCancelBtn = document.getElementById('os-modal-cancel-btn');

        return !!elements.toastEl && !!elements.modalEl;
    }

    /**
     * Čisti klase, tajmere i vraća ikone na fabričko stanje pre novih akcija
     */
    function _reset() {
        if (timer) { clearTimeout(timer); timer = null; }

        OS(elements.toastEl).removeClass('bg-success bg-danger bg-warning bg-info bg-dark text-dark text-white');
        OS(elements.actionsEl).addClass('d-none');

        // Rešenje baga sa nevidljivom ikonicom (uvek je vraćamo na belu pre novog toasta)
        if (elements.closeBtn) {
            OS(elements.closeBtn).removeClass('btn-close-white').addClass('btn-close-white');
        }

        if (elements.confirmBtn) elements.confirmBtn.onclick = null;
        if (elements.modalConfirmBtn) elements.modalConfirmBtn.onclick = null;
    }

    /**
     * Pokreće nativni prikaz toasta sa glatkom animacijom
     */
    function _showNative(duration = 0) {
        if (!elements.toastEl) {
            if (!_init()) return;
        }
        _reset();

        elements.toastEl.style.display = "block";
        setTimeout(function() {
            if (elements.toastEl) elements.toastEl.style.opacity = "1";
        }, 10);

        if (duration > 0) {
            timer = setTimeout(function() {
                if (OS.notify && OS.notify.hide) OS.notify.hide();
            }, duration);
        }
    }

    // Ekstenzija i dodavanje metoda na OpenShop globalni objekat
    OS.notify = Object.assign(OS.notify || {}, {
        info: function(msg, dur = 3000) { _init(); this._showT(msg, 'bg-info', dur); },
        success: function(msg, dur = 3000) { _init(); this._showT(msg, 'bg-success', dur); },
        error: function(msg, dur = 5000) { _init(); this._showT(msg, 'bg-danger', dur); },
        loading: function(msg = 'Učitavanje...') { _init(); this._showT(msg, 'bg-dark', 0); },

        _showT: function(msg, cls, dur) {
            _reset();
            elements.toastEl.style.display = "block";
            setTimeout(() => { if(elements.toastEl) elements.toastEl.style.opacity = "1"; }, 10);
            OS(elements.toastEl).addClass(cls, cls === 'bg-warning' ? 'text-dark' : 'text-white');
            OS(elements.bodyEl).html(msg);
            if (dur > 0) timer = setTimeout(() => this.hide(), dur);
        },

        hide: function() {
            if (elements.toastEl) {
                elements.toastEl.style.opacity = "0";
                setTimeout(() => {
                    if(elements.toastEl) elements.toastEl.style.display = "none";
                    _reset();
                }, 300);
            }
        },

        // 🌟 JAVNA METODA: ALERT (MODAL)
        alert: function(message, title = _P('Notification')) {
            if (!_init()) return;
            _reset();
            elements.modalTitle.innerText = title;
            elements.modalBody.innerHTML = message;

            elements.modalCancelBtn.style.display = 'none';
            elements.modalConfirmBtn.innerText = _P('OK');
            OS(elements.modalConfirmBtn).removeClass('btn-danger').addClass('btn-primary');

            elements.modalConfirmBtn.onclick = () => OS('#os-modal').modal('hide');
            OS('#os-modal').modal('show');
        },

        // 🌟 JAVNA METODA: CONFIRM (TOAST VERZIJA)
        confirm: function(message, onConfirmCallback) {
            if (!_init()) return;
            _reset();
            _showNative(0);

            OS(elements.toastEl).addClass('bg-warning', 'text-dark');

            // Skidamo belu klasu da bi ikonica bila crna i vidljiva na žutoj pozadini
            if (elements.closeBtn) OS(elements.closeBtn).removeClass('btn-close-white');

            OS(elements.bodyEl).html(`
                <i class="fa-solid fa-circle-question me-2 fs-5"></i>
                <strong>${message}</strong>
            `);

            OS(elements.actionsEl).removeClass('d-none');

            elements.confirmBtn.onclick = () => {
                this.hide();
                if (typeof onConfirmCallback === 'function') onConfirmCallback();
            };
        },
        // 🌟 KONAČNA POPRAVLJENA METODA: Potpuno otporna na ultra-brze serverske odgovore
        wait: function(message = 'Molimo sačekajte...') {
            if (typeof _ensureHtmlExists === 'function') _ensureHtmlExists();

            // Resetujemo sklopku za zatvaranje na početku
            OS.notify._closeRequested = false;

            // Čistimo prethodne intervale bezbedno ako su ostali u memoriji
            if (waitInterval) {
                clearInterval(waitInterval);
                waitInterval = null;
            }

            const titleEl = document.getElementById('os-wait-modal-title');
            const pBar = document.getElementById('os-wait-progressbar');

            if (titleEl) titleEl.innerText = message;
            if (pBar) pBar.style.width = '0%';

            const modalElement = document.getElementById('os-wait-modal');
            if (!modalElement) return;

            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
            modalInstance._config.backdrop = 'static';
            modalInstance._config.keyboard = false;

            // Ako je closeWait pozvan brže od animacije širenja, gasimo ga čim završi
            modalElement.addEventListener('shown.bs.modal', function onShown() {
                modalElement.removeEventListener('shown.bs.modal', onShown);
                if (OS.notify._closeRequested) {
                    const currentInstance = bootstrap.Modal.getInstance(modalElement);
                    if (currentInstance) currentInstance.hide();
                }
            });

            OS('#os-wait-modal').modal('show');

            let procenat = 0;

            // Čekamo 150ms da Bootstrap započne otvaranje
            setTimeout(function() {
                // 🌟 KLJUČNA POPRAVKA: Ako je u ovih 150ms AJAX već završio i tražio zatvaranje, PREKIDAMO i ne pokrećemo interval!
                if (OS.notify._closeRequested) {
                    if (waitInterval) {
                        clearInterval(waitInterval);
                        waitInterval = null;
                    }
                    return;
                }

                waitInterval = setInterval(function() {
                    // Još jedna provera unutar samog intervala radi apsolutne sigurnosti
                    if (OS.notify._closeRequested) {
                        clearInterval(waitInterval);
                        waitInterval = null;
                        return;
                    }

                    const currentBar = document.getElementById('os-wait-progressbar');
                    if (!currentBar) {
                        clearInterval(waitInterval);
                        waitInterval = null;
                        return;
                    }

                    procenat += 15;
                    if (procenat >= 90) {
                        currentBar.style.width = '90%';
                        clearInterval(waitInterval);
                        waitInterval = null;
                    } else {
                        currentBar.style.width = procenat + '%';
                    }
                }, 120);
            }, 150);
        },

        // 🌟 KONAČNA POPRAVLJENA METODA: Postavlja neprobojnu blokadu za tajmere i gasi prozor
        closeWait: function() {
            // Odmah podižemo zastavicu da je zatvaranje zatraženo kako bismo blokirali setTimeout/setInterval unutar wait-a
            OS.notify._closeRequested = true;

            if (waitInterval) {
                clearInterval(waitInterval);
                waitInterval = null;
            }

            const modalEl = document.getElementById('os-wait-modal');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
                modalInstance._config.backdrop = true;
                modalInstance._config.keyboard = true;

                OS('#os-wait-modal').modal('hide');
            }
        },

        // 🌟 JAVNA METODA: CONFIRM 2 (MODAL VERZIJA) - Za ozbiljne i kritične akcije
        confirm2: function(message, onConfirm, title = _P('Confirm action')) {
            if (!_init()) return;
            _reset();
            elements.modalTitle.innerText = title;
            elements.modalBody.innerHTML = message;

            elements.modalCancelBtn.style.display = 'block';
            elements.modalCancelBtn.innerText = _P('Cancel');
            elements.modalConfirmBtn.innerText = _P('Confirm');

            // Automatska provera: Ako naslov sadrži brisanje/uklanjanje, dugme postaje crveno
            const lowTitle = title.toLowerCase();
            if (lowTitle.includes('bris') || lowTitle.includes('delet') || lowTitle.includes('ukloni')) {
                OS(elements.modalConfirmBtn).removeClass('btn-primary').addClass('btn-danger');
            } else {
                OS(elements.modalConfirmBtn).removeClass('btn-danger').addClass('btn-primary');
            }

            elements.modalConfirmBtn.onclick = () => {
                OS('#os-modal').modal('hide');
                if (typeof onConfirm === 'function') onConfirm();
            };

            OS('#os-modal').modal('show');
        }
    });
})(OpenShop);

(function(OS) {
    // Bezbednosna provera: Ako OpenShop nije učitan, prekida se izvršavanje
    if (typeof OS === 'undefined' || (!OS.prototype && !OS.fn)) return;

    // Uzimamo ispravnu referencu na prototip tvoje biblioteke
    var proto = OS.fn || OS.prototype;

    // Privatna metoda za injektovanje CSS stilova u zaglavlje dokumenta
    function injectModalStyles() {
        if (document.getElementById('os-notify-modal-styles')) return;
        var css = `
            .os-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; font-family: sans-serif; }
            .os-modal-box { background: #fff; border-radius: 8px; width: 400px; max-width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transform: translateY(-20px); transition: transform 0.2s ease; overflow: hidden; }
            .os-modal-header { padding: 14px 20px; background: #f8f9fa; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; justify-content: space-between; }
            .os-modal-title { margin: 0; font-size: 16px; font-weight: bold; color: #333; }
            .os-modal-body { padding: 20px; font-size: 14px; color: #555; line-height: 1.5; }
            .os-modal-footer { padding: 12px 20px; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 10px; background: #f8f9fa; }
            .os-btn { padding: 8px 16px; border-radius: 4px; border: 1px solid transparent; font-size: 13px; font-weight: bold; cursor: pointer; transition: background 0.1s ease; }
            .os-btn-secondary { background: #6c757d; color: #fff; }
            .os-btn-secondary:hover { background: #5a6268; }
            .os-btn-danger { background: #dc3545; color: #fff; }
            .os-btn-danger:hover { background: #bd2130; }
            .os-btn-primary { background: #007bff; color: #fff; }
            .os-btn-primary:hover { background: #0069d9; }
            .os-modal-show { opacity: 1; }
            .os-modal-show .os-modal-box { transform: translateY(0); }
        `;
        var style = document.createElement('style');
        style.id = 'os-notify-modal-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Proširujemo statički OS.notify namespace koji već ima tvoje Toasteve
    OS.notify = OS.notify || {};

    // 1. IMPLEMENTACIJA MODALA ZA POTVRDU (confirm2)
    OS.notify.confirm2 = function(msg, callback, title) {
        injectModalStyles();

        // Kreiranje strukture elemenata
        var overlay = document.createElement('div');
        overlay.className = 'os-modal-overlay';

        var box = document.createElement('div');
        box.className = 'os-modal-box';

        box.innerHTML = `
            <div class="os-modal-header">
                <span class="os-modal-title">${title || 'Potvrda akcije'}</span>
            </div>
            <div class="os-modal-body">${msg}</div>
            <div class="os-modal-footer">
                <button class="os-btn os-btn-secondary os-close-btn">${_P('Cancel')}</button>
                <button class="os-btn os-btn-danger os-confirm-btn">${_P('Confirm')}</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Animacija otvaranja
        setTimeout(function() { overlay.classList.add('os-modal-show'); }, 10);

        // Funkcija za zatvaranje
        function closeModal() {
            overlay.classList.remove('os-modal-show');
            setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
        }

        // Klik na Odustani
        box.querySelector('.os-close-btn').addEventListener('click', closeModal);

        // Klik na Potvrdi
        box.querySelector('.os-confirm-btn').addEventListener('click', function() {
            closeModal();
            if (typeof callback === 'function') callback();
        });
    };

    // 2. IMPLEMENTACIJA OBIČNOG DIJALOGA (alert)
    OS.notify.alert = function(msg, title) {
        injectModalStyles();

        var overlay = document.createElement('div');
        overlay.className = 'os-modal-overlay';

        var box = document.createElement('div');
        box.className = 'os-modal-box';

        box.innerHTML = `
            <div class="os-modal-header">
                <span class="os-modal-title">${title || 'Obaveštenje'}</span>
            </div>
            <div class="os-modal-body">${msg}</div>
            <div class="os-modal-footer">
                <button class="os-btn os-btn-primary os-ok-btn">${_P('Ok')}</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        setTimeout(function() { overlay.classList.add('os-modal-show'); }, 10);

        box.querySelector('.os-ok-btn').addEventListener('click', function() {
            overlay.classList.remove('os-modal-show');
            setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
        });
    };

})(window.OpenShop || window.OS);
