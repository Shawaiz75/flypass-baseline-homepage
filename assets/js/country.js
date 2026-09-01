
/* =====================================================================
   Flypass Holidays — Baseline engine
   Lenis smooth scroll + tiny rAF spring helper + clip-mask reveals
   ===================================================================== */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hoverOK = () => innerWidth > 768 && matchMedia('(hover: hover)').matches;

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------- Adaptive rem scale-up (viewports wider than 1920) ---------- */
const FONT_BASE = 16, BASE_W = 1920, COEF = 0.6666;
function fitRem() {
  const reduction = ((BASE_W - innerWidth) / BASE_W) * 100 * COEF;
  const size = FONT_BASE - (FONT_BASE * reduction) / 100;
  if (size > FONT_BASE) document.documentElement.style.fontSize = size + 'px';
  else document.documentElement.style.removeProperty('font-size');
}
fitRem();
addEventListener('resize', fitRem);

/* ---------- Lenis (with native-scroll fallback if the CDN is missing) ---------- */
let lenis = {
  raf(){}, stop(){}, start(){},
  scrollTo(el){ (typeof el === 'number' ? window.scrollTo(0, el) : el?.scrollIntoView({ behavior: 'smooth' })); }
};
try {
  const mod = await import('lenis');
  lenis = new mod.default({ smoothWheel: true });
} catch (err) {
  console.warn('Lenis failed to load — falling back to native scroll.', err);
}

const html = document.documentElement;
let locks = 0;
function lockScroll()   { locks++; lenis.stop(); html.classList.add('lock'); }
function unlockScroll() { locks = Math.max(0, locks - 1); if (!locks) { lenis.start(); html.classList.remove('lock'); } }

/* ---------- Dialog focus management ----------
   aria-modal="true" constrains assistive-tech virtual cursors, but it does NOT
   constrain the Tab sequence: without this, Tab walks straight out of an open
   overlay into the page behind it, which is still fully focusable. trapFocus
   keeps Tab inside the given container and restores focus to whatever opened
   it, so closing with Escape does not dump the user back at the top of the
   document. */
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

let activeTrap = null;

