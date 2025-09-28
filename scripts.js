// Show or hide the Back to Top button: become active once user is away from above-the-fold
const backToTopBtn = document.getElementById('backToTop');

// Prefer IntersectionObserver on the hero section to avoid flicker during initial scroll
(function setupBackToTopVisibility(){
  const home = document.getElementById('home');
  if (!backToTopBtn) return;

  let heroVisible = true;
  let lastY = window.scrollY || 0;
  let ticking = false;

  function show() { backToTopBtn.classList.add('visible'); }
  function hide() { backToTopBtn.classList.remove('visible'); }

  if (home && 'IntersectionObserver' in window) {
    // observe hero visibility; do not auto-show on intersection change — only show when user scrolls up
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        heroVisible = entry.isIntersecting;
        if (heroVisible) hide();
      });
    }, { root: null, threshold: 0.05 });

    io.observe(home);
  } else {
    // fallback if no hero or observer
    heroVisible = (window.scrollY < (window.innerHeight * 0.5));
  }

  function handleScroll() {
    const y = window.scrollY || 0;
    const scrolledUp = y < lastY;
    lastY = y;

    // Never show when hero is visible
    if (heroVisible) { hide(); return; }

    // Only show when user scrolls upward and has scrolled down some amount
    if (scrolledUp && y > 150) show(); else hide();
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { handleScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  // When clicking the button, scroll to top and hide it
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    hide();
  });
})();

// Smooth scroll for internal anchor links, accounting for sticky header height
(function enableSmoothAnchors(){
  const header = () => document.querySelector('.sticky-header');
  function getHeaderOffset() {
    const h = header();
    return h ? Math.ceil(h.getBoundingClientRect().height) + 12 : 12; // small buffer
  }

  document.addEventListener('click', function(e){
    const el = e.target.closest('a[href^="#"]');
    if (!el) return;
    const href = el.getAttribute('href');
    if (!href || href === '#') return;
    const targetId = href.slice(1);
    const target = document.getElementById(targetId);
    if (!target) return; // let default if not found

    e.preventDefault();
    const offset = getHeaderOffset();
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });

    // close mobile nav if open
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.getElementById('hamburger');
    if (navMenu && navMenu.classList.contains('active')) {
      navMenu.classList.remove('active');
      hamburger && hamburger.classList.remove('active');
    }
  }, { passive: true });
})();

// Scroll reveal animation (sections + hero images)
const animatedSections = document.querySelectorAll('section');

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // reveal section
        entry.target.classList.add('visible');

        // animate any showcase/hero images inside the section to "come up"
        const imgs = entry.target.querySelectorAll('.showcase img, .cs-hero-img img, .hero-img img, .hifi-showcase img, .case-slide .showcase img');
        imgs.forEach((img, idx) => {
          // ensure the element will animate from below into place
          img.classList.add('fade-up');
          // apply a small stagger for multiple images
          img.style.animationDelay = (idx * 0.08) + 's';
        });

        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

animatedSections.forEach(section => {
  section.classList.add('hidden');
  observer.observe(section);
});


