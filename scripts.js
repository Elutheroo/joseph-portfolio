// Show or hide the Back to Top button: become active once user is away from above-the-fold
const backToTopBtn = document.getElementById('backToTop');

function getAboveFoldThreshold() {
  const home = document.getElementById('home');
  if (home) {
    // show once user scrolls past most of the hero/home section
    return Math.max( Math.min(home.offsetHeight - 40, window.innerHeight * 0.9), window.innerHeight * 0.25 );
  }
  // fallback to half the viewport
  return window.innerHeight * 0.5;
}

let currentThreshold = getAboveFoldThreshold();
window.addEventListener('resize', () => {
  currentThreshold = getAboveFoldThreshold();
});

window.addEventListener('scroll', () => {
  const sc = window.scrollY || window.pageYOffset;
  if (sc > currentThreshold) {
    backToTopBtn.classList.add('visible');
  } else {
    backToTopBtn.classList.remove('visible');
  }
});

// Scroll to top smoothly when button is clicked
backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

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

// Scroll reveal animation
const animatedSections = document.querySelectorAll('section');

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
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

// Contact form handling: validate, open mail client and show custom overlay
(function contactFormHandler(){
  const form = document.getElementById('contactForm');
  const overlay = document.getElementById('formOverlay');
  const overlayClose = document.getElementById('overlayClose');
  const overlayCall = document.getElementById('overlayCall');
  if (!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const subject = (formData.get('subject') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    // simple validation (HTML required already enforces, but double-check)
    if (!name || !email || !subject || !message) {
      // focus first empty
      if (!name) form.querySelector('[name="name"]').focus();
      else if (!email) form.querySelector('[name="email"]').focus();
      else if (!subject) form.querySelector('[name="subject"]').focus();
      else form.querySelector('[name="message"]').focus();
      return;
    }

    // build mailto link to send via user's mail client
    const to = 'olapagbojoseph@gmail.com';
    const body = `From: ${name} <${email}>\n\n${message}\n\n--\nSite contact form`;
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // open mail client
    try {
      window.location.href = mailto;
    } catch (err) {
      window.open(mailto, '_blank');
    }

    // show custom overlay
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
    }

    // reset form after small delay
    setTimeout(() => {
      form.reset();
    }, 400);
  });

  // overlay interactions
  if (overlayClose) overlayClose.addEventListener('click', () => {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  });
  if (overlayCall) overlayCall.addEventListener('click', () => {
    window.location.href = 'tel:+2337014877302';
  });

  // close overlay when clicking outside card
  if (overlay) overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }
  });
})();
