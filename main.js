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

// Hero video fade-in & autoplay fallback
(function() {
  const vid = document.querySelector('.hero-video');
  if (!vid) return;
  function showVid() { vid.classList.add('loaded'); }
  function tryPlay() {
    var p = vid.play();
    if (p && p.catch) p.catch(function(){});
  }
  if (vid.readyState >= 3) { showVid(); tryPlay(); }
  else { vid.addEventListener('canplay', function() { showVid(); tryPlay(); }, { once: true }); }
  // Fallback: retry on first user interaction if autoplay was blocked
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


// ===== SCROLL REVEAL =====
(function() {
  var els = document.querySelectorAll('.scroll-reveal');
  if (!els.length) return;
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
    });
  }, { threshold: 0.04, rootMargin: '0px 0px -20px 0px' });
  els.forEach(function(el) { io.observe(el); });
  // Safety net: reveal all still-hidden elements after 1.5s (handles scroll-past on mobile)
  setTimeout(function() {
    document.querySelectorAll('.scroll-reveal:not(.revealed)').forEach(function(el) {
      el.classList.add('revealed');
    });
  }, 1500);
})();

// ===== QUALITY TABS =====
(function() {
  var tabs = document.querySelectorAll('.quality-tab-btn');
  if (!tabs.length) return;
  tabs.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var target = btn.dataset.tab;
      tabs.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.quality-tab-pane').forEach(function(p) {
        p.classList.remove('active');
      });
      var pane = document.getElementById('qtab-' + target);
      if (pane) {
        pane.classList.add('active');
        // animate bars inside this pane
        pane.querySelectorAll('.quality-result-bar-fill').forEach(function(f) {
          f.classList.remove('animated');
          requestAnimationFrame(function() { requestAnimationFrame(function() { f.classList.add('animated'); }); });
        });
      }
    });
  });
  // Animate bars in initial active pane
  document.querySelectorAll('.quality-tab-pane.active .quality-result-bar-fill').forEach(function(f) {
    setTimeout(function() { f.classList.add('animated'); }, 300);
  });
})();

// ===== ANIMATE TRIAL BARS ON SCROLL =====
(function() {
  var fills = document.querySelectorAll('.pdp-trial-bar-fill');
  if (!fills.length) return;
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('animated');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  fills.forEach(function(f) { io.observe(f); });
})();

// ===== NEWSLETTER FORM =====
(function() {
  var form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var input = form.querySelector('.newsletter-input');
    var btn = form.querySelector('.newsletter-btn');
    if (!input || !input.value.includes('@')) { input && input.focus(); return; }
    btn.textContent = 'Subscribed!';
    btn.style.background = '#16a34a';
    input.value = '';
    input.disabled = true;
    btn.disabled = true;
  });
})();

// ===== PDP PAGE FAQ (reuses global FAQ accordion logic) =====
// Already handled by existing FAQ accordion logic above (querySelectorAll('.faq-question'))
