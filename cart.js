// ===== PepLab.us — Cart System =====
// localStorage-based cart with slide-out drawer, injected UI

(function() {
  'use strict';

  // ─── Cart Data ────────────────────────────────────────────
  const STORAGE_KEY = 'peplabs_cart';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
    updateDrawerContents();
  }

  function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += product.quantity || 1;
    } else {
      cart.push({ ...product, quantity: product.quantity || 1 });
    }
    saveCart(cart);
    openDrawer();
    showAddedFeedback();
  }

  function removeFromCart(id) {
    let cart = getCart().filter(item => item.id !== id);
    // If 3-pack is removed, also remove the 7-pack upgrade (upgrade requires the 3-pack)
    if (id === 'glp3rt-3pack') {
      cart = cart.filter(item => item.id !== 'glp3rt-7pack');
    }
    saveCart(cart);
  }

  function updateQuantity(id, qty) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) {
      item.quantity = Math.max(1, Math.min(99, qty));
    }
    saveCart(cart);
  }

  function clearCart() {
    localStorage.removeItem(STORAGE_KEY);
    updateCartBadge();
    updateDrawerContents();
  }

  function getCartTotal() {
    return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  // ─── Slug Generator ───────────────────────────────────────
  function slugify(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // ─── Product Name → Image & Link Map ─────────────────────
  const PRODUCT_IMAGE_MAP = {
    '5-Amino-1MQ 50mg':              { image: 'assets/products/5amino1mq-50mg.webp',         link: 'product-5amino.html' },
    'AOD-9604 5mg':                   { image: 'assets/products/aod9604-5mg.webp',            link: 'product-aod9604.html' },
    'Bacteriostatic Water':           { image: 'assets/products/bacteriostatic-water.webp',   link: 'product-bacwater.html' },
    'Bacteriostatic Water 30mL':      { image: 'assets/products/bacteriostatic-water.webp',   link: 'product-bacwater.html' },
    'BPC-157 5mg':                    { image: 'assets/products/bpc157-5mg.webp',             link: 'product-bpc157.html' },
    'BPC-157 10mg':                   { image: 'assets/products/bpc157-10mg.webp',            link: 'product-bpc157-10mg.html' },
    'CJC-1295 + Ipamorelin 5mg/5mg': { image: 'assets/products/cjc1295-ipamorelin-blend.webp', link: 'product-cjc-ipa-blend.html' },
    'CJC-1295 DAC 5mg':              { image: 'assets/products/cjc1295-dac-5mg.webp',        link: 'product-cjc1295dac.html' },
    'CJC-1295 No DAC 5mg':           { image: 'assets/products/cjc1295-nodac-5mg.webp',      link: 'product-cjc1295nodac.html' },
    'DSIP 5mg':                       { image: '',                                             link: 'product-dsip.html' },
    'Epithalon 10mg':                 { image: 'assets/products/epithalon-10mg.webp',         link: 'product-epithalon.html' },
    'GHK-Cu':                         { image: 'assets/products/ghk-cu.webp',                 link: 'product-ghkcu.html' },
    'GLP-3 RT':                       { image: 'assets/products/glp3rt.webp',                 link: 'product-glp3rt.html' },
    'Glow Blend 70mg':                { image: 'assets/products/glow-blend-70mg.webp',        link: 'product-glow.html' },
    'HCG 5000 IU':                    { image: 'assets/products/hcg-5000iu.webp',             link: 'product-hcg.html' },
    'IGF-1 LR3 1mg':                  { image: 'assets/products/igf1-lr3-1mg.webp',           link: 'product-igf1lr3.html' },
    'Ipamorelin 10mg':                { image: 'assets/products/ipamorelin-10mg.webp',        link: 'product-ipamorelin.html' },
    'Kisspeptin 10mg':                { image: 'assets/products/kisspeptin-10mg.webp',        link: 'product-kisspeptin.html' },
    'KLOW Blend 80mg':                { image: 'assets/products/klow-blend-80mg.webp',        link: 'product-klow.html' },
    'L-Carnitine 500mg':              { image: 'assets/products/l-carnitine-500mg.webp',      link: 'product-lcarnitine.html' },
    'MOTS-c 10mg':                    { image: 'assets/products/motsc-10mg.webp',             link: 'product-motsc.html' },
    'MT-1 10mg':                      { image: 'assets/products/mt1-10mg.webp',               link: 'product-mt1.html' },
    'MT-2 10mg':                      { image: 'assets/products/mt2-10mg.webp',               link: 'product-mt2.html' },
    'NAD+ 500mg':                     { image: 'assets/products/nad-500mg.webp',              link: 'product-nad.html' },
    'Retatrutide (GLP-3 RT) 10mg':    { image: 'assets/products/glp3rt.webp',                 link: 'product-glp3rt.html' },
    'Retatrutide (GLP-3 RT) 10mg — 1 Vial':  { image: 'assets/products/glp3rt.webp',  link: 'product-glp3rt.html' },
    'Retatrutide (GLP-3 RT) 10mg — 3 Vials': { image: 'assets/products/GLP-3 RT B1GOF.png', link: 'product-glp3rt.html' },
    'Retatrutide (GLP-3 RT) 10mg — 7 Vials': { image: 'assets/products/glp3rt.webp', link: 'product-glp3rt.html' },
    'Retatrutide (GLP-3 RT) 10mg — 7 Vials (Upgrade)': { image: 'assets/products/glp3rt.webp', link: 'product-glp3rt.html' },
    'Selank 5mg':                     { image: 'assets/products/selank-5mg.webp',             link: 'product-selank.html' },
    'Semax 5mg':                      { image: 'assets/products/semax-5mg.webp',              link: 'product-semax.html' },
    'Sermorelin 5mg':                 { image: 'assets/products/sermorelin-5mg.webp',         link: 'product-sermorelin.html' },
    'SS-31 5mg':                      { image: 'assets/products/ss31-5mg.webp',               link: 'product-ss31.html' },
    'TB-500 5mg':                     { image: 'assets/products/tb500-5mg.webp',              link: 'product-tb500.html' },
    'Tesamorelin 10mg':               { image: 'assets/products/tesamorelin-10mg.webp',       link: 'product-tesamorelin.html' },
    'Tirzepatide 10mg':               { image: 'assets/products/tirzepatide-10mg.webp',       link: 'product-tirzepatide.html' },
    'Wolverine Blend':                { image: 'assets/products/wolverine-blend.webp',        link: 'product-wolverine.html' },
  };

  function lookupProduct(name) {
    return PRODUCT_IMAGE_MAP[name] || { image: '', link: '' };
  }

  // ─── Inject Cart Badge into Header ────────────────────────
  function injectCartBadge() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('cartToggle')) return;

    const cartBtn = document.createElement('button');
    cartBtn.id = 'cartToggle';
    cartBtn.className = 'cart-toggle-btn';
    cartBtn.setAttribute('aria-label', 'Shopping Cart');
    cartBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"/>
      </svg>
      <span class="cart-badge" id="cartBadge">0</span>
    `;
    cartBtn.addEventListener('click', toggleDrawer);

    // Insert before the Shop Now CTA
    const shopNowBtn = headerActions.querySelector('.nav-cta');
    if (shopNowBtn) {
      headerActions.insertBefore(cartBtn, shopNowBtn);
    } else {
      headerActions.appendChild(cartBtn);
    }
  }

  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // ─── Cart Drawer ──────────────────────────────────────────
  function injectDrawer() {
    if (document.getElementById('cartDrawer')) return;

    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    overlay.className = 'cart-overlay';
    overlay.addEventListener('click', closeDrawer);

    const drawer = document.createElement('div');
    drawer.id = 'cartDrawer';
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <h3>Your Cart</h3>
        <button class="cart-drawer-close" id="cartClose" aria-label="Close cart">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="cart-drawer-body" id="cartDrawerBody"></div>
      <div class="cart-drawer-footer" id="cartDrawerFooter"></div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    document.getElementById('cartClose').addEventListener('click', closeDrawer);
  }

  function updateDrawerContents() {
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    if (!body || !footer) return;

    const cart = getCart();

    if (cart.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" width="48" height="48">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"/>
          </svg>
          <p>Your cart is empty</p>
          <a href="shop.html" class="cart-empty-link">Browse Products</a>
        </div>
      `;
      footer.innerHTML = '';
      return;
    }

    body.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-image">
          ${item.image
            ? `<img src="${item.image}" alt="${item.name}">`
            : `<div class="cart-item-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="0.75" stroke="currentColor" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.46 1.46a2.25 2.25 0 0 1-1.591.659H8.051a2.25 2.25 0 0 1-1.591-.659L5 14.5m14 0V5.846a2.25 2.25 0 0 0-1.172-1.976l-.348-.192M5 14.5V5.846a2.25 2.25 0 0 1 1.172-1.976l.348-.192"/></svg>
              </div>`
          }
        </div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.link ? '<a href="' + item.link + '" style="color:inherit;text-decoration:none">' + item.name + '</a>' : item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-qty-row">
            <div class="cart-item-qty-controls">
              <button class="cart-item-qty-btn" data-action="decrease" data-id="${item.id}">-</button>
              <span class="cart-item-qty-value">${item.quantity}</span>
              <button class="cart-item-qty-btn" data-action="increase" data-id="${item.id}">+</button>
            </div>
            <button class="cart-item-remove" data-id="${item.id}">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    const subtotal = getCartTotal();
    const freeShipping = subtotal >= 250;

    // Check for upsell opportunity: 3-pack in cart but no 7-pack
    var has3Pack = cart.some(function(i) { return i.id === 'glp3rt-3pack'; });
    var has7Pack = cart.some(function(i) { return i.id === 'glp3rt-7pack'; });
    var upsellHtml = '';
    if (has3Pack && !has7Pack) {
      upsellHtml = `
        <div class="upsell-banner">
          <div class="upsell-banner-label">Limited Time — GLP-3 RT Upgrade</div>
          <div class="upsell-banner-title">Add 7 More GLP-3 RT Vials For The Price Of 2!</div>
          <div class="upsell-banner-price">+7 Vials of GLP-3 RT (10mg) — <strong>$399.99</strong> ($57/vial)</div>
          <button class="upsell-banner-btn" id="cartUpsellBtn">Add Upgrade to Cart</button>
        </div>
      `;
    }

    footer.innerHTML = upsellHtml + `
      <div class="cart-shipping-notice ${freeShipping ? 'cart-shipping-free' : ''}">
        ${freeShipping
          ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg> Free shipping unlocked!'
          : `$${(250 - subtotal).toFixed(2)} away from free shipping`
        }
      </div>
      <div class="cart-subtotal">
        <span>Subtotal</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      <a href="checkout.html" class="cart-checkout-btn">Proceed to Checkout</a>
      <button class="cart-continue-btn" id="cartContinue">Continue Shopping</button>
    `;

    // Wire upsell button
    var upsellBtn = document.getElementById('cartUpsellBtn');
    if (upsellBtn) {
      upsellBtn.addEventListener('click', function() {
        addToCart({
          id: 'glp3rt-7pack',
          name: 'Retatrutide (GLP-3 RT) 10mg — 7 Vials (Upgrade)',
          price: 399.99,
          image: 'assets/products/glp3rt.webp',
          link: 'product-glp3rt.html',
          quantity: 1,
          isOffer: true,
          offerType: 'upgrade'
        });
      });
    }

    // Wire up drawer event listeners
    body.querySelectorAll('.cart-item-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cart = getCart();
        const item = cart.find(i => i.id === id);
        if (!item) return;
        if (btn.dataset.action === 'increase') {
          updateQuantity(id, item.quantity + 1);
        } else {
          if (item.quantity <= 1) {
            removeFromCart(id);
          } else {
            updateQuantity(id, item.quantity - 1);
          }
        }
      });
    });

    body.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });

    const continueBtn = document.getElementById('cartContinue');
    if (continueBtn) continueBtn.addEventListener('click', closeDrawer);
  }

  function openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggleDrawer() {
    const drawer = document.getElementById('cartDrawer');
    if (drawer && drawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  // ─── Add-to-Cart Feedback ─────────────────────────────────
  function showAddedFeedback() {
    let toast = document.getElementById('cartToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cartToast';
      toast.className = 'cart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = 'Added to cart';
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // ─── Extract Product Data from Context ────────────────────

  // From a shop/index product card
  function extractFromCard(card) {
    const name = card.querySelector('.product-info h3')?.textContent?.trim() || 'Product';
    const priceText = card.querySelector('.product-price')?.textContent?.trim() || '0';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    const img = card.querySelector('.product-photo');
    const image = img ? img.getAttribute('src') : '';
    const link = card.querySelector('.product-image-link')?.getAttribute('href') || '';
    const id = slugify(name);
    return { id, name, price, image, link };
  }

  // From product detail page
  function extractFromPDP() {
    const name = document.querySelector('.pdp-title')?.textContent?.trim() || '';
    const priceText = document.querySelector('.pdp-price-current')?.textContent?.trim() || '0';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    const img = document.querySelector('.pdp-image img');
    const image = img ? img.getAttribute('src') : '';
    const link = window.location.pathname.split('/').pop();
    const id = slugify(name);
    const qtyInput = document.getElementById('qtyInput');
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    return { id, name, price, image, link, quantity };
  }

  // ─── Wire Up Buttons ──────────────────────────────────────
  function wireButtons() {
    // Shop page & homepage product cards: .add-to-cart-btn
    document.querySelectorAll('.product-card .add-to-cart-btn').forEach(btn => {
      if (btn._cartWired) return;
      btn._cartWired = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.product-card');
        if (!card) return;
        const product = extractFromCard(card);
        addToCart(product);
      });
    });

    // Product detail page: .pdp-add-to-cart
    const pdpBtn = document.querySelector('.pdp-add-to-cart');
    if (pdpBtn && !pdpBtn._cartWired) {
      pdpBtn._cartWired = true;
      pdpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const product = extractFromPDP();
        addToCart(product);
      });
    }

    // Bundle "Add All" button on PDP
    const bundleBtn = document.querySelector('.pdp-bundle-add');
    if (bundleBtn && !bundleBtn._cartWired) {
      bundleBtn._cartWired = true;
      bundleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const bundleItems = document.querySelectorAll('.pdp-bundle-item');
        bundleItems.forEach(item => {
          const name = item.querySelector('.pdp-bundle-item-name')?.textContent?.trim() || '';
          const priceText = item.querySelector('.pdp-bundle-item-price')?.textContent?.trim() || '0';
          const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
          if (name && price > 0) {
            const mapped = lookupProduct(name);
            addToCart({ id: slugify(name), name, price, image: mapped.image, link: mapped.link, quantity: 1 });
          }
        });
      });
    }
  }

  // ─── Keyboard & Escape ────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // ─── Initialize ───────────────────────────────────────────
  function init() {
    injectCartBadge();
    injectDrawer();
    updateCartBadge();
    updateDrawerContents();
    wireButtons();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for checkout page
  window.PepLabCart = {
    getCart, saveCart, clearCart, getCartTotal, getCartCount,
    addToCart, removeFromCart, updateQuantity, openDrawer, closeDrawer
  };

})();
