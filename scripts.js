// Show or hide the Back to Top button (appear only after user scrolls)
const backToTopBtn = document.getElementById('backToTop');
let hasScrolledOnce = false;

window.addEventListener('scroll', () => {
  // mark that the user attempted to scroll at least once
  if (!hasScrolledOnce && window.scrollY > 0) hasScrolledOnce = true;

  if (hasScrolledOnce && window.scrollY > 0) {
    backToTopBtn.classList.add('visible');
  } else {
    backToTopBtn.classList.remove('visible');
  }
});

// Scroll to top smoothly when button is clicked
backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

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