function trapFocus(container) {
  const opener = document.activeElement;
  const onKey = e => {
    if (e.key !== 'Tab') return;
    // Re-query every time: the modal swaps form <-> success panel while open.
    const items = $$(FOCUSABLE, container).filter(el =>
      !el.hasAttribute('hidden') && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey, true);
  activeTrap = { container, onKey, opener };
  return activeTrap;
}

function releaseFocus(trap) {
  if (!trap) return;
  document.removeEventListener('keydown', trap.onKey, true);
  if (activeTrap === trap) activeTrap = null;
  const o = trap.opener;
  if (o && o.isConnected && typeof o.focus === 'function') o.focus({ preventScroll: true });
}

/* ---------- Spring engine (react-spring style {tension, friction}) ---------- */
const DEFAULTS = { x: 0, y: 0, scale: 1, rot: 0, opacity: 1 };
const active = new Set();
const motions = new WeakMap();

class Motion {
  constructor(el) { this.el = el; this.s = {}; this.done = null; }
  static of(el) { let m = motions.get(el); if (!m) { m = new Motion(el); motions.set(el, m); } return m; }
  ensure(k) { if (!this.s[k]) this.s[k] = { x: DEFAULTS[k], v: 0, t: DEFAULTS[k], tension: 170, friction: 26 }; return this.s[k]; }
  set(props) {
    for (const k in props) { const s = this.ensure(k); s.x = s.t = props[k]; s.v = 0; }
    this.apply();
  }
  to(props, cfg = {}, done) {
    if (REDUCED) { this.set(props); done && done(); return; }
    for (const k in props) {
      const s = this.ensure(k);
      s.t = props[k];
      s.tension = cfg.tension ?? 170;
      s.friction = cfg.friction ?? 26;
    }
    this.done = done || null;
    active.add(this);
  }
  step(dtMs) {
    let settled = true;
    const steps = clamp(Math.round(dtMs), 1, 64);
    for (const k in this.s) {
      const s = this.s[k];
      for (let i = 0; i < steps; i++) {
        const a = -s.tension * (s.x - s.t) - s.friction * s.v;
        s.v += a / 1000;
        s.x += s.v / 1000;
      }
      const eps = (k === 'opacity' || k === 'scale') ? 0.001 : 0.05;
      if (Math.abs(s.x - s.t) > eps || Math.abs(s.v) > eps * 12) settled = false;
      else { s.x = s.t; s.v = 0; }
    }
    this.apply();
    if (settled) {
      active.delete(this);
      const d = this.done; this.done = null; d && d();
    }
  }
  apply() {
    const g = k => this.s[k] ? this.s[k].x : DEFAULTS[k];
    let t = '';
    if (this.s.x || this.s.y) t += `translate3d(${g('x')}px, ${g('y')}px, 0)`;
    if (this.s.scale) t += ` scale(${g('scale')})`;
    if (this.s.rot) t += ` rotate(${g('rot')}deg)`;
    if (t) this.el.style.transform = t;
    if (this.s.opacity) this.el.style.opacity = clamp(g('opacity'), 0, 1);
  }
}

/* ---------- Scroll parallax registry ---------- */
const plx = [];
function addParallax(el, ref, axis, from, to) { if (!REDUCED) plx.push({ el, ref, axis, from, to }); }
function parallaxTick() {
  const vh = innerHeight;
  for (const p of plx) {
    const r = p.ref.getBoundingClientRect();
    const t = clamp((vh - r.top) / (vh + r.height), 0, 1);
    const v = p.from + (p.to - p.from) * t;
    p.el.style.transform = p.axis === 'x'
      ? `translate3d(${v}%, 0, 0)`
      : `translate3d(0, ${v}%, 0)`;
  }
}

/* ---------- Single rAF loop: springs + parallax + lenis ---------- */
let last = performance.now();
requestAnimationFrame(function loop(now) {
  const dt = Math.min(now - last, 64); last = now;
  for (const m of [...active]) m.step(dt);
  parallaxTick();
  stepTick();
  lenis.raf(now);
  requestAnimationFrame(loop);
});

/* ---------- Reveal helpers ---------- */
function splitWords(el, cls = 'w') {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  const out = [];
  words.forEach((w, i) => {
    const o = document.createElement('span'); o.className = cls;
    const s = document.createElement('span'); s.className = cls + 'i'; s.textContent = w;
    o.appendChild(s); el.appendChild(o);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    out.push(o);
  });
  return out;
}
function fireLines(root, { stagger = 120, base = 0, dur = 950 } = {}) {
  if (!root) return;
  $$('.ln', root.classList.contains('ln') ? root.parentElement : root)
    .filter(ln => (root.classList.contains('ln') ? ln === root : root.contains(ln)))
    .forEach((ln, i) => {
      const li = $('.li', ln);
      if (!li) return;
      li.style.setProperty('--dl', (base + i * stagger) + 'ms');
      li.style.setProperty('--rd', dur + 'ms');
    });
  root.classList.add('in');
}
function resetLines(root) {
  root.classList.add('cut');
  root.classList.remove('in');
  void root.offsetWidth;
  root.classList.remove('cut');
}

/* ---------- IntersectionObserver (play once) ---------- */
const ioMap = new Map();
const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (e.isIntersecting) {
      io.unobserve(e.target);
      const f = ioMap.get(e.target);
      ioMap.delete(e.target);
      f && f();
    }
  }
}, { threshold: 0.15 });
function onView(el, fn) { if (!el) return; if (REDUCED) { fn(); return; } ioMap.set(el, fn); io.observe(el); }

const gatedFns = [];
function inview(el, { from, to, cfg, delay = 0, gated = false }) {
  if (!el) return;
  const m = Motion.of(el);
  m.set(from);
  const go = () => setTimeout(() => m.to(to, cfg), delay);
  if (gated) gatedFns.push(go); else onView(el, go);
}
function bindHover(el, target, from, to, cfg) {
  if (!el || !target) return;
  const m = Motion.of(target);
  m.set(from);
  el.addEventListener('pointerenter', () => { if (hoverOK()) m.to(to, cfg); });
  el.addEventListener('pointerleave', () => m.to(from, cfg));
}

/* =====================================================================
   LOADER
   ===================================================================== */
const loader = $('#loader');
lockScroll();
const lw = $('#loader .lw');
Motion.of(lw).set({ opacity: 0, y: 16 });
requestAnimationFrame(() => {
  loader.classList.add('go');
  Motion.of(lw).to({ opacity: 1, y: 0 }, { tension: 200, friction: 22 });
});

