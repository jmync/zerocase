/* Portfolio interactions — plain JavaScript. Matter.js is lazy-loaded for the skills playground. */
(function () {
  'use strict';

  window.__siteReady = true;

  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var EMAIL = 'jmync.exe@gmail.com';
  var LINKEDIN = 'https://www.linkedin.com/in/jm-albasin/';
  var GITHUB = 'https://github.com/jmync';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function onMedia(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* =========================================================
     Theme (light / dark) with a circular reveal
     ========================================================= */
  var themeBtn = $('#theme-toggle');
  var metaTheme = $('meta[name="theme-color"]');

  function storedTheme() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0c0c0d' : '#f3f2ee');
    if (themeBtn) themeBtn.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
  }

  function setTheme(theme, origin) {
    try { localStorage.setItem('theme', theme); } catch (e) { /* still switch */ }
    if (theme === currentTheme()) return;
    if (!document.startViewTransition || reduce) {
      applyTheme(theme);
      return;
    }
    var x = window.innerWidth - 60;
    var y = 38;
    if (origin && origin.getBoundingClientRect) {
      var r = origin.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var t = document.startViewTransition(function () { applyTheme(theme); });
    t.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 800, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
  }

  function toggleTheme(origin) {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark', origin || themeBtn);
  }

  applyTheme(currentTheme());
  if (themeBtn) themeBtn.addEventListener('click', function () { toggleTheme(themeBtn); });
  onMedia(window.matchMedia('(prefers-color-scheme: dark)'), function (e) {
    if (!storedTheme()) applyTheme(e.matches ? 'dark' : 'light');
  });

  /* =========================================================
     Small content helpers
     ========================================================= */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  var loaderYear = $('#loader-year');
  if (loaderYear) loaderYear.textContent = String(new Date().getFullYear());

  function yearsSince(ym) {
    var p = ym.split('-');
    var now = new Date();
    var months = (now.getFullYear() - Number(p[0])) * 12 + (now.getMonth() - (Number(p[1]) - 1));
    return Math.max(0, Math.floor(months / 12));
  }

  var chipCount = $$('.skill-group .chip').length;
  var countYears = $('#count-years');
  var countSkills = $('#count-skills');
  var statSkills = $('#stat-skills');
  if (countYears) countYears.textContent = '[' + yearsSince('2017-01') + 'y+]';
  if (countSkills) countSkills.textContent = '[' + chipCount + ']';
  if (statSkills) statSkills.setAttribute('data-count', chipCount);

  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var kbdLabel = $('#kbd-label');
  if (kbdLabel) kbdLabel.textContent = isMac ? '⌘K' : 'Ctrl K';

  // Split letter headings into animated spans.
  function splitLetters(el, startIndex) {
    var idx = startIndex || 0;
    var text = el.textContent;
    el.textContent = '';
    text.split('').forEach(function (c) {
      if (c === ' ') {
        var sp = document.createElement('span');
        sp.className = 'sp';
        el.appendChild(sp);
        return;
      }
      var l = document.createElement('span');
      var li = document.createElement('span');
      l.className = 'l';
      li.className = 'li';
      li.textContent = c;
      l.style.setProperty('--li', idx++);
      l.appendChild(li);
      el.appendChild(l);
    });
    return idx;
  }

  var heroLetterIdx = 0;
  $$('.hero-name [data-letters]').forEach(function (el) { heroLetterIdx = splitLetters(el, heroLetterIdx); });
  $$('.contact-title [data-letters]').forEach(function (el, i) {
    splitLetters(el, 0);
    el.style.setProperty('--ld', (i * 260) + 'ms');
  });

  // Split the statement into words for the scroll highlight.
  var statement = $('#statement');
  var statementWords = [];
  if (statement && !reduce) {
    var words = statement.textContent.trim().split(/\s+/);
    statement.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      statement.appendChild(s);
      if (i < words.length - 1) statement.appendChild(document.createTextNode(' '));
      statementWords.push(s);
    });
  }

  $$('.journey li').forEach(function (li, i) { li.style.setProperty('--j', i); });

  /* =========================================================
     Fit giant type to its container
     ========================================================= */
  var heroName = $('#hero-name');
  var hnWrap = $('.hn-wrap');
  var heroStack = window.matchMedia('(max-width: 1100px)');

  function textWidth(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().width;
  }

  function fitAll() {
    if (heroName && hnWrap) {
      var avail = heroName.clientWidth - (heroStack.matches ? 2 * parseFloat(getComputedStyle(heroName).paddingLeft || 0) : 0);
      if (heroStack.matches) {
        heroName.style.removeProperty('--name-size');
        $$('.hn', heroName).forEach(function (hn) {
          hn.style.fontSize = '100px';
          var w = textWidth(hn);
          if (w) hn.style.fontSize = (100 * avail / w * 0.985).toFixed(2) + 'px';
        });
      } else {
        $$('.hn', heroName).forEach(function (hn) { hn.style.fontSize = ''; });
        heroName.style.setProperty('--name-size', '100px');
        var w = hnWrap.getBoundingClientRect().width;
        if (w) heroName.style.setProperty('--name-size', (100 * avail / w * 0.985).toFixed(2) + 'px');
      }
    }

    $$('[data-fit]').forEach(function (el) {
      var parent = el.parentElement;
      if (!parent) return;
      el.style.setProperty('--fit', '100px');
      var w = textWidth(el);
      if (w) el.style.setProperty('--fit', (100 * parent.clientWidth / w * 0.985).toFixed(2) + 'px');
    });
  }

  fitAll();
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady.then(fitAll);

  /* =========================================================
     Intro loader → page load animation
     ========================================================= */
  var loader = $('#loader');
  var started = false;

  function startPage() {
    if (started) return;
    started = true;
    fitAll();
    body.classList.add('loaded');
    setTimeout(function () {
      var h = $('#top');
      if (h) h.classList.add('settled');
    }, reduce ? 0 : 1700);
    startTyping();
    requestUpdate();
  }

  function runLoader() {
    var seen = false;
    try { seen = sessionStorage.getItem('intro-seen') === '1'; } catch (e) {}
    if (!loader || reduce || seen) {
      if (loader) loader.classList.add('gone');
      Promise.race([fontsReady, wait(700)]).then(function () {
        requestAnimationFrame(function () { requestAnimationFrame(startPage); });
      });
      return;
    }

    body.classList.add('no-scroll');
    var countEl = $('#loader-count');
    var duration = 1300;
    var t0 = performance.now();

    requestAnimationFrame(function tick(now) {
      var p = clamp((now - t0) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      if (countEl) countEl.textContent = Math.round(eased * 100);
      if (p < 1) {
        requestAnimationFrame(tick);
        return;
      }
      Promise.race([fontsReady, wait(1200)]).then(function () {
        fitAll();
        loader.classList.add('done');
        body.classList.remove('no-scroll');
        try { sessionStorage.setItem('intro-seen', '1'); } catch (e) {}
        setTimeout(startPage, 280);
        setTimeout(function () { loader.classList.add('gone'); }, 1100);
      });
    });
  }

  runLoader();

  /* =========================================================
     Hero typing line
     ========================================================= */
  function startTyping() {
    var el = $('#typed');
    if (!el || reduce) return;
    var list = (el.getAttribute('data-words') || '').split('|').filter(Boolean);
    if (list.length < 2) return;
    var wi = 0;
    var ci = list[0].length;
    var deleting = true;

    function tick() {
      if (deleting) {
        ci--;
        el.textContent = list[wi].slice(0, ci);
        if (ci <= 0) {
          deleting = false;
          wi = (wi + 1) % list.length;
          return setTimeout(tick, 380);
        }
        return setTimeout(tick, 28);
      }
      ci++;
      el.textContent = list[wi].slice(0, ci);
      if (ci >= list[wi].length) {
        deleting = true;
        return setTimeout(tick, 2400);
      }
      setTimeout(tick, 50 + Math.random() * 60);
    }

    setTimeout(tick, 3000);
  }

  /* =========================================================
     Reveal on scroll + counters
     ========================================================= */
  function countUp(el) {
    if (!el || el.__counting) return;
    var target = Number(el.getAttribute('data-target'));
    if (reduce || !target) {
      el.textContent = target;
      return;
    }
    el.__counting = true;
    var t0 = performance.now();
    el.textContent = '0';
    requestAnimationFrame(function tick(now) {
      var p = clamp((now - t0) / 1500, 0, 1);
      el.textContent = Math.round(target * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)));
      if (p < 1) requestAnimationFrame(tick);
      else el.__counting = false;
    });
  }

  $$('.stat-num').forEach(function (el) {
    var since = el.getAttribute('data-since');
    var target = since ? yearsSince(since) : parseInt(el.getAttribute('data-count'), 10) || 0;
    el.setAttribute('data-target', target);
    el.textContent = target;
  });

  $$('.stat').forEach(function (stat) {
    stat.addEventListener('mouseenter', function () {
      if (stat.classList.contains('in')) countUp($('.stat-num', stat));
    });
  });

  var revealTargets = $$('.reveal, .contact-title');
  function reveal(el) {
    el.classList.add('in');
    if (el.classList.contains('stat')) countUp($('.stat-num', el));
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(reveal);
  }

  /* =========================================================
     Navigation: active link, hide on scroll, mobile menu
     ========================================================= */
  var nav = $('#nav');
  var navToggle = $('#nav-toggle');
  var navLinks = $$('#nav-links a[href^="#"]');

  function setActive(id) {
    navLinks.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'about', 'terminal', 'projects', 'experience', 'skills', 'contact'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  function setMenu(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('open', open);
    body.classList.toggle('no-scroll', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) nav.classList.remove('hide');
  }

  if (navToggle) navToggle.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  navLinks.forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  onMedia(window.matchMedia('(min-width: 961px)'), function (e) { if (e.matches) setMenu(false); });

  /* =========================================================
     Experience: accordion rows
     ========================================================= */
  var expRows = $$('.exp-row');
  var expAll = $('#exp-all');
  var expYearsEl = $('#exp-years');
  var expCountEl = $('#exp-count');
  if (expYearsEl) expYearsEl.textContent = yearsSince('2017-01') + '+';
  if (expCountEl) expCountEl.textContent = String(expRows.length);

  function setRow(row, open) {
    row.classList.toggle('is-open', open);
    var btn = $('.exp-trigger', row);
    if (btn) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('data-cursor', open ? 'Close' : 'Open');
    }
  }

  function syncExpAll() {
    if (!expAll) return;
    var allOpen = expRows.length > 0 && expRows.every(function (r) { return r.classList.contains('is-open'); });
    expAll.setAttribute('aria-pressed', String(allOpen));
    expAll.textContent = allOpen ? 'Collapse all' : 'Expand all';
  }

  expRows.forEach(function (row) {
    setRow(row, row.classList.contains('is-open'));
    var btn = $('.exp-trigger', row);
    if (!btn) return;
    btn.addEventListener('click', function () {
      setRow(row, !row.classList.contains('is-open'));
      syncExpAll();
      if (cursorLabel && cursor && cursor.classList.contains('has-label')) cursorLabel.textContent = btn.getAttribute('data-cursor');
    });
  });

  if (expAll) {
    expAll.addEventListener('click', function () {
      var open = expAll.getAttribute('aria-pressed') !== 'true';
      expRows.forEach(function (r) { setRow(r, open); });
      syncExpAll();
    });
  }
  syncExpAll();

  /* =========================================================
     Scroll-linked effects (one rAF per frame)
     ========================================================= */
  var toTop = $('#to-top');
  var ring = $('#ring-fg');
  var RING = 138.23;
  var lastY = window.scrollY || 0;
  var lastLit = -1;
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;

    // The nav stays visible; it only gains a frosted background once you scroll.
    if (nav) nav.classList.toggle('scrolled', y > 20);
    lastY = y;

    if (ring) ring.style.strokeDashoffset = String(RING * (1 - (max > 0 ? clamp(y / max, 0, 1) : 0)));
    if (toTop) toTop.classList.toggle('show', y > vh * 0.9);

    // Statement words light up as it scrolls through.
    if (statement && statementWords.length) {
      var sr = statement.getBoundingClientRect();
      var start = vh * 0.85;
      var end = vh * 0.4;
      var sp = clamp((start - sr.top) / (sr.height + start - end), 0, 1);
      var lit = Math.round(sp * statementWords.length);
      if (lit !== lastLit) {
        statementWords.forEach(function (w, i) { w.classList.toggle('lit', i < lit); });
        lastLit = lit;
      }
    }

  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });

  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      fitAll();
      requestUpdate();
    });
  });

  update();

  /* =========================================================
     Tilted bands — speed and direction follow your scrolling
     ========================================================= */
  var bandTracks = $$('.band-track');
  if (bandTracks.length && !reduce) {
    var bands = bandTracks.map(function (track) {
      var originals = Array.prototype.slice.call(track.children);
      for (var c = 0; c < 3; c++) {
        originals.forEach(function (n) { track.appendChild(n.cloneNode(true)); });
      }
      return { el: track, n: originals.length, set: 0, x: 0, speed: parseFloat(track.getAttribute('data-speed')) || 0.5 };
    });

    // Width of one original set (layout widths ignore the bands' rotation).
    var measureBands = function () {
      bands.forEach(function (b) {
        var w = 0;
        for (var k = 0; k < b.n; k++) {
          var kid = b.el.children[k];
          w += kid.offsetWidth + parseFloat(getComputedStyle(kid).marginRight || 0);
        }
        b.set = w;
      });
    };
    measureBands();
    fontsReady.then(measureBands);
    window.addEventListener('resize', measureBands);

    var bandsVisible = false;
    var bandDir = 1;
    var bandBoost = 0;
    var bandLastY = window.scrollY || 0;

    var bandLoop = function () {
      if (!bandsVisible) return;
      var y = window.scrollY || 0;
      var dy = y - bandLastY;
      bandLastY = y;
      if (dy !== 0) bandDir = dy > 0 ? 1 : -1;
      bandBoost = Math.max(bandBoost * 0.92, Math.min(Math.abs(dy) * 0.12, 8));
      bands.forEach(function (b) {
        if (!b.set) return;
        b.x -= b.speed * bandDir * (1 + bandBoost);
        if (b.x <= -b.set) b.x += b.set;
        if (b.x > 0) b.x -= b.set;
        b.el.style.transform = 'translate3d(' + b.x.toFixed(2) + 'px,0,0)';
      });
      requestAnimationFrame(bandLoop);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var vis = entries[0].isIntersecting;
        if (vis && !bandsVisible) {
          bandsVisible = true;
          bandLastY = window.scrollY || 0;
          requestAnimationFrame(bandLoop);
        } else if (!vis) {
          bandsVisible = false;
        }
      }).observe($('.bands'));
    }
  }

  /* =========================================================
     Pointer effects (desktop)
     ========================================================= */
  // Letters swell / fill as the cursor gets close.
  function proximity(zone, letters, radiusFactor) {
    if (!zone || !letters.length) return;
    var mx = 0, my = 0, active = false, raf = 0;

    function frame() {
      raf = 0;
      if (!active) return;
      var fs = parseFloat(getComputedStyle(letters[0]).fontSize) || 80;
      var radius = Math.max(120, fs * radiusFactor);
      letters.forEach(function (l) {
        var r = l.getBoundingClientRect();
        var d = Math.hypot(mx - (r.left + r.width / 2), (my - (r.top + r.height / 2)) * 1.3);
        var p = clamp(1 - d / radius, 0, 1);
        l.style.setProperty('--p', (p * p * (3 - 2 * p)).toFixed(3));
      });
    }

    zone.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX;
      my = e.clientY;
      active = true;
      if (!raf) raf = requestAnimationFrame(frame);
    });
    zone.addEventListener('pointerleave', function () {
      active = false;
      letters.forEach(function (l) { l.style.setProperty('--p', '0'); });
    });
  }

  if (finePointer && !reduce) {
    proximity($('#top'), $$('.hero-name .l'), 2.1);
    proximity($('#contact'), $$('.contact-title .l'), 2);
  }

  // Cursor ring with contextual labels.
  var cursor = $('#cursor');
  var cursorDot = $('#cursor-dot');
  var cursorLabel = $('#cursor-label');
  var photo = $('#profile-photo');
  var pgStage = $('#pg-stage');
  var term = $('#term');
  if (photo) photo.setAttribute('data-cursor', 'View');
  if (pgStage) pgStage.setAttribute('data-cursor', 'Drag');
  if (term) term.setAttribute('data-cursor', 'Type');

  if (finePointer && !reduce && cursor && cursorDot) {
    var tx = -100, ty = -100, cx = -100, cy = -100, cRaf = 0, shown = false;

    var cursorLoop = function () {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2) cRaf = requestAnimationFrame(cursorLoop);
      else cRaf = 0;
    };

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      cursorDot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
      if (!shown) {
        shown = true;
        cx = tx;
        cy = ty;
        cursor.classList.add('on');
        cursorDot.classList.add('on');
      }
      if (!cRaf) cRaf = requestAnimationFrame(cursorLoop);
    }, { passive: true });

    document.addEventListener('mouseout', function (e) {
      if (e.relatedTarget) return;
      shown = false;
      cursor.classList.remove('on');
      cursorDot.classList.remove('on');
    });

    var HOVERABLE = 'a, button, [role="button"], .chip, .stat, .journey li, .exp-card';
    document.addEventListener('pointerover', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var labelled = t.closest('[data-cursor]');
      var label = labelled ? labelled.getAttribute('data-cursor') : '';
      var hover = !label && !!t.closest(HOVERABLE);
      cursor.classList.toggle('has-label', !!label);
      cursor.classList.toggle('hover', hover);
      cursorDot.classList.toggle('hide', !!label || hover);
      if (cursorLabel) cursorLabel.textContent = label;
    });

    window.addEventListener('pointerdown', function () { cursor.classList.add('down'); });
    window.addEventListener('pointerup', function () { cursor.classList.remove('down'); });

    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * 0.3).toFixed(1) + 'px');
        el.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * 0.4).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--tx', '0px');
        el.style.setProperty('--ty', '0px');
      });
    });
  }

  /* =========================================================
     Hero canvas: rulers, crosshair guides, resizable portrait layer
     ========================================================= */
  var heroEl = $('#top');
  var guideH = $('#guide-h');
  var guideV = $('#guide-v');
  var coordsEl = $('#coords');
  var markX = $('#ruler-mark-x');
  var markY = $('#ruler-mark-y');
  var frame = $('#frame');
  var frameDims = $('#frame-dims');

  function updateDims() {
    if (!frame || !frameDims) return;
    var r = frame.getBoundingClientRect();
    frameDims.textContent = Math.round(r.width) + ' × ' + Math.round(r.height);
  }

  updateDims();
  window.addEventListener('resize', updateDims);
  fontsReady.then(updateDims);

  if (heroEl && finePointer && !reduce && guideH && guideV && coordsEl) {
    var gx = 0, gy = 0, gRaf = 0;
    var navH = parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 76;

    var drawGuides = function () {
      gRaf = 0;
      var flip = gx > heroEl.clientWidth - 150;
      guideH.style.transform = 'translate3d(0,' + gy.toFixed(0) + 'px,0)';
      guideV.style.transform = 'translate3d(' + gx.toFixed(0) + 'px,0,0)';
      coordsEl.textContent = 'x ' + Math.round(gx) + ' · y ' + Math.round(gy);
      coordsEl.style.transform = 'translate3d(' + (flip ? gx - 14 - coordsEl.offsetWidth : gx + 14).toFixed(0) + 'px,' + (gy + 14).toFixed(0) + 'px,0)';
      if (markX) markX.style.transform = 'translate3d(' + (gx - 20).toFixed(0) + 'px,0,0)';
      if (markY) markY.style.transform = 'translate3d(0,' + (gy - navH - 20).toFixed(0) + 'px,0)';
    };

    heroEl.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = heroEl.getBoundingClientRect();
      gx = e.clientX - r.left;
      gy = e.clientY - r.top;
      heroEl.classList.add('tracking');
      if (cursor) cursor.classList.add('in-canvas');
      if (cursorDot) cursorDot.classList.add('in-canvas');
      if (!gRaf) gRaf = requestAnimationFrame(drawGuides);
    });

    heroEl.addEventListener('pointerleave', function () {
      heroEl.classList.remove('tracking');
      if (cursor) cursor.classList.remove('in-canvas');
      if (cursorDot) cursorDot.classList.remove('in-canvas');
    });
  }

  // Grab a corner handle to resize the portrait layer; it springs back on release.
  if (frame) {
    $$('[data-handle]', frame).forEach(function (handle) {
      handle.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
        var r = frame.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var start = Math.max(20, Math.hypot(e.clientX - cx, e.clientY - cy));
        frame.classList.add('dragging');

        var move = function (ev) {
          var s = clamp(Math.hypot(ev.clientX - cx, ev.clientY - cy) / start, 0.7, 1.3);
          frame.style.setProperty('--s', s.toFixed(3));
          updateDims();
        };
        var up = function () {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
          frame.classList.remove('dragging');
          frame.style.setProperty('--s', '1');
          var t0 = performance.now();
          (function follow(now) {
            updateDims();
            if (now - t0 < 900) requestAnimationFrame(follow);
          })(t0);
        };

        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      });
    });
  }

  // "Try the terminal" jumps there and types `help` for you.
  $$('.hero-cta a[href="#terminal"]').forEach(function (a) {
    a.addEventListener('click', function () {
      setTimeout(function () { typeAndRun('help'); }, reduce ? 0 : 900);
    });
  });

  /* =========================================================
     Toast, copy, print
     ========================================================= */
  var toastEl = $('#toast');
  var toastTimer = 0;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  function copyText(text) {
    return new Promise(function (resolve, reject) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(resolve, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        body.removeChild(ta);
        if (ok) resolve(); else reject();
      }
    });
  }

  function copyEmail(btn) {
    return copyText(EMAIL).then(function () {
      toast('Email copied to clipboard');
      var label = btn ? $('span', btn) : null;
      if (label) {
        label.textContent = 'Copied!';
        setTimeout(function () { label.textContent = 'Copy email'; }, 2000);
      }
    }, function () {
      toast('Email: ' + EMAIL);
    });
  }

  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () { copyEmail(btn); });
  });

  function isInAppBrowser() {
    var ua = navigator.userAgent || '';
    return /FBAN|FBAV|Instagram|Line|Twitter|TikTok|Snapchat|Pinterest|LinkedInApp/i.test(ua);
  }

  function printResume() {
    setMenu(false);
    if (typeof window.print !== 'function') {
      alert('Print is not supported in this browser. Please open this page in your default browser and try again.');
      return;
    }
    if (isInAppBrowser()) {
      alert('To save as PDF, please open this page in your default browser (Safari / Chrome) using the in-app menu, then tap Print again.');
    }
    setTimeout(function () {
      try {
        window.print();
      } catch (err) {
        alert('Your browser blocked the print dialog. Use the browser menu → Print, or Share → Save to PDF.');
      }
    }, 80);
  }

  $$('[data-print]').forEach(function (btn) { btn.addEventListener('click', printResume); });

  /* =========================================================
     Photo lightbox
     ========================================================= */
  var lightbox = $('#photo-lightbox');
  var lightboxImg = $('#photo-lightbox-img');
  var lightboxClose = $('#photo-lightbox-close');

  if (photo && lightbox && lightboxImg && lightboxClose) {
    photo.setAttribute('tabindex', '0');
    photo.setAttribute('role', 'button');
    photo.setAttribute('aria-label', 'View full photo of Jo Mary Ynna Albasin');

    var openLightbox = function () {
      lightboxImg.src = 'assets/workspace.jpg';
      lightbox.hidden = false;
      body.classList.add('no-scroll');
      lightboxClose.focus();
    };
    var closeLightbox = function () {
      lightbox.hidden = true;
      body.classList.remove('no-scroll');
      photo.focus({ preventScroll: true });
    };

    photo.addEventListener('click', openLightbox);
    photo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox();
      }
    });
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
  }

  /* =========================================================
     Terminal
     ========================================================= */
  var termBody = $('#term-body');
  var termForm = $('#term-form');
  var termInput = $('#term-input');
  var termStatus = $('#term-status');
  var termHistory = [];
  var termHistIdx = -1;
  var termBusy = false;
  var PROMPT = 'visitor@albasin:~$';

  function tPrint(html, cls) {
    var p = document.createElement('p');
    p.className = 't-line' + (cls ? ' ' + cls : '');
    p.innerHTML = html;
    termBody.appendChild(p);
    termBody.scrollTop = termBody.scrollHeight;
    return p;
  }

  function tLines(lines, delay) {
    var chain = Promise.resolve();
    lines.forEach(function (line) {
      chain = chain.then(function () {
        if (typeof line === 'string') tPrint(line);
        else tPrint(line[0], line[1]);
        return delay ? wait(delay) : null;
      });
    });
    return chain;
  }

  function padEnd(s, n) {
    s = String(s);
    while (s.length < n) s += ' ';
    return s;
  }

  function sectionData() {
    return {
      jobs: expRows.map(function (card) {
        var role = $('.job-role', card);
        var period = $('.job-period', card);
        var company = $('.job-company', card);
        return {
          role: role ? role.textContent.trim() : '',
          period: period ? period.textContent.trim() : '',
          company: company ? company.textContent.trim() : ''
        };
      }),
      groups: $$('.skill-group').map(function (g) {
        var title = $('.skill-group-title', g);
        return {
          title: title ? title.textContent.trim() : '',
          items: $$('.chip', g).map(function (c) { return c.textContent.trim(); })
        };
      })
    };
  }

  var COMMANDS = ['help', 'whoami', 'about', 'experience', 'skills', 'education', 'contact', 'run tests', 'build', 'resume', 'theme', 'goto', 'ls', 'date', 'echo', 'history', 'clear', 'sudo hire jo'];

  var handlers = {
    help: function () {
      var rows = [
        ['whoami', 'who I am'],
        ['about', 'what I do'],
        ['experience', "where I've worked"],
        ['skills', 'my toolkit'],
        ['education', 'where I studied'],
        ['contact', 'how to reach me'],
        ['run tests', 'run the quality suite'],
        ['build', 'build & ship something'],
        ['resume', 'save my résumé as PDF'],
        ['theme', 'toggle light / dark'],
        ['goto &lt;section&gt;', 'jump to about, projects, experience, skills, contact'],
        ['clear', 'clear the screen']
      ];
      return tLines(['<span class="t-dim">Available commands:</span>'].concat(rows.map(function (r) {
        return '  <span class="t-cmd">' + padEnd(r[0], r[0].indexOf('&lt;') > -1 ? 21 : 14) + '</span><span class="t-dim">' + r[1] + '</span>';
      })).concat(['<span class="t-dim">Tip: ↑/↓ for history · Tab to autocomplete · Ctrl/⌘ K for the command menu</span>']), 25);
    },
    whoami: function () {
      return tLines([
        '<span class="t-gold">Jo Mary Ynna Albasin</span> — AI Product Engineer · Philippines',
        'I build software with quality built in.'
      ], 120);
    },
    about: function () {
      return tLines([
        "I'm an AI product engineer — I combine development, quality engineering,",
        'automation and AI tools to design and build reliable systems.',
        '<span class="t-dim">path:</span> web developer <span class="t-dim">→</span> QA <span class="t-dim">→</span> lead QA <span class="t-dim">→</span> AI automation <span class="t-dim">→</span> <span class="t-ok">AI product engineer</span>'
      ], 120);
    },
    experience: function () {
      var jobs = sectionData().jobs;
      return tLines(jobs.map(function (j) {
        return '<span class="t-key">' + padEnd(esc(j.period), 21) + '</span>' + esc(j.role) + (j.company ? ' <span class="t-dim">@ ' + esc(j.company.split(' · ')[0]) + '</span>' : '');
      }).concat(['<span class="t-dim">→ type</span> <span class="t-cmd">goto experience</span> <span class="t-dim">for the details</span>']), 90);
    },
    skills: function () {
      var groups = sectionData().groups;
      return tLines(groups.map(function (g) {
        return '<span class="t-gold">' + esc(g.title) + '</span>\n  ' + g.items.map(esc).join(' <span class="t-dim">·</span> ');
      }), 120);
    },
    education: function () {
      return tLines([
        '<span class="t-gold">Bukidnon State University</span> <span class="t-dim">(2013 – 2017)</span>',
        'Bachelor of Science in Information Technology'
      ], 120);
    },
    contact: function () {
      return tLines([
        '<span class="t-key">email   </span> <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>',
        '<span class="t-key">linkedin</span> <a href="' + LINKEDIN + '" target="_blank" rel="noopener">linkedin.com/in/jm-albasin</a>',
        '<span class="t-key">github  </span> <a href="' + GITHUB + '" target="_blank" rel="noopener">github.com/jmync</a>'
      ], 90);
    },
    run: function (args) {
      if (args && args !== 'tests' && args !== 'test') {
        return tLines([['run: unknown target "' + esc(args) + '" — try <span class="t-cmd">run tests</span>', 't-err']]);
      }
      return tLines([
        '<span class="t-dim">$ pytest-bdd features/ --quality</span>',
        '<span class="t-gold">Feature:</span> Building software with quality',
        '  <span class="t-gold">Scenario:</span> Ship a reliable release',
        '    <span class="t-ok">✓</span> Given a clear product goal',
        '    <span class="t-ok">✓</span> When I build it with automation and AI',
        '    <span class="t-ok">✓</span> Then it is tested before it ships',
        ['1 feature · 1 scenario · 3 steps <span class="t-ok">passed</span> in 0.42s', 't-ok']
      ], 260);
    },
    build: function () {
      var steps = [
        ['planning', 'done'],
        ['building', 'done'],
        ['testing', '3/3 passed'],
        ['shipping', 'deployed']
      ];
      var chain = Promise.resolve();
      steps.forEach(function (s) {
        chain = chain.then(function () {
          var line = tPrint('<span class="t-dim">▸</span> ' + padEnd(s[0] + '…', 12) + ' <span class="t-dim">[          ]</span>');
          var n = 0;
          return new Promise(function (resolve) {
            var iv = setInterval(function () {
              n++;
              line.innerHTML = '<span class="t-dim">▸</span> ' + padEnd(s[0] + '…', 12) + ' <span class="t-dim">[</span><span class="t-ok">' + new Array(n + 1).join('■') + '</span>' + new Array(11 - n).join(' ') + '<span class="t-dim">]</span>' + (n >= 10 ? ' <span class="t-ok">' + s[1] + '</span>' : '');
              if (n >= 10) {
                clearInterval(iv);
                resolve();
              }
            }, 45);
          });
        });
      });
      return chain.then(function () {
        tPrint('Built with quality in 1.8s <span class="t-ok">✓</span>', 't-ok');
      });
    },
    resume: function () {
      tPrint('Opening the print dialog — choose “Save as PDF”…', 't-dim');
      return wait(500).then(printResume);
    },
    theme: function (args) {
      var next = args === 'light' || args === 'dark' ? args : (currentTheme() === 'dark' ? 'light' : 'dark');
      setTheme(next, termInput);
      return tLines([['theme → <span class="t-gold">' + next + '</span>', '']]);
    },
    goto: function (args) {
      var map = { top: 'top', home: 'top', about: 'about', terminal: 'terminal', projects: 'projects', project: 'projects', portfolio: 'projects', experience: 'experience', exp: 'experience', work: 'experience', skills: 'skills', contact: 'contact' };
      var id = map[(args || '').replace(/[\/.]/g, '')];
      if (!id) return tLines([['goto: no such section "' + esc(args || '') + '" — try about, projects, experience, skills or contact', 't-err']]);
      tPrint('→ ' + id, 't-dim');
      scrollToId(id);
      return Promise.resolve();
    },
    ls: function () {
      return tLines(['<span class="t-key">about/  terminal/  projects/  experience/  skills/  contact/</span>  resume.pdf']);
    },
    date: function () {
      var ph = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date());
      return tLines([ph + ' <span class="t-dim">(Philippines, GMT+8)</span>']);
    },
    echo: function (args) {
      return tLines([esc(args || '')]);
    },
    history: function () {
      return tLines(termHistory.length ? termHistory.map(function (h, i) { return '<span class="t-dim">' + padEnd(i + 1, 4) + '</span>' + esc(h); }) : ['<span class="t-dim">(empty)</span>']);
    },
    clear: function () {
      termBody.innerHTML = '';
      return Promise.resolve();
    },
    sudo: function (args) {
      if (!/hire/.test(args || '')) {
        return tLines([['sudo: nice try. Maybe <span class="t-cmd">sudo hire jo</span>?', 't-err']]);
      }
      return tLines([
        '<span class="t-dim">[sudo] password for visitor: ********</span>',
        ['✓ Access granted. Great choice!', 't-ok'],
        '→ Let’s talk: <a href="mailto:' + EMAIL + '?subject=Let%E2%80%99s%20work%20together">' + EMAIL + '</a>'
      ], 450);
    },
    hire: function () {
      return tLines([['Permission denied. Try <span class="t-cmd">sudo hire jo</span>', 't-err']]);
    },
    hello: function () {
      return tLines(['Hi there! Type <span class="t-cmd">help</span> to look around.']);
    },
    exit: function () {
      return tLines(['There’s no escape — but <span class="t-cmd">' + (isMac ? '⌘K' : 'Ctrl K') + '</span> opens the command menu.']);
    }
  };

  var aliases = {
    hi: 'hello', hey: 'hello', who: 'whoami', exp: 'experience', work: 'experience', jobs: 'experience',
    stack: 'skills', tools: 'skills', edu: 'education', email: 'contact', cv: 'resume', pdf: 'resume',
    test: 'run', tests: 'run', cd: 'goto', cls: 'clear', man: 'help', '?': 'help', quit: 'exit'
  };

  function runCommand(raw) {
    if (!termBody) return Promise.resolve();
    var line = String(raw || '').trim();
    tPrint('<span class="t-p">' + PROMPT + '</span> ' + esc(line), 't-echo');
    if (!line) return Promise.resolve();
    termHistory.push(line);
    termHistIdx = termHistory.length;

    var parts = line.split(/\s+/);
    var cmd = parts.shift().toLowerCase();
    var args = parts.join(' ').toLowerCase();
    cmd = aliases[cmd] || cmd;
    if (cmd === 'run' && !args) args = 'tests';

    var handler = handlers[cmd];
    if (!handler) {
      tPrint('zsh: command not found: ' + esc(line.split(/\s+/)[0]) + ' — type <span class="t-cmd">help</span>', 't-err');
      return Promise.resolve();
    }

    termBusy = true;
    if (termStatus) {
      termStatus.textContent = 'running';
      termStatus.classList.add('busy');
    }
    return Promise.resolve(handler(args)).then(function () {
      termBusy = false;
      if (termStatus) {
        termStatus.textContent = 'ready';
        termStatus.classList.remove('busy');
      }
    });
  }

  function typeAndRun(cmd) {
    if (!termInput || termBusy) return Promise.resolve();
    termBusy = true;
    termInput.value = '';
    var i = 0;
    return new Promise(function (resolve) {
      (function step() {
        if (i <= cmd.length) {
          termInput.value = cmd.slice(0, i++);
          setTimeout(step, reduce ? 0 : 35);
          return;
        }
        termInput.value = '';
        termBusy = false;
        resolve(runCommand(cmd));
      })();
    });
  }

  if (termForm && termInput && termBody) {
    termForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (termBusy) return;
      var v = termInput.value;
      termInput.value = '';
      runCommand(v);
    });

    termInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        if (!termHistory.length) return;
        e.preventDefault();
        termHistIdx = Math.max(0, termHistIdx - 1);
        termInput.value = termHistory[termHistIdx] || '';
      } else if (e.key === 'ArrowDown') {
        if (!termHistory.length) return;
        e.preventDefault();
        termHistIdx = Math.min(termHistory.length, termHistIdx + 1);
        termInput.value = termHistory[termHistIdx] || '';
      } else if (e.key === 'Tab') {
        var v = termInput.value.toLowerCase();
        if (!v) return;
        var match = COMMANDS.filter(function (c) { return c.indexOf(v) === 0; });
        if (match.length) {
          e.preventDefault();
          termInput.value = match[0];
        }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        handlers.clear();
      }
    });

    $('#term').addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      if (window.getSelection && String(window.getSelection())) return;
      termInput.focus({ preventScroll: true });
    });

    $$('#term-chips [data-cmd]').forEach(function (b) {
      b.addEventListener('click', function () {
        typeAndRun(b.getAttribute('data-cmd')).then(function () {
          if (finePointer) termInput.focus({ preventScroll: true });
        });
      });
    });
  }

  /* =========================================================
     Command palette (Ctrl/⌘ K or "/")
     ========================================================= */
  var palette = $('#palette');
  var palInput = $('#palette-input');
  var palList = $('#palette-list');
  var palOpenBtn = $('#palette-open');
  var palItems = [];
  var palActive = 0;
  var palReturnFocus = null;

  function goSection(id) {
    return function () { scrollToId(id); };
  }

  var ACTIONS = [
    { group: 'Navigate', label: 'Go to the top', icon: 'i-up', hint: '00', keys: 'home hero start', run: goSection('top') },
    { group: 'Navigate', label: 'About', icon: 'i-arrow', hint: '01', keys: 'summary story', run: goSection('about') },
    { group: 'Navigate', label: 'Terminal', icon: 'i-terminal', hint: '02', keys: 'shell console command', run: goSection('terminal') },
    { group: 'Navigate', label: 'Projects', icon: 'i-arrow', hint: '03', keys: 'work portfolio videos bukven specsai nkmacb', run: goSection('projects') },
    { group: 'Navigate', label: 'Experience', icon: 'i-arrow', hint: '04', keys: 'work jobs career roles', run: goSection('experience') },
    { group: 'Navigate', label: 'Skills playground', icon: 'i-arrow', hint: '05', keys: 'tools stack toolkit', run: goSection('skills') },
    { group: 'Navigate', label: 'Contact', icon: 'i-mail', hint: '06', keys: 'email hire talk', run: goSection('contact') },
    { group: 'Actions', label: 'Toggle light / dark mode', icon: 'i-moon', hint: 'theme', keys: 'dark light theme mode', run: function () { toggleTheme(palOpenBtn); } },
    { group: 'Actions', label: 'Copy email address', icon: 'i-copy', hint: 'copy', keys: 'email clipboard', run: function () { copyEmail(); } },
    { group: 'Actions', label: 'Save résumé as PDF', icon: 'i-download', hint: 'print', keys: 'resume cv pdf print download', run: printResume },
    { group: 'Actions', label: 'Run the test suite', icon: 'i-terminal', hint: 'terminal', keys: 'tests quality pytest bdd', run: function () { scrollToId('terminal'); setTimeout(function () { typeAndRun('run tests'); }, reduce ? 0 : 700); } },
    { group: 'Actions', label: 'Shake the skills', icon: 'i-zap', hint: 'play', keys: 'physics playground fun', run: function () { scrollToId('skills'); setTimeout(function () { if (window.__pgShake) window.__pgShake(); }, reduce ? 0 : 900); } },
    { group: 'Links', label: 'Send an email', icon: 'i-mail', hint: '↗', keys: 'mail contact', run: function () { window.location.href = 'mailto:' + EMAIL; } },
    { group: 'Links', label: 'Open LinkedIn', icon: 'i-linkedin', hint: '↗', keys: 'social profile', run: function () { window.open(LINKEDIN, '_blank', 'noopener'); } },
    { group: 'Links', label: 'Open GitHub', icon: 'i-github', hint: '↗', keys: 'code repos', run: function () { window.open(GITHUB, '_blank', 'noopener'); } }
  ];

  function renderPalette() {
    var q = (palInput.value || '').trim().toLowerCase();
    var terms = q.split(/\s+/).filter(Boolean);
    palItems = ACTIONS.filter(function (a) {
      var hay = (a.label + ' ' + a.keys + ' ' + a.group).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) > -1; });
    });
    palActive = clamp(palActive, 0, Math.max(0, palItems.length - 1));
    palList.innerHTML = '';
    if (!palItems.length) {
      var empty = document.createElement('li');
      empty.className = 'palette-empty';
      empty.textContent = 'No matches. Try “theme”, “email” or “skills”.';
      palList.appendChild(empty);
      palInput.removeAttribute('aria-activedescendant');
      return;
    }
    var lastGroup = '';
    palItems.forEach(function (a, i) {
      if (a.group !== lastGroup) {
        lastGroup = a.group;
        var g = document.createElement('li');
        g.className = 'palette-group';
        g.setAttribute('role', 'presentation');
        g.textContent = a.group;
        palList.appendChild(g);
      }
      var li = document.createElement('li');
      li.className = 'palette-item';
      li.id = 'pal-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === palActive));
      li.innerHTML = '<svg class="i" aria-hidden="true"><use href="#' + a.icon + '"/></svg><span>' + esc(a.label) + '</span><span class="hint">' + esc(a.hint) + '</span>';
      li.addEventListener('mousemove', function () {
        if (palActive !== i) {
          palActive = i;
          markActive();
        }
      });
      li.addEventListener('click', function () { runPalette(i); });
      palList.appendChild(li);
    });
    markActive();
  }

  function markActive() {
    $$('.palette-item', palList).forEach(function (li, i) {
      var on = i === palActive;
      li.setAttribute('aria-selected', String(on));
      if (on) {
        palInput.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function openPalette() {
    if (!palette) return;
    palReturnFocus = document.activeElement;
    palette.hidden = false;
    body.classList.add('no-scroll');
    palInput.value = '';
    palActive = 0;
    renderPalette();
    setTimeout(function () { palInput.focus(); }, 0);
  }

  function closePalette() {
    if (!palette || palette.hidden) return;
    palette.hidden = true;
    if (!nav || !nav.classList.contains('open')) body.classList.remove('no-scroll');
    if (palReturnFocus && palReturnFocus.focus) palReturnFocus.focus({ preventScroll: true });
  }

  function runPalette(i) {
    var a = palItems[i];
    if (!a) return;
    closePalette();
    setTimeout(a.run, 60);
  }

  if (palette && palInput && palList) {
    if (palOpenBtn) palOpenBtn.addEventListener('click', openPalette);
    palInput.addEventListener('input', function () {
      palActive = 0;
      renderPalette();
    });
    palInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        palActive = (palActive + 1) % Math.max(1, palItems.length);
        markActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        palActive = (palActive - 1 + palItems.length) % Math.max(1, palItems.length);
        markActive();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runPalette(palActive);
      } else if (e.key === 'Tab') {
        e.preventDefault();
      }
    });
    palette.addEventListener('mousedown', function (e) {
      if (e.target === palette) closePalette();
    });
  }

  document.addEventListener('keydown', function (e) {
    var typing = /input|textarea|select/i.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (palette && !palette.hidden) closePalette();
      else openPalette();
      return;
    }
    if (e.key === '/' && !typing && palette && palette.hidden) {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key === 'Escape') {
      if (palette && !palette.hidden) closePalette();
      else if (nav && nav.classList.contains('open')) {
        setMenu(false);
        if (navToggle) navToggle.focus();
      }
    }
  });

  /* =========================================================
     Skills playground (Matter.js physics, lazy-loaded)
     ========================================================= */
  var playground = $('#playground');
  var pills = [];

  if (pgStage && playground) {
    $$('.skill-group').forEach(function (g) {
      var group = g.getAttribute('data-group') || '0';
      $$('.chip', g).forEach(function (chip) {
        var el = document.createElement('span');
        el.className = 'pg-pill g' + group;
        el.textContent = chip.textContent.trim();
        pills.push(el);
      });
    });
    pgStage.classList.add('static');
    pills.forEach(function (el) { pgStage.appendChild(el); });

    var loadScript = function (src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    };

    var physicsStarted = false;
    var startPhysics = function () {
      if (physicsStarted || reduce) return;
      physicsStarted = true;
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js')
        .then(initPhysics)
        .catch(function () { /* keep the static layout */ });
    };

    if ('IntersectionObserver' in window && !reduce) {
      var pgIo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          startPhysics();
          pgIo.disconnect();
        }
      }, { rootMargin: '300px 0px' });
      pgIo.observe(playground);
    }
  }

  function initPhysics() {
    var M = window.Matter;
    if (!M || !pgStage) return;

    var engine = M.Engine.create();
    engine.gravity.y = 1;
    var world = engine.world;
    var runner = M.Runner.create();
    var bodies = [];
    var walls = [];
    var W = 0, H = 0;
    var running = false;
    var spawnTimers = [];

    function buildWalls() {
      if (walls.length) M.Composite.remove(world, walls);
      W = pgStage.clientWidth;
      H = pgStage.clientHeight;
      var t = 200;
      var opts = { isStatic: true, friction: 0.3 };
      walls = [
        M.Bodies.rectangle(W / 2, H + t / 2, W * 3, t, opts),
        M.Bodies.rectangle(W / 2, -t / 2, W * 3, t, opts),
        M.Bodies.rectangle(-t / 2, H / 2, t, H * 3, opts),
        M.Bodies.rectangle(W + t / 2, H / 2, t, H * 3, opts)
      ];
      M.Composite.add(world, walls);
    }

    function spawn() {
      spawnTimers.forEach(clearTimeout);
      spawnTimers = [];
      bodies.forEach(function (b) { M.Composite.remove(world, b.body); });
      bodies = [];
      pgStage.classList.remove('static');

      pills.forEach(function (el, i) {
        el.style.transform = 'translate(-999px,-999px)';
        var w = el.offsetWidth;
        var h = el.offsetHeight;
        spawnTimers.push(setTimeout(function () {
          var x = clamp(w / 2 + 10 + Math.random() * (W - w - 20), w / 2, W - w / 2);
          var y = engine.gravity.y >= 0 ? h + Math.random() * 40 : H - h - Math.random() * 40;
          var body = M.Bodies.rectangle(x, y, w, h, {
            chamfer: { radius: 4 },
            restitution: 0.45,
            friction: 0.08,
            frictionAir: 0.012,
            density: 0.0018
          });
          M.Body.setAngle(body, (Math.random() - 0.5) * 0.8);
          M.Body.setVelocity(body, { x: (Math.random() - 0.5) * 6, y: 0 });
          M.Composite.add(world, body);
          bodies.push({ el: el, body: body, w: w, h: h });
        }, 90 * i));
      });
    }

    function sync() {
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var p = b.body.position;
        if (p.y > H + 300 || p.y < -300 || p.x < -300 || p.x > W + 300) {
          M.Body.setPosition(b.body, { x: W / 2, y: H / 2 });
          M.Body.setVelocity(b.body, { x: 0, y: 0 });
        }
        b.el.style.transform = 'translate(' + (p.x - b.w / 2).toFixed(1) + 'px,' + (p.y - b.h / 2).toFixed(1) + 'px) rotate(' + b.body.angle.toFixed(3) + 'rad)';
      }
    }

    M.Events.on(engine, 'afterUpdate', sync);

    if (finePointer) {
      var mouse = M.Mouse.create(pgStage);
      mouse.pixelRatio = 1;
      ['wheel', 'mousewheel', 'DOMMouseScroll'].forEach(function (evt) {
        mouse.element.removeEventListener(evt, mouse.mousewheel);
      });
      var mc = M.MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: { stiffness: 0.18, damping: 0.1, render: { visible: false } }
      });
      M.Composite.add(world, mc);
      // Let go of a pill even if the button is released outside the stage.
      window.addEventListener('mouseup', function (e) { mouse.mouseup(e); });
    } else {
      // Touch: tap a pill to pop it (keeps page scrolling intact).
      pgStage.addEventListener('click', function (e) {
        var el = e.target.closest && e.target.closest('.pg-pill');
        if (!el) return;
        bodies.forEach(function (b) {
          if (b.el === el) M.Body.setVelocity(b.body, { x: (Math.random() - 0.5) * 10, y: -14 * Math.sign(engine.gravity.y || 1) });
        });
      });
    }

    function play() {
      if (running) return;
      running = true;
      M.Runner.run(runner, engine);
    }

    function pause() {
      if (!running) return;
      running = false;
      M.Runner.stop(runner);
    }

    function shake() {
      play();
      bodies.forEach(function (b) {
        M.Body.setVelocity(b.body, {
          x: (Math.random() - 0.5) * 22,
          y: -(8 + Math.random() * 14) * Math.sign(engine.gravity.y || 1)
        });
        M.Body.setAngularVelocity(b.body, (Math.random() - 0.5) * 0.4);
      });
    }

    window.__pgShake = shake;

    var flipBtn = $('#pg-flip');
    var shakeBtn = $('#pg-shake');
    var resetBtn = $('#pg-reset');
    if (flipBtn) {
      flipBtn.setAttribute('aria-pressed', 'false');
      flipBtn.addEventListener('click', function () {
        engine.gravity.y *= -1;
        flipBtn.setAttribute('aria-pressed', String(engine.gravity.y < 0));
        bodies.forEach(function (b) { M.Sleeping.set(b.body, false); });
      });
    }
    if (shakeBtn) shakeBtn.addEventListener('click', shake);
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        engine.gravity.y = 1;
        if (flipBtn) flipBtn.setAttribute('aria-pressed', 'false');
        spawn();
      });
    }

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (pgStage.clientWidth !== W || pgStage.clientHeight !== H) {
          buildWalls();
          spawn();
        }
      }, 250);
    });

    buildWalls();

    if ('IntersectionObserver' in window) {
      var spawned = false;
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          play();
          if (!spawned) {
            spawned = true;
            spawn();
          }
        } else {
          pause();
        }
      }, { threshold: 0.15 }).observe(pgStage);
    } else {
      play();
      spawn();
    }
  }

  /* =========================================================
     Local time in the Philippines
     ========================================================= */
  var timeEls = [$('#local-time'), $('#sb-time')].filter(Boolean);
  var sbYears = $('#sb-years');
  if (sbYears) sbYears.textContent = yearsSince('2017-01') + '+';
  if (timeEls.length && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
    var tickClock = function () {
      var t = fmt.format(new Date());
      timeEls.forEach(function (el) { el.textContent = t; });
    };
    tickClock();
    setInterval(tickClock, 15000);
  }
})();

