// public/seo-tracker.js — anonymous pageview + click beacons to /api/seo/track.
// Fire-and-forget; never blocks UI, never stores PII (type+url+UA only, matching SeoEvent model).
(function () {
  function track(type, url) {
    try {
      var body = JSON.stringify({ type: type, url: url });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/seo/track', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/seo/track', { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (e) { /* analytics must never break the page */ }
  }
  // pageview with source attribution (utm/referrer in url fragment-free path)
  var path = location.pathname + (location.search.indexOf('utm_') > -1 || document.referrer ? '?' + (document.referrer ? 'ref=' + encodeURIComponent(document.referrer.split('/')[2] || '') : '') + (location.search || '') : location.search);
  track('pageview', path.slice(0, 512));
  // delegated click tracking: any element with data-track="event_name"
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (el) track('click:' + el.getAttribute('data-track'), location.pathname);
  }, { passive: true });
})();