let revealed = false;
function reveal() {
  if (revealed) return;
  revealed = true;
  unlockScroll();
  heroReveal();
  gatedFns.forEach(f => f());
  startBgSlider();
  loader.classList.add('exit');
  setTimeout(() => loader.remove(), REDUCED ? 60 : 870);
}
const MIN_VISIBLE = REDUCED ? 200 : 1400;
const MAX_VISIBLE = 2600;
if (document.readyState === 'complete') setTimeout(reveal, MIN_VISIBLE);
else addEventListener('load', () => setTimeout(reveal, MIN_VISIBLE));
setTimeout(reveal, MAX_VISIBLE);

/* =====================================================================
   HERO
   ===================================================================== */
addParallax($('#hero-plate'), $('.hero'), 'y', 0, 12);

/* Background video slider — 3 clips crossfading; Unsplash still stays underneath as fallback */
const bgVids = $$('.bgv');
let bgi = 0, bgTimer = null;
function showBg(i) {
  bgi = i;
  const next = bgVids[i];
  try { next.currentTime = 0; } catch (e) {}
  next.play().catch(() => {});
  Motion.of(next).to({ opacity: 1 }, { tension: 120, friction: 26 });
  bgVids.forEach((v, j) => {
    if (j !== i) Motion.of(v).to({ opacity: 0 }, { tension: 120, friction: 26 }, () => { if (j !== bgi) v.pause(); });
  });
}
function startBgSlider() {
  if (REDUCED || !bgVids.length || bgTimer) return;
  let started = false;
  const kick = i => {
    if (started) return;
    started = true;
    showBg(i);
    bgTimer = setInterval(() => showBg((bgi + 1) % bgVids.length), 7500);
  };
  bgVids.forEach((v, i) => {
    if (v.readyState >= 2) { kick(i); return; }
    v.addEventListener('canplay', () => kick(i), { once: true });
    /* if a clip is missing or broken, promote the next one so the slider still starts */
    v.addEventListener('error', () => {
      const next = bgVids[i + 1];
      if (next && !started) { next.preload = 'auto'; next.load(); }
    }, { once: true });
  });
}

/* Giant title: word-by-word clip reveal, stagger 140ms, 1100ms easeOutExpo */
const heroWords = [];
$$('#hero-title .giant').forEach(line => heroWords.push(...splitWords(line)));
heroWords.forEach((w, i) => {
  const wi = $('.wi', w);
  wi.style.setProperty('--dl', (i * 80) + 'ms');
  wi.style.setProperty('--rd', '1100ms');
});

/* Single-text section headlines (no manual line breaks): word-by-word reveal, natural wrap */
$$('.hword').forEach(block => {
  splitWords(block).forEach((w, i) => {
    const wi = $('.wi', w);
    wi.style.setProperty('--dl', (i * 45) + 'ms');
    wi.style.setProperty('--rd', '950ms');
  });
});

function heroReveal() {
  $('#hero-title').classList.add('in');
  fireLines($('#hero-tp'), { base: 450, dur: 900 });
  fireLines($('#hero-sub'), { base: 900, dur: 900 });
  fireLines($('#hero-emote'), { base: 1050, dur: 900 });
  fireLines($('#hero-strip'), { base: 1050, stagger: 100, dur: 900 });
  fireLines($('#hero-disc'), { base: 1300, dur: 900 });
}

/* Gated in-view */
inview($('#hero-wa'),  { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 880, gated: true });
inview($('#enquiry'),  { from: { opacity: 0, y: 28 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 26 }, delay: 650, gated: true });

/* =====================================================================
   ENQUIRY DELIVERY
   Both forms used to fake a success message and send nothing. They now
   actually deliver.

   With no backend, delivery is a mailto: handoff — the same approach the rest
   of the practice's contact points already use, and the form says so before you
   press the button. To move to a real endpoint later, set ENQUIRY_ENDPOINT to a
   URL that accepts a JSON POST; everything else here already handles it, and
   the disclosure line swaps itself.
   ===================================================================== */
const ENQUIRY_ENDPOINT = null;          // e.g. 'https://formspree.io/f/xxxxxxx'
const ENQUIRY_MAILBOX  = 'info@flypassholidays.co.uk';

