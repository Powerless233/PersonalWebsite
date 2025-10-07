import { gsap } from 'gsap';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = Array.from(document.querySelectorAll('[data-section]'));
const dots = Array.from(document.querySelectorAll('.dot'));

let index = 0;
let isAnimating = false;
let touchStartY = 0;
let allowWheel = true;

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function scrollToIndex(i) {
  index = clamp(i, 0, sections.length - 1);
  const target = sections[index];
  isAnimating = true;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateDots();
  // Stop wheel during smooth scroll
  allowWheel = false;
  setTimeout(() => { allowWheel = true; }, 450);

  // Trigger animations
  playSectionAnims(target).finally(() => {
    // Release lock a bit later to avoid overscroll
    setTimeout(() => { isAnimating = false; }, 100);
  });
}

function updateDots() {
  dots.forEach((d, i) => {
    d.classList.toggle('is-active', i === index);
    d.setAttribute('aria-current', i === index ? 'true' : 'false');
  });
}

function playSectionAnims(sectionEl) {
  if (prefersReduced) return Promise.resolve();
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  const singles = sectionEl.querySelectorAll('[data-animate="fade-up"]');
  const staggersRoot = sectionEl.querySelectorAll('[data-animate="stagger"]');

  singles.forEach(el => {
    const d = parseFloat(el.dataset.delay || '0');
    tl.to(el, { opacity: 1, y: 0, duration: 0.6, delay: d }, 0);
  });

  staggersRoot.forEach(root => {
    const children = Array.from(root.children);
    tl.to(children, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06 }, 0.05);
  });

  return tl.then ? tl : Promise.resolve(); // gsap timeline is then-able
}

// Intersection: initialize first visible and reset hidden states on leave
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const el = entry.target;
    if (entry.isIntersecting) {
      index = sections.indexOf(el);
      updateDots();
      isAnimating = false; allowWheel = true;
      // only play if items are still hidden
      const needsAnim =
        el.querySelector('[data-animate="fade-up"][style*="opacity"]') ||
        el.querySelector('[data-animate="stagger"] > *[style*="opacity"]');
      if (!needsAnim) playSectionAnims(el);
    } else {
      // reset children to hidden state for replay on revisit
      if (!prefersReduced) {
        el.querySelectorAll('[data-animate="fade-up"]').forEach(n => { n.style.opacity = 0; n.style.transform = 'translateY(12px)'; });
        el.querySelectorAll('[data-animate="stagger"] > *').forEach(n => { n.style.opacity = 0; n.style.transform = 'translateY(12px)'; });
      }
    }
  });
}, { threshold: 0.6 });

sections.forEach(s => io.observe(s));

// Wheel navigation
window.addEventListener('wheel', (e) => {
  if (prefersReduced) return; // let native scroll
  if (!allowWheel || isAnimating) { e.preventDefault?.(); return; }
  const delta = e.deltaY;
  if (Math.abs(delta) < 10) return;
  if (delta > 0) scrollToIndex(index + 1);
  else scrollToIndex(index - 1);
}, { passive: false });

// Keyboard navigation
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
    e.preventDefault();
    scrollToIndex(index + 1);
  }
  if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault();
    scrollToIndex(index - 1);
  }
  if (e.key === 'Home') { e.preventDefault(); scrollToIndex(0); }
  if (e.key === 'End') { e.preventDefault(); scrollToIndex(sections.length - 1); }
});

// Touch swipe (vertical)
window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (prefersReduced) return;
  if (isAnimating) { e.preventDefault(); return; }
}, { passive: false });
window.addEventListener('touchend', (e) => {
  if (prefersReduced) return;
  const endY = (e.changedTouches && e.changedTouches[0].clientY) || 0;
  const dy = endY - touchStartY;
  if (Math.abs(dy) > 50) {
    if (dy < 0) scrollToIndex(index + 1);
    else scrollToIndex(index - 1);
  }
});

// Dots click
dots.forEach((btn, i) => btn.addEventListener('click', () => scrollToIndex(i)));

// On load: snap to first section and animate it
window.addEventListener('load', () => {
  updateDots();
  if (!prefersReduced) {
    // ensure initial hidden state then animate
    sections[0].querySelectorAll('[data-animate="fade-up"]').forEach(n => { n.style.opacity = 0; n.style.transform = 'translateY(12px)'; });
    sections[0].querySelectorAll('[data-animate="stagger"] > *').forEach(n => { n.style.opacity = 0; n.style.transform = 'translateY(12px)'; });
    playSectionAnims(sections[0]);
  }
});

const moreBtn = document.querySelector('.btn[href="#about"]');
if (moreBtn) {
  moreBtn.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToIndex(1);
  });
}