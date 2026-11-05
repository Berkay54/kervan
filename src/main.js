import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './style.css';
import { createScene } from './scene.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ——— Yumuşak kaydırma ——— */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    closeNav();
    if (lenis) lenis.scrollTo(el, { offset: id === '#top' ? 0 : -60, duration: 1.4 });
    else el.scrollIntoView();
  });
});

/* ——— Mobil menü ——— */
const burger = $('#burger');
function closeNav() {
  document.body.classList.remove('nav-open');
  burger.setAttribute('aria-expanded', 'false');
  lenis?.start();
}
burger.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  burger.setAttribute('aria-expanded', String(open));
  open ? lenis?.stop() : lenis?.start();
});

/* ——— Header davranışı ——— */
const header = $('#header');
ScrollTrigger.create({
  trigger: '.hero',
  start: 'bottom top+=72',
  onEnter: () => header.classList.add('is-solid'),
  onLeaveBack: () => header.classList.remove('is-solid'),
});
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => {
    const y = self.scroll();
    header.classList.toggle('is-hidden', y > 600 && y > lastY && !document.body.classList.contains('nav-open'));
    lastY = y;
  },
});

/* ——— 3D sahne ——— */
const canvas = $('#scene');
let scene = null;
try {
  const test = document.createElement('canvas');
  if (test.getContext('webgl2') || test.getContext('webgl')) {
    scene = createScene(canvas, { reducedMotion: reduced });
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top',
      onUpdate: (self) => scene.setProgress(self.progress),
    });
  }
} catch (err) {
  console.warn('WebGL başlatılamadı:', err);
}

/* ——— Kelime bölme ——— */
function split(el) {
  const nodes = [...el.childNodes];
  el.textContent = '';
  const out = [];
  nodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.append(' '); return; }
        const o = document.createElement('span'); o.className = 'w';
        const i = document.createElement('span'); i.className = 'w__i'; i.textContent = part;
        o.append(i); el.append(o); out.push(i);
      });
    } else if (n.nodeName === 'BR') {
      el.append(document.createElement('br'));
    } else {
      const o = document.createElement('span'); o.className = 'w';
      const i = document.createElement('span'); i.className = 'w__i'; i.append(n);
      o.append(i); el.append(o); out.push(i);
    }
  });
  return out;
}