function enquiryBody(fields) {
  return Object.entries(fields)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}:\n${String(v).trim()}`)
    .join('\n\n');
}

/* Returns 'sent' | 'handoff' | 'failed'. Never claims success it cannot back. */
async function deliverEnquiry(subject, fields) {
  if (ENQUIRY_ENDPOINT) {
    try {
      const r = await fetch(ENQUIRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ subject, ...fields })
      });
      return r.ok ? 'sent' : 'failed';
    } catch (err) {
      console.warn('Enquiry POST failed', err);
      return 'failed';
    }
  }
  try {
    window.location.href = 'mailto:' + ENQUIRY_MAILBOX
      + '?subject=' + encodeURIComponent(subject)
      + '&body='    + encodeURIComponent(enquiryBody(fields));
    return 'handoff';
  } catch (err) {
    return 'failed';
  }
}

const eForm = $('#enquiry-form'), eSuccess = $('#enq-success'), eSubmit = $('#enq-submit');
/* Null-safe: pages without the hero enquiry form must not kill the engine here. */
if (eForm && eSuccess && eSubmit) eForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!eForm.reportValidity()) return;
  eSubmit.disabled = true;
  eSubmit.textContent = ENQUIRY_ENDPOINT ? 'Sending…' : 'Opening your email…';
  const first = ($('#e-name').value.trim().split(/\s+/)[0]) || 'there';
  const result = await deliverEnquiry('Schengen visa enquiry — ' + ($('#e-name').value.trim() || 'website'), {
    'Full name':   $('#e-name').value,
    'Email':       $('#e-email').value,
    'Phone':       $('#e-phone').value,
    'Nationality': $('#e-nat').value,
    'Destination': $('#e-dest').value,
    'Description': $('#e-desc').value
  });
  if (result === 'failed') {
    eSubmit.disabled = false;
    eSubmit.textContent = 'Send your enquiry';
    $('#enq-error').hidden = false;
    return;
  }
  $('#enq-success-text').textContent = result === 'sent'
    ? `Thanks, ${first} — we reply the same working day, Monday to Saturday, with a straight answer.`
    : `Your email client should now be open, ${first}, with your details filled in. Press send there and we reply the same working day, Monday to Saturday.`;
  eForm.hidden = true;
  eSuccess.hidden = false;
});

function makeDots(container, n, onPick) {
  container.innerHTML = '';
  const btns = [];
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dot';
    b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => onPick(i));
    container.appendChild(b); btns.push(b);
  }
  return {
    set(i) {
      btns.forEach((b, j) => {
        b.classList.toggle('on', j === i);
        if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    }
  };
}

/* =====================================================================
   COUNTRY MARQUEE — 29 Schengen countries, links to future /country pages
   ===================================================================== */
/* Only France has a country page today. Everything else routes to the /country/
   hub rather than emitting a link to a URL that does not exist. Paths carry the
   trailing slash so they match the canonicals exactly — no redirect hop. */
const COUNTRY_PAGES = { France: '/france-schengen-visa', Spain: '/spain-visa-from-uk', Greece: '/greece-visa-uk', Netherlands: '/netherlands-visa-uk', Belgium: '/belgium-visa-uk', Germany: '/germany-visa-uk', Italy: '/italy-visa-uk' };
const countryHref = name => COUNTRY_PAGES[name] || '/country';

const COUNTRIES = [
  ['Austria','at'],['Belgium','be'],['Bulgaria','bg'],['Croatia','hr'],['Czechia','cz'],
  ['Denmark','dk'],['Estonia','ee'],['Finland','fi'],['France','fr'],['Germany','de'],
  ['Greece','gr'],['Hungary','hu'],['Iceland','is'],['Italy','it'],['Latvia','lv'],
  ['Liechtenstein','li'],['Lithuania','lt'],['Luxembourg','lu'],['Malta','mt'],['Netherlands','nl'],
  ['Norway','no'],['Poland','pl'],['Portugal','pt'],['Romania','ro'],['Slovakia','sk'],
  ['Slovenia','si'],['Spain','es'],['Sweden','se'],['Switzerland','ch']
];
(function buildCountryGrid() {
  const grid = $('#country-grid');
  if (!grid) return;
  grid.innerHTML = COUNTRIES.map(([n, c]) =>
    `<a class="cg-item" href="${countryHref(n)}">` +
    `<span class="cg-left"><span class="cg-flag"><img src="https://flagcdn.com/w80/${c}.png" alt="" width="80" height="60" loading="lazy"></span>` +
    `<span class="cg-name">${n}</span></span>` +
    `<span class="cg-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a>`
  ).join('');
})();

(function buildCountryStrip() {
  const track = $('#mq-track');
  if (!track) return;
  const item = ([name, code], extra = '') =>
    `<a class="mq-item" href="${countryHref(name)}"${extra}>` +
    `<span class="mq-flag"><img src="https://flagcdn.com/w80/${code}.png" alt="" width="80" height="60" loading="lazy"></span>` +
    `<span class="mq-name">${name}</span></a>`;
  const group = COUNTRIES.map(c => item(c)).join('');
  const clone = COUNTRIES.map(c => item(c, ' tabindex="-1"')).join('');
  track.innerHTML =
    `<div class="mq-group">${group}</div>` +
    `<div class="mq-group" aria-hidden="true">${clone}</div>`;
})();