// Projects: each video plays (muted, looping) while it's on screen. Click it, or its Sound button, for sound;
// only one plays sound at a time, and a video that scrolls away goes quiet again.
(function () {
  var frames = Array.prototype.slice.call(document.querySelectorAll('.work-frame'));
  if (!frames.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = frames.map(function (frame) {
    return { frame: frame, video: frame.querySelector('video'), btn: frame.querySelector('.work-sound') };
  });
  var play = function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); };

  function setSound(it, on) {
    it.video.muted = !on;
    it.btn.setAttribute('aria-pressed', String(on));
    it.btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    it.btn.querySelector('use').setAttribute('href', on ? '#i-volume' : '#i-volume-x');
    it.frame.setAttribute('data-cursor', on ? 'Mute' : 'Sound');
    if (on) {
      items.forEach(function (o) { if (o !== it && !o.video.muted) setSound(o, false); });
      play(it.video);
    }
  }

  items.forEach(function (it) {
    it.video.muted = true;
    // the Sound button sits inside the frame, so one click handler covers both
    it.frame.addEventListener('click', function () { setSound(it, it.video.muted); });
  });

  // With reduced motion nothing starts by itself: a click starts the video, with sound
  if (reduce || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var it = items.filter(function (o) { return o.frame === e.target; })[0];
      if (e.isIntersecting) play(it.video);
      else { it.video.pause(); if (!it.video.muted) setSound(it, false); }
    });
  }, { threshold: 0.4 });
  frames.forEach(function (f) { io.observe(f); });
})();