// Header hide on scroll for case study pages
(function caseStudyHeaderHide(){
  if (!document.querySelector('.case-study')) return; // only run on case study pages
  const header = document.querySelector('.sticky-header');
  if (!header) return;

  let lastY = window.scrollY || 0;
  let ticking = false;
  let hidden = false;

  function showHeader() {
    if (hidden) {
      header.classList.remove('header-hidden');
      hidden = false;
    }
  }
  function hideHeader() {
    if (!hidden) {
      header.classList.add('header-hidden');
      hidden = true;
    }
  }

  function onScroll() {
    const y = window.scrollY || 0;
    const scrollingUp = y < lastY;
    const scrollingDown = y > lastY;
    lastY = y;

    // Always show near top
    if (y < 60) { showHeader(); return; }

    // when scrolling down, hide; when scrolling up, show
    if (scrollingDown && y > 120) hideHeader();
    else if (scrollingUp) showHeader();
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { onScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
})();
// Toggle mobile menu
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
let navOpenScrollY = null;

hamburger.addEventListener('click', e => {
  e.stopPropagation();
  const isActive = navMenu.classList.toggle('active');
  hamburger.classList.toggle('active');
  navOpenScrollY = isActive ? window.scrollY : null;
});

// Close menu if user clicks outside
document.addEventListener('click', e => {
  const isClickInside = hamburger.contains(e.target) || navMenu.contains(e.target);
  if (!isClickInside) {
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
    navOpenScrollY = null;
  }
});

// Close menu after meaningful scroll movement (for mobile)
window.addEventListener('scroll', () => {
  if (navMenu.classList.contains('active') && navOpenScrollY !== null) {
    if (Math.abs(window.scrollY - navOpenScrollY) > 60) {
      navMenu.classList.remove('active');
      hamburger.classList.remove('active');
      navOpenScrollY = null;
    }
  }
});

// Ensure testimonial cards share equal dimensions (match tallest)
function equalizeTestimonialSizes() {
  const items = Array.from(document.querySelectorAll('.testimonial-item'));
  if (!items.length) return;

  // reset heights
  items.forEach(it => {
    it.style.height = 'auto';
  });

  // compute max height
  const maxHeight = items.reduce((max, el) => Math.max(max, el.getBoundingClientRect().height), 0);

  // apply height to all
  items.forEach(it => {
    it.style.height = Math.ceil(maxHeight) + 'px';
  });
}

// debounce helper
function debounce(fn, wait = 120) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Run after DOM load and on resize
window.addEventListener('load', () => {
  equalizeTestimonialSizes();
  // also run again after a short delay in case webfonts/images change layout
  setTimeout(equalizeTestimonialSizes, 250);
});

window.addEventListener('resize', debounce(() => {
  equalizeTestimonialSizes();
}, 120));

// Also re-run when fonts finish loading
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(equalizeTestimonialSizes);
}

// Set dynamic year in footer
(function setFooterYear(){
  const y = new Date().getFullYear();
  const el = document.getElementById('year');
  if (el) el.textContent = y;
})();

// Ensure images are optimized: default lazy loading for non-hero images
(function optimizeImages() {
  try {
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
      if (!img.hasAttribute('loading')) {
        // keep hero images eager
        if (img.closest('.cs-hero, .hero, .cs-hero-img, .hero-img')) img.setAttribute('loading', 'eager');
        else img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      // ensure responsive behavior
      img.style.maxWidth = img.style.maxWidth || '100%';
      img.style.height = img.style.height || 'auto';
    });
  } catch (e) {
    // no-op
    console.warn('Image optimization init failed', e);
  }
})();

// If the page was opened with a hash (including when navigating from another page),
// adjust the scroll to account for the fixed header so the section is not hidden.
window.addEventListener('load', () => {
  try {
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    const header = document.querySelector('.sticky-header');
    const offset = header ? Math.ceil(header.getBoundingClientRect().height) + 12 : 12;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    // perform a smooth scroll after load to reposition under the sticky header
    window.setTimeout(() => {
      window.scrollTo({ top, behavior: 'smooth' });
    }, 60);
  } catch (e) {
    // ignore
  }
});

// Contact form handling: validate, open mail client and show custom overlay
(function contactFormHandler(){
  const form = document.getElementById('contactForm');
  const overlay = document.getElementById('formOverlay');
  const overlayClose = document.getElementById('overlayClose');
  const overlayCloseIcon = document.getElementById('overlayCloseIcon');
  const overlayCall = document.getElementById('overlayCall');
  if (!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const subject = (formData.get('subject') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    // simple validation (HTML required already enforces, but double-check)
    if (!name || !email || !subject || !message) {
      if (submitBtn) submitBtn.disabled = false;
      // focus first empty
      if (!name) form.querySelector('[name="name"]').focus();
      else if (!email) form.querySelector('[name="email"]').focus();
      else if (!subject) form.querySelector('[name="subject"]').focus();
      else form.querySelector('[name="message"]').focus();
      return;
    }

    // Prepare payload for serverless email function
    const payload = { name, email, subject, message };
    const emailEndpoint = '/.netlify/functions/send-email';

    // Submit to Netlify Forms (so Netlify stores the submission)
    const netlifySubmit = fetch('/', {
      method: 'POST',
      body: formData,
    }).then(res => res.ok).catch(() => false);

    // Send email notification via serverless function
    const emailSend = fetch(emailEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async res => {
      if (res.ok) return { ok: true };
      let text = await res.text().catch(() => 'Server error');
      return { ok: false, error: text };
    }).catch(err => ({ ok: false, error: String(err) }));

    Promise.all([netlifySubmit, emailSend]).then(async results => {
      const [netlifyOk, emailRes] = results;

      if (emailRes && emailRes.ok) {
        // Prefer to show overlay when email notification succeeded
        if (overlay) {
          overlay.classList.remove('hidden');
          overlay.setAttribute('aria-hidden', 'false');
        }
        form.reset();
      } else if (netlifyOk) {
        // If email failed but Netlify stored submission, still show overlay but warn in console
        console.warn('Email send failed but Netlify form saved the submission', emailRes && emailRes.error);
        if (overlay) {
          overlay.classList.remove('hidden');
          overlay.setAttribute('aria-hidden', 'false');
        }
        form.reset();
      } else {
        // Both failed
        alert('Could not send message. Please try again later.');
        console.error('Form submission failed', emailRes && emailRes.error);
      }
    }).finally(() => {
      if (submitBtn) submitBtn.disabled = false;
    });
  });

  // overlay interactions
  if (overlayClose) overlayClose.addEventListener('click', () => {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  });
  if (overlayCall) overlayCall.addEventListener('click', () => {
    window.location.href = 'tel:+2347014877302';
  });

  // close overlay when clicking outside card
  if (overlay) overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }
  });
})();

