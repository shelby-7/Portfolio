/* ──────────────────────────────────────────────────────────── */
/* THE_MASKEDGRAPHER — main.js                                   */
/* Loading screen cinema + all site interactions                */
/* ──────────────────────────────────────────────────────────── */
'use strict';

/* ═══════════════════════════════════════════════════════════
   LOADING SCREEN — auto-driven timeline
   ═══════════════════════════════════════════════════════════

   Total duration: ~7.5 seconds (skip-able at any time)

   Timeline (seconds):
     0.0 – 1.5   Phase 0: City overview — title text visible
     1.5 – 2.0   Phase 1: Title fades out
     2.0 – 5.0   Phase 2: City drive — buildings zoom, speed lines
     5.0 – 6.2   Phase 3: Transition — city fades, studio emerges
     6.2 – 7.5   Phase 4: Studio + sign reveal + Enter button
     7.5+         Auto-exit (unless user already clicked Enter/Skip)
   ═══════════════════════════════════════════════════════════ */

const LOADER_DURATION = 3000;   // ms for full animation play-through
const PHASE = [0, 600, 800, 2000, 2480, 3000]; // phase start times in ms

/* DOM refs — loader */
const loader = document.getElementById('journey-loader');
const jlSky = document.getElementById('jl-sky');
const jlSkyline = document.getElementById('jl-skyline');
const jlBldLeft = document.getElementById('jl-bld-left');
const jlBldRight = document.getElementById('jl-bld-right');
const jlRoad = document.getElementById('jl-road');
const jlStudio = document.getElementById('jl-studio');
const studioOvl = document.getElementById('studio-fade-overlay');
const jtIntro = document.getElementById('jtext-intro');
const jtStudio = document.getElementById('jtext-studio');
const jhudBar = document.getElementById('jhud-bar');
const jhudPct = document.getElementById('jhud-pct');
const jhudPhase = document.getElementById('jhud-phase');
const slEl = document.getElementById('journey-speedlines');
const rainCanvas = document.getElementById('journey-rain');
const slCanvas = document.getElementById('journey-speedlines');
const enterBtn = document.getElementById('loader-enter-btn');
const skipBtn = document.getElementById('loader-skip');

/* ── Math helpers ── */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function range(lo, hi, v) { return clamp((v - lo) / (hi - lo), 0, 1); }
function easeIO(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

/* ── Rain ── */
const rainCtx = rainCanvas ? rainCanvas.getContext('2d') : null;
let rainDrops = [];

function resizeRain() {
  if (!rainCanvas) return;
  rainCanvas.width = window.innerWidth;
  rainCanvas.height = window.innerHeight;
}
function initRain() {
  rainDrops = [];
  for (let i = 0; i < 200; i++) {
    rainDrops.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      len: Math.random() * 16 + 8,
      speed: Math.random() * 9 + 10,
      alpha: Math.random() * 0.35 + 0.08,
      w: Math.random() * 0.6 + 0.3
    });
  }
}
function drawRain() {
  if (!rainCtx) return;
  rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
  rainDrops.forEach(d => {
    rainCtx.beginPath();
    rainCtx.moveTo(d.x, d.y);
    rainCtx.lineTo(d.x - d.len * 0.15, d.y + d.len);
    rainCtx.strokeStyle = 'rgba(180,230,255,' + d.alpha + ')';
    rainCtx.lineWidth = d.w;
    rainCtx.stroke();
    d.y += d.speed;
    d.x -= d.speed * 0.15;
    if (d.y > window.innerHeight) { d.y = -d.len; d.x = Math.random() * window.innerWidth; }
  });
}
if (rainCanvas) { resizeRain(); initRain(); window.addEventListener('resize', () => { resizeRain(); initRain(); }); }

/* ── Speed lines ── */
const slCtx = slCanvas ? slCanvas.getContext('2d') : null;
let speedLines = [];

