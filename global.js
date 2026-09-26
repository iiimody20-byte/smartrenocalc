/* =====================================================================
   SmartRenoCalc — global.js
   The ONE file to edit for header, footer, or CTA changes.
   Must load BEFORE script.js on every page:
     <script src="/global.js" defer></script>
     <script src="/script.js" defer></script>
   URLs are extensionless (/about-us, /blog/...) because Cloudflare Pages
   308-redirects every *.html URL to its clean form.
   ===================================================================== */
(function () {
  'use strict';

  var HEADER_HTML =
    '<div class="container">' +
      '<a href="/" class="logo">Smart<span>Reno</span>Calc</a>' +
      '<button class="nav-toggle" aria-expanded="false" aria-label="Toggle navigation menu">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
      '<nav>' +
        '<ul class="nav-list">' +
          '<li><a href="/">Calculator</a></li>' +
          '<li><a href="/blog">Blog</a></li>' +
          '<li><a href="/about-us">About</a></li>' +
          '<li><a href="/contact-us">Contact</a></li>' +
        '</ul>' +
      '</nav>' +
    '</div>';

  var FOOTER_HTML =
    '<div class="container">' +
      '<ul class="footer-links">' +
        '<li><a href="/privacy-policy">Privacy Policy</a></li>' +
        '<li><a href="/terms-of-service">Terms of Service</a></li>' +
        '<li><a href="/about-us">About Us</a></li>' +
        '<li><a href="/contact-us">Contact Us</a></li>' +
      '</ul>' +
      '<div class="footer-meta">' +
        '<p>&copy; <span id="year"></span> SmartRenoCalc. All estimates are for planning purposes only.</p>' +
      '</div>' +
    '</div>';

  // Keys are used as <div data-global-cta="KEY"></div> inside articles.
  var CTA_CONFIG = {
    kitchen:   { headline: 'Want a starting number for your own kitchen?', button: 'Calculate My Kitchen Remodel Cost' },
    bathroom:  { headline: 'See what your own bathroom remodel could cost.', button: 'Calculate My Bathroom Remodel Cost' },
    basement:  { headline: 'Get a number for your own basement, adjusted to your ZIP code.', button: 'Calculate My Basement Finishing Cost' },
    roof:      { headline: 'Get your real number in about 30 seconds.', button: 'Calculate My Roof Replacement Cost' },
    fullhouse: { headline: 'Curious what a full renovation would run at your address?', button: 'Calculate My Full Renovation Cost' },
    attic:     { headline: 'See what an attic conversion could cost in your area.', button: 'Calculate My Attic Conversion Cost' },
    zip:       { headline: 'See your own region’s number.', button: 'Get My ZIP-Adjusted Estimate' },
    general:   { headline: 'Ready to see your own numbers?', button: 'Try the Free Calculator' }
  };

  // "/about-us.html", "/about-us/" and "/about-us" all compare as "/about-us".
  function normalizePath(path) {
    path = path.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
    if (path.length > 1) { path = path.replace(/\/$/, ''); }
    return path || '/';
  }

  function injectHeader() {
    var el = document.getElementById('site-header');
    if (!el) { return; }
    el.innerHTML = HEADER_HTML;
    markActiveNavLink(el);
  }

  function injectFooter() {
    var el = document.getElementById('site-footer');
    if (el) { el.innerHTML = FOOTER_HTML; }
  }

  function markActiveNavLink(headerEl) {
    var path = normalizePath(window.location.pathname);
    headerEl.querySelectorAll('.nav-list a').forEach(function (link) {
      var href = link.getAttribute('href');
      var isBlogSection = href === '/blog' && (path === '/blog' || path.indexOf('/blog/') === 0);
      if (isBlogSection || href === path) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function injectCtas() {
    document.querySelectorAll('[data-global-cta]').forEach(function (node) {
      var cta = CTA_CONFIG[node.getAttribute('data-global-cta')] || CTA_CONFIG.general;
      node.className = 'article__cta';
      node.innerHTML =
        '<p><strong>' + cta.headline + '</strong> Use the SmartRenoCalc calculator to get an instant, ZIP-adjusted estimate.</p>' +
        '<a href="/#calculator" class="btn btn--primary">' + cta.button + '</a>';
    });
  }

  injectHeader();
  injectFooter();
  injectCtas();
})();