// Cross-page smooth scroll enhancement
// When clicking a header nav link that points to index.html#section from another page,
// store the target in sessionStorage and let the browser navigate. On the index page load
// we read the stored target and perform a smooth-scroll with header offset to avoid
// the initial jump hiding content beneath the sticky header.
(function crossPageHashScroll(){
  // Listen for clicks on links that point to index.html#...
  document.addEventListener('click', function(e){
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    try {
      const href = a.getAttribute('href') || '';
      // Only handle internal index anchors (relative)
      if (href.indexOf('index.html#') === 0) {
        const hash = href.split('#')[1] || '';
        if (hash) sessionStorage.setItem('pendingScroll', hash);
      }
    } catch (err) { /* ignore */ }
  });

  // On load, if there's a pending scroll target, perform a smooth scroll to it and remove flag
  window.addEventListener('load', function(){
    try {
      const pending = sessionStorage.getItem('pendingScroll');
      if (!pending) return;
      const target = document.getElementById(pending);
      if (!target) { sessionStorage.removeItem('pendingScroll'); return; }

      const header = document.querySelector('.sticky-header');
      const offset = header ? Math.ceil(header.getBoundingClientRect().height) + 12 : 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      // run slightly after load to allow browser to settle layout
      window.setTimeout(() => {
        window.scrollTo({ top, behavior: 'smooth' });
        sessionStorage.removeItem('pendingScroll');
      }, 80);
    } catch (e) { /* ignore */ }
  });
})();

// Send a visit ping for presentation/case-study pages (organic-only heuristic)
(function sendVisitPing(){
  try {
    if (!document.querySelector('.case-study')) return; // only on case study pages

    // Simple organic detection: reject if URL has utm_ params or query campaign params
    const search = window.location.search || '';
    if (/utm_|utm-/.test(search)) return;

    const ref = document.referrer || '';
    // ignore referrals from same origin (internal navigation)
    if (ref && new URL(ref).origin === window.location.origin) return;

    // basic bot detection
    const ua = navigator.userAgent || '';
    if (/bot|crawl|spider|bingpreview/i.test(ua)) return;

    // Collect case study identifier (prefer meta or title; fallback to pathname)
    const caseStudyTitle = document.querySelector('.slide-title')?.textContent?.trim() || document.title || window.location.pathname;
    const page = window.location.pathname + (window.location.hash || '');

    // visitor-local count: track how many times this browser viewed this case study
    const key = 'views_' + (caseStudyTitle || page).replace(/\s+/g, '_').toLowerCase();
    let c = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    c += 1;
    localStorage.setItem(key, String(c));

    // payload
    const payload = {
      caseStudy: caseStudyTitle,
      page,
      referrer: ref,
      userAgent: ua,
      visitorCount: c,
      // include IP as empty; server will derive from request headers
    };

    // send asynchronously; no need to await
    fetch('/.netlify/functions/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => { /* fail silently */ console.warn('visit ping failed', err); });
  } catch (e) { /* ignore */ }
})();
