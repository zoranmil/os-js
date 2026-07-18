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
 * along with this program. If not, see <https://gnu.org>.
 *
 * @category   E-commerce
 * @package    OpenShop
 * @author     Zoran Milićević
 * @version    2.7.0
 * @license    AGPL-3.0-or-later
 */

/**
 * Formatiranje brojeva - Nativna optimizacija
 */
function number_format(number, decimals, dec_point, thousands_sep) {
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

/**
 * Glavna kalkulacija korpe i renderovanje HTML-a
 */
let calculate = function(r) {
    let reci = [
        "Vaš proizvod je u korpi",
        "Vaš proizvod brisan"
    ];

    // 1. ŠTIT: Čuvamo globalni checkout objekat od brisanja
    let radni_checkout = window.checkout;
    if (!radni_checkout || typeof radni_checkout !== 'object') {
        console.warn("⚠️ window.checkout je bio prazan ili undefined! Prisilno pravim lokalni čist objekat.");
        radni_checkout = { c: 0, zbirnobezpdv: 0, prevoz: "0", p: [] };
    }

    // 2. Pretvaranje objekta u čist niz
    let stavke_niz = [];
    if (radni_checkout && radni_checkout['p']) {
        if (Array.isArray(radni_checkout['p'])) {
            stavke_niz = radni_checkout['p'];
        } else if (typeof radni_checkout['p'] === 'object') {
            stavke_niz = Object.values(radni_checkout['p']);
        }
    }

    // Keširanje DOM elemenata preko čistih JavaScript metoda
    const countStyles = document.querySelectorAll(".count-style");
    const pdvVrednost = document.getElementById("pdv_vrednost");
    const bezPdvVrednost = document.getElementById("bez_pdv_vrednost");
    const shopingCartG = document.getElementById("shoping_cart_g");
    const isporukaG = document.getElementById("isporuka_g");
    const cenaG = document.getElementById("cena_g");
    const premaKorpi = document.getElementById("premakorpi");
    const shoppingCartContent = document.querySelector(".shopping-cart-content");
    // ==========================================
    // SCENARIO 1: KORPA JE POTPUNO PRAZNA
    // ==========================================
    if (stavke_niz.length == 0) {
        countStyles.forEach(el => el.innerHTML = "0");
        if (pdvVrednost) pdvVrednost.style.display = "none";
        if (bezPdvVrednost) bezPdvVrednost.style.display = "none";
        if (shopingCartG) shopingCartG.innerHTML = "";
        if (isporukaG) isporukaG.textContent = "0 rsd";
        if (cenaG) cenaG.textContent = "0 rsd";

        if (premaKorpi) {
            premaKorpi.innerHTML = "";
            premaKorpi.style.display = "none";
            premaKorpi.classList.add("d-none");
        }
        if (shoppingCartContent) shoppingCartContent.classList.remove('cart-visible');

        if (r == 1) {
            sinhronizujDexieSaServerom(radni_checkout).then(function() {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: reci[r],
                        confirmButtonText: "U redu",
                        showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
                        hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' }
                    });
                }
            }).catch(function(err) {
                console.error("Dexie greška pri čišćenju prazne korpe:", err);
            });
        }
        return;
    }

    // ==========================================
    // SCENARIO 2: KORPA IMA ARTIKLE
    // ==========================================
    let html = "";
    countStyles.forEach(el => el.innerHTML = radni_checkout['c']);

    // Brza nativna forEach petlja umesto starog $.each
    stavke_niz.forEach(function(artikal) {
        if (!artikal) return;
        let atributiHtml = '';
        let imaBoju = !!(artikal.cssboja && artikal.cssboja.trim() !== '');
        let imaVelicinu = !!(artikal.velicina && String(artikal.velicina).trim() !== '');

        if (imaBoju || imaVelicinu) {
            atributiHtml = '<div class="color-content"><ul>';
            if (imaBoju) {
                atributiHtml += '<li style="background-color:' + artikal.cssboja + ';"></li>';
            }
            if (imaVelicinu) {
                atributiHtml += '<li class="ostalo">' + artikal.velicina + '</li>';
            }
            atributiHtml += '</ul></div>';
        }

        html += '<li class="single-shopping-cart">\
            <div class="shopping-cart-delete">\
                <a href="#" class="deleteproduct" data-type="' + artikal.type + '" data-id="' + artikal.id + '" data-sid="' + artikal.sid + '"><i class="fa fa-times-circle"></i></a>\
            </div>\
            <div class="shopping-cart-img">\
                <a href="' + window.SITE_ORG_URL + artikal.alias + '"><img alt="" src="' + window.SITE_ORG_URL + artikal.image + '"></a>\
            </div>\
            <div class="shopping-cart-title">\
                <h4><a href="' + window.SITE_ORG_URL + artikal.alias + '">' + artikal.naziv + '</a></h4>\
                <h6>Kol:' + artikal.qty + ' </h6>\
                <span>' + number_format(artikal.price * artikal.qty, 2, '.', ",") + ' rsd ' + atributiHtml + '</span>\
            </div>\
        </li>';
    });

    if (shopingCartG) shopingCartG.innerHTML = html;

    if (isporukaG) {
        if (radni_checkout['prevoz'] == '0' || (radni_checkout['prevoz'] && radni_checkout['prevoz'] != 'ne')) {
            isporukaG.textContent = number_format(radni_checkout['prevoz'], 2, '.', ",") + " rsd";
        } else {
            isporukaG.textContent = " ";
        }
    }

    let zbirnobezpdv = parseFloat(radni_checkout['zbirnobezpdv']) || 0;
    let pdv = parseFloat(radni_checkout['pdv']) || 0;
    let prevoz = parseFloat(radni_checkout['prevoz']) || 0;
    let ukupna_cena = zbirnobezpdv + pdv + prevoz;

    if (cenaG) cenaG.textContent = number_format(ukupna_cena, 2, '.', ",") + " rsd";

    if (pdv > 0) {
        if (bezPdvVrednost) bezPdvVrednost.style.display = "none";
        if (pdvVrednost) pdvVrednost.style.display = "block";
    } else {
        if (bezPdvVrednost) bezPdvVrednost.style.display = "block";
        if (pdvVrednost) pdvVrednost.style.display = "none";
    }

    let dugmadHtml = `
        <a class="default-btn w-100" href="${window.SITE_ORG_URL}cart-page">vidi korpu</a>
        ${!window.isregistark ? `<a class="default-btn w-100" href="${window.SITE_ORG_URL}checkout">idi na plaćanje</a>` : ''}
    `;

    if (premaKorpi) {
        premaKorpi.innerHTML = dugmadHtml;
        Object.assign(premaKorpi.style, { display: "grid", visibility: "visible", opacity: "1" });
        premaKorpi.classList.remove("d-none");
        premaKorpi.classList.add("d-grid");
    }

    // Bezbedno osvežavanje event listenera preko kloniranja čvora u memoriji
    if (shopingCartG) {
        const noviKontejner = shopingCartG.cloneNode(true);
        shopingCartG.parentNode.replaceChild(noviKontejner, shopingCartG);

        noviKontejner.addEventListener("click", function(e) {
            const link = e.target.closest(".deleteproduct");
            if (link) {
                e.preventDefault();
                let type = link.getAttribute("data-type");
                let id = link.getAttribute("data-id");
                let sid = link.getAttribute("data-sid");
                if (typeof window.deleteproduct === 'function') {
                    window.deleteproduct(type, id, sid);
                }
            }
        });
    }

    if (r > 1) return;
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: reci[r],
            confirmButtonText: "U redu",
            showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
            hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' }
        });
    }
};
/**
 * Sinhronizacija Dexie.js baze sa serverskim checkout stanjem
 */