/* =====================================================================
   SECTION REVEALS
   ===================================================================== */
/* Stacked-line headings (default: stagger 120, dur 950, easeOutExpo) */
[['#key-facts-title', {}], ['#coverage-title', {}], ['#dr-title', {}], ['#numbers-title', {}], ['#reviews-title', {}], ['#safe-title', {}], ['#faq-title', {}], ['#final-title', {}]]
  .forEach(([sel, o]) => { const el = $(sel); if (!el) return; onView(el, () => fireLines(el, o)); });

/* Pain-point + who-we-are paragraphs */
$$('.pain-copy p, .who-grid p').forEach((p, i) => {
  inview(p, { from: { opacity: 0, y: 26 }, to: { opacity: 1, y: 0 }, cfg: { tension: 180, friction: 26 }, delay: (i % 3) * 120 });
});
inview($('#who-img'), { from: { opacity: 0, y: 40, scale: 0.96 }, to: { opacity: 1, y: 0, scale: 1 }, cfg: { tension: 180, friction: 26 }, delay: 150 });
inview($('#who-cta'), { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 300 });
$$('.whyc-points li').forEach((li, i) => {
  inview(li, { from: { opacity: 0, y: 26 }, to: { opacity: 1, y: 0 }, cfg: { tension: 190, friction: 26 }, delay: i * 100 });
});
inview($('.whyc-intro'), { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 150 });
inview($('#whyc-cta'),   { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 250 });
inview($('#whyc-img'),   { from: { opacity: 0, y: 40, scale: 0.97 }, to: { opacity: 1, y: 0, scale: 1 }, cfg: { tension: 180, friction: 26 }, delay: 150 });
inview($('#centres-img'), { from: { opacity: 0, y: 40, scale: 0.97 }, to: { opacity: 1, y: 0, scale: 1 }, cfg: { tension: 180, friction: 26 }, delay: 150 });
inview($('#dr-img'),      { from: { opacity: 0, y: 40, scale: 0.97 }, to: { opacity: 1, y: 0, scale: 1 }, cfg: { tension: 180, friction: 26 }, delay: 150 });
inview($('#dr-cta'),      { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 300 });
inview($('.cost-note'),   { from: { opacity: 0, y: 18 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 250 });



/* Who-we-are image height = 1.2 × content height on desktop */
function sizeWhoImage() {
  const fig = $('#who-img'), content = $('.who-content');
  if (!fig || !content) return;
  if (innerWidth >= 768) fig.style.height = Math.round(content.offsetHeight * 1.2) + 'px';
  else fig.style.removeProperty('height');
}
sizeWhoImage();
addEventListener('resize', sizeWhoImage);
addEventListener('load', sizeWhoImage);

/* Why-choose image height = 1.2 x content height on desktop */
function sizeWhyImage() {
  const fig = $('#whyc-img'), content = $('.whyc-content');
  if (!fig || !content) return;
  if (innerWidth >= 768) fig.style.height = Math.round(content.offsetHeight * 1.2) + 'px';
  else fig.style.removeProperty('height');
}
sizeWhyImage();
addEventListener('resize', sizeWhyImage);
addEventListener('load', sizeWhyImage);

/* Service rows */


/* Process — sticky step stack: cards 2 & 3 slide up, then the note + CTA appear */
const stepCards = $$('.step-card');
const processWrap = $('#process-wrap');
const processFoot = $('.process-foot');
const stepsPinned = innerWidth >= 1024 && !REDUCED;
if (stepCards.length) {
  if (stepsPinned) {
    stepCards[1].style.transform = 'translate3d(0, 100vh, 0)';
    stepCards[2].style.transform = 'translate3d(0, 100vh, 0)';
    processFoot.style.opacity = 0;
  } else {
    stepCards.forEach((card, i) => {
      inview(card, { from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 }, cfg: { tension: 180, friction: 26 }, delay: i * 120 });
    });
    inview(processFoot, { from: { opacity: 0, y: 24 }, to: { opacity: 1, y: 0 }, cfg: { tension: 190, friction: 26 }, delay: 200 });
  }
}
function centerProcessSticky() {
  const st = $('.process-sticky');
  if (!st) return;
  if (innerWidth >= 1024) st.style.top = Math.max(12, Math.round((innerHeight - st.offsetHeight) / 2)) + 'px';
  else st.style.removeProperty('top');
}
centerProcessSticky();
addEventListener('resize', centerProcessSticky);
addEventListener('load', centerProcessSticky);

