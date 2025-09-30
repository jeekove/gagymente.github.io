document.addEventListener('DOMContentLoaded', () => {
  // ---------- HERO LOCK ----------
  let locked = true;       // amíg H1→H2 nem futott le
  let delayActive = false; // H2 "megállás" késleltetés (ms-ban lejjebb)
  const h1 = document.getElementById('mainTitle');
  const h2 = document.getElementById('subTitle');
  const bg = document.querySelector('.hero .bg');

  function showH1() {
    if (h1) { h1.style.opacity = '1'; h1.style.transform = 'translateY(0)'; }
    if (h2) { h2.style.opacity = '0'; h2.style.transform = 'translateY(50px)'; }
    if (bg) { bg.style.filter = 'blur(0px)'; }
  }
  function showH2() {
    if (h1) { h1.style.opacity = '0'; h1.style.transform = 'translateY(-50px)'; }
    if (h2) { h2.style.opacity = '1'; h2.style.transform = 'translateY(0)'; }
    if (bg) { bg.style.filter = 'blur(15px)'; }
  }
  showH1(); // indulás

  // ---------- SEGÉDEK GÖRGETÉSHEZ ----------
  function closestScrollableY(el) {
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) return el;
      el = el.parentElement;
    }
    return null;
  }
  function canScrollInDirection(el, dy) {
    if (!el) return false;
    if (dy > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1; // lefelé
    if (dy < 0) return el.scrollTop > 0;                                     // felfelé
    return false;
  }

  // ---------- DESKTOP: FLUID SCROLL + LOCK integráció ----------
  const enableFluid = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.scrollingElement || document.documentElement;
  let vy = 0, running = false, rafId;
  const friction = 0.90, step = 0.10;

  function runMomentum() {
    if (Math.abs(vy) > 0.1) {
      const before = root.scrollTop;
      const maxScroll = root.scrollHeight - root.clientHeight;
      root.scrollTop = Math.max(0, Math.min(maxScroll, root.scrollTop + vy));
      vy *= friction;
      if (root.scrollTop === before || root.scrollTop === 0 || root.scrollTop === maxScroll) vy = 0;
      rafId = requestAnimationFrame(runMomentum);
    } else {
      running = false;
      cancelAnimationFrame(rafId);
    }
  }

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // zoom
    // ha belső scroll doboz alatt vagyunk és TUD abba az irányba görgetni → ne nyúljunk bele
    const sc = closestScrollableY(e.target);
    if (sc && canScrollInDirection(sc, e.deltaY)) return;

    if (locked) {
      e.preventDefault();
      if (e.deltaY > 0 && !delayActive) {
        showH2();
        delayActive = true;
        setTimeout(() => { locked = false; delayActive = false; }, 800); // <-- késleltetés
      }
      if (e.deltaY < 0) showH1();
      return;
    }

    if (!enableFluid) return; // ha reduce-motion, hagyjuk natívon
    e.preventDefault();
    vy += e.deltaY * step;
    if (!running) { running = true; rafId = requestAnimationFrame(runMomentum); }
  }, { passive: false });

  // ---------- MOBIL: TOUCH + LOCK ----------
  let touchStartY = 0;
  let lastTouchY = 0;
  const SWIPE_THRESHOLD = 6; // px – kis zajszűrés

  window.addEventListener('touchstart', (e) => {
    if (!e.touches || !e.touches.length) return;
    touchStartY = lastTouchY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!e.touches || !e.touches.length) return;
    const y = e.touches[0].clientY;
    const dy = lastTouchY - y; // >0: felfelé húzás (lefelé scroll)
    lastTouchY = y;

    // ha belső scroll doboz tud ebbe az irányba görgetni → engedjük
    const sc = closestScrollableY(e.target);
    if (sc && canScrollInDirection(sc, dy)) return;

    if (locked) {
      // amíg zárva van, a hero animációt játsszuk, a natív scrollt blokkoljuk
      if (Math.abs(dy) < SWIPE_THRESHOLD) return; // zajszűrés
      e.preventDefault();

      if (dy > 0 && !delayActive) {
        // lefelé scroll (tartalom felé)
        showH2();
        delayActive = true;
        setTimeout(() => { locked = false; delayActive = false; }, 800); // <-- késleltetés
      }
      if (dy < 0) {
        // felfelé (vissza)
        showH1();
      }
      // ha már nem locked, NEM csinálunk semmit: natív mobil momentum görgetés megy tovább
    }
    // ha nem locked: passz – hagyjuk a natív touch scrollt
  }, { passive: false });

  // ---------- VISSZALOCK, ha tetejére érünk ----------
  window.addEventListener('scroll', () => {
    if (window.scrollY === 0) {
      locked = true;
      showH1();
    }
  });

  // ---------- SMOOTH LINK SCROLL (desktop + mobil) ----------
  (() => {
    const HEADER_OFFSET = 0;
    const DURATION = 900; // ms
    const easeInOutCubic = t => (t < 0.5) ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

    function targetY(hash) {
      const el = document.querySelector(hash);
      if (!el) return null;
      return el.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
    }
    function smoothScrollTo(y, duration = DURATION) {
      const startY = window.pageYOffset;
      const dist = y - startY;
      let startTime = null;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo(0, y);
        return;
      }
      const step = (now) => {
        if (startTime === null) startTime = now;
        const t = Math.min((now - startTime) / duration, 1);
        const eased = easeInOutCubic(t);
        window.scrollTo(0, startY + dist * eased);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a.js-smooth');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      const y = targetY(href);
      if (y == null) return;
      e.preventDefault();
      smoothScrollTo(y, DURATION);
    });
  })();
});





  // ---------- GLOBAL WHEEL ----------
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // ne zavarjuk a zoomot

    // 1) ha belső görgethető elem alatt vagyunk ÉS tud abba az irányba görgetni → engedjük a natívot
    const scrollable = closestScrollableY(e.target);
    if (scrollable && canScrollInDirection(scrollable, e.deltaY)) return;

    // 2) HERO lock szakasz (csak itt preventDefault)
    if (locked) {
      e.preventDefault();
      if (e.deltaY > 0 && !delayActive) {
        showH2();
        delayActive = true;
        setTimeout(() => { locked = false; delayActive = false; }, 800); // itt állítsd a késleltetést (ms)
      }
      if (e.deltaY < 0) showH1();
      return;
    }

    // 3) Fluid scroll csak akkor, ha engedélyezve van
    if (!enableFluid) return; // natív görgetés

    e.preventDefault();
    vy += e.deltaY * step;
    if (!running) { running = true; rafId = requestAnimationFrame(runMomentum); }
  }, { passive: false });

  // tetején vissza-lockol
  window.addEventListener('scroll', () => {
    if (window.scrollY === 0) { locked = true; showH1(); }
  });

  // ---------- GALLERY: 1 slide látszik, drag/swipe váltás ----------
  const gallery = document.querySelector('.gallerys');
  if (gallery) {
    const slides = Array.from(gallery.querySelectorAll('.cubevillage'));
    let index = 0;

    function render() {
      gallery.style.transform = `translateX(${-index * 80}%)`;
    }
    render();

    // nyilak (ha vannak .prev/.next)
    const nextBtn = document.querySelector('.next');
    const prevBtn = document.querySelector('.prev');
    nextBtn && nextBtn.addEventListener('click', () => { index = (index + 1) % slides.length; render(); });
    prevBtn && prevBtn.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; render(); });

    // drag / swipe
    let down = false, startX = 0, dx = 0;
    const threshold = 50; // ennyi pixel után vált

    function onPointerDown(e) {
      down = true;
      startX = (e.touches ? e.touches[0].clientX : e.clientX);
      dx = 0;
      gallery.style.transition = 'none';
    }
    function onPointerMove(e) {
      if (!down) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      dx = x - startX;
      e.preventDefault(); // ne váltsa ki a natív görgetést húzás közben
      gallery.style.transform = `translateX(calc(${-index * 80}% + ${dx}px))`;
    }
    function onPointerUp() {
      if (!down) return;
      down = false;
      gallery.style.transition = 'transform .45s ease';
      if (dx < -threshold) index = Math.min(index + 1, slides.length - 1);
      else if (dx > threshold) index = Math.max(index - 1, 0);
      render();
    }

    gallery.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    gallery.addEventListener('touchstart', onPointerDown, { passive: true });
    gallery.addEventListener('touchmove', onPointerMove, { passive: false });
    gallery.addEventListener('touchend', onPointerUp);

    // fontos: a galéria ne “nyelje el” a görgőt → nincs wheel handler itt
    // így az oldalt lehet görgetni, a húzás pedig vált
  }