function sinhronizujDexieSaServerom(data) {
    console.log("🔄 [Dexie Sinhronizacija] Pokrenut modul...", data);
    if (typeof window.db === 'undefined' || !window.db || !window.db.cart || !window.db.cartukupno) return Promise.resolve();

    if (!data || !data.p || !Array.isArray(data.p) || data.p.length === 0) {
        console.log("🧹 [Dexie] Korpa je prazna. Čistim sve tabele...");
        return Promise.all([
            window.db.cart.clear(),
            window.db.cartukupno.clear()
        ]);
    }

    return window.db.cart.toCollection().first().then(function(biloKojiArtikal) {
        let trenutnoVreme = new Date().getTime();
        let vremeKorpe = trenutnoVreme;

        if (biloKojiArtikal && biloKojiArtikal.kreirano) {
            vremeKorpe = biloKojiArtikal.kreirano;
        }

        return Promise.all([
            window.db.cart.clear(),
            window.db.cartukupno.clear()
        ]).then(function() {
            let svaObećanjaUpisa = [];

            data.p.forEach(function(stavka) {
                let redId = String(stavka.id) + "-" + String(stavka.sid);
                svaObećanjaUpisa.push(window.db.cart.put({
                    id: redId,
                    type: String(stavka.type),
                    pid: String(stavka.id),
                    sid: String(stavka.sid),
                    naziv: stavka.naziv,
                    cena: parseFloat(stavka.price) || 0,
                    qty: parseInt(stavka.qty) || 0,
                    slike: stavka.image,
                    tezina: parseFloat(stavka.prod ? stavka.prod.tezina : 0) || 0,
                    sifra: stavka.sifra,
                    alias: stavka.alias,
                    product: stavka.prod,
                    cssboja: stavka.cssboja,
                    kreirano: vremeKorpe
                }));
            });

            svaObećanjaUpisa.push(window.db.cartukupno.put({
                id: 1,
                broj: parseInt(data.c) || 0,
                ukupno: parseFloat(data.u) || 0,
                prevoz: parseFloat(data.prevoz) || 0,
                zaprevoz_min: parseFloat(data.zaprevoz_min) || 0,
                zbirnobezpdv: parseFloat(data.zbirnobezpdv) || 0,
                pdv: parseFloat(data.pdv) || 0
            }));

            return Promise.all(svaObećanjaUpisa);
        });
    }).catch(function(greska) {
        console.error("❌ Greška tokom Dexie sinhronizacije:", greska);
    });
}

/**
 * Uklanjanje proizvoda iz korpe preko Fetch API-ja (Potpuna Vanilla JS zamena za $.ajax)
 */
let deleteproduct = function(type, id, sid) {
    const url = window.SITE_ORG_URL + 'ajax/index_checkout';

    // Formiranje URLSearchParams-a za slanje čistog aplikativnog x-www-form-urlencoded paketa
    const formData = new URLSearchParams();
    formData.append("delete", "1");
    formData.append("type", type);
    formData.append("id", id);
    formData.append("sid", sid);
    formData.append("dexie_osigurac", JSON.stringify(window.checkout));

    fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: formData.toString()
    })
    .then(response => {
        if (!response.ok) throw new Error("Mrežna greška pri komunikaciji sa serverom.");
        return response.json();
    })
    .then(data => {
        window.checkout = data;

        // Sinhronizacija skladišta, pa tek onda osvežavanje interfejsa preko kalkulacije
        sinhronizujDexieSaServerom(window.checkout).then(function() {
            calculate(1);
        }).catch(function(err) {
            console.error("Dexie greška nakon brisanja artikla:", err);
            calculate(1); // Sigurnosni fallback
        });
    })
    .catch(error => {
        console.error("Fetch Error:", error);
    });
};