/* ——— Giriş animasyonları ——— */
function intro() {
  const heroWords = split($('[data-split="hero"]'));
  if (reduced) return;
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from(canvas, { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0)
    .from('.hero .eyebrow', { y: 16, opacity: 0, duration: 0.8 }, 0.2)
    .from(heroWords, { yPercent: 115, duration: 1.15, stagger: 0.07 }, 0.3)
    .from('[data-hero-fade]', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.75)
    .from('.header__inner > *', { y: -12, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.4);
}

function reveals() {
  $$('[data-split]:not([data-split="hero"])').forEach((el) => {
    const words = split(el);
    if (reduced) return;
    gsap.from(words, {
      yPercent: 115, duration: 1, stagger: 0.045, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });

  if (reduced) return;

  gsap.set('[data-reveal]', { y: 28, opacity: 0 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true }),
  });

  // süreç çubuğu
  gsap.to('.process__bar span', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 55%', scrub: 0.6 },
  });

  // hizmetler: başlık hafif paralaks
  gsap.to('.services .section__head', {
    y: -40, ease: 'none',
    scrollTrigger: { trigger: '.services', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

/* ——— Sayaçlar ——— */
function counters() {
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const fmt = (v) => v.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduced) { el.textContent = fmt(end); return; }
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2, ease: 'power3.out',
      onUpdate: () => { el.textContent = fmt(o.v); },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

/* ——— Ağ haritası ——— */
function network() {
  const NS = 'http://www.w3.org/2000/svg';
  const hubs = {
    istanbul: { x: 517, y: 265, n: 'İstanbul', main: true },
    mersin: { x: 610, y: 339, n: 'Mersin', main: true },
    izmir: { x: 485, y: 311, n: 'İzmir' },
    ankara: { x: 582, y: 284, n: 'Ankara', label: 'below' },
    bukres: { x: 468, y: 205, n: 'Bükreş', label: 'left' },
    munih: { x: 227, y: 139, n: 'Münih' },
    milano: { x: 187, y: 185, n: 'Milano', label: 'below' },
    trieste: { x: 263, y: 182, n: 'Trieste', label: 'below' },
    paris: { x: 73, y: 124, n: 'Paris', label: 'below' },
    rotterdam: { x: 108, y: 72, n: 'Rotterdam' },
    hamburg: { x: 200, y: 42, n: 'Hamburg' },
    tiflis: { x: 780, y: 252, n: 'Tiflis' },
    bagdat: { x: 773, y: 399, n: 'Bağdat' },
    dubai: { x: 955, y: 543, n: 'Dubai', label: 'left' },
  };
  const routes = [
    ['istanbul', 'bukres'], ['istanbul', 'munih'], ['istanbul', 'milano'], ['istanbul', 'paris'],
    ['istanbul', 'rotterdam'], ['istanbul', 'hamburg'], ['ankara', 'tiflis'], ['mersin', 'bagdat'],
    ['istanbul', 'ankara'], ['ankara', 'mersin'], ['izmir', 'trieste', 'sea'], ['mersin', 'dubai', 'sea'],
  ];
  const gR = $('#routes'), gH = $('#hubs');
  const paths = [];
  routes.forEach(([a, b, mode], i) => {
    const A = hubs[a], B = hubs[b];
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const dx = B.x - A.x, dy = B.y - A.y;
    const len = Math.hypot(dx, dy);
    const bend = Math.min(90, len * 0.18) * (i % 2 ? 1 : -1);
    const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${A.x} ${A.y} Q${cx} ${cy} ${B.x} ${B.y}`);
    p.setAttribute('pathLength', '1');
    p.setAttribute('class', 'route');
    p.dataset.mode = mode || 'road';
    p.id = `r${i}`;
    gR.append(p);
    paths.push(p);
  });
  Object.values(hubs).forEach((h) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `hub${h.main ? ' hub--main' : ''}`);
    g.setAttribute('transform', `translate(${h.x} ${h.y})`);
    const r = h.main ? 6 : 3.6;
    g.innerHTML = `<circle class="ring" r="${r}"></circle><circle class="core" r="${r}"></circle>`;
    const t = document.createElementNS(NS, 'text');
    t.textContent = h.n;
    if (h.label === 'left') { t.setAttribute('x', -12); t.setAttribute('y', 4); t.setAttribute('text-anchor', 'end'); }
    else if (h.label === 'below') { t.setAttribute('x', 0); t.setAttribute('y', 22); t.setAttribute('text-anchor', 'middle'); }
    else { t.setAttribute('x', 12); t.setAttribute('y', 4); }
    g.append(t);
    gH.append(g);
  });

  const addPackets = () => {
    if (reduced) return;
    paths.forEach((p, i) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', '3');
      c.setAttribute('class', 'packet');
      const anim = document.createElementNS(NS, 'animateMotion');
      anim.setAttribute('dur', `${5 + (i % 4) * 1.4}s`);
      anim.setAttribute('repeatCount', 'indefinite');
      anim.setAttribute('begin', `${(i % 5) * 0.7}s`);
      if (i % 3 === 1) { anim.setAttribute('keyPoints', '1;0'); anim.setAttribute('keyTimes', '0;1'); anim.setAttribute('calcMode', 'linear'); }
      const mp = document.createElementNS(NS, 'mpath');
      mp.setAttribute('href', `#${p.id}`);
      anim.append(mp); c.append(anim);
      gR.append(c);
    });
  };

  const finish = () => paths.forEach((p) => p.dataset.mode === 'sea' && p.classList.add('is-sea'));

  if (reduced) { finish(); return; }
  gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set('.hub', { opacity: 0 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.map', start: 'top 72%', once: true }, onComplete: () => { finish(); addPackets(); } });
  tl.to('.hub--main', { opacity: 1, duration: 0.5 })
    .to(paths, { strokeDashoffset: 0, duration: 1.4, stagger: 0.08, ease: 'power2.inOut' }, 0.2)
    .to('.hub:not(.hub--main)', { opacity: 1, duration: 0.4, stagger: 0.05 }, 0.8);
}

/* ——— Canlı veriler ——— */
function liveData() {
  const clock = $('#clock');
  const live = $('#live');
  const fmt = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 1000);
  let n = 1284;
  setInterval(() => {
    n += Math.round((Math.random() - 0.45) * 4);
    live.textContent = n.toLocaleString('tr-TR');
  }, 3800);
}

/* ——— Takip demo ——— */
function tracking() {
  const form = $('#trackForm'), input = $('#trackNo'), err = $('#trackError'), res = $('#trackResult');
  $('#sample').addEventListener('click', () => { input.value = 'KRV-48213'; input.focus(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^KRV-?\d{4,8}$/.test(v)) {
      err.textContent = 'Takip numarası KRV ile başlar ve rakamlarla devam eder. Örnek: KRV-48213';
      res.hidden = true;
      return;
    }
    err.textContent = '';
    res.hidden = false;
    if (reduced) return;
    gsap.fromTo(res, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    gsap.fromTo('.track__line span', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power3.inOut', delay: 0.15 });
    gsap.fromTo('.track__events li', { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.09, delay: 0.25, ease: 'power2.out' });
  });
}

/* ——— Teklif formu demo ——— */
function quoteForm() {
  const form = $('#quoteForm'), msg = $('#quoteMsg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach((i) => {
      const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
      i.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { msg.textContent = 'Lütfen ad soyad ve geçerli bir e-posta adresi girin.'; return; }
    msg.textContent = 'Teşekkürler. Talebiniz operasyon ekibimize iletildi; mesai saatleri içinde iki saat içinde dönüş yapacağız.';
    form.reset();
  });
}

const start = () => {
  intro();
  reveals();
  counters();
  network();
  liveData();
  tracking();
  quoteForm();
  ScrollTrigger.refresh();
};

if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
else start();