function resizeSL() {
  if (!slCanvas) return;
  slCanvas.width = window.innerWidth;
  slCanvas.height = window.innerHeight;
}
function initSL() {
  speedLines = [];
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (let i = 0; i < 60; i++) {
    speedLines.push({
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 80 + 60,
      cx, cy,
      len: Math.random() * 120 + 40,
      alpha: Math.random() * 0.3 + 0.05,
      speed: Math.random() * 18 + 14,
      col: Math.random() > 0.5 ? '0,229,255' : '180,79,255'
    });
  }
}
function drawSL(intensity) {
  if (!slCtx) return;
  slCtx.clearRect(0, 0, slCanvas.width, slCanvas.height);
  if (intensity <= 0) return;
  speedLines.forEach(sl => {
    const x0 = sl.cx + Math.cos(sl.angle) * sl.dist;
    const y0 = sl.cy + Math.sin(sl.angle) * sl.dist;
    const x1 = sl.cx + Math.cos(sl.angle) * (sl.dist + sl.len * intensity);
    const y1 = sl.cy + Math.sin(sl.angle) * (sl.dist + sl.len * intensity);
    slCtx.beginPath();
    slCtx.moveTo(x0, y0);
    slCtx.lineTo(x1, y1);
    slCtx.strokeStyle = 'rgba(' + sl.col + ',' + (sl.alpha * intensity) + ')';
    slCtx.lineWidth = 1;
    slCtx.stroke();
    sl.dist += sl.speed * intensity;
    if (sl.dist > Math.max(window.innerWidth, window.innerHeight)) {
      sl.dist = Math.random() * 80 + 60;
      sl.angle = Math.random() * Math.PI * 2;
    }
  });
}
if (slCanvas) { resizeSL(); initSL(); window.addEventListener('resize', () => { resizeSL(); initSL(); }); }

/* ═══════════════════════════════════════════════════════════
   LOADER ANIMATION LOOP
   ═══════════════════════════════════════════════════════════ */
let loaderStartTime = null;
let loaderDone = false;
let rafId = null;

function exitLoader() {
  if (loaderDone) return;
  loaderDone = true;
  if (rafId) cancelAnimationFrame(rafId);

  // Transition: slide up and fade out
  loader.classList.add('exit');
  document.body.classList.remove('loading');

  // Remove from DOM after transition
  loader.addEventListener('transitionend', () => {
    loader.remove();
  }, { once: true });
}

function animateLoader(timestamp) {
  if (!loaderStartTime) loaderStartTime = timestamp;
  const elapsed = timestamp - loaderStartTime;  // ms since start
  // Normalized 0..1 across full duration
  const p = clamp(elapsed / LOADER_DURATION, 0, 1);

  /* ── HUD update ── */
  jhudBar.style.width = (p * 100).toFixed(1) + '%';
  jhudPct.textContent = Math.round(p * 100) + '%';

  let ph = 'SYS://CITY — APPROACH';
  if (elapsed >= PHASE[2] && elapsed < PHASE[3]) ph = 'SYS://TRANSIT — CITY DRIVE';
  else if (elapsed >= PHASE[3] && elapsed < PHASE[4]) ph = 'SYS://DESTINATION — ETA LOW';
  else if (elapsed >= PHASE[4]) ph = 'SYS://ARRIVED — THE_MASKEDGRAPHER';
  if (jhudPhase.textContent !== ph) jhudPhase.textContent = ph;

  /* ────────────────────────────────────────────
     SKY — slow drift upward
  ──────────────────────────────────────────── */
  const skyDrift = easeIO(clamp(p, 0, 0.85)) * -12;
  jlSky.style.transform = 'translateY(' + skyDrift + '%)';
  jlSky.style.opacity = String(clamp(1 - range(0.7, 0.88, p) * 0.7, 0.35, 1));

  /* ────────────────────────────────────────────
     FAR SKYLINE — slow zoom
  ──────────────────────────────────────────── */
  const skScale = 1 + easeIO(clamp(p * 1.2, 0, 1)) * 0.22;
  jlSkyline.style.transform = 'scale(' + skScale + ') translateY(' + (skyDrift * 0.5) + '%)';
  jlSkyline.style.opacity = String(clamp(1 - range(0.65, 0.82, p), 0.2, 1));

  /* ────────────────────────────────────────────
     BUILDINGS — zoom in, slide off-screen
     Active: phase 2 (p = 0.27..0.69)
  ──────────────────────────────────────────── */
  const dT = range(0.18, 0.68, p);
  const bScale = 1 + easeIO(dT) * 2.2;
  const bLeftX = -(easeIO(dT) * 60);
  const bRightX = easeIO(dT) * 60;
  const bOpacity = clamp(1 - range(0.62, 0.74, p), 0, 1);
  jlBldLeft.style.transform = 'translateX(' + bLeftX + '%) scale(' + bScale + ')';
  jlBldLeft.style.opacity = String(bOpacity);
  jlBldRight.style.transform = 'translateX(' + bRightX + '%) scale(' + bScale + ')';
  jlBldRight.style.opacity = String(bOpacity);

  /* ────────────────────────────────────────────
     ROAD — rushes toward camera
  ──────────────────────────────────────────── */
  const rT = range(0.12, 0.70, p);
  const rScale = 1 + easeIO(rT) * 3.8;
  const rOpacity = clamp(1 - range(0.58, 0.74, p), 0, 1);
  jlRoad.style.transform = 'scale(' + rScale + ') translateY(' + (easeIO(rT) * 8) + '%)';
  jlRoad.style.opacity = String(rOpacity);

  /* ────────────────────────────────────────────
     STUDIO — materialises from dark
  ──────────────────────────────────────────── */
  const stT = range(0.68, 0.86, p);
  const stScale = 1.14 - easeIO(stT) * 0.14;
  jlStudio.style.opacity = String(easeIO(stT));
  jlStudio.style.transform = 'scale(' + stScale + ')';
  if (studioOvl) studioOvl.style.opacity = String(1 - easeIO(stT));

  /* ────────────────────────────────────────────
     INTRO TEXT — fades out during phase 1
  ──────────────────────────────────────────── */
  const iOp = clamp(1 - range(0.17, 0.28, p), 0, 1);
  jtIntro.style.opacity = String(iOp);
  jtIntro.style.transform = 'translate(-50%, calc(-50% - ' + (range(0.17, 0.28, p) * 30) + 'px))';

  /* ────────────────────────────────────────────
     STUDIO TEXT — slides in at end
  ──────────────────────────────────────────── */
  const stxtT = range(0.84, 0.97, p);
  jtStudio.style.opacity = String(easeOut(stxtT));
  jtStudio.style.transform = 'translate(-50%, calc(-50% + ' + ((1 - easeOut(stxtT)) * 40) + 'px))';
  jtStudio.classList.toggle('active', stxtT > 0.1);

  /* ────────────────────────────────────────────
     SPEED LINES — peak mid-drive
  ──────────────────────────────────────────── */
  const slPeak = range(0.32, 0.52, p);
  const slFade = 1 - range(0.52, 0.66, p);
  const slI = easeIO(Math.min(slPeak, slFade));
  if (slEl) slEl.style.opacity = String(slI);
  drawSL(slI);

  /* Rain — always */
  drawRain();

  /* ── Hold at final frame after animation completes ── */
  if (elapsed >= LOADER_DURATION) {
    // Clamp everything to p=1 final state and stop the loop
    // (user must scroll or click to exit)
    return;
  }

  rafId = requestAnimationFrame(animateLoader);
}

