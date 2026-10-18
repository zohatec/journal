/* =====================================================================
   ARC Journals — site-submissions.js  (v8 — page-walk takeover + bar preservation + strict 6-per-page)
   ===================================================================== */

(function () {
  "use strict";

  if (window.__ARC_SUBMISSIONS_LOADED) return; /* double-load guard */
  window.__ARC_SUBMISSIONS_LOADED = true;

  var VERSION = "v8";

  /* URL slug → exact category name used by the submit form */
  var CAT_NAMES = {
    arts:        "Arts & Culture",
    comparative: "Comparative & International Studies",
    economics:   "Economics & Business",
    education:   "Education Studies",
    space:       "Future & Space Studies",
    health:      "Health, Psychology & Bioethics",
    history:     "History & Memory Studies",
    human:       "Human Rights & Indigenous Studies",
    inter:       "Interdisciplinary Studies",
    law:         "Law & Environment",
    justice:     "Law & Justice",
    migration:   "Migration & Geopolitics",
    philosophy:  "Philosophy & Ethics",
    digital:     "Technology & Digital Studies"
  };

  var SUBS_PER_PAGE = 6;            /* must match the site's 6-per-page rule */
  var MAX_ON_JOURNALS_HOME = 12;   /* cards shown on journals.html          */
  var MAX_WALK_PAGES = 25;         /* never walk more pages than this       */
  var SUBS_POSITION = "front";     /* "front" = page 1, "end" = last pages  */
  var DEBUG = /subdebug/i.test(location.hash + ";" + location.search);

  /* ---------------- generic helpers ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function normCat(s) {
    return String(s || "").toLowerCase()
      .replace(/\s*&\s*/g, " and ")
      .replace(/[^a-z0-9]+/g, "");
  }
  function tsNum(v) {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "string") { var n = Date.parse(v); return isNaN(n) ? 0 : n; }
    if (typeof v.toMillis === "function") return v.toMillis();
    return 0;
  }
  function fmtDate(v) {
    var t = tsNum(v);
    return t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  }
  function isApproved(d) {
    if (d.approved === true || d.approved === "true" || d.approved === 1) return true;
    var st = String(d.status || "").toLowerCase();
    if (st === "approved" || st === "published") return true;
    if (d.published === true || d.published === "true") return true;
    return false;
  }
  function catMatches(docCat, targetName) {
    var n = normCat(docCat), t = normCat(targetName);
    if (!n || !t) return false;
    if (n === t) return true;
    if (n.length >= 4 && t.indexOf(n) !== -1) return true;
    if (t.length >= 4 && n.indexOf(t) !== -1) return true;
    return false;
  }
  function metaLine(d) {
    return "By " + (d.fullName || "Anonymous") +
      (d.institution ? " · " + d.institution : "") +
      (fmtDate(d.submittedAt) ? " · " + fmtDate(d.submittedAt) : "");
  }
  function makePlaceholder(letter) {
    letter = (letter || "A").substring(0, 1).toUpperCase();
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='140'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%231f3d7a'/%3E%3Cstop offset='1' stop-color='%233d5fa8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='140' rx='6' fill='url(%23g)'/%3E%3Ctext x='50' y='84' font-family='Georgia,serif' font-size='46' fill='rgba(255,255,255,0.92)' text-anchor='middle'%3E" + encodeURIComponent(letter) + "%3C/text%3E%3C/svg%3E";
  }

  /* ---------------- debug box ---------------- */
  var dbgLines = ["site-submissions.js " + VERSION + " loaded"];
  function paintDebug() {
    if (!DEBUG) return;
    var box = document.getElementById("arcSubDebug");
    if (!box) {
      box = document.createElement("div");
      box.id = "arcSubDebug";
      box.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:99999;max-width:380px;max-height:45vh;overflow:auto;background:#111827;color:#d1d5db;border:1px solid #374151;border-radius:10px;padding:10px 12px;font:11px/1.6 ui-monospace,Consolas,monospace;box-shadow:0 8px 30px rgba(0,0,0,.35);white-space:pre-wrap;";
      (document.body || document.documentElement).appendChild(box);
    }
    box.textContent = dbgLines.join("\n");
  }
  function dbg(msg) { dbgLines.push(msg); paintDebug(); try { console.log("[ARC sub]", msg); } catch (e) {} }
  function dbgErr(msg) { dbgLines.push("ERROR: " + msg); paintDebug(); try { console.error("[ARC sub]", msg); } catch (e) {} }
  paintDebug();

  /* ---------------- visible error banner ---------------- */
  function showErrorBanner(message) {
    var mainContent = document.querySelector(".main-content");
    if (!mainContent) return;
    var friendly = /permission|unauthorized|unauthenticated/i.test(message)
      ? "The database refused to read the submissions (Firestore Security Rules). Fix: Firebase Console -> Firestore Database -> Rules -> for the submissions collection set: allow read: if true;"
      : "";
    var el = document.createElement("div");
    el.style.cssText = "margin-top:1.6rem;padding:.85rem 1rem;border-radius:10px;background:#fdeeee;border:1px solid #f2c2c2;color:#b91c1c;font-size:.86rem;line-height:1.65;";
    el.innerHTML = '<b><i class="fas fa-exclamation-triangle"></i> Submissions could not be loaded.</b>'
      + (friendly ? "<br>" + esc(friendly) : "")
      + "<br><small>Details: " + esc(message) + "</small>"
      + '<br><small>Tip: open this page with <b>#subdebug</b> at the end of the URL for a full report.</small>';
    mainContent.appendChild(el);
  }

  /* ---------------- styles ---------------- */
  function ensureStyles() {
    if (document.getElementById("arcSubStyles")) return;
    var style = document.createElement("style");
    style.id = "arcSubStyles";
    style.textContent = [
      /* horizontal journal-card design (matches the site's journal cards) */
      ".us-section{margin-top:2.6rem;}",
      ".us-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.1rem;margin-top:1.1rem;}",
      ".us-card{display:flex;gap:14px;background:#fff;border:1px solid #e6e8ee;border-radius:10px;padding:12px 14px;box-shadow:0 2px 10px rgba(20,30,60,.06);animation:usIn .5s ease both;}",
      ".us-card:nth-child(2){animation-delay:.06s}.us-card:nth-child(3){animation-delay:.12s}.us-card:nth-child(4){animation-delay:.18s}.us-card:nth-child(5){animation-delay:.24s}.us-card:nth-child(6){animation-delay:.3s}",
      "@keyframes usIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}",
      ".us-thumb{width:100px;min-width:100px;height:140px;border-radius:6px;overflow:hidden;background:linear-gradient(135deg,#1f3d7a,#3d5fa8);display:block;align-self:flex-start;}",
      ".us-thumb img{width:100%;height:100%;object-fit:cover;display:block;}",
      ".us-thumb-empty{height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.85);font-size:2rem;}",
      ".us-body{display:flex;flex-direction:column;gap:.4rem;flex:1;min-width:0;}",
      ".us-cat{align-self:flex-start;font-size:.66rem;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#1f3d7a;background:#eef2fa;border:1px solid #d9e1f2;padding:2px 9px;border-radius:20px;}",
      ".us-title{margin:0;font-size:1.02rem;line-height:1.35;font-family:'Lora',serif;}",
      ".us-title a{color:#1c2b4a;text-decoration:none;}",
      ".us-title a:hover{color:#1f3d7a;text-decoration:underline;}",
      ".us-meta{font-size:.78rem;color:#6c757d;line-height:1.5;margin:0;}",
      ".us-abs{font-size:.85rem;color:#55607a;line-height:1.55;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}",
      ".us-actions{margin-top:auto;padding-top:.4rem;display:flex;gap:.5rem;flex-wrap:wrap;}",
      ".us-btn{background:#1f3d7a;color:#fff;text-decoration:none;font-size:.78rem;font-weight:600;padding:.38rem .8rem;border-radius:7px;transition:background .15s;}",
      ".us-btn:hover{background:#16305f;}",
      ".us-pdf{border:1px solid #cdd5e2;color:#1f3d7a;background:#fff;text-decoration:none;font-size:.78rem;font-weight:600;padding:.38rem .8rem;border-radius:7px;transition:background .15s;}",
      ".us-pdf:hover{background:#f0f4fb;}",
      ".us-empty{color:#8a92a1;font-size:.9rem;margin-top:.4rem;}",
      ".us-more{margin-top:.9rem;font-size:.82rem;color:#8a92a1;}",
      /* notes + walk dimmer + fallback page buttons */
      ".arc-note{margin-top:.8rem;font-size:.82rem;color:#8a92a1;line-height:1.6;}",
      ".arc-note a{color:#1f3d7a;font-weight:600;}",
      ".arc-walking{opacity:.4 !important;pointer-events:none;transition:opacity .2s;}",
      ".arc-page-btn{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:40px;padding:0 14px;margin:0 4px;border:1px solid #d5dbe6;border-radius:999px;background:#fff;color:#3a4763;font:600 .88rem 'Inter',sans-serif;text-decoration:none;cursor:pointer;transition:all .15s;}",
      ".arc-page-btn:hover{border-color:#1f3d7a;color:#1f3d7a;}",
      ".arc-page-btn.arc-active{background:#1f3d7a;border-color:#1f3d7a;color:#fff;}",
      ".arc-page-btn.arc-disabled{opacity:.45;pointer-events:none;cursor:default;}",
      ".arc-page-btn.arc-dots{border-color:transparent;background:transparent;pointer-events:none;min-width:26px;color:#8a92a1;}",
      "#pagination .arc-active{background:#1f3d7a !important;border-color:#1f3d7a !important;color:#fff !important;}",
      "@media (max-width:640px){.us-grid{grid-template-columns:1fr;}}"
    ].join("");
    document.head.appendChild(style);
  }

  /* ---------------- DOM shortcuts ---------------- */
  function getContainer() { return document.getElementById("articlesContainer"); }
  function getPag() { return document.getElementById("pagination"); }
  function parseHash() {
    var m = String(location.hash || "").match(/page-(\d+)/i);
    return m ? parseInt(m[1], 10) : 0;
  }

  /* =====================================================================
     The one true submission card markup (horizontal journal-card design)
     used on journals.html, in empty categories and in the fallbacks.
     ===================================================================== */
  function cardHTML(d) {
    var view = "submission-view.html?sub=" + encodeURIComponent(d.id);
    var thumb = d.imageUrl
      ? '<img src="' + esc(d.imageUrl) + '" alt="' + esc(d.title || "Submission") + '" loading="lazy">'
      : '<div class="us-thumb-empty"><i class="fas fa-file-pdf"></i></div>';
    var abs = String(d.abstract || "");
    var chip = d.category ? '<span class="us-cat">' + esc(d.category) + "</span>" : "";
    return '<div class="us-card" data-arc-sub="' + esc(d.id) + '">' +
        '<a class="us-thumb" href="' + view + '">' + thumb + "</a>" +
        '<div class="us-body">' + chip +
          '<h3 class="us-title"><a href="' + view + '">' + esc(d.title || "(Untitled)") + "</a></h3>" +
          '<p class="us-meta">' + esc(metaLine(d)) + "</p>" +
          (abs ? '<p class="us-abs">' + esc(abs.slice(0, 200)) + (abs.length > 200 ? "..." : "") + "</p>" : "") +
          '<div class="us-actions">' +
            '<a class="us-btn" href="' + view + '"><i class="fas fa-book-open"></i> Read</a>' +
            (d.fileUrl ? '<a class="us-pdf" href="' + esc(d.fileUrl) + '" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> PDF</a>' : "") +
          "</div>" +
        "</div>" +
      "</div>";
  }
  function cardNode(d) {
    var holder = document.createElement("div");
    holder.innerHTML = cardHTML(d);
    return holder.firstElementChild;
  }

  /* =====================================================================
     journals.html — "Submitted Journals" section (also the Layer-C
     fallback section at the bottom of category pages)
     ===================================================================== */
  function renderHomeSection(subs, opts) {
    opts = opts || {};
    var atBottom = !!opts.atBottom;
    var heading = opts.heading || "Submitted Journals";
    ensureStyles();
    var mainContent = document.querySelector(".main-content");
    if (!mainContent) { dbgErr(".main-content not found"); return; }

    var section = document.createElement("div");
    section.className = "us-section";
    if (!subs.length) {
      section.innerHTML =
        '<div class="section-header">' +
          '<h2><i class="fas fa-inbox"></i> ' + esc(heading) + "</h2>" +
          '<div class="results-count">0 submissions</div>' +
        "</div>" +
        '<p class="us-empty">No approved submissions yet. Approve submissions in the admin panel and they will appear here.</p>';
    } else {
      var shown = subs.slice(0, MAX_ON_JOURNALS_HOME);
      section.innerHTML =
        '<div class="section-header">' +
          '<h2><i class="fas fa-inbox"></i> ' + esc(heading) + "</h2>" +
          '<div class="results-count">' + subs.length + (subs.length === 1 ? " submission" : " submissions") + "</div>" +
        "</div>" +
        '<div class="us-grid">' + shown.map(cardHTML).join("") + "</div>" +
        (subs.length > shown.length ? '<p class="us-more">Showing the latest ' + shown.length + " of " + subs.length + " submissions.</p>" : "");
    }
    if (atBottom) mainContent.appendChild(section);
    else mainContent.insertBefore(section, mainContent.firstChild);
    dbg((atBottom ? "bottom section" : "journals.html") + ": rendered " + Math.min(subs.length, MAX_ON_JOURNALS_HOME) + " card(s)");
  }

  /* =====================================================================
     Category pages — helpers
     ===================================================================== */
  function waitInitialRender(timeoutMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function poll() {
        var c = getContainer();
        if (c && c.children.length) return resolve(true);
        var nrm = document.getElementById("noResultsMsg");
        if (nrm && nrm.style.display !== "none" && nrm.offsetParent !== null) return resolve(true);
        if (Date.now() - t0 > timeoutMs) return resolve(false);
        setTimeout(poll, 120);
      })();
    });
  }

  function maxPageNumber(pag) {
    if (!pag) return 0;
    var max = 0;
    var els = pag.querySelectorAll("a,button,span,li,div");
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || "").trim();
      if (/^\d{1,3}$/.test(t)) { var n = parseInt(t, 10); if (n > max) max = n; }
    }
    return max;
  }

  function detectActiveClass(pag) {
    if (!pag) return "arc-active";
    var els = pag.querySelectorAll("*");
    for (var i = 0; i < els.length; i++) {
      var cls = els[i].classList;
      for (var j = 0; j < cls.length; j++) {
        if (/active|current|selected/i.test(cls[j]) && cls[j] !== "pagination") return cls[j];
      }
    }
    return "arc-active";
  }

  function showNote(html) {
    var el = document.createElement("div");
    el.className = "arc-note";
    el.innerHTML = '<i class="fas fa-info-circle"></i> ' + html;
    var anchor = getPag() || getContainer();
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
    else (document.querySelector(".main-content") || document.body).appendChild(el);
  }

  /* =====================================================================
     v7 — pagination preservation helpers
     The site's own bar (‹ Previous · pills · Next ›) is never rebuilt:
     we restore its exact HTML, re-wire clicks, clone REAL buttons when
     extra pages are needed, and mirror the site's own active/disabled
     styling. Structure-agnostic: flat bars, <ul><li> bars, buttons or
     anchors, any class names — all preserved.
     ===================================================================== */
  var barProtoHTML = "";
  function captureBarProto() {
    var p = getPag();
    if (p && p.innerHTML && String(p.innerHTML).trim() && !barProtoHTML) {
      barProtoHTML = p.innerHTML;
      dbg("bar: page-1 snapshot captured (" + p.querySelectorAll("a,button").length + " button node(s))");
    }
  }

  function normText(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function isNumericText(s) { return /^\d{1,3}$/.test(normText(s)); }

  function depthIn(root, el) {
    var d = 0, p = el.parentNode;
    while (p && p !== root) { d++; p = p.parentNode; }
    return d;
  }

  function deepestNumericEl(root) {
    if (!root) return null;
    var best = null, bestD = -1;
    var els = root.querySelectorAll("*");
    for (var i = 0; i < els.length; i++) {
      if (!isNumericText(els[i].textContent)) continue;
      var d = depthIn(root, els[i]);
      if (d > bestD) { best = els[i]; bestD = d; }
    }
    if (best) return best;
    return isNumericText(root.textContent) ? root : null;
  }

  function setUnitLabel(unit, label) {
    var best = null, bestD = -1;
    var tw = document.createTreeWalker(unit, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = tw.nextNode())) {
      if (isNumericText(n.textContent)) {
        var d = 0, p = n.parentElement;
        while (p && p !== unit) { d++; p = p.parentElement; }
        if (d > bestD) { best = n; bestD = d; }
      }
    }
    if (best) best.textContent = String(label);
    else unit.textContent = String(label);
  }

  function findActiveMech(root, numUnits) {
    var pool = [];
    var all = root.querySelectorAll("*");
    var i, z;
    for (i = 0; i < all.length; i++) {
      var e = all[i];
      var inUnit = false;
      for (z = 0; z < numUnits.length; z++) {
        if (numUnits[z] === e || (numUnits[z].contains && numUnits[z].contains(e))) { inUnit = true; break; }
      }
      if (e.classList) {
        for (var c = 0; c < e.classList.length; c++) {
          var cn = e.classList[c];
          if (cn === "pagination" || cn === "arc-active") continue;
          if (/(^|[-_: ])(is-)?(active|current|selected)([-_: ]|$)/i.test(cn)) pool.push({ type: "class", name: cn, el: e, inUnit: inUnit });
        }
      }
      if (e.getAttribute && e.getAttribute("aria-current")) pool.push({ type: "aria", name: "aria-current", el: e, inUnit: inUnit });
    }
    var use = [];
    for (i = 0; i < pool.length; i++) if (pool[i].inUnit) use.push(pool[i]);
    if (!use.length) for (i = 0; i < pool.length; i++) if (pool[i].type !== "aria") use.push(pool[i]);
    if (!use.length) use = pool;
    if (!use.length) return { type: "arc", name: "arc-active", el: null };
    var best = use[0];
    for (var k = 1; k < use.length; k++) if (depthIn(root, use[k].el) > depthIn(root, best.el)) best = use[k];
    return best;
  }

  function analyzePagination(root) {
    if (!root) return null;
    var leaves = [];
    var els = root.querySelectorAll("*");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!isNumericText(el.textContent)) continue;
      var hasInner = false;
      var sub = el.querySelectorAll("*");
      for (var j = 0; j < sub.length; j++) {
        if (isNumericText(sub[j].textContent)) { hasInner = true; break; }
      }
      if (!hasInner) leaves.push(el);
    }
    /* prefer interactive leaves (real buttons) over text counters like "Page 1 of 3" */
    var inter = [];
    for (var v = 0; v < leaves.length; v++) if (/^(A|BUTTON)$/.test(leaves[v].tagName)) inter.push(leaves[v]);
    if (inter.length) leaves = inter;
    if (!leaves.length) return null;

    var listContainer = leaves[0].parentNode;
    while (listContainer && listContainer !== root && listContainer !== document.body) {
      var ok = true;
      for (var k = 0; k < leaves.length; k++) if (!listContainer.contains(leaves[k])) { ok = false; break; }
      if (ok) break;
      listContainer = listContainer.parentNode;
    }
    if (!listContainer) listContainer = root;

    /* degenerate case: with a SINGLE number leaf the common ancestor is
       its own wrapper (e.g. the <li> itself), which turns the whole <ul>
       into the prev/next "unit". Climb up while the container has exactly
       one element child and its parent still holds every leaf. */
    function containsAllLeaves(el) {
      for (var q3 = 0; q3 < leaves.length; q3++) if (!el.contains(leaves[q3])) return false;
      return true;
    }
    while (listContainer.parentNode && listContainer.parentNode !== root.parentNode &&
           listContainer.children && listContainer.children.length === 1 &&
           containsAllLeaves(listContainer.parentNode)) {
      listContainer = listContainer.parentNode;
    }

    function unitOf(x) {
      var u = x;
      while (u && u.parentNode && u.parentNode !== listContainer && u.parentNode !== root) u = u.parentNode;
      return u || x;
    }

    var raw = [];
    for (var m = 0; m < leaves.length; m++) if (raw.indexOf(unitOf(leaves[m])) === -1) raw.push(unitOf(leaves[m]));
    /* drop units that hold more than one number (e.g. "Page 1 of 3" counters) */
    var numUnits = [];
    for (var g = 0; g < raw.length; g++) {
      var cnt = 0;
      for (var L = 0; L < leaves.length; L++) if (raw[g] === leaves[L] || raw[g].contains(leaves[L])) cnt++;
      if (cnt <= 1) numUnits.push(raw[g]);
    }
    if (!numUnits.length) return null;

    function dirUnits(re, exclude) {
      var found = [], out = [];
      var e2 = root.querySelectorAll("a,button,span,li,div,p");
      for (var i2 = 0; i2 < e2.length; i2++) {
        var t = normText(e2[i2].textContent);
        if (!t || t.length > 24 || isNumericText(t) || !re.test(t)) continue;
        var hasNum = false;
        var s2 = e2[i2].querySelectorAll("*");
        for (var j2 = 0; j2 < s2.length; j2++) if (isNumericText(s2[j2].textContent)) { hasNum = true; break; }
        if (!hasNum) found.push(e2[i2]);
      }
      for (var f = 0; f < found.length; f++) {
        var u2 = unitOf(found[f]);
        if (out.indexOf(u2) === -1 && numUnits.indexOf(u2) === -1 && exclude.indexOf(u2) === -1) out.push(u2);
      }
      return out;
    }
    var prevUnits = dirUnits(/prev|‹|«/i, []);
    var nextUnits = dirUnits(/next|›|»/i, prevUnits);

    return {
      numUnits: numUnits,
      prevUnits: prevUnits,
      nextUnits: nextUnits,
      activeMech: findActiveMech(root, numUnits)
    };
  }

  function cleanUnit(unit, mech) {
    if (!unit) return;
    unit.removeAttribute("id");
    unit.style.display = "";
    unit.style.opacity = "";
    unit.style.pointerEvents = "";
    if (unit.classList) {
      unit.classList.remove("arc-active");
      if (mech && mech.type === "class") unit.classList.remove(mech.name);
    }
    var all = unit.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      all[i].removeAttribute("id");
      if (all[i].classList) {
        all[i].classList.remove("arc-active");
        if (mech && mech.type === "class") all[i].classList.remove(mech.name);
      }
      if (all[i].getAttribute && all[i].getAttribute("aria-current")) all[i].removeAttribute("aria-current");
    }
  }

  function applyActive(pag, unit, mech) {
    if (!pag) return;
    var name = mech && mech.type === "class" ? mech.name : "arc-active";
    var all = pag.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) all[i].classList.remove(name);
    if (mech && mech.type === "aria") {
      for (var j = 0; j < all.length; j++) {
        if (all[j].getAttribute && all[j].getAttribute("aria-current")) all[j].removeAttribute("aria-current");
      }
    }
    if (!unit) return;
    var target = null;
    if (mech && mech.el && mech.el.tagName) {
      var tag = mech.el.tagName;
      if (unit.tagName === tag) target = unit;
      else { var q = unit.querySelectorAll(tag); target = q.length ? q[0] : null; }
    }
    if (!target) target = deepestNumericEl(unit) || unit;
    if (mech && mech.type === "aria") target.setAttribute("aria-current", "page");
    else target.classList.add(name);
  }

  function detectDisabledIn(unit) {
    if (!unit) return null;
    var els = [unit];
    try { els = els.concat(Array.prototype.slice.call(unit.querySelectorAll("*"))); } catch (e) {}
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (!e.getAttribute) continue;
      if (e.hasAttribute("disabled")) return { type: "attr", tag: e.tagName };
      var cls = e.getAttribute("class") || "";
      var mm = cls.match(/(?:^|\s)(disabled|is-disabled|inactive|deactivated)(?:\s|$)/i);
      if (mm) return { type: "class", name: mm[1], tag: e.tagName };
      if (e.getAttribute("aria-disabled") === "true") return { type: "aria", tag: e.tagName };
      if (e.style && (e.style.display === "none" || e.style.visibility === "hidden")) return { type: "hide", tag: e.tagName };
    }
    try {
      if (unit.ownerDocument && unit.ownerDocument.contains(unit)) {
        var probe = [unit];
        var inner = unit.querySelector("a,button");
        if (inner) probe.push(inner);
        for (var p2 = 0; p2 < probe.length; p2++) {
          var cs = window.getComputedStyle(probe[p2]);
          if (cs.pointerEvents === "none" || parseFloat(cs.opacity || "1") < 0.65) return { type: "inline", tag: probe[p2].tagName };
        }
      }
    } catch (e2) {}
    return null;
  }

  function applyDisabled(unit, mech, on) {
    if (!unit) return;
    var el = null;
    if (mech && mech.tag) {
      if (unit.tagName === mech.tag) el = unit;
      else { var q = unit.querySelectorAll(mech.tag); el = q.length ? q[0] : null; }
    }
    if (!el) el = (unit.querySelector && unit.querySelector("a,button")) || unit;
    if (!mech) { el.style.opacity = on ? ".45" : ""; el.style.pointerEvents = on ? "none" : ""; return; }
    if (mech.type === "attr") { if (on) el.setAttribute("disabled", ""); else el.removeAttribute("disabled"); }
    else if (mech.type === "class") { if (on) el.classList.add(mech.name); else el.classList.remove(mech.name); }
    else if (mech.type === "aria") { el.setAttribute("aria-disabled", on ? "true" : "false"); }
    else if (mech.type === "hide") { el.style.display = on ? "none" : ""; }
    else { el.style.opacity = on ? ".45" : ""; el.style.pointerEvents = on ? "none" : ""; }
  }

  function updatePageHint(pag, cur, total) {
    try {
      var tw = document.createTreeWalker(pag, NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = tw.nextNode())) {
        if (/page\s+\d+(\s+of\s+\d+)?/i.test(n.textContent || "")) {
          n.textContent = n.textContent.replace(/page\s+\d+(\s+of\s+\d+)?/i, "Page " + cur + " of " + total);
        }
      }
    } catch (e) {}
  }

  /* fallback bar (only when the site itself shows no pagination at all):
     same visual language as the site — ‹ Previous · pills · Next › */
  function arcBarEngine(pag, pages, goTo) {
    ensureStyles();
    function paint(cur) {
      pag.innerHTML = "";
      var pv = document.createElement("a");
      pv.className = "arc-page-btn" + (cur <= 1 ? " arc-disabled" : "");
      pv.textContent = "‹ Previous";
      pv.setAttribute("data-arc-page", "prev");
      if (cur > 1) {
        pv.setAttribute("href", "#page-" + (cur - 1));
        pv.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); goTo(cur - 1); });
      }
      pag.appendChild(pv);
      function num(n) {
        var a = document.createElement("a");
        a.className = "arc-page-btn" + (n === cur ? " arc-active" : "");
        a.textContent = String(n);
        a.setAttribute("data-arc-page", String(n));
        a.setAttribute("href", "#page-" + n);
        a.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); goTo(n); });
        pag.appendChild(a);
      }
      function dots() {
        var s = document.createElement("span");
        s.className = "arc-page-btn arc-dots";
        s.textContent = "…";
        pag.appendChild(s);
      }
      if (pages <= 10) { for (var p = 1; p <= pages; p++) num(p); }
      else {
        num(1);
        if (cur > 4) dots();
        for (var m = Math.max(2, cur - 2); m <= Math.min(pages - 1, cur + 2); m++) num(m);
        if (cur < pages - 3) dots();
        num(pages);
      }
      var nx = document.createElement("a");
      nx.className = "arc-page-btn" + (cur >= pages ? " arc-disabled" : "");
      nx.textContent = "Next ›";
      nx.setAttribute("data-arc-page", "next");
      if (cur < pages) {
        nx.setAttribute("href", "#page-" + (cur + 1));
        nx.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); goTo(cur + 1); });
      }
      pag.appendChild(nx);
    }
    return { paint: paint };
  }

  /* =====================================================================
     THE WALK — snapshot every static page using the site's own
     navigation (synthetic hashchange → real hash → button click).
     No guessing about script.js internals: we simply watch whether the
     grid re-renders after each navigation attempt.
     ===================================================================== */
  function syntheticNav(p) {
    try { history.replaceState(history.state, "", location.pathname + location.search + "#page-" + p); } catch (e) {}
    try { window.dispatchEvent(new HashChangeEvent("hashchange")); }
    catch (e) { try { window.dispatchEvent(new Event("hashchange")); } catch (e2) {} }
  }
  function realNav(p) { location.hash = "page-" + p; }
  function clickNav(p) {
    var pag = getPag();
    if (!pag) return;
    var els = pag.querySelectorAll("a,button,span,li,div");
    for (var i = 0; i < els.length; i++) {
      if ((els[i].textContent || "").trim() === String(p)) { els[i].click(); return; }
    }
  }
  function waitForChange(before, timeoutMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function poll() {
        var c = getContainer();
        if (c && c.innerHTML !== before && c.children.length) return resolve(true);
        if (Date.now() - t0 > timeoutMs) return resolve(false);
        setTimeout(poll, 40);
      })();
    });
  }

  async function walkPages(target, initialPage) {
    var container = getContainer();
    if (!container) return null;

    var methods = [syntheticNav, realNav, clickNav];
    var methodNames = ["synthetic-hashchange", "real-hash", "button-click"];
    var methodIdx = -1; /* undecided — probe on first page, then lock */

    var snapshots = [];
    for (var z = 0; z <= target; z++) snapshots.push(null);

    /* snapshot the initially-rendered page first (no navigation needed) */
    var startPage = Math.min(Math.max(initialPage || 1, 1), target);
    snapshots[startPage] = container.innerHTML;
    if (startPage === 1) captureBarProto();
    dbg("walk: page " + startPage + " snapshotted (initial render, " + container.children.length + " cards)");

    var savedScrollY = window.pageYOffset || 0;
    container.classList.add("arc-walking");
    try {
      for (var p = 1; p <= target; p++) {
        if (p === 1) captureBarProto(); /* page-1 state of the bar = our prototype */
        if (snapshots[p]) continue;
        var ok = false;
        /* locked method first; if it fails for THIS page (e.g. the button is
           hidden behind an ellipsis), retry with all the other methods */
        var order = (methodIdx >= 0) ? [methodIdx, 0, 1, 2] : [0, 1, 2];
        for (var oi = 0; oi < order.length && !ok; oi++) {
          var mi = order[oi];
          var c = getContainer();
          if (!c) return null;
          var before = c.innerHTML;
          try { methods[mi](p); } catch (e) { dbg("walk: " + methodNames[mi] + " threw: " + (e && e.message)); continue; }
          ok = await waitForChange(before, methodIdx >= 0 ? 600 : 500);
          if (ok && methodIdx < 0) { methodIdx = mi; dbg("walk: navigation method locked = " + methodNames[mi]); }
          if (!ok) dbg("walk: " + methodNames[mi] + " did not re-render page " + p);
        }
        if (!ok) { dbg("walk: page " + p + " unreachable — takeover aborted (static content stays safe)"); return null; }
        var cc = getContainer();
        if (!cc) return null;
        snapshots[p] = cc.innerHTML;
        dbg("walk: page " + p + " snapshotted (" + cc.children.length + " cards)");
      }
    } finally {
      container.classList.remove("arc-walking");
      try { window.scrollTo(0, savedScrollY); } catch (e) {}
    }

    /* validation — every page present, non-empty and unique */
    var seen = {};
    for (var q = 1; q <= target; q++) {
      var s = snapshots[q];
      if (!s || !String(s).trim()) { dbg("walk: page " + q + " snapshot missing/empty — takeover aborted"); return null; }
      if (seen[s]) { dbg("walk: pages " + seen[s] + " & " + q + " rendered identical content — takeover aborted"); return null; }
      seen[s] = q;
    }
    dbg("walk: OK — " + target + " page(s) snapshotted");
    return snapshots;
  }

  /* =====================================================================
     Submission cards — cloned from a real rendered card (pixel-perfect)
     ===================================================================== */
  function buildFromClone(template, d, placeholder) {
    var node = template.cloneNode(true);
    node.removeAttribute("id");
    node.setAttribute("data-arc-sub", d.id || "");

    /* cover image */
    var img = node.querySelector("img");
    if (img) {
      img.removeAttribute("srcset");
      img.removeAttribute("data-src");
      img.src = d.imageUrl || placeholder;
      img.alt = d.title || "Submission";
    } else {
      /* no <img>? make sure no stale background-image survives */
      var bgEls = node.querySelectorAll('[style*="background-image"]');
      for (var g = 0; g < bgEls.length; g++) bgEls[g].style.backgroundImage = "";
    }

    /* title */
    var h = node.querySelector("h1,h2,h3,h4,h5,h6");
    if (h) h.textContent = d.title || "(Untitled)";

    /* stale meta text (ISSN, year...) → author · institution · date */
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var par = n.parentElement;
        if (!par || !n.textContent.trim()) return NodeFilter.FILTER_REJECT;
        if (par.closest("a") || par.closest("h1,h2,h3,h4,h5,h6")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (var i = 0; i < texts.length; i++) texts[i].textContent = (i === 0) ? metaLine(d) : "";

    /* every link → submission view */
    var url = "submission-view.html?sub=" + encodeURIComponent(d.id);
    if (node.matches && node.matches("a")) node.setAttribute("href", url);
    var links = node.querySelectorAll("a[href]");
    if (links.length) {
      for (var k = 0; k < links.length; k++) links[k].setAttribute("href", url);
    } else if (!(node.matches && node.matches("a"))) {
      node.style.cursor = "pointer";
      (function (n, u) { n.addEventListener("click", function () { location.href = u; }); })(node, url);
    }
    return node;
  }

  /* =====================================================================
     TAKEOVER — merged grid + merged pagination (6 per page)
     ===================================================================== */
  function takeover(snapshots, subs, slug, initialPage) {
    var container = getContainer();
    var pag = getPag();
    var countEl = document.getElementById("resultCount");
    if (!container) return false;

    /* flatten all static cards, in original page order, links untouched.
       v8: keep ONLY element nodes — the site's script.js leaves invisible
       whitespace text nodes between its cards (innerHTML templates with
       newlines/indentation). childNodes picked those up and they consumed
       slots in the 6-per-page slicing, so pages showed fewer than 6 visible
       cards (journals-arts: 5 / 3 / 2 / 3). Elements only = strict 6/page. */
    var staticNodes = [];
    var holder = document.createElement("div");
    var droppedTextNodes = 0;
    for (var i = 1; i < snapshots.length; i++) {
      if (!snapshots[i]) continue;
      holder.innerHTML = snapshots[i];
      var kids = holder.childNodes;
      for (var n = 0; n < kids.length; n++) {
        if (kids[n].nodeType === 1) staticNodes.push(kids[n]); /* element only */
        else if (kids[n].nodeType === 3 && !/\S/.test(kids[n].textContent || "")) droppedTextNodes++;
      }
    }
    dbg("takeover: " + staticNodes.length + " static card(s) collected from " + (snapshots.length - 1) +
      " page(s)" + (droppedTextNodes ? " · " + droppedTextNodes + " invisible whitespace node(s) dropped (v8)" : " (v8)"));

    /* submission cards */
    var placeholder = makePlaceholder(String(CAT_NAMES[slug] || "A").charAt(0));
    var template = null;
    for (var tn = 0; tn < staticNodes.length; tn++) {
      if (staticNodes[tn].nodeType === 1) { template = staticNodes[tn]; break; } /* first ELEMENT node */
    }
    var subCards = subs.map(function (d) {
      return template ? buildFromClone(template, d, placeholder) : cardNode(d);
    });
    dbg("takeover: " + subCards.length + " submission card(s) built" + (template ? " (cloned from a real card)" : " (built design — empty category)"));

    /* merged order: submissions first (newest already first), then static */
    var allCards = (SUBS_POSITION === "front")
      ? subCards.concat(staticNodes)
      : staticNodes.concat(subCards);
    var pages = Math.max(1, Math.ceil(allCards.length / SUBS_PER_PAGE));

    /* hide the site's "no results" message if it is showing */
    var nrm = document.getElementById("noResultsMsg");
    if (nrm) nrm.style.display = "none";

    /* =================================================================
       v7 — PRESERVE the site's own pagination bar (‹ Previous · pills ·
       Next ›). We never rebuild it from scratch: we restore the exact
       HTML the site rendered, re-wire the clicks to OUR merged pages,
       clone REAL page buttons when extra pages are needed, mirror the
       site's own active/disabled styling and keep ‹ Previous / Next ›
       fully working. This is why the bar now looks identical to the
       pages that have no submissions.
       ================================================================= */
    var protoHTML = barProtoHTML || (pag ? pag.innerHTML : "") || "";
    var protoRoot = document.createElement("div");
    protoRoot.innerHTML = protoHTML;
    var protoAnalysis = analyzePagination(protoRoot);
    var activeMech = (protoAnalysis && protoAnalysis.activeMech)
      ? protoAnalysis.activeMech
      : { type: "arc", name: "arc-active", el: null };
    var prevMech = (protoAnalysis && protoAnalysis.prevUnits.length)
      ? detectDisabledIn(protoAnalysis.prevUnits[0]) : null;
    var nextMech = null;
    var liveA = analyzePagination(pag);
    if (liveA && liveA.nextUnits.length) nextMech = detectDisabledIn(liveA.nextUnits[0]);
    if (!nextMech && protoAnalysis && protoAnalysis.nextUnits.length) nextMech = detectDisabledIn(protoAnalysis.nextUnits[0]);
    dbg("bar: " + (protoAnalysis
      ? protoAnalysis.numUnits.length + " page button(s) · prev:" + protoAnalysis.prevUnits.length + " · next:" + protoAnalysis.nextUnits.length + " · active=" + activeMech.type + (activeMech.name ? "/" + activeMech.name : "")
      : "no site bar found — arc design will be used"));

    if (!pag) {
      pag = document.createElement("div");
      pag.className = "pagination";
      pag.id = "pagination";
      container.parentNode.insertBefore(pag, container.nextSibling);
    }

    var current = Math.min(Math.max(initialPage || 1, 1), pages);
    var pagSuppress = false;

    function wireNum(unit, n) {
      unit.setAttribute("data-arc-page", String(n));
      unit.style.cursor = "pointer";
      var aEl = unit.matches("a") ? unit : unit.querySelector("a");
      if (aEl) aEl.setAttribute("href", "#page-" + n);
      unit.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        goTo(n, true);
      });
    }

    function wireDots(unit) {
      unit.style.cursor = "default";
      unit.style.opacity = ".45";
      unit.style.pointerEvents = "none";
      var aEl = unit.matches("a") ? unit : unit.querySelector("a");
      if (aEl) aEl.removeAttribute("href");
    }

    function wireDir(unit, dir, cur) {
      var t = dir < 0 ? cur - 1 : cur + 1;
      var on = t >= 1 && t <= pages;
      unit.setAttribute("data-arc-page", dir < 0 ? "prev" : "next");
      var aEl = unit.matches("a") ? unit : unit.querySelector("a");
      if (aEl) { if (on) aEl.setAttribute("href", "#page-" + t); else aEl.removeAttribute("href"); }
      applyDisabled(unit, dir < 0 ? prevMech : nextMech, !on);
      unit.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (on) goTo(t, true);
      });
    }

    function buildSiteBar(cur) {
      pag.innerHTML = protoHTML;                       /* the site's exact design */
      var a = analyzePagination(pag);
      if (!a || !a.numUnits.length) { arcEngine.paint(cur); return; }
      var labels = [];
      for (var li = 0; li < a.numUnits.length; li++) {
        labels.push(parseInt(normText((deepestNumericEl(a.numUnits[li]) || a.numUnits[li]).textContent), 10) || 0);
      }
      var lastUnit = a.numUnits[a.numUnits.length - 1];
      var maxLabel = Math.max.apply(null, labels);
      var allUnits = a.numUnits.slice();

      if (pages <= 10) {
        for (var h = 0; h < a.numUnits.length; h++) {
          if (!labels[h]) continue;
          if (labels[h] > pages) a.numUnits[h].style.display = "none"; /* merged list needs fewer pages */
          else wireNum(a.numUnits[h], labels[h]);
        }
        if (pages > maxLabel) {
          /* extra merged pages: clone the site's OWN last button */
          var parent = lastUnit.parentNode, ref = lastUnit.nextSibling;
          for (var p = maxLabel + 1; p <= pages; p++) {
            var c = lastUnit.cloneNode(true);
            cleanUnit(c, activeMech);
            setUnitLabel(c, p);
            parent.insertBefore(c, ref);
            wireNum(c, p);
            allUnits.push(c);
          }
        }
      } else {
        /* many pages: windowed set [1 … cur-2..cur+2 … last], still from
           the site's own button design */
        var parent2 = lastUnit.parentNode, ref2 = lastUnit.nextSibling;
        for (var r = 0; r < a.numUnits.length; r++) a.numUnits[r].remove();
        var seq = [1];
        if (cur > 4) seq.push(0);
        for (var m = Math.max(2, cur - 2); m <= Math.min(pages - 1, cur + 2); m++) seq.push(m);
        if (cur < pages - 3) seq.push(0);
        seq.push(pages);
        for (var s = 0; s < seq.length; s++) {
          var c2 = lastUnit.cloneNode(true);
          cleanUnit(c2, activeMech);
          setUnitLabel(c2, seq[s] || "…");
          parent2.insertBefore(c2, ref2);
          if (seq[s]) { wireNum(c2, seq[s]); allUnits.push(c2); }
          else wireDots(c2);
        }
      }

      for (var pv = 0; pv < a.prevUnits.length; pv++) wireDir(a.prevUnits[pv], -1, cur);
      for (var nx = 0; nx < a.nextUnits.length; nx++) wireDir(a.nextUnits[nx], 1, cur);

      var curUnit = null;
      for (var q = 0; q < allUnits.length; q++) {
        if (parseInt(allUnits[q].getAttribute("data-arc-page"), 10) === cur) { curUnit = allUnits[q]; break; }
      }
      applyActive(pag, curUnit, activeMech);
      updatePageHint(pag, cur, pages);
    }

    var arcEngine = arcBarEngine(pag, pages, function (p) { goTo(p, true); });

    function paintBar(cur) {
      if (protoAnalysis && protoAnalysis.numUnits.length) buildSiteBar(cur);
      else arcEngine.paint(cur);
    }
    function safePaint(cur) {
      pagSuppress = true;
      try { paintBar(cur); } finally { setTimeout(function () { pagSuppress = false; }, 60); }
    }

    function goTo(p, userAction) {
      p = Math.min(Math.max(1, p), pages);
      current = p;
      container.innerHTML = "";
      for (var i = (p - 1) * SUBS_PER_PAGE; i < p * SUBS_PER_PAGE && i < allCards.length; i++) {
        container.appendChild(allCards[i]);
      }
      safePaint(p);
      try { history.replaceState(history.state, "", location.pathname + location.search + "#page-" + p); } catch (e) {}
      if (userAction) {
        try { window.scrollTo({ top: container.getBoundingClientRect().top + window.pageYOffset - 130, behavior: "smooth" }); } catch (e) {}
      }
    }

    /* keep the count informative: "N articles · M submitted" */
    function bumpCount() {
      if (!countEl) return;
      var txt = countEl.textContent || "";
      if (txt.indexOf("submitted") === -1) countEl.textContent = txt + " · " + subs.length + " submitted";
    }
    bumpCount();
    if (countEl) {
      new MutationObserver(bumpCount).observe(countEl, { childList: true, characterData: true, subtree: true });
    }

    /* if the site's script rebuilds the bar (e.g. on hash change before
       our handler runs), restore ours right after */
    new MutationObserver(function () {
      if (pagSuppress) return;
      if (!pag.querySelector("[data-arc-page]")) safePaint(current);
    }).observe(pag, { childList: true, subtree: true });

    /* browser back/forward or manual #page-N edits: script.js renders
       its (static) view first, then OUR handler — registered later —
       overwrites it with the merged view. Same event tick, no flicker. */
    window.addEventListener("hashchange", function () {
      var p = parseHash();
      if (p >= 1) goTo(p, false); /* ignore unrelated hash changes (anchors etc.) */
    });

    goTo(current, false);
    dbg("takeover: done — " + allCards.length + " cards (" + subs.length + " submissions + " + staticNodes.length + " journals), " + pages + " page(s), showing page " + current +
      " · bar: " + (protoAnalysis && protoAnalysis.numUnits.length ? "site design preserved (prev/next kept)" : "arc design"));
    return true;
  }

  /* =====================================================================
     FALLBACK B — keep the site's static pages untouched, append extra
     pages for submissions after the last static page (v5 layer-B style,
     but WITH a visible notice so nothing can be invisible again)
     ===================================================================== */
  function fallbackB(subs, slug) {
    var container = getContainer();
    var pag = getPag();
    var countEl = document.getElementById("resultCount");
    if (!container) return false;

    /* already rendered? (safety) */
    for (var i = 0; i < subs.length; i++) {
      for (var c = 0; c < container.children.length; c++) {
        if (subs[i].title && (container.children[c].textContent || "").indexOf(subs[i].title) !== -1) {
          dbg("fallback B: submissions already rendered — nothing to do");
          return true;
        }
      }
    }

    var template = container.firstElementChild;
    if (!template) { dbg("fallback B: no card template (empty grid)"); return false; }

    var placeholder = makePlaceholder(String(CAT_NAMES[slug] || "A").charAt(0));
    var A = analyzePagination(pag);
    var staticMax = 0;
    if (A) {
      for (var sm = 0; sm < A.numUnits.length; sm++) {
        var sn = parseInt(normText((deepestNumericEl(A.numUnits[sm]) || A.numUnits[sm]).textContent), 10) || 0;
        if (sn > staticMax) staticMax = sn;
      }
    }
    if (!staticMax) staticMax = maxPageNumber(pag);
    var activeMech = (A && A.activeMech) ? A.activeMech : { type: "arc", name: "arc-active", el: null };
    var myPages = Math.ceil(subs.length / SUBS_PER_PAGE);
    ensureStyles();

    function makeCard(d) { return buildFromClone(template, d, placeholder); }

    function renderMyPage(p) {
      container.innerHTML = "";
      var start = (p - 1) * SUBS_PER_PAGE;
      for (var i = start; i < start + SUBS_PER_PAGE && i < subs.length; i++) container.appendChild(makeCard(subs[i]));
      applyActive(pag, pag.querySelector('[data-arc-page="' + p + '"]'), activeMech);
      try { window.scrollTo({ top: container.getBoundingClientRect().top + window.pageYOffset - 130, behavior: "smooth" }); } catch (e) {}
      dbg("fallback B: rendered submission page " + p);
    }

    function bumpCount() {
      if (!countEl) return;
      var txt = countEl.textContent || "";
      if (txt.indexOf("submitted") === -1) countEl.textContent = txt + " · " + subs.length + " submitted";
    }
    bumpCount();
    if (countEl) new MutationObserver(bumpCount).observe(countEl, { childList: true, characterData: true, subtree: true });

    if (staticMax > 0) {
      /* append extra page buttons after the last static one — cloned
         from the site's OWN button so the design matches exactly */
      var pagSuppress = false;
      function appendMyButtons() {
        if (!pag || pagSuppress) return;
        pagSuppress = true;
        try {
          var old = pag.querySelectorAll("[data-arc-page]");
          for (var i = 0; i < old.length; i++) old[i].remove();
          var AA = analyzePagination(pag);
          if (!AA || !AA.numUnits.length) return;
          var lastU = AA.numUnits[AA.numUnits.length - 1];
          var lastLabel = parseInt(normText((deepestNumericEl(lastU) || lastU).textContent), 10) || 0;
          var parent = lastU.parentNode, ref = lastU.nextSibling;
          for (var p = 1; p <= myPages; p++) {
            var u = lastU.cloneNode(true);
            cleanUnit(u, AA.activeMech);
            setUnitLabel(u, lastLabel + p);
            u.setAttribute("data-arc-page", String(p));
            u.style.cursor = "pointer";
            var aEl = u.matches("a") ? u : u.querySelector("a");
            if (aEl) aEl.setAttribute("href", "#page-" + (lastLabel + p));
            (function (page) {
              u.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                renderMyPage(page);
              });
            })(p);
            parent.insertBefore(u, ref);
          }
          dbg("fallback B: appended " + myPages + " page button(s) after static page " + lastLabel + " (site button design cloned)");
        } finally {
          setTimeout(function () { pagSuppress = false; }, 80);
        }
      }
      appendMyButtons();
      new MutationObserver(function () {
        if (pagSuppress) return;
        if (!pag.querySelector("[data-arc-page]")) appendMyButtons();
      }).observe(pag, { childList: true, subtree: true });

      /* visible notice — the v5 lesson: never let submissions be invisible */
      var firstSubPage = staticMax + 1;
      showNote("<b>" + subs.length + "</b> new submission" + (subs.length > 1 ? "s" : "") +
        " — <a href=\"#\" data-arc-jump=\"1\">view on page " + firstSubPage + "</a>");
      var jump = document.querySelector("[data-arc-jump]");
      if (jump) jump.addEventListener("click", function (e) { e.preventDefault(); renderMyPage(1); });
      return true;
    }

    /* no static pagination at all: safe to render everything ourselves,
       but ONLY if every static card is already visible (no hidden pages) */
    var staticTotal = 0;
    try {
      if (typeof journalData !== "undefined" && journalData[slug]) staticTotal = journalData[slug].length;
    } catch (e) {}
    var visibleCount = container.children.length;
    if (staticTotal > visibleCount) {
      dbg("fallback B: " + staticTotal + " journals exist but only " + visibleCount + " are reachable — refusing to risk data loss");
      return false; /* go to layer C — zero data loss */
    }
    var staticCards = [];
    for (var k = 0; k < container.children.length; k++) staticCards.push(container.children[k].cloneNode(true));
    var all = staticCards.concat(subs.map(makeCard));
    var pages = Math.max(1, Math.ceil(all.length / SUBS_PER_PAGE));
    if (!pag) {
      pag = document.createElement("div");
      pag.className = "pagination";
      pag.id = "pagination";
      container.parentNode.insertBefore(pag, container.nextSibling);
    }
    function renderP(p) {
      container.innerHTML = "";
      var start = (p - 1) * SUBS_PER_PAGE;
      for (var i = start; i < start + SUBS_PER_PAGE && i < all.length; i++) container.appendChild(all[i]);
      engine.paint(p);
    }
    var engine = arcBarEngine(pag, pages, renderP);
    renderP(1);
    dbg("fallback B: built full pagination (" + pages + " pages, " + all.length + " cards)");
    return true;
  }

  /* =====================================================================
     Layer C — bottom section (absolute last resort, zero data loss)
     ===================================================================== */
  function layerC(subs, slug) {
    renderHomeSection(subs, { atBottom: true, heading: "Submitted Articles in " + (CAT_NAMES[slug] || "this Category") });
    dbg("layer C: rendered fallback section at the bottom");
  }

  /* =====================================================================
     Data loading (shared)
     ===================================================================== */
  async function fetchApproved() {
    /* test-harness support: when the page defines window.__FAKE_SUBS__,
       use that deterministic list instead of the real database (never
       set on the live site). */
    if (typeof window.__FAKE_SUBS__ !== "undefined") {
      var fdocs = (window.__FAKE_SUBS__ || []).slice();
      fdocs.sort(function (a, b) { return tsNum(b.submittedAt) - tsNum(a.submittedAt); });
      dbg("query FAKE (test harness): " + fdocs.length + " doc(s)");
      return fdocs.filter(isApproved);
    }
    var appMod, fsMod;
    try {
      appMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
      fsMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    } catch (err) {
      dbgErr("firebase SDK failed: " + (err && err.message ? err.message : err));
      showErrorBanner("Could not load the Firebase SDK (network problem).");
      return null;
    }
    var firebaseConfig = {
      apiKey: "AIzaSyD89i0iqHXWY6mG1P1ErFkf8Otbunsx6LU",
      authDomain: "my-journal-a0eaa.firebaseapp.com",
      projectId: "my-journal-a0eaa",
      storageBucket: "my-journal-a0eaa.firebasestorage.app",
      messagingSenderId: "577249786861",
      appId: "1:577249786861:web:489745d30cd82b6ca6c5e4"
    };
    var app = appMod.initializeApp(firebaseConfig);
    var db = fsMod.getFirestore(app);

    var docs = [];
    try {
      var q = fsMod.query(fsMod.collection(db, "submissions"), fsMod.orderBy("submittedAt", "desc"), fsMod.limit(200));
      var snap = await fsMod.getDocs(q);
      snap.forEach(function (s) { var d = s.data(); d.id = s.id; docs.push(d); });
      dbg("query A (orderBy+limit): " + docs.length + " doc(s)");
    } catch (e1) {
      dbgErr("query A failed: " + (e1 && e1.message ? e1.message : e1));
      try {
        var snap2 = await fsMod.getDocs(fsMod.collection(db, "submissions"));
        snap2.forEach(function (s) { var d = s.data(); d.id = s.id; docs.push(d); });
        dbg("query B (plain read): " + docs.length + " doc(s)");
      } catch (e2) {
        dbgErr("query B failed: " + (e2 && e2.message ? e2.message : e2));
        showErrorBanner(String((e2 && e2.message) || e2));
        return null;
      }
    }

    docs.sort(function (a, b) { return tsNum(b.submittedAt) - tsNum(a.submittedAt); });
    docs.forEach(function (d) {
      dbg("doc " + String(d.id).slice(0, 6) + "... category='" + (d.category || "") + "' approved=" + (d.approved === undefined ? "(unset)" : JSON.stringify(d.approved)));
    });
    return docs.filter(isApproved);
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  function boot() {
    (async function () {
      var page = (location.pathname.split("/").pop() || "").toLowerCase();
      var catMatch = page.match(/^journals-([a-z]+)\.html$/);
      var slug = catMatch ? catMatch[1] : null;
      var isCategoryPage = !!slug && Object.prototype.hasOwnProperty.call(CAT_NAMES, slug);
      var isJournalsHome = page === "journals.html";

      dbg("page: " + page);
      if (!isCategoryPage && !isJournalsHome) { dbg("not a submissions page"); return; }

      /* remove the old duplicate "New Submissions" block if still present */
      var old = document.getElementById("newSubmissionsList");
      if (old) {
        var head = old.previousElementSibling;
        if (head && head.classList && head.classList.contains("section-header")) head.remove();
        old.remove();
        dbg("removed old 'New Submissions' block");
      }

      var approved = await fetchApproved();
      if (approved === null) return; /* error already shown */

      if (isJournalsHome) {
        renderHomeSection(approved, { atBottom: false, heading: "Submitted Journals" });
        return;
      }

      /* ---------------- category page ---------------- */
      var container = getContainer();
      if (!container) { dbgErr("#articlesContainer not found on this page"); return; }

      var target = CAT_NAMES[slug];
      var subs = approved.filter(function (d) { return catMatches(d.category, target); });
      dbg("category '" + target + "': " + subs.length + " approved submission(s) (of " + approved.length + " total)");

      if (!subs.length) {
        showNote("No approved submissions in this category yet" +
          (approved.length ? " — " + approved.length + " approved in other categories." : "."));
        dbg("nothing for this category — note shown");
        return;
      }

      var pag = getPag();
      var barMax = maxPageNumber(pag);
      var staticTotal = 0;
      try {
        if (typeof journalData !== "undefined" && journalData[slug]) staticTotal = journalData[slug].length;
      } catch (e) {}
      var targetPages = Math.max(barMax, Math.ceil(staticTotal / SUBS_PER_PAGE), 1);
      dbg("bar max page: " + barMax + " · journalData['" + slug + "']: " + staticTotal + " journal(s) · walk target: " + targetPages + " page(s)");

      /* wait for the site's initial render (skip when there is nothing to wait for) */
      if (staticTotal > 0 || barMax > 0) {
        var rendered = await waitInitialRender(6000);
        dbg("initial render: " + (rendered ? "ready" : "timeout — continuing anyway"));
      }

      var initialPage = parseHash() || 1;

      function finishWithFallback() {
        if (fallbackB(subs, slug)) { dbg("done — fallback B (extra pages appended, notice shown)"); return; }
        layerC(subs, slug);
        dbg("done — fallback C (bottom section)");
      }

      if (targetPages > MAX_WALK_PAGES) {
        dbg("too many pages (" + targetPages + " > " + MAX_WALK_PAGES + ") — using fallback");
        return finishWithFallback();
      }

      var snapshots = null;
      if (targetPages <= 1) {
        snapshots = [null, (getContainer() || container).innerHTML];
        captureBarProto();
        dbg("single page — no walk needed");
      } else {
        snapshots = await walkPages(targetPages, initialPage);
      }

      if (snapshots && takeover(snapshots, subs, slug, initialPage)) {
        dbg("done — takeover (merged grid + pagination)");
        return;
      }
      finishWithFallback();
    })().catch(function (err) {
      dbgErr("unexpected error: " + (err && err.message ? err.message : err));
      showErrorBanner(String((err && err.message) || err));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
