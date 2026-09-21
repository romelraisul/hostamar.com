/* HOSTAMAR SITE — shared interactions
   nav state, mobile menu, tabs, filters, search, forms, modal,
   toast, copy, reveal-on-scroll, count-up. No dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  /* ---------- active nav (by data-nav matching file name) ---------- */
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(function (a) {
    var key = (a.getAttribute("data-nav") || "").toLowerCase();
    if (key && (key === here || key + ".html" === here || key === here.replace(".html", ""))) {
      a.classList.add("current");
      a.setAttribute("aria-current", "page");
    }
  });

  /* ---------- mobile nav ---------- */
  document.querySelectorAll(".nav-toggle").forEach(function (d) {
    document.addEventListener("click", function (e) {
      if (!d.contains(e.target)) d.removeAttribute("open");
    });
  });

  /* ---------- reveal on scroll ---------- */
  var rv = document.querySelectorAll(".rv");
  if (rv.length && "IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- tabs ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var tabs = group.querySelectorAll(".tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("on"); t.setAttribute("aria-selected", "false"); });
        tab.classList.add("on"); tab.setAttribute("aria-selected", "true");
        var id = tab.getAttribute("data-tab");
        group.querySelectorAll(".tabpanel").forEach(function (p) {
          p.hidden = p.getAttribute("data-panel") !== id;
        });
      });
    });
  });

  /* ---------- chips filter ---------- */
  document.querySelectorAll("[data-filter-group]").forEach(function (wrap) {
    var targetSel = wrap.getAttribute("data-filter-target");
    var items = targetSel ? document.querySelectorAll(targetSel) : [];
    wrap.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        wrap.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("on"); });
        chip.classList.add("on");
        var f = chip.getAttribute("data-filter") || "all";
        var shown = 0;
        items.forEach(function (it) {
          var match = f === "all" || (it.getAttribute("data-cat") || "").split(" ").indexOf(f) !== -1;
          it.hidden = !match; if (match) shown++;
        });
        var empty = document.querySelector(wrap.getAttribute("data-empty"));
        if (empty) empty.hidden = shown !== 0;
      });
    });
  });

  /* ---------- live search list ---------- */
  document.querySelectorAll("[data-search]").forEach(function (input) {
    var targetSel = input.getAttribute("data-search");
    var items = document.querySelectorAll(targetSel);
    var empty = document.querySelector(input.getAttribute("data-empty") || "");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (it) {
        var hay = (it.getAttribute("data-text") || it.textContent || "").toLowerCase();
        var match = !q || hay.indexOf(q) !== -1;
        it.hidden = !match; if (match) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  });

  /* ---------- forms (validate + fake submit) ---------- */
  document.querySelectorAll("form[data-demo]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (inp) {
        var f = inp.closest(".field");
        var bad = !String(inp.value || "").trim();
        if (!bad && inp.type === "email") bad = !/^\S+@\S+\.\S+$/.test(inp.value);
        if (f) f.classList.toggle("error", bad);
        if (bad) ok = false;
      });
      if (!ok) { toast("কিছু ঘর পূরণ করা হয়নি"); return; }
      var btn = form.querySelector("[type=submit]");
      if (btn) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = "পাঠানো হচ্ছে…"; }
      setTimeout(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.t || "পাঠান"; }
        var okBox = document.querySelector(form.getAttribute("data-ok") || "");
        if (okBox) { form.hidden = true; okBox.hidden = false; }
        else toast("সফলভাবে পাঠানো হয়েছে (নমুনা)");
      }, 800);
    });
  });

  /* ---------- modal ---------- */
  document.querySelectorAll("[data-open]").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = document.getElementById(b.getAttribute("data-open"));
      if (m) m.classList.add("open");
    });
  });
  document.querySelectorAll(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) {
      if (e.target === m || e.target.hasAttribute("data-close")) m.classList.remove("open");
    });
  });

  /* ---------- toast ---------- */
  var toastEl = document.createElement("div");
  toastEl.className = "toast"; toastEl.setAttribute("role", "status");
  document.body.appendChild(toastEl);
  var tId;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(tId); tId = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }
  window.toast = toast;

  /* ---------- copy buttons ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-copy");
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { toast("কপি হয়েছে: " + v); });
      else toast("কপি: " + v);
    });
  });

  /* ---------- count-up ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, to = parseFloat(el.getAttribute("data-count")), dec = (el.getAttribute("data-dec") || 0) * 1, suf = el.getAttribute("data-suf") || "", t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / 900, 1);
          var v = to * (1 - Math.pow(1 - p, 3));
          el.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")) + suf;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        co.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { co.observe(c); });
  }

  /* ---------- demo interactivity (spin/生成 buttons) ---------- */
  document.querySelectorAll("[data-demo-action]").forEach(function (b) {
    b.addEventListener("click", function () {
      var box = document.querySelector(b.getAttribute("data-demo-action"));
      if (!box) return;
      box.hidden = false;
      var rows = box.querySelectorAll(".demo-row");
      rows.forEach(function (r, i) { r.style.display = "none"; setTimeout(function () { r.style.display = ""; }, 260 * i); });
      toast("নমুনা প্রক্রিয়া চলছে…");
    });
  });
})();
