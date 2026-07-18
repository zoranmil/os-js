/**
 * OpenShop QuickView Engine (v2.0 - Global Production Ready)
 * Klasa za dinamičko upravljanje brzim pregledom i slanjem u korpu.
 * Optimizovano za OpenShop JS Core Engine i Bootstrap 5.
 */
class OpenShopQuickView {
    constructor() {
        this.currentProductColors = [];
        this.currentProductId = null;
    }

    // Otvaranje modala i povlačenje podataka sa bilo koje stranice
    open(pid) {
        const self = this;
        this.currentProductId = pid; // Pamti ID otvorenog proizvoda

        OS.ajax({
            url: 'ajax/quickview.php',
            type: 'POST',
            data: { id: pid },
            dataType: 'json',
            success: function(res) {
                if (res.err) return;

                // Popunjavanje osnovnih podataka kroz OpenShop engine
                OS('#qv-title').text(res.title);
                OS('#qv-price').text(res.price);
                OS('#qv-cat').text(res.cat);
                OS('#qv-img').attr('src', res.img);

                // Čuvanje boja u kontekst klase
                self.currentProductColors = res.colors;

                // Generisanje krugova za boje
                let colorsHtml = '';
                res.colors.forEach((c, i) => {
                    colorsHtml += `<div class="color-swatch ${i === 0 ? 'active' : ''}"
                    style="background:${c.hex}" data-color="${c.name}" data-index="${i}" onclick="quickView.selectSwatch(this)">
                    </div>`;
                });
                OS('#qv-colors').html(colorsHtml);

                // Postavljanje imena prve boje
                OS('#selected-color-name').text(res.colors[0] ? res.colors[0].name : '');

                // Renderovanje veličina za prvu boju
                self.renderSizes(0);

                // Resetovanje količine na 1
                OS('.qty-input').val(1);

                // Otvaranje modala pomoću ugrađene Bootstrap integracije
                OS('#quickViewModal').modal('show');
            }
        });
    }

    // Dinamičko renderovanje veličina za izabranu boju
    renderSizes(colorIndex) {
        let sizesHtml = '';
        const colorData = this.currentProductColors[colorIndex];

        if (colorData && colorData.sizes && colorData.sizes.length > 0) {
            colorData.sizes.forEach((s, i) => {
                sizesHtml += `<button class="btn btn-outline-dark btn-sm px-3 rounded-3
                ${i === 0 ? 'active' : ''}" onclick="quickView.selectSize(this)">${s}</button>`;
            });
        } else {
            sizesHtml = '<span class="text-danger small">Nema dostupnih veličina.</span>';
        }

        OS('#qv-sizes').html(sizesHtml);
    }

    // Selektovanje boje na klik
    selectSwatch(el) {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        el.classList.add('active');

        OS('#selected-color-name').text(el.getAttribute('data-color'));

        const colorIndex = parseInt(el.getAttribute('data-index'));
        this.renderSizes(colorIndex);
    }

    // Selektovanje veličine na klik
    selectSize(el) {
        el.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    }

    // Promena količine (+/-)
    changeQty(n) {
        let $input = OS('.qty-input');
        let val = parseInt($input.val()) + n;
        if (val >= 1) $input.val(val);
    }

    // Maestralno skupljanje podataka i slanje u pravu korpu
    addToCart() {
        // 1. Prikupljanje izabranih varijacija sa interfejsa
        const productId = this.currentProductId;
        const qty = parseInt(OS('.qty-input').val()) || 1;

        // Pronalaženje aktivne boje preko klase .active
        const activeColorEl = document.querySelector('.color-swatch.active');
        const selectedColor = activeColorEl ? activeColorEl.getAttribute('data-color') : '';

        // Pronalaženje aktivne veličine (dugme unutar #qv-sizes koje ima .active)
        const activeSizeEl = document.querySelector('#qv-sizes .btn.active');
        const selectedSize = activeSizeEl ? activeSizeEl.innerText : '';

        // Objekat spreman za slanje na tvoj backend procesor korpe
        const cartData = {
            id: productId,
            color: selectedColor,
            size: selectedSize,
            quantity: qty
        };

        const self = this;

        // 2. Slanje u bazu/sesiju preko tvog OpenShop $.ajax pogona
        OS.ajax({
            url: 'ajax/cart_add.php', // Tvoja skripta koja obrađuje ubacivanje u korpu
            type: 'POST',
            data: cartData,
            dataType: 'json',
            success: function(response) {
                // Ako tvoj backend vraća uspeh (prilagodi po potrebi, npr. response.success)
                // Zatvaranje modala kroz ugrađenu modal integraciju
                OS('#quickViewModal').modal('hide');
 notify.success('Proizvod je uspešno ubačen u vašu korpu!');
                // 3. Pokretanje letenja animacije tek nakon što je backend potvrdio unos
                self.runFlyAnimation();
            },
            error: function() {
            notify.error('Greška prilikom dodavanja u korpu.');
            }
        });
    }

    // Izolovana animacija letenja
    runFlyAnimation() {
        const img = document.getElementById('qv-img');
        const cart = document.getElementById('mainCartBtn');
        if (!img || !cart) return;

        const flyImg = img.cloneNode();
        const rect = img.getBoundingClientRect();
        const cartRect = cart.getBoundingClientRect();

        Object.assign(flyImg.style, {
            position: 'fixed', zIndex: 9999, top: rect.top + 'px', left: rect.left + 'px',
            width: rect.width + 'px', height: rect.height + 'px', borderRadius: '50%',
            transition: 'all 0.8s cubic-bezier(.14,.83,.73,1.07)', pointerEvents: 'none'
        });
        document.body.appendChild(flyImg);

        setTimeout(() => {
            Object.assign(flyImg.style, { top: cartRect.top + 'px', left: cartRect.left + 'px', width: '20px', height: '20px', opacity: 0 });
        }, 50);

        setTimeout(() => {
            flyImg.remove();
            OS('#mainCartBtn').addClass('cart-animate');
            setTimeout(() => OS('#mainCartBtn').removeClass('cart-animate'), 500);

            if (window.bootstrap) {
                new bootstrap.Toast(document.getElementById('cartToast')).show();
            }

            let $badge = OS('#cartBadge');
            $badge.text(parseInt($badge.text() || 0) + 1);
        }, 900);
    }

    // Omiljeno (Wishlist) preklopnik
    toggleWishlist(btn) {
        const icon = btn.querySelector('i');
        if (!icon) return;
        icon.classList.toggle('fa-regular');
        icon.classList.toggle('fa-solid');
        icon.classList.toggle('text-danger');
    }
}

// Inicijalizacija globalnog objekta dostupnog na svakoj stranici
window.quickView = new OpenShopQuickView();
