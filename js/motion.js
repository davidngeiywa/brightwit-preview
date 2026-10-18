/* Brightwit motion toolkit. Depends on gsap + ScrollTrigger (+ optional Lenis). Global: BW */
(function (w, d) {
  'use strict';
  var reduced = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia('(pointer: fine)').matches;
  var BW = { reduced: reduced, fine: fine, lenis: null };

  function $(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }
  BW.$ = $;

  /* ---------- boot ---------- */
  BW.init = function (opts) {
    opts = opts || {};
    if (w.gsap && w.ScrollTrigger) { gsap.registerPlugin(ScrollTrigger); }
    if (!reduced && opts.smooth !== false && w.Lenis) {
      var lenis = new Lenis({ lerp: opts.lerp || 0.1, wheelMultiplier: 1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      BW.lenis = lenis;
      // anchor links through lenis
      d.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var el = d.querySelector(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -(opts.anchorOffset || 80), duration: 1.1 });
      });
    }
    d.documentElement.classList.add(reduced ? 'motion-reduced' : 'motion-on');
    var st = d.createElement('style');
    st.textContent = 'html.lenis,html.lenis body{height:auto}.lenis.lenis-smooth{scroll-behavior:auto!important}.lenis:not(.lenis-autoToggle).lenis-stopped{overflow:clip}.lenis.lenis-smooth [data-lenis-prevent]{overscroll-behavior:contain}.lenis.lenis-smooth iframe{pointer-events:none}';
    d.head.appendChild(st);
    return BW;
  };

  /* ---------- text splitting ---------- */
  BW.splitWords = function (el, cls) {
    cls = cls || 'w';
    var nodes = Array.prototype.slice.call(el.childNodes);
    var out = [];
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = d.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
          var o = d.createElement('span'); o.className = cls; o.style.display = 'inline-block'; o.style.overflow = 'hidden'; o.style.verticalAlign = 'top';
          var i = d.createElement('span'); i.className = cls + 'i'; i.style.display = 'inline-block'; i.textContent = part;
          o.appendChild(i); frag.appendChild(o); out.push(i);
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1) {
        out = out.concat(BW.splitWords(n, cls));
      }
    });
    return out;
  };

  /* ---------- scroll reveals ---------- */
  BW.reveal = function (sel, from, opts) {
    if (reduced) return;
    opts = opts || {};
    var els = $(sel); if (!els.length) return;
    gsap.set(els, from);
    ScrollTrigger.batch(els, {
      start: opts.start || 'top 88%',
      once: true,
      onEnter: function (batch) {
        var to = Object.assign({ duration: opts.duration || 0.9, ease: opts.ease || 'power3.out', stagger: opts.stagger == null ? 0.08 : opts.stagger, overwrite: true }, opts.to || {});
        Object.keys(from).forEach(function (k) { if (!(k in to)) to[k] = (k === 'opacity') ? 1 : (k === 'clipPath' ? 'inset(0 0 0 0)' : 0); });
        gsap.to(batch, to);
      }
    });
  };

  BW.wipe = function (sel, dir) {
    if (reduced) return;
    var map = { left: 'inset(0 100% 0 0)', right: 'inset(0 0 0 100%)', up: 'inset(100% 0 0 0)', down: 'inset(0 0 100% 0)', circle: 'circle(0% at 50% 50%)' };
    $(sel).forEach(function (el) {
      var dd = el.getAttribute('data-wipe') || dir || 'left';
      gsap.fromTo(el, { clipPath: map[dd] || map.left }, {
        clipPath: dd === 'circle' ? 'circle(75% at 50% 50%)' : 'inset(0 0 0 0)', duration: 1.1, ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });
  };

  /* ---------- counters ---------- */
  BW.counters = function (sel) {
    $(sel || '[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      var prefix = el.getAttribute('data-prefix') || '';
      var fmt = function (v) { return prefix + Math.round(v).toLocaleString('en-KE') + suffix; };
      if (reduced) { el.textContent = fmt(target); return; }
      var o = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = fmt(o.v); } }); }
      });
    });
  };

  /* ---------- parallax on scroll ---------- */
  BW.parallax = function (sel) {
    if (reduced) return;
    $(sel || '[data-parallax]').forEach(function (el) {
      var f = parseFloat(el.getAttribute('data-parallax') || '0.2');
      gsap.fromTo(el, { yPercent: -f * 50 }, { yPercent: f * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  };

  /* ---------- scroll progress ---------- */
  BW.progress = function (el) {
    if (!el) return;
    gsap.set(el, { scaleX: 0, transformOrigin: '0 50%' });
    gsap.to(el, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  };

  /* ---------- header behaviour ---------- */
  BW.header = function (el, opts) {
    if (!el) return; opts = opts || {};
    var last = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll();
        el.classList.toggle('is-scrolled', y > (opts.at || 60));
        if (opts.hide !== false) { el.classList.toggle('is-hidden', y > 300 && y > last && self.direction === 1); }
        last = y;
      }
    });
  };

  /* ---------- pointer interactions (fine pointers only) ---------- */
  BW.magnetic = function (sel, strength) {
    if (reduced || !fine) return; strength = strength || 0.35;
    $(sel || '[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength); yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  };

  BW.tilt = function (sel, max) {
    if (reduced || !fine) return; max = max || 8;
    $(sel || '[data-tilt]').forEach(function (el) {
      el.style.transformStyle = 'preserve-3d';
      var rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      gsap.set(el, { transformPerspective: 900 });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * max * 2); rx(-py * max * 2);
        el.style.setProperty('--mx', (px + 0.5) * 100 + '%'); el.style.setProperty('--my', (py + 0.5) * 100 + '%');
      });
      el.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });
  };

  BW.mouseParallax = function (container, sel) {
    if (reduced || !fine || !container) return;
    var items = $(sel || '[data-depth]', container).map(function (el) {
      return { el: el, depth: parseFloat(el.getAttribute('data-depth') || '0.05'), x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power2' }), y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power2' }) };
    });
    container.addEventListener('pointermove', function (e) {
      var r = container.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      items.forEach(function (it) { it.x(dx * it.depth); it.y(dy * it.depth); });
    });
    container.addEventListener('pointerleave', function () { items.forEach(function (it) { it.x(0); it.y(0); }); });
  };

  BW.cursorGlow = function (color, size) {
    if (reduced || !fine) return;
    var g = d.createElement('div');
    g.setAttribute('aria-hidden', 'true');
    g.style.cssText = 'position:fixed;left:0;top:0;width:' + (size || 520) + 'px;height:' + (size || 520) + 'px;border-radius:50%;pointer-events:none;z-index:1;mix-blend-mode:screen;opacity:0;transform:translate(-50%,-50%);background:radial-gradient(circle,' + (color || 'rgba(201,162,75,.22)') + ' 0%,rgba(0,0,0,0) 62%)';
    d.body.appendChild(g);
    var xTo = gsap.quickTo(g, 'left', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(g, 'top', { duration: 0.5, ease: 'power3' });
    w.addEventListener('pointermove', function (e) { xTo(e.clientX); yTo(e.clientY); g.style.opacity = 1; });
    d.addEventListener('pointerleave', function () { g.style.opacity = 0; });
  };

  /* ---------- marquee with scroll velocity boost ---------- */
  BW.marquee = function (track, opts) {
    if (!track) return; opts = opts || {};
    var speed = opts.speed || 60; // px/s
    var x = 0, half = 0, boost = 0;
    function measure() { half = track.scrollWidth / 2; }
    measure(); w.addEventListener('resize', measure);
    if (reduced) return;
    var st = ScrollTrigger.create({ onUpdate: function (self) { boost = gsap.utils.clamp(-6, 6, self.getVelocity() / 200); } });
    gsap.ticker.add(function (t, dt) {
      var v = speed * (1 + Math.abs(boost)) * (opts.dir || 1) * (boost < 0 && opts.reverseOnUp ? -1 : 1);
      x -= v * dt / 1000; boost *= 0.96;
      if (x <= -half) x += half; if (x > 0) x -= half;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
    });
    return st;
  };

  /* ---------- sticky scroll steps (text drives image) ---------- */
  BW.scrollSteps = function (section, opts) {
    if (!section) return; opts = opts || {};
    var steps = $(opts.steps || '[data-step]', section), imgs = $(opts.images || '[data-step-img]', section);
    function activate(i) {
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      imgs.forEach(function (im, k) { im.classList.toggle('is-active', k === i); });
    }
    activate(0);
    steps.forEach(function (s, i) {
      ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onEnter: function () { activate(i); }, onEnterBack: function () { activate(i); } });
    });
  };

  /* ---------- horizontal pin scroll ---------- */
  BW.horizontal = function (section, track) {
    if (reduced || !section || !track) return;
    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', function () {
      var dist = function () { return track.scrollWidth - section.clientWidth; };
      gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 } });
    });
  };

  /* ---------- page load sequence helper ---------- */
  BW.intro = function (tl) { if (reduced) return null; return gsap.timeline(Object.assign({ defaults: { ease: 'power3.out' } }, tl || {})); };

  w.BW = BW;
})(window, document);