function stepTick() {
  if (!stepsPinned || !processWrap) return;
  const r = processWrap.getBoundingClientRect();
  const total = r.height - innerHeight;
  if (total <= 0) return;
  const p = clamp(-r.top / total, 0, 1);
  const spans = [[0.08, 0.44], [0.48, 0.84]];
  [1, 2].forEach((ci, k) => {
    const [a, b] = spans[k];
    const t = clamp((p - a) / (b - a), 0, 1);
    const e = 1 - Math.pow(1 - t, 3);
    stepCards[ci].style.transform = `translate3d(0, ${(1 - e) * innerHeight}px, 0)`;
  });
  const ft = clamp((p - 0.86) / 0.14, 0, 1);
  const fe = 1 - Math.pow(1 - ft, 3);
  processFoot.style.opacity = fe;
  processFoot.style.transform = `translate3d(0, ${(1 - fe) * 30}px, 0)`;
}

/* Stats */
$$('#stats .stat').forEach((cell, i) => {
  inview(cell, { from: { opacity: 0, y: 30 }, to: { opacity: 1, y: 0 }, cfg: { tension: 180, friction: 24 }, delay: i * 110 });
});
inview($('#countries'), { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 180, friction: 24 }, delay: 300 });



/* Reviews */
$$('#t-grid .t-card').forEach((card, i) => {
  inview(card, { from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 }, cfg: { tension: 180, friction: 26 }, delay: i * 120 });
  bindHover(card, card, { y: 0 }, { y: -8 }, { tension: 300, friction: 22 });
});
inview($('#tp-summary'), { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 150 });
inview($('#t-cta'), { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 200 });

/* Safe-with-us cards */
$$('.safe-card').forEach((card, i) => {
  inview(card, { from: { opacity: 0, y: 30 }, to: { opacity: 1, y: 0 }, cfg: { tension: 185, friction: 26 }, delay: i * 110 });
});

