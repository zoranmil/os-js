class ImagePreview {
    constructor(el, options) {
        this.defaults = {
            naslov: 'Klikni ili prevuci sliku ovde',
            podnaslov: 'Podržani formati: JPG, PNG, WEBP',
            defaultImg: '',
            uploadUrl: '',
            uploadData: {},
            onChange: null,
            onUploadSuccess: null,
            onUploadError: null,
            onRemove: null
        };

        this.config = { ...this.defaults, ...options };
        this.el = el;
        this.isUploading = false;
        this.wrap = null;
        this.renderEl = null;
        this.overlayEl = null;
        this.removeBtn = null;
        this.currentBlob = null;

        const htmlDefault = this.el.getAttribute('data-default');
        if (htmlDefault) {
            this.config.defaultImg = htmlDefault;
        }

        this.init();
    }

    init() {
        this.wrap = document.createElement('div');
        this.wrap.className = 'image-preview-wrapper';

        this.wrap.innerHTML = `
            <div class="image-preview-message text-center">
                <div class="upload-icon-zone">
                    <svg xmlns="http://w3.org" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p class="upload-title">${this.config.naslov}</p>
                <span class="upload-subtitle">${this.config.podnaslov}</span>
            </div>
            <div class="image-preview-render"></div>

            <button type="button" class="btn-remove-preview" title="Ukloni sliku">
                <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>

            <div class="os-upload-overlay d-none">
                <div class="spinner-border text-warning"></div>
            </div>
        `;

        this.el.replaceWith(this.wrap);
        this.wrap.appendChild(this.el);

        this.renderEl = this.wrap.querySelector('.image-preview-render');
        this.overlayEl = this.wrap.querySelector('.os-upload-overlay');
        this.removeBtn = this.wrap.querySelector('.btn-remove-preview');

        Object.assign(this.el.style, {
            position: 'absolute',
            inset: '0',
            opacity: '0',
            cursor: 'pointer',
            zIndex: '15'
        });

        this.initEvents();
        this.checkDefaultImage();
    }

    initEvents() {
        this.el.addEventListener('change', (e) => {
            // POPRAVLJENO: Izvlači se tačno prvi fajl sa indeksom [0]
            if (e.target.files && e.target.files[0]) {
                this.handleFile(e.target.files[0]);
            }
        });

        this.el.addEventListener('dragenter', () => this.wrap.classList.add('dragover'));
        this.el.addEventListener('dragover', () => this.wrap.classList.add('dragover'));
        this.el.addEventListener('dragleave', () => this.wrap.classList.remove('dragover'));
        this.el.addEventListener('drop', () => this.wrap.classList.remove('dragover'));

        this.removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetPreview();
        });
    }

    checkDefaultImage() {
        if (this.config.defaultImg) {
            this.renderEl.innerHTML = `<img src="${this.config.defaultImg}" alt="Default Preview" style="opacity: 1; transform: scale(1);">`;
            this.renderEl.classList.add('has-img');
            this.wrap.classList.add('has-file-active');
            this.removeBtn.classList.add('is-visible');
        }
    }

    handleFile(file) {
        if (this.currentBlob) URL.revokeObjectURL(this.currentBlob);

        this.currentBlob = URL.createObjectURL(file);

        this.renderEl.innerHTML = `<img src="${this.currentBlob}" alt="Preview">`;
        this.renderEl.classList.add('has-img');
        this.wrap.classList.add('has-file-active');

        setTimeout(() => {
            this.removeBtn.classList.add('is-visible');
        }, 50);

        if (typeof this.config.onChange === 'function') this.config.onChange(file, this.currentBlob);
        if (this.config.uploadUrl && !this.isUploading) this.uploadFile(file);
    }

    async uploadFile(file) {
        this.isUploading = true;
        this.overlayEl.classList.remove('d-none');
        this.removeBtn.classList.remove('is-visible');

        const formData = new FormData();
        formData.append(this.el.getAttribute('name') || 'file', file);

        for (const [key, value] of Object.entries(this.config.uploadData)) {
            formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }

        try {
            const response = await fetch(this.config.uploadUrl, { method: 'POST', body: formData });
            if (!response.ok) throw response;
            const res = await response.json();

            if (typeof this.config.onUploadSuccess === 'function') this.config.onUploadSuccess(res);
            OS.notify.success('Slika uspešno sačuvana!');
        } catch (error) {
            if (typeof this.config.onUploadError === 'function') this.config.onUploadError(error);
            OS.notify.error(error instanceof Response ? 'Greška pri slanju.' : 'Mrežna greška.');
            this.resetPreview();
        } finally {
            this.isUploading = false;
            this.overlayEl.add('d-none');
            if (this.currentBlob) this.removeBtn.classList.add('is-visible');
        }
    }

    resetPreview() {
        if (this.currentBlob) {
            URL.revokeObjectURL(this.currentBlob);
            this.currentBlob = null;
        }
        this.el.value = '';
        this.removeBtn.classList.remove('is-visible');
        this.wrap.classList.remove('has-file-active');

        setTimeout(() => {
            this.renderEl.innerHTML = '';
            this.renderEl.classList.remove('has-img');
        }, 300);

        if (typeof this.config.onRemove === 'function') this.config.onRemove();
    }
}

OS.prototype.ImagePreview = function(options) {
    return this.each(function() {
        new ImagePreview(this, options);
    });
};
