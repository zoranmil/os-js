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
     'use strict';

     class OpenShopGallery {
         constructor(options) {
             // Podrazumevana podešavanja i prevodi prilagođeni tvom sistemu
             this.defaults = {
                 productId: 0,
                 ajaxUrl: '',
                 imageContainer: '.hex-grid',
                 docContainer: '#sorter',
                 nextImageId: 1,
                 nextDocId: 1,
                 lang: {
                     imgUploading: 'Učitavanje slika, molimo sačekajte...',
                     docUploading: 'Učitavanje dokumenata, molimo sačekajte...',
                     imgSuccess: 'Sve slike su uspešno sačuvane!',
                     docSuccess: 'Dokument je uspešno sačuvan!',
                     imgDeleteConfirm: 'Da li ste sigurni da želite da obrišete ovu sliku?',
                     docDeleteConfirm: 'Da li ste sigurni da želite da obrišete ovaj dokument?',
                     enterTitle: 'Molimo unesite naziv dokumenta.'
                 }
             };

             // Spajanje opcija spread operatorom umesto Object.assign
             this.config = { ...this.defaults, ...options };
             this.now = 0;
             this.queue = null;

             this.init();
         }

         /**
          * Inicijalizacija komponente i automatsko vezivanje tvog OS Sortable sistema
          */
         init() {
             // 1. Aktivacija tvog OS Sortable na galeriji slika (koristi klase iz novog CSS-a)
             if (OS(this.config.imageContainer).length) {
                 OS(this.config.imageContainer).Sortable({
                     handle: '.portlet-header',
                     onUpdate: () => this.updateLayout('images')
                 });
                 this.bindDeleteEvents('images');
             }

             // 2. Aktivacija tvog OS Sortable na listi dokumenata
             if (OS(this.config.docContainer).length) {
                 OS(this.config.docContainer).Sortable({
                     handle: '.handle',
                     onUpdate: () => this.updateLayout('docs')
                 });
                 this.bindDeleteEvents('docs');
             }
         }
         // ==========================================================================
         // DEO 2: ASINHRONI CEVOVOD (PIPELINE) ZA UPLOAD SLIKA
         // ==========================================================================

         /**
          * Pokreće masovni upload slika iz liste izabranih fajlova
          */
         uploadImages(files) {
             if (this.queue !== null) return;
             this.queue = files;
             this.now = 0;

             const uploadBtn = document.querySelector('.uploadmulti');
             if (uploadBtn) uploadBtn.disabled = true;

             // Pokretanje tvog ugrađenog OS Loadera za vreme slanja
             OS.notify.loading(this.config.lang.imgUploading);
             this.runImageUpload();
         }

         /**
          * Pojedinačni Ajax upload trenutnog fajla iz reda (queue)
          */
         runImageUpload() {
             const currentId = this.config.nextImageId;
             this.renderImagePlaceholder(currentId);

             const formData = new FormData();
             formData.append('file-upload', this.queue[this.now]);
             formData.append('broj', currentId);
             formData.append('product_id', this.config.productId);
             formData.append('op', 'upload');

             const xhr = new XMLHttpRequest();
             xhr.open('POST', this.config.ajaxUrl, true);

             // Nativni XHR Progress: Pomera tvoju Bootstrap liniju napretka u realnom vremenu
             if (xhr.upload) {
                 xhr.upload.addEventListener('progress', (e) => {
                     if (e.lengthComputable) {
                         const pct = Math.round((e.loaded / e.total) * 100);
                         const progressBar = document.getElementById(`bar${currentId}`);
                         if (progressBar) progressBar.style.width = pct + '%';
                     }
                 }, false);
             }

             xhr.onload = () => {
                 if (xhr.status >= 200 && xhr.status < 300) {
                     const data = JSON.parse(xhr.responseText);
                     if (data.err === '0' || data.err === 0) {
                         const box = document.getElementById(`box${currentId}`);
                         const item = document.getElementById(`dodatos${currentId}`);
                         const previewSlot = document.getElementById(`sl${currentId}`);

                         if (box) box.setAttribute('data-id', data.id);
                         if (item) item.setAttribute('data-id', data.id);
                         if (previewSlot) {
                             previewSlot.innerHTML = `<img class="image img-fluid rounded" src="${data.image}" width="187">`;
                         }
                     } else {
                         const item = document.getElementById(`dodatos${currentId}`);
                         if (item) item.remove();
                     }
                     this.finalizeImageStep();
                 } else {
                     this.handleImageError(currentId);
                 }
             };

             xhr.onerror = () => this.handleImageError(currentId);
             xhr.send(formData);
         }

         /**
          * Završava trenutni korak i prelazi na sledeću sliku ili zatvara red
          */
         finalizeImageStep() {
             this.now++;
             this.config.nextImageId++;

             if (this.now < this.queue.length) {
                 this.runImageUpload();
             } else {
                 const uploadBtn = document.querySelector('.uploadmulti');
                 const orderBtn = document.querySelector('.orderingmulti');
                 if (uploadBtn) uploadBtn.disabled = false;
                 if (orderBtn) orderBtn.disabled = false;

                 this.now = 0;
                 this.queue = null;

                 // Sakrij privremeni loader i okini tvoj ugrađeni OS.notify uspeh
                 OS.notify.hide();
                 OS.notify.success(this.config.lang.imgSuccess);

                 this.refreshSortable(this.config.imageContainer);
             }
         }

         /**
          * Rukovanje greškama u toku prenosa slike
          */
         handleImageError(id) {
             const item = document.getElementById(`dodatos${id}`);
             if (item) item.remove();
             OS.notify.hide();
             OS.notify.error('Greška pri učitavanju slike.');
             this.finalizeImageStep();
         }

         /**
          * Ubacuje HTML kostur (placeholder) za novu sliku pre samog slanja
          */
         renderImagePlaceholder(id) {
             const html = `
                 <div class="hex-grid__item border rounded p-2 text-center os-sortable-item" id="dodatos${id}" data-id="0">
                     <div class="img-operations d-flex justify-content-between mb-2" id="box${id}">
                         <a class="portlet-header text-secondary" href="javascript:void(0)">
                             <i class="os-icon os-icon-arrows"></i>
                         </a>
                         <a id="del${id}" data-id="${id}" class="text-danger delete-img-btn" href="#">
                             <i class="os-icon os-icon-trash"></i>
                         </a>
                     </div>
                     <div id="sl${id}" class="text-center mb-2"></div>
                     <div class="meter animate">
                         <span id="bar${id}" style="width: 0%"></span>
                     </div>
                 </div>`;

             const grid = document.querySelector(this.config.imageContainer);
             if (grid) grid.insertAdjacentHTML('beforeend', html);
             this.bindSingleDelete('images', id);
         }
         // ==========================================================================
         // DEO 3: SLANJE DOKUMENATA I SINHRONIZACIJA RASPOREDA (ORDERING)
         // ==========================================================================

         /**
          * Validira naslov i šalje izabrani dokument na server
          */
         uploadDocuments(fileElementId, titleInputId) {
             const titleInput = document.getElementById(titleInputId);
             const fileInput = document.getElementById(fileElementId);

             if (!titleInput || titleInput.value.trim() === '') {
                 OS.notify.alert(this.config.lang.enterTitle, 'Upozorenje');
                 return;
             }

             if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                 fileInput.click();
                 return;
             }

             OS.notify.loading(this.config.lang.docUploading);

             const currentId = this.config.nextDocId;
             const formData = new FormData();
             formData.append('doc-upload', fileInput.files[0]);
             formData.append('broj', currentId);
             formData.append('product_id', this.config.productId);
             formData.append('naziv', titleInput.value);
             formData.append('op', 'uploaddoc');

             const xhr = new XMLHttpRequest();
             xhr.open('POST', this.config.ajaxUrl, true);

             xhr.onload = () => {
                 OS.notify.hide();
                 if (xhr.status >= 200 && xhr.status < 300) {
                     const data = JSON.parse(xhr.responseText);
                     if (data.err === '0' || data.err === 0) {
                         this.renderDocRow(data.id, titleInput.value);
                         titleInput.value = '';
                         fileInput.value = '';
                         this.config.nextDocId++;
                         OS.notify.success(this.config.lang.docSuccess);
                     } else {
                         OS.notify.error('Server je vratio grešku.');
                     }
                 }
             };

             xhr.onerror = () => {
                 OS.notify.hide();
                 OS.notify.error('Mrežna greška.');
             };

             xhr.send(formData);
         }

         /**
          * Crta novi red unutar liste dokumenata nakon uspešnog slanja
          */
         renderDocRow(id, title) {
             const html = `
                 <li class="list-group-item d-flex justify-content-between align-items-center os-sortable-item" data-id="${id}" id="dodatosf${id}">
                     <span class="fw-bold text-secondary" id="nazivf${id}">${title}</span>
                     <div class="btns d-flex gap-3 justify-content-end">
                         <i class="handle os-icon os-icon-list" style="cursor:pointer"></i>
                         <i data-id="${id}" class="handles delddoc os-icon os-icon-trash" style="cursor:pointer"></i>
                     </div>
                 </li>`;

             const list = document.querySelector(this.config.docContainer);
             if (list) list.insertAdjacentHTML('beforeend', html);
             this.bindSingleDelete('docs', id);
             this.refreshSortable(this.config.docContainer);
         }

         /**
          * Skuplja trenutne ID-eve sa ekrana i šalje novi redosled na PHP backend
          */
         updateLayout(type) {
             const containerSelector = type === 'images' ? this.config.imageContainer : this.config.docContainer;
             const items = document.querySelectorAll(`${containerSelector} .os-sortable-item`);
             let orderIds = [];

             items.forEach(item => {
                 const id = item.getAttribute('data-id');
                 if (id && id !== '0') orderIds.push(id);
             });

             if (orderIds.length === 0) return;

             // Koristimo tvoj izvorni OS.post metod prosleđen kroz PDF dokumentaciju
             OS.post(this.config.ajaxUrl, {
                 op: type === 'images' ? 'ordering' : 'orderingdoc',
                 slike: orderIds.join(',')
             }, (response) => {
                 // Raspored uspešno ažuriran u bazi, nema potrebe za dodatnim iskakanjem poruka
             });
         }
         // ==========================================================================
         // DEO 4: MODALNO BRISANJE ELEMENATA I ZATVARANJE KLASE
         // ==========================================================================

         /**
          * Pronalazi sve dugmiće za brisanje na stranici i vezuje događaje
          */
         bindDeleteEvents(type) {
             const selector = type === 'images' ? '.delete-img-btn' : '.delddoc';
             document.querySelectorAll(selector).forEach(btn => {
                 const id = btn.getAttribute('data-id');
                 this.bindSingleDelete(type, id);
             });
         }

         /**
          * Vezuje klik događaj za pojedinačno dugme i otvara tvoj OS.notify.confirm2 modal
          */
         bindSingleDelete(type, id) {
             const btnSelector = type === 'images' ? `#del${id}` : `[data-id="${id}"].delddoc`;
             const element = document.querySelector(btnSelector);
             if (!element) return;

             element.onclick = (e) => {
                 e.preventDefault();
                 e.stopPropagation();

                 const itemSelector = type === 'images' ? `#dodatos${id}` : `#dodatosf${id}`;
                 const domItem = document.querySelector(itemSelector);
                 const backendId = domItem ? domItem.getAttribute('data-id') : id;

                 // Pozivanje tvog ugrađenog modalnog sistema iz OpenShop Framework-a
                 OS.notify.confirm2(
                     type === 'images' ? this.config.lang.imgDeleteConfirm : this.config.lang.docDeleteConfirm,
                     () => {
                         // Korišćenje tvog OS.post metoda za brisanje na backendu
                         OS.post(this.config.ajaxUrl, {
                             op: type === 'images' ? 'delete' : 'deletedoc',
                             id: backendId
                         }, (res) => {
                             if (domItem) domItem.remove();
                             this.refreshSortable(type === 'images' ? this.config.imageContainer : this.config.docContainer);
                             OS.notify.success('Obrisano uspešno!');
                         });
                     },
                     'Potvrdi brisanje'
                 );
             };
         }

         /**
          * Osvežava stanje unutar tvog OS Sortable sistema nakon izmena u DOM-u
          */
         refreshSortable(containerSelector) {
             if (OS(containerSelector).length) {
                 OS(containerSelector).Sortable();
             }
         }
     }

     // Eksportujemo novu čistu klasu u tvoj globalni OpenShop/OS objekat
     OS.Gallery = OpenShopGallery;

 })(OpenShop);