/* FAQ rows */
$$('#faq-list .faq-item').forEach((item, i) => {
  inview(item, { from: { opacity: 0, y: 24 }, to: { opacity: 1, y: 0 }, cfg: { tension: 190, friction: 26 }, delay: i * 60 });
  const btn = $('.faq-q', item);
  btn.addEventListener('click', () => {
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
});

/* Footer */
$$('.final-p').forEach((pel, i) => {
  inview(pel, { from: { opacity: 0, y: 22 }, to: { opacity: 1, y: 0 }, cfg: { tension: 190, friction: 26 }, delay: 150 + i * 120 });
});
inview($('#final-ctas'), { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, cfg: { tension: 200, friction: 24 }, delay: 400 });
inview($('.final-contact'), { from: { opacity: 0 }, to: { opacity: 1 }, cfg: { tension: 200, friction: 26 }, delay: 550 });

/* Pill arrows nudge x 0 -> 5 on hover */
$$('.pill').forEach(p => {
  const svg = $('svg', p);
  if (svg) bindHover(p, svg, { x: 0 }, { x: 5 }, { tension: 320, friction: 20 });
});

/* =====================================================================
   MENU OVERLAY
   ===================================================================== */
const menu = $('#menu');
const menuPanel = $('.menu-panel', menu);
const menuBack = $('.backdrop', menu);
const menuLinks = $$('#menu-nav a');
let menuOpen = false;
let menuTrap = null;

Motion.of(menuPanel).set({ opacity: 0, y: -24 });
Motion.of(menuBack).set({ opacity: 0 });

function openMenu() {
  if (menuOpen) return;
  menuOpen = true;
  lockScroll();
  menu.style.pointerEvents = 'auto';
  menu.removeAttribute('aria-hidden');
  menu.removeAttribute('inert');
  $('#burger').setAttribute('aria-expanded', 'true');
  Motion.of(menuBack).to({ opacity: 1 }, { tension: 260, friction: 30 });
  Motion.of(menuPanel).to({ opacity: 1, y: 0 }, { tension: 220, friction: 28 });
  menuLinks.forEach((a, i) => {
    const m = Motion.of(a);
    m.set({ opacity: 0, y: 28 });
    setTimeout(() => m.to({ opacity: 1, y: 0 }, { tension: 200, friction: 26 }), 120 + i * 70);
  });
  menuTrap = trapFocus(menuPanel);
  setTimeout(() => $('#menu-close').focus(), 150);
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  $('#burger').setAttribute('aria-expanded', 'false');
  Motion.of(menuBack).to({ opacity: 0 }, { tension: 260, friction: 30 });
  Motion.of(menuPanel).to({ opacity: 0, y: -24 }, { tension: 220, friction: 28 }, () => {
    menu.style.pointerEvents = 'none';
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
  });
  unlockScroll();
  releaseFocus(menuTrap); menuTrap = null;
  menu.setAttribute('inert', '');
}
$('#burger').addEventListener('click', openMenu);
$('#menu-close').addEventListener('click', closeMenu);

/* Nav dropdown/mega aria state (visuals are CSS hover/focus-within) */
$$('.nav-item').forEach(item => {
  const btn = $('.nav-link', item);
  if (!btn) return;
  const set = v => btn.setAttribute('aria-expanded', v);
  item.addEventListener('mouseenter', () => { if (!item.classList.contains('open')) set('true'); });
  item.addEventListener('mouseleave', () => { if (!item.classList.contains('open')) set('false'); });
  item.addEventListener('focusin',  () => { if (!item.classList.contains('open')) set('true'); });
  item.addEventListener('focusout', () => { if (!item.classList.contains('open')) set('false'); });
  /* The panel opened on :hover/:focus-within only, so the button itself did
     nothing when pressed — and on a touch screen there is no hover to rely on.
     .open is a real toggle that works for pointer, keyboard and touch alike. */
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = !item.classList.contains('open');
    $$('.nav-item.open').forEach(o => { if (o !== item) { o.classList.remove('open'); const b=$('.nav-link',o); if(b) b.setAttribute('aria-expanded','false'); } });
    item.classList.toggle('open', willOpen);
    set(willOpen ? 'true' : 'false');
  });
  btn.addEventListener('keydown', e => {
    if (e.key === 'Escape' && item.classList.contains('open')) {
      item.classList.remove('open'); set('false'); btn.focus();
    }
  });
});
document.addEventListener('click', e => {
  if (e.target.closest('.nav-item')) return;
  $$('.nav-item.open').forEach(o => { o.classList.remove('open'); const b=$('.nav-link',o); if(b) b.setAttribute('aria-expanded','false'); });
});
bindHover($('#menu-close'), $('#menu-close svg'), { rot: 0 }, { rot: 90 }, { tension: 300, friction: 18 });

/* =====================================================================
   CONTACT MODAL
   ===================================================================== */
const modal = $('#modal');
const mPanel = $('.panel', modal);
const mBack = $('.backdrop', modal);
const mForm = $('#modal-form');
const mSuccess = $('#modal-success');
const mSubmit = $('#modal-submit');
let modalOpen = false;
let modalTrap = null;

Motion.of(mPanel).set({ opacity: 0, y: 28, scale: 0.96 });
Motion.of(mBack).set({ opacity: 0 });

function openModal() {
  if (modalOpen) return;
  modalOpen = true;
  lockScroll();
  modal.style.pointerEvents = 'auto';
  modal.removeAttribute('aria-hidden');
  modal.removeAttribute('inert');
  Motion.of(mBack).to({ opacity: 1 }, { tension: 240, friction: 30 });
  Motion.of(mPanel).to({ opacity: 1, y: 0, scale: 1 }, { tension: 240, friction: 26 });
  const t = $('#modal-title');
  resetLines(t);
  fireLines(t, { stagger: 90, dur: 800 });
  modalTrap = trapFocus(mPanel);
  setTimeout(() => $('#f-name').focus(), 120);
}
function closeModal() {
  if (!modalOpen) return;
  modalOpen = false;
  Motion.of(mBack).to({ opacity: 0 }, { tension: 240, friction: 30 });
  Motion.of(mPanel).to({ opacity: 0, y: 28, scale: 0.96 }, { tension: 240, friction: 26 }, () => {
    modal.style.pointerEvents = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
  });
  unlockScroll();
  releaseFocus(modalTrap); modalTrap = null;
  modal.setAttribute('inert', '');
  setTimeout(resetForm, 350);
}
function resetForm() {
  mForm.reset();
  mForm.hidden = false;
  mSuccess.hidden = true;
  mSubmit.disabled = false;
  mSubmit.textContent = 'Start my application';
}
mForm.addEventListener('submit', async e => {
  e.preventDefault();
  mSubmit.disabled = true;
  mSubmit.textContent = ENQUIRY_ENDPOINT ? 'Sending…' : 'Opening your email…';
  const first = ($('#f-name').value.trim().split(/\s+/)[0]) || 'there';
  const result = await deliverEnquiry('Schengen visa enquiry — ' + ($('#f-name').value.trim() || 'website'), {
    'Full name': $('#f-name').value,
    'Email':     $('#f-email').value,
    'Trip':      $('#f-msg').value
  });
  if (result === 'failed') {
    mSubmit.disabled = false;
    mSubmit.textContent = 'Start my application';
    $('#modal-error').hidden = false;
    return;
  }
  $('#success-text').textContent = result === 'sent'
    ? `Thanks, ${first} — we reply the same working day, Monday to Saturday, and your case starts with a straight answer.`
    : `Your email client should now be open, ${first}, with your details filled in. Press send there and we reply the same working day, Monday to Saturday.`;
  mForm.hidden = true;
  mSuccess.hidden = false;
});
$('#modal-close').addEventListener('click', closeModal);
$('#modal-done').addEventListener('click', closeModal);
bindHover($('#modal-close'), $('#modal-close svg'), { rot: 0 }, { rot: 90 }, { tension: 300, friction: 18 });

