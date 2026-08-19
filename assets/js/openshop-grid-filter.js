/**
 * ============================================================================
 * OPENSHOP (OS) GRID FILTER & SEARCH ENGINE - ALL-IN-ONE SPECIFIKACIJA
 * ============================================================================
 *
 * 🛠️ 1. KLIJENTSKA IMPLEMENTACIJA (FRONTEND)
 * ----------------------------------------------------------------------------
 * HTML Struktura (Admin Panel - Proizvodi):
 *
 * <div class="admin-grid-kontrole">
 *     <!-- Polje za pretragu -->
 *     <input type="text" id="search-proizvodi" placeholder="Pretraži šifru, naziv, barkod..." autocomplete="off">
 *
 *     <!-- Dodatni filteri (Plugin ih može skupljati automatski) -->
 *     <select id="filter-kategorija">
 *         <option value="">Sve kategorije</option>
 *         <option value="1">Elektronika</option>
 *     </select>
 * </div>
 *
 * <!-- Kontejner koji OS.ajax dinamički osvežava (Zadržava inicijalni backend render) -->
 * <div id="grid-tabela-wrapper">
 *     <?php include 'tabela_proizvoda.php'; ?>
 * </div>
 *
 * ----------------------------------------------------------------------------
 * JS Inicijalizacija:
 *
 * OS(function() {
 *     OS('#search-proizvodi').gridFilter({
 *         url: '/admin/proizvodi/grid-data',
 *         target: '#grid-tabela-wrapper',
 *         wait: 300,
 *         extraFilters: function() {
 *             return {
 *                 kategorija_id: OS('#filter-kategorija').val()
 *             };
 *         },
 *         beforeSend: function() {
 *             OS('#grid-tabela-wrapper').css('opacity', '0.4'); // Vizuelni feedback
 *         },
 *         success: function(response) {
 *             OS('#grid-tabela-wrapper').css('opacity', '1');
 *         }
 *     });
 *
 *     // Ako se promeni select box, odmah okini pretragu bez čekanja
 *     OS('#filter-kategorija').on('change', function() {
 *         OS('#search-proizvodi').trigger('input');
 *     });
 * });
 *
 * ============================================================================
 * 🖥️ 2. SERVERSKA IMPLEMENTACIJA (BACKEND - PHP / SQL OPTIMIZACIJA)
 * ----------------------------------------------------------------------------
 * Da bi pretraga radila "kao podmazana" na hiljadama proizvoda, baza MORA imati
 * indeks na kolonama koje se pretražuju.
 *
 * SQL Indeks (Pokreni ovo u bazi podataka):
 * ALTER TABLE proizvodi ADD INDEX idx_pretraga (sifra, naziv(100), barkod);
 *
 * PHP Backend Kontroler (/admin/proizvodi/grid-data):
 * <?php
 * // 1. Prihvatanje sanitizovanih parametara sa frontenda
 * $search = isset($_GET['search']) ? trim($_GET['search']) : '';
 * $kategorijaId = isset($_GET['kategorija_id']) ? (int)$_GET['kategorija_id'] : 0;
 *
 * // 2. Izgradnja brze i optimizovane SQL skripte
 * $query = "SELECT * FROM proizvodi WHERE status = 1";
 * $params = [];
 *
 * if (!empty($search)) {
 *     // Koristi se LIKE sa desnim džokerom 'reč%' ako je moguće zbog indeksa,
 *     // ili '%reč%' za fleksibilniju pretragu hiljada artikala.
 *     $query .= " AND (naziv LIKE ? OR sifra LIKE ? OR barkod = ?)";
 *     $params[] = "%$search%";
 *     $params[] = "$search%";
 *     $params[] = $search;
 * }
 *
 * if ($kategorijaId > 0) {
 *     $query .= " AND kategorija_id = ?";
 *     $params[] = $kategorijaId;
 * }
 *OS(function() {
    // Pokretanje motora na input polju
    OS('#search-proizvodi').gridFilter({
        url: '/admin/proizvodi/grid-data',
        target: '#grid-tabela-wrapper',
        exportBtn: '#btn-eksport-proizvoda',
        exportUrl: '/admin/proizvodi/export-csv',
        extraFilters: function() {
            return { kategorija_id: OS('#filter-kategorija').val() };
        }
    });

    // Ako admin promeni kategoriju, odmah osvežavamo tabelu
    OS('#filter-kategorija').on('change', function() {
        OS('#search-proizvodi').trigger('triggerSearch');
    });
});
 * $query .= " ORDER BY id DESC LIMIT 50"; // Limitiranje sprečava zagušenje memorije
 *
 * // 执行 / Izvršavanje upita i renderovanje parcijalnog HTML-a (tabela_proizvoda.php)
 * $proizvodi = $db->execute($query, $params);
 * foreach ($proizvodi as $proizvod) {
 *     echo "<tr><td>{$proizvod['sifra']}</td><td>{$proizvod['naziv']}</td></tr>";
 * }
 * ?>
 * ============================================================================
 */
 (function(OS) {
      'use strict';

      if (!OS) {
          console.error('OS.GridEngine: Core biblioteka OpenShop nije učitana.');
          return;
      }
      OS.fn.gridFilter = function(options) {
          // 1. Spajanje konfiguracije koristeći ugrađeni OS.extend
          var settings = OS.extend({
              url: '',
              target: '',
              wait: 300,
              exportBtn: '',
              exportUrl: '',
              extraFilters: null,
              beforeSend: null,
              success: null
          }, options);

          if (!settings.url || !settings.target) {
              console.error('OS.gridFilter: Parametri "url" i "target" su obavezni.');
              return this;
          }

          var $targetContainer = OS(settings.target);

          /**
           * ============================================================================
           * 🔄 PRECIZNA EVENT DELEGACIJA (Multi-Instance Safe)
           * Slušamo klikove na nivou krovnog kontejnera ove konkretne instance.
           * Povezujemo kliknuti element sa inputom preko "data-os-grid-target" atributa.
           * ============================================================================
           */

          // 1. ASINHRONA PAGINACIJA PREKO DELEGACIJE
          $targetContainer.on('click', '.os-page-link', function(e) {
              e.preventDefault();
              var selektovanaStrana = this.getAttribute('data-page');
              // Pronalazimo input polje koje je eksplicitno mapirano za ovaj target kontejner
              var aktivniInput = document.querySelector('input[data-os-grid-target="' + settings.target + '"]');
              if (selektovanaStrana && aktivniInput) {
                  // Šaljemo internu poruku (CustomEvent) izolovanom stanju input polja
                  aktivniInput.dispatchEvent(new CustomEvent('goToPage', { detail: selektovanaStrana }));
              }
          });

          // 2. DINAMIČKO SORTIRANJE KOLONA PREKO DELEGACIJE
          $targetContainer.on('click', 'th[data-sort]', function() {
              var poljeZaSort = this.getAttribute('data-sort');
              var aktivniInput = document.querySelector('input[data-os-grid-target="' + settings.target + '"]');
              if (poljeZaSort && aktivniInput) {
                  // Šaljemo internu poruku izolovanom stanju input polja za promenu kolone
                  aktivniInput.dispatchEvent(new CustomEvent('changeSort', { detail: poljeZaSort }));
              }
          });

          /**
           * ============================================================================
           * 🚀 INICIJALIZACIJA INSTANCE I ENKAPSULACIJA STANJA
           * ============================================================================
           */
          return this.each(function() {
              var inputElement = this; // Sirovi DOM element input polja
              var $inputField = OS(inputElement);

              // Unutrašnje izolovo stanje grida za SVAKI element pojedinačno
              var trenutnaStranica = 1;
              var trenutniSort = 'id';
              var trenutniSmer = 'DESC';

              // Generisanje ključa za sesiju na osnovu URL-a
              var storageKljuc = 'os_grid_' + btoa(settings.url).substring(0, 15);

              // Mapiramo ovaj konkretan input sa njegovim target kontejnerom
              inputElement.setAttribute('data-os-grid-target', settings.target);

              // Funkcija za skupljanje parametara iz svih izvora
              var sakupiSveParametre = function(trenutniTekst) {
                  var params = {
                      search: trenutniTekst || '',
                      page: trenutnaStranica,
                      sort_by: trenutniSort,
                      sort_dir: trenutniSmer
                  };
                  if (typeof settings.extraFilters === 'function') {
                      params = OS.extend(params, settings.extraFilters.call(inputElement));
                  }
                  return params;
              };

              // Funkcija za učitavanje istorije pretrage (ako admin klikne "Nazad")
              var ucitajPrethodnoStanje = function() {
                  var sacuvanaIstorija = sessionStorage.getItem(storageKljuc);
                  if (sacuvanaIstorija) {
                      try {
                           var staraStanja = JSON.parse(sacuvanaIstorija);
                           if (inputElement && staraStanja.search) {
                               inputElement.value = staraStanja.search;
                           }
                           trenutnaStranica = staraStanja.page || 1;
                           trenutniSort = staraStanja.sort_by || 'id';
                           trenutniSmer = staraStanja.sort_dir || 'DESC';
                      } catch (e) {
                           console.warn('Neuspešno parsiranje prethodnog stanja grida.');
                      }
                  }
                  osveziGridPodatke(); // Prvo punjenje
              };

              /**
               * Glavna AJAX funkcija za povlačenje podataka
               */
              var osveziGridPodatke = function() {
                  var trenutniTekst = inputElement ? inputElement.value : '';
                  var sviParametri = sakupiSveParametre(trenutniTekst);

                  sessionStorage.setItem(storageKljuc, JSON.stringify(sviParametri));
                  if (typeof settings.beforeSend === 'function') {
                      settings.beforeSend.call(inputElement);
                  }

                  OS.ajax({
                      url: settings.url,
                      type: 'GET',
                      data: sviParametri,
                      success: function(response) {
                          $targetContainer.html(response);
                          if (typeof settings.success === 'function') {
                              settings.success.call(inputElement, response);
                          }
                      },
                      error: function(xhr, statusText) {
                          console.error('OS.GridEngine greška pri učitavanju:', statusText);
                          if (targetContainer) $targetContainer.style.opacity = '1';
                      }
                  });
              };

              // Debounce mehanizam sa stranice 10 biblioteke za kucanje na tastaturi
              var debouncedOsvezi = OS.debounce(function() {
                  trenutnaStranica = 1;
                  osveziGridPodatke();
              }, settings.wait);

              /**
               * MAPIRANJE INTERNIH POREMEĆAJA (Custom Event Slušaoci)
               * Primaju signale iz krovne delegacije i primenjuju ih na izolovano stanje
               */
              inputElement.addEventListener('goToPage', function(e) {
                  trenutnaStranica = parseInt(e.detail, 10);
                  osveziGridPodatke();
              });

              inputElement.addEventListener('changeSort', function(e) {
                  var poljeZaSort = e.detail;
                  if (trenutniSort === poljeZaSort) {
                      trenutniSmer = (trenutniSmer === 'ASC') ? 'DESC' : 'ASC';
                  } else {
                      trenutniSort = poljeZaSort;
                      trenutniSmer = 'ASC';
                  }
                  trenutnaStranica = 1;
                  osveziGridPodatke();
              });

              // 3. EKSPORT U CSV (Preuzimanje fajla sa trenutnim filterima)
              if (settings.exportBtn && settings.exportUrl) {
                  var exportElement = document.querySelector(settings.exportBtn);
                  if (exportElement) {
                      exportElement.addEventListener('click', function(e) {
                          e.preventDefault();
                          var trenutniTekst = inputElement ? inputElement.value : '';
                          var trenutneMape = sakupiSveParametre(trenutniTekst);
                          var queryString = OpenShop.param(trenutneMape);
                          window.location.href = settings.exportUrl + '?' + queryString;
                      });
                  }
              }

              // Slušamo 'input' jer pokriva kucanje, brisanje i paste akciju
              if (inputElement && (inputElement.tagName === 'INPUT' || inputElement.tagName === 'TEXTAREA')) {
                  inputElement.addEventListener('input', debouncedOsvezi);

                  inputElement.addEventListener('triggerSearch', function() {
                      trenutnaStranica = 1;
                      osveziGridPodatke();
                  });
              }

              // Pokretanje provere istorije i prvog učitavanja na nivou ove instance
              ucitajPrethodnoStanje();
          });
      };


  })(window.OpenShop || window.OS);
