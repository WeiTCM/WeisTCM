(function () {
  var STORAGE_KEY = 'wei-lang';
  function getLang() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === 'zh' ? 'zh' : 'en';
    } catch (e) { return 'en'; }
  }
  function applyLang(lang) {
    var html = document.documentElement;
    html.setAttribute('lang', lang === 'zh' ? 'zh' : 'en');
    html.classList.remove('lang-en', 'lang-zh');
    html.classList.add('lang-' + lang);
    document.querySelectorAll('.lang-switch').forEach(function (el) {
      el.setAttribute('data-lang', lang);
    });
  }
  function setLang(lang, animate) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll('.lang-switch').forEach(function (el) {
      el.setAttribute('data-lang', lang);
    });
    if (!animate) {
      applyLang(lang);
      return;
    }
    var html = document.documentElement;
    html.classList.add('lang-fading-out');
    setTimeout(function () {
      applyLang(lang);
      html.classList.remove('lang-fading-out');
      html.classList.add('lang-typing');
      setTimeout(function () {
        html.classList.remove('lang-typing');
      }, 620);
    }, 220);
  }
  var initial = getLang();
  document.documentElement.classList.add('lang-' + initial);
  document.documentElement.setAttribute('lang', initial);

  function typewriter(el, done) {
    if (!el) return done && done();
    var lang = getLang();
    var target = el.querySelector('[data-i18n="' + lang + '"]');
    if (!target) return done && done();
    var full = target.textContent;
    target.textContent = '';
    var i = 0;
    function tick() {
      if (i > full.length) {
        el.classList.add('hero-type-done');
        return done && done();
      }
      target.textContent = full.slice(0, i);
      i++;
      setTimeout(tick, 37);
    }
    setTimeout(tick, 1000);
  }
  function getPlainText(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || '';
  }
  function wrapTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      var parent = node.parentElement;
      if (!parent) continue;
      var tag = parent.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'video') continue;
      if (parent.closest('.hero-type-in')) continue;
      if (parent.closest('svg')) continue;
      if (parent.closest('.gold-flow')) continue;
      if (parent.closest('.card-a')) continue;
      if (parent.closest('.herb-card')) continue;
      if (parent.closest('.overview__stats')) continue;
      // Skip text nodes that live inside a red-text element (those get typed)
      var p = parent, insideRed = false;
      while (p && p !== root) {
        var pStyle = p.getAttribute && p.getAttribute('style');
        if (pStyle && pStyle.indexOf('color: #ff473a') !== -1) { insideRed = true; break; }
        if (p.classList && p.classList.contains('directory__accent')) { insideRed = true; break; }
        p = p.parentElement;
      }
      if (insideRed) continue;
      textNodes.push(node);
    }
    textNodes.forEach(function (n) {
      // Count <br> siblings preceding this text node in its direct parent
      // to determine which "paragraph block" it belongs to (separated by <br><br>).
      var brCount = 0;
      var sib = n.previousSibling;
      while (sib) {
        if (sib.nodeType === 1 && sib.tagName && sib.tagName.toLowerCase() === 'br') brCount++;
        sib = sib.previousSibling;
      }
      var block = Math.floor(brCount / 2);
      var delaySteps = Math.max(0, block - 1);
      var span = document.createElement('span');
      span.className = 'reveal-text';
      if (delaySteps > 0) span.style.transitionDelay = (delaySteps * 300) + 'ms';
      var p = n.parentNode;
      p.insertBefore(span, n);
      span.appendChild(n);
    });
  }
  function initTypeReveal() {
    var sections = document.querySelectorAll('section:not(.hero)');
    // Footer contact block: fade in as one unit (no per-element typing)
    var fadeBlocks = document.querySelectorAll('.footer__content, .directory');
    fadeBlocks.forEach(function (el) { el.classList.add('fade-block'); });
    // Each stat card (and its heading/image) reveals individually when scrolled into view.
    var itemEls = document.querySelectorAll('.overview__stats .absolute-img, .overview__stats .huge-card__flex, .overview__stats .card-a');
    itemEls.forEach(function (el) { el.classList.add('fade-item'); });
    var footerBlocks = Array.prototype.slice.call(fadeBlocks).concat(Array.prototype.slice.call(itemEls));
    if ('IntersectionObserver' in window) {
      var fbIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          fbIO.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
      footerBlocks.forEach(function (el) { fbIO.observe(el); });
    } else {
      footerBlocks.forEach(function (el) { el.classList.add('is-visible'); });
    }
    var data = [];
    sections.forEach(function (section) {
      // Identify red text elements first (before wrapping)
      var redEls = Array.prototype.slice.call(section.querySelectorAll('[style*="color: #ff473a"], .directory__accent'))
        .filter(function (el) {
          if (el.closest('.hero-type-in')) return false;
          if (el.children.length > 0) return false;
          var t = el.textContent;
          return t && t.trim();
        });
      redEls.forEach(function (el) {
        el.dataset.original = el.innerHTML;
        el.innerHTML = '';
      });
      // Wrap non-red text nodes in .reveal-text spans (skips inside-red)
      wrapTextNodes(section);
      // Mark herb-cards for delayed fade
      Array.prototype.forEach.call(section.querySelectorAll('.herb-card'), function (card) {
        card.classList.add('reveal-block');
      });
      // Fade gold-flow (★) as its own block so the gradient/animation is preserved.
      Array.prototype.forEach.call(section.querySelectorAll('.gold-flow'), function (el) {
        if (el.closest('.overview__stats')) return;
        el.classList.add('reveal-block');
      });
      section.classList.add('reveal-section');
      data.push({ section: section, redEls: redEls });
    });

    var revealSection = function (d) {
      if (d.section.dataset.revealed) return;
      d.section.dataset.revealed = '1';
      d.section.classList.add('revealed');
    };
    var typeThenReveal = function (d) {
      if (d.section.dataset.revealed) return;
      d.section.dataset.revealed = '1';
      var redEls = d.redEls;
      if (!redEls.length) return d.section.classList.add('revealed');
      var idx = 0;
      (function typeNext() {
        if (idx >= redEls.length) {
          if (!d.section.classList.contains('revealed')) d.section.classList.add('revealed');
          return;
        }
        var el = redEls[idx];
        var plain = getPlainText(el.dataset.original);
        var stepMs = plain.length ? Math.max(10, 667 / plain.length) : 10;
        var isLast = (idx === redEls.length - 1);
        if (isLast) {
          if (!d.section.classList.contains('revealed')) d.section.classList.add('revealed');
        }
        var i = 0;
        (function tick() {
          el.textContent = plain.slice(0, i);
          i++;
          if (i > plain.length) {
            el.innerHTML = el.dataset.original;
            idx++;
            typeNext();
            return;
          }
          setTimeout(tick, stepMs);
        })();
      })();
    };

    if (!('IntersectionObserver' in window)) {
      data.forEach(function (d) {
        d.redEls.forEach(function (el) { el.innerHTML = el.dataset.original; });
        d.section.classList.add('revealed');
        d.section.dataset.revealed = '1';
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var section = entry.target;
        var d = data.filter(function (x) { return x.section === section; })[0];
        if (!d) return;
        io.unobserve(section);
        typeThenReveal(d);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -15% 0px' });
    data.forEach(function (d) { io.observe(d.section); });

  }
  function init() {
    applyLang(getLang());
    initTypeReveal();
    typewriter(document.querySelector('.hero-type-in'));
    document.querySelectorAll('.lang-switch').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var next = el.getAttribute('data-lang') === 'zh' ? 'en' : 'zh';
        setLang(next, true);
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