/* ---------- Global wiring ---------- */
document.addEventListener('click', e => {
  const opener = e.target.closest('[data-open-modal]');
  if (opener) {
    e.preventDefault();
    if (opener.hasAttribute('data-close-menu-first') || menuOpen) closeMenu();
    openModal();
    return;
  }
  if (e.target.closest('[data-close-modal]')) { closeModal(); return; }
  if (e.target.closest('[data-close-menu]'))  { closeMenu();  return; }

  const link = e.target.closest('a[href^="#"]');
  if (link) {
    e.preventDefault();
    const href = link.getAttribute('href');
    if (menuOpen) closeMenu();
    if (href === '#top') { lenis.scrollTo(0, { duration: 1.2 }); focusTarget(document.querySelector('#main')); return; }
    const target = document.querySelector(href);
    if (target) { lenis.scrollTo(target, { offset: -10, duration: 1.2 }); focusTarget(target); }
  }
});

/* preventDefault above cancels the browser's own hash navigation, and with it
   the focus move that normally follows one. Without this the skip link (and
   every in-page anchor) would scroll the viewport but leave focus where it
   was, so the next Tab returns to the nav instead of continuing from the
   destination — a skip link that does not actually skip anything.
   preventScroll keeps the focus call from fighting the Lenis animation. */
function focusTarget(el) {
  if (!el) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}
$$('[data-focus-form]').forEach(btn => btn.addEventListener('click', () => {
  const f = $('#enquiry');
  if (!f) { window.location.href = '/contact'; return; } /* pages without a hero form route to the contact page */
  lenis.scrollTo(f, { offset: -40, duration: 1 });
  setTimeout(() => { const n = $('#e-name'); n && n.focus({ preventScroll: true }); }, 700);
}));

addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modalOpen) closeModal();
    else if (menuOpen) closeMenu();
  }
});

/* Destination-rule map figure height = 1.2 x content height on desktop (site-wide ratio rule). */
function sizeDrImage() {
  const fig = $('#dr-img');
  if (!fig) return;
  const grid = fig.closest('.whyc-grid');
  const content = grid && grid.querySelector('.whyc-content');
  if (!content) return;
  if (innerWidth >= 768) fig.style.height = Math.round(content.offsetHeight * 1.2) + 'px';
  else fig.style.removeProperty('height');
}
sizeDrImage();
addEventListener('resize', sizeDrImage);
addEventListener('load', sizeDrImage);

/* RATIO-SETTLE: keep the 1.2x figure ratio exact after fonts/late reflows. */
(function () {
  const all = () => { sizeSafeImage(); if (typeof sizeWhoImage === 'function') sizeWhoImage(); if (typeof sizeWhyImage === 'function') sizeWhyImage(); sizeDrImage(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
  setTimeout(all, 1200); setTimeout(all, 3000);
})();

/* Trust-section image height = 1.2 x content height on desktop (site-wide ratio rule). */
function sizeSafeImage() {
  const fig = $('#safe-img'), content = $('.safe-content');
  if (!fig || !content) return;
  if (innerWidth >= 1024) fig.style.height = Math.round(content.offsetHeight * 1.2) + 'px';
  else fig.style.removeProperty('height');
}
sizeSafeImage();
addEventListener('resize', sizeSafeImage);
addEventListener('load', sizeSafeImage);