/* ── Start loader on page load ── */
if (loader) {
  rafId = requestAnimationFrame(animateLoader);

  /* Enter Portfolio button */
  if (enterBtn) enterBtn.addEventListener('click', exitLoader);

  /* Skip intro button */
  if (skipBtn) skipBtn.addEventListener('click', exitLoader);

  /* Exit on first scroll (wheel or touch) — only after animation is done */
  function onScrollExit() {
    if (loaderDone) return;
    const elapsed = performance.now() - (loaderStartTime || 0);
    if (elapsed >= LOADER_DURATION) {
      exitLoader();
    }
  }
  window.addEventListener('wheel', onScrollExit, { passive: true });
  window.addEventListener('touchstart', onScrollExit, { passive: true });
}

/* ═══════════════════════════════════════════════════════════
   CUSTOM CURSOR
   ═══════════════════════════════════════════════════════════ */
const cursor = document.getElementById('cursor');
const follower = document.getElementById('cursor-follower');
let mx = 0, my = 0, fx = 0, fy = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px';
  cursor.style.top = my + 'px';
});
(function tickFollower() {
  fx += (mx - fx) * 0.1;
  fy += (my - fy) * 0.1;
  follower.style.left = fx + 'px';
  follower.style.top = fy + 'px';
  requestAnimationFrame(tickFollower);
})();

document.querySelectorAll(
  'a, button, .portfolio-item, .service-card, .filter-btn, .tool-tag, .social-link'
).forEach(el => {
  el.addEventListener('mouseenter', () => follower.classList.add('hovered'));
  el.addEventListener('mouseleave', () => follower.classList.remove('hovered'));
});

/* ═══════════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════════ */
const nav = document.getElementById('nav');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(l => {
  l.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ═══════════════════════════════════════════════════════════
   SCROLL-REVEAL
   ═══════════════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ═══════════════════════════════════════════════════════════
   PORTFOLIO FILTER
   ═══════════════════════════════════════════════════════════ */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.portfolio-item').forEach(item => {
      const show = f === 'top'
        ? item.dataset.top === 'true'
        : item.dataset.category === f;
      item.classList.toggle('hidden', !show);
      if (show) {
        item.style.opacity = '0'; item.style.transform = 'scale(0.97)';
        requestAnimationFrame(() => {
          item.style.transition = 'opacity .4s, transform .4s';
          item.style.opacity = '1'; item.style.transform = 'scale(1)';
        });
      } else { item.style.transition = item.style.opacity = item.style.transform = ''; }
    });
  });
});

