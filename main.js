// ===== PepLab.us — Main JavaScript =====

// Age gate
(function() {
  const overlay = document.getElementById('ageGate');
  if (!overlay) return;
  if (localStorage.getItem('peplabs_age_verified') === 'true' || sessionStorage.getItem('peplabs_age_verified') === 'true') {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    return;
  }
  document.body.style.overflow = 'hidden';
  overlay.classList.remove('hidden');

  const enterBtn = document.getElementById('ageEnter');
  const denyBtn = document.getElementById('ageDeny');
  const rememberBox = document.getElementById('ageRemember');

  if (enterBtn) {
    enterBtn.addEventListener('click', () => {
      if (rememberBox && rememberBox.checked) {
        localStorage.setItem('peplabs_age_verified', 'true');
      } else {
        sessionStorage.setItem('peplabs_age_verified', 'true');
      }
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }
  if (denyBtn) {
    denyBtn.addEventListener('click', () => {
      window.location.href = 'https://www.google.com';
    });
  }
})();

// Hero video — skip on mobile to save bandwidth
(function() {
  const vid = document.querySelector('.hero-video');
  if (!vid) return;
  if (window.innerWidth < 768) {
    vid.removeAttribute('autoplay');
    vid.pause && vid.pause();
    return;
  }
  function showVid() { vid.classList.add('loaded'); }
  function tryPlay() {
    var p = vid.play();
    if (p && p.catch) p.catch(function(){});
  }
  if (vid.readyState >= 3) { showVid(); tryPlay(); }
  else { vid.addEventListener('canplay', function() { showVid(); tryPlay(); }, { once: true }); }
  document.addEventListener('click', function() { if (vid.paused) tryPlay(); }, { once: true });
  document.addEventListener('scroll', function() { if (vid.paused) tryPlay(); }, { once: true });
})();

// Header scroll effect
const header = document.getElementById('header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// Mobile menu toggle
const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    nav.classList.toggle('open');
    menuBtn.classList.toggle('active');
  });
  // Close menu on link click
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuBtn.classList.remove('active');
    });
  });
}

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    // Toggle clicked
    if (!isOpen) item.classList.add('open');
  });
});

// Shop page: search, filter, sort
(function() {
  const grid = document.getElementById('productGrid');
  const searchInput = document.getElementById('shopSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const countEl = document.getElementById('productCount');
  if (!grid) return;

  function filterAndSort() {
    const cards = Array.from(grid.querySelectorAll('.product-card'));
    const search = (searchInput ? searchInput.value.toLowerCase() : '');
    const category = (categoryFilter ? categoryFilter.value : 'all');
    const sort = (sortFilter ? sortFilter.value : 'featured');

    let visible = 0;
    cards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const cat = card.dataset.category || '';
      const matchSearch = !search || name.includes(search);
      const matchCat = category === 'all' || cat === category;
      if (matchSearch && matchCat) {
        card.style.display = '';
        visible++;
      } else {
        card.style.display = 'none';
      }
    });

    // Sort visible cards
    const visibleCards = cards.filter(c => c.style.display !== 'none');
    visibleCards.sort((a, b) => {
      const priceA = parseFloat(a.dataset.price) || 0;
      const priceB = parseFloat(b.dataset.price) || 0;
      const nameA = (a.dataset.name || '').toLowerCase();
      const nameB = (b.dataset.name || '').toLowerCase();
      switch (sort) {
        case 'price-low': return priceA - priceB;
        case 'price-high': return priceB - priceA;
        case 'name-az': return nameA.localeCompare(nameB);
        case 'name-za': return nameB.localeCompare(nameA);
        default: return 0;
      }
    });

    visibleCards.forEach(card => grid.appendChild(card));
    if (countEl) countEl.textContent = 'Showing ' + visible + ' product' + (visible !== 1 ? 's' : '');
  }

  if (searchInput) searchInput.addEventListener('input', filterAndSort);
  if (categoryFilter) categoryFilter.addEventListener('change', filterAndSort);
  if (sortFilter) sortFilter.addEventListener('change', filterAndSort);
})();

// Legacy filter buttons (if present on other pages)
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.product-card').forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

// Make entire product card clickable (except Add to Cart button)
document.querySelectorAll('.product-card').forEach(card => {
  const link = card.querySelector('.product-image-link');
  if (link) {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.add-to-cart-btn')) {
        window.location.href = link.href;
      }
    });
  }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Sticky mobile shop bar (index page)
(function() {
  const bar = document.getElementById('stickyShopBar');
  if (!bar) return;
  document.body.classList.add('has-sticky-bar');
  var shown = false;
  window.addEventListener('scroll', function() {
    if (window.scrollY > 300 && !shown) {
      shown = true;
      bar.classList.add('visible');
    } else if (window.scrollY <= 300 && shown) {
      shown = false;
      bar.classList.remove('visible');
    }
  }, { passive: true });
})();

// Promo code (checkout page)
(function() {
  const toggle = document.getElementById('promoToggle');
  const inputRow = document.getElementById('promoInputRow');
  const applyBtn = document.getElementById('promoApplyBtn');
  const codeInput = document.getElementById('promoCodeInput');
  const msg = document.getElementById('promoMsg');
  if (!toggle) return;

  // Valid codes: { CODE: discountFraction }
  var CODES = { 'PEPLAB10': 0.10, 'RESEARCH15': 0.15 };
  var appliedDiscount = 0;

  toggle.addEventListener('click', function() {
    var hidden = inputRow.style.display === 'none';
    inputRow.style.display = hidden ? 'flex' : 'none';
    toggle.textContent = hidden ? '− Cancel' : '+ Have a promo code?';
  });

  applyBtn.addEventListener('click', function() {
    var code = codeInput.value.trim().toUpperCase();
    msg.className = 'checkout-promo-msg';
    if (CODES[code]) {
      appliedDiscount = CODES[code];
      msg.textContent = '✓ Code applied — ' + (appliedDiscount * 100) + '% off';
      msg.classList.add('success');
      codeInput.disabled = true;
      applyBtn.disabled = true;
      applyBtn.textContent = 'Applied';
      // Re-render totals with discount
      var totalsEl = document.getElementById('checkoutTotals');
      if (totalsEl && window.PepLabCart) {
        var subtotal = window.PepLabCart.getCartTotal();
        var discount = subtotal * appliedDiscount;
        var discounted = subtotal - discount;
        var freeShipping = discounted >= 250;
        var shipping = freeShipping ? 0 : 12.99;
        var total = discounted + shipping;
        totalsEl.innerHTML =
          '<div class="checkout-summary-row"><span>Subtotal</span><span>$' + subtotal.toFixed(2) + '</span></div>' +
          '<div class="checkout-summary-row"><span>Discount (' + (appliedDiscount * 100) + '%)</span><span style="color:#16a34a;">−$' + discount.toFixed(2) + '</span></div>' +
          '<div class="checkout-summary-row"><span>Shipping</span><span' + (freeShipping ? ' class="free"' : '') + '>' + (freeShipping ? 'FREE' : '$' + shipping.toFixed(2)) + '</span></div>' +
          '<div class="checkout-summary-row total"><span>Total</span><span>$' + total.toFixed(2) + '</span></div>';
      }
    } else {
      msg.textContent = 'Invalid promo code.';
      msg.classList.add('error');
    }
  });
})();