/* Apply Top Picks filter on initial load */
(function () {
  const topBtn = document.querySelector('.filter-btn[data-filter="top"]');
  if (topBtn) topBtn.click();
})();

/* ═══════════════════════════════════════════════════════════
   STAT COUNTERS
   ═══════════════════════════════════════════════════════════ */
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.target, dur = 1800, t0 = performance.now();
    function tick(now) {
      const prog = Math.min((now - t0) / dur, 1);
      el.textContent = Math.floor((1 - Math.pow(1 - prog, 3)) * target);
      if (prog < 1) requestAnimationFrame(tick); else el.textContent = target;
    }
    requestAnimationFrame(tick);
    counterObs.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-number').forEach(el => counterObs.observe(el));

/* ═══════════════════════════════════════════════════════════
   SKILL BARS
   ═══════════════════════════════════════════════════════════ */
const skillObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.width = e.target.dataset.width + '%';
      skillObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.skill-fill').forEach(el => skillObs.observe(el));

/* ═══════════════════════════════════════════════════════════
   CONTACT FORM
   ═══════════════════════════════════════════════════════════ */
const form = document.getElementById('contact-form');
if (form) {
  const formSuccess = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const msg = form.querySelector('#message').value.trim();
    if (!name || !email || !msg) return;
    const bi = submitBtn.querySelector('.btn-inner');
    bi.textContent = 'TRANSMITTING...'; submitBtn.disabled = true;
    setTimeout(() => {
      form.reset(); bi.textContent = 'SEND MESSAGE'; submitBtn.disabled = false;
      formSuccess.classList.add('visible');
      setTimeout(() => formSuccess.classList.remove('visible'), 4000);
    }, 1400);
  });
}

/* ═══════════════════════════════════════════════════════════
   SMOOTH ANCHOR SCROLL
   ═══════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const t = document.querySelector(link.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ═══════════════════════════════════════════════════════════
   PHOTO LIGHTBOX
   ═══════════════════════════════════════════════════════════ */
(function () {
  const lightbox = document.getElementById('photo-lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbClose = document.getElementById('lightbox-close');
  const lbPrev = document.getElementById('lightbox-prev');
  const lbNext = document.getElementById('lightbox-next');
  const lbBackdrop = document.getElementById('lightbox-backdrop');
  const lbCounter = document.getElementById('lightbox-counter');

  if (!lightbox) return;

  let photoItems = [];
  let currentIdx = 0;

  function getPhotoItems() {
    // Only visible photo items (not hidden by filter)
    return Array.from(document.querySelectorAll('.portfolio-item[data-category="photo"]:not(.hidden)'));
  }

  function openLightbox(idx) {
    photoItems = getPhotoItems();
    if (!photoItems.length) return;
    currentIdx = Math.max(0, Math.min(idx, photoItems.length - 1));
    const img = photoItems[currentIdx].querySelector('img');
    if (!img) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt || '';
    lbCounter.textContent = (currentIdx + 1) + ' / ' + photoItems.length;
    lightbox.setAttribute('aria-hidden', 'false');
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { lbImg.src = ''; }, 300);
  }

  function navigate(dir) {
    photoItems = getPhotoItems();
    currentIdx = (currentIdx + dir + photoItems.length) % photoItems.length;
    const img = photoItems[currentIdx].querySelector('img');
    if (!img) return;
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbImg.src = img.src;
      lbImg.alt = img.alt || '';
      lbImg.style.opacity = '1';
      lbCounter.textContent = (currentIdx + 1) + ' / ' + photoItems.length;
    }, 150);
  }

  // Click on any photo portfolio item opens lightbox
  document.getElementById('portfolio-grid').addEventListener('click', e => {
    const item = e.target.closest('.portfolio-item[data-category="photo"]:not(.hidden)');
    if (!item) return;
    // Don't open if the external link arrow was clicked
    if (e.target.closest('.portfolio-link')) return;
    photoItems = getPhotoItems();
    const idx = photoItems.indexOf(item);
    openLightbox(idx);
  });

  lbClose.addEventListener('click', closeLightbox);
  lbBackdrop.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => navigate(-1));
  lbNext.addEventListener('click', () => navigate(1));

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  // Smooth opacity transition on image swap
  lbImg.style.transition = 'opacity 0.15s ease';
})();

