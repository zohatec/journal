/* =====================================================================
   ARC Journals — site-submissions.js  (v5 — merge into pagination)
   ---------------------------------------------------------------------
   ===================================================================== */

(function () {
  "use strict";

  if (window.__ARC_SUBMISSIONS_LOADED) return; /* double-load guard */
  window.__ARC_SUBMISSIONS_LOADED = true;

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

  var SUBS_PER_PAGE = 6;          /* must match the site's 6-per-page rule */
  var MAX_ON_JOURNALS_HOME = 12;  /* cards shown on journals.html */
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
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* SVG placeholder cover (navy gradient + category initial) */
  function makePlaceholder(letter) {
    letter = (letter || "A").substring(0, 1).toUpperCase();
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='140'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%231f3d7a'/%3E%3Cstop offset='1' stop-color='%233d5fa8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='140' rx='6' fill='url(%23g)'/%3E%3Ctext x='50' y='84' font-family='Georgia,serif' font-size='46' fill='rgba(255,255,255,0.92)' text-anchor='middle'%3E" + encodeURIComponent(letter) + "%3C/text%3E%3C/svg%3E";
  }

  /* ---------------- debug box ---------------- */
  var dbgLines = ["site-submissions.js v5 loaded"];
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

  /* ---------------- shared card-grid styles (journals.html + Layer C) ---------------- */
  function ensureStyles() {
    if (document.getElementById("arcSubStyles")) return;
    var style = document.createElement("style");
    style.id = "arcSubStyles";
    style.textContent = [
      ".us-section{margin-top:2.6rem;}",
      ".us-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1.3rem;margin-top:1.1rem;}",
      ".us-card{background:#fff;border:1px solid #e6e8ee;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 3px 14px rgba(20,30,60,.07);animation:usIn .5s ease both;}",
      ".us-card:nth-child(2){animation-delay:.07s}.us-card:nth-child(3){animation-delay:.14s}.us-card:nth-child(4){animation-delay:.21s}.us-card:nth-child(5){animation-delay:.28s}.us-card:nth-child(6){animation-delay:.35s}",
      "@keyframes usIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}",
      ".us-thumb{display:block;height:150px;background:linear-gradient(135deg,#1f3d7a,#3d5fa8);}",
      ".us-thumb img{width:100%;height:100%;object-fit:cover;display:block;}",
      ".us-thumb-empty{height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.85);font-size:2rem;}",
      ".us-body{padding:.95rem 1.05rem 1.1rem;display:flex;flex-direction:column;gap:.42rem;flex:1;}",
      ".us-cat{align-self:flex-start;font-size:.68rem;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#1f3d7a;background:#eef2fa;border:1px solid #d9e1f2;padding:2px 9px;border-radius:20px;}",
      ".us-title{margin:0;font-size:1.02rem;line-height:1.35;font-family:'Lora',serif;}",
      ".us-title a{color:#1c2b4a;text-decoration:none;}",
      ".us-title a:hover{color:#1f3d7a;text-decoration:underline;}",
      ".us-meta{font-size:.78rem;color:#7c8598;line-height:1.5;}",
      ".us-abs{font-size:.86rem;color:#55607a;line-height:1.55;margin:0;}",
      ".us-actions{margin-top:auto;padding-top:.45rem;display:flex;gap:.55rem;}",
      ".us-btn{background:#1f3d7a;color:#fff;text-decoration:none;font-size:.8rem;font-weight:600;padding:.4rem .85rem;border-radius:7px;transition:background .15s;}",
      ".us-btn:hover{background:#16305f;}",
      ".us-pdf{border:1px solid #cdd5e2;color:#1f3d7a;background:#fff;text-decoration:none;font-size:.8rem;font-weight:600;padding:.4rem .85rem;border-radius:7px;transition:background .15s;}",
      ".us-pdf:hover{background:#f0f4fb;}",
      ".us-empty{color:#8a92a1;font-size:.9rem;margin-top:.4rem;}",
      ".us-more{margin-top:.9rem;font-size:.82rem;color:#8a92a1;}",
      /* Layer B fallback page buttons (only used when there is no bar to clone from) */
      ".arc-page-btn{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 10px;margin:0 3px;border:1px solid #d5dbe6;border-radius:50%;background:#fff;color:#3a4763;font:600 .88rem 'Inter',sans-serif;text-decoration:none;cursor:pointer;transition:all .15s;}",
      ".arc-page-btn:hover{border-color:#1f3d7a;color:#1f3d7a;}",
      ".arc-page-btn.arc-active{background:#1f3d7a;border-color:#1f3d7a;color:#fff;}",
      "@media (max-width:640px){.us-grid{grid-template-columns:1fr;}}"
    ].join("");
    document.head.appendChild(style);
  }

  /* =====================================================================
     journals.html — "Submitted Journals" section at the top (v4 behavior)
     ===================================================================== */
  function renderJournalsHomeSection(subs, atBottom) {
    ensureStyles();
    var mainContent = document.querySelector(".main-content");
    if (!mainContent) { dbgErr(".main-content not found"); return; }

    function card(d) {
      var view = "submission-view.html?sub=" + encodeURIComponent(d.id);
      var date = fmtDate(d.submittedAt);
      var thumb = d.imageUrl
        ? '<img src="' + esc(d.imageUrl) + '" alt="' + esc(d.title) + '" loading="lazy">'
        : '<div class="us-thumb-empty"><i class="fas fa-scroll"></i></div>';
      var abs = String(d.abstract || "");
      var catChip = d.category ? '<span class="us-cat">' + esc(d.category) + "</span>" : "";
      return '<div class="us-card">' +
          '<a class="us-thumb" href="' + view + '">' + thumb + "</a>" +
          '<div class="us-body">' + catChip +
            '<h3 class="us-title"><a href="' + view + '">' + esc(d.title || "(Untitled)") + "</a></h3>" +
            '<div class="us-meta">By ' + esc(d.fullName || "Anonymous") +
              (d.institution ? " &middot; " + esc(d.institution) : "") +
              (date ? " &middot; " + date : "") + "</div>" +
            (abs ? '<p class="us-abs">' + esc(abs.slice(0, 170)) + (abs.length > 170 ? "..." : "") + "</p>" : "") +
            '<div class="us-actions">' +
              '<a class="us-btn" href="' + view + '"><i class="fas fa-book-open"></i> Read</a>' +
              (d.fileUrl ? '<a class="us-pdf" href="' + esc(d.fileUrl) + '" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> PDF</a>' : "") +
            "</div>" +
          "</div>" +
        "</div>";
    }

    var section = document.createElement("div");
    section.className = "us-section";
    if (!subs.length) {
      section.innerHTML =
        '<div class="section-header">' +
          '<h2><i class="fas fa-inbox"></i> Submitted Journals</h2>' +
          '<div class="results-count">0 submissions</div>' +
        "</div>" +
        '<p class="us-empty">No approved submissions yet. Approve submissions in the admin panel and they will appear here.</p>';
    } else {
      var shown = subs.slice(0, MAX_ON_JOURNALS_HOME);
      section.innerHTML =
        '<div class="section-header">' +
          '<h2><i class="fas fa-inbox"></i> Submitted Journals</h2>' +
          '<div class="results-count">' + subs.length + (subs.length === 1 ? " submission" : " submissions") + "</div>" +
        "</div>" +
        '<div class="us-grid">' + shown.map(card).join("") + "</div>" +
        (subs.length > shown.length ? '<p class="us-more">Showing the latest ' + shown.length + " of " + subs.length + " submissions.</p>" : "");
    }
    if (atBottom) mainContent.appendChild(section);
    else mainContent.insertBefore(section, mainContent.firstChild);
    dbg((atBottom ? "category page (layer C)" : "journals.html") + ": rendered " + Math.min(subs.length, MAX_ON_JOURNALS_HOME) + " card(s)" + (atBottom ? " (bottom section)" : ""));
  }

  /* =====================================================================
     Category pages — merge submissions into the existing pagination
     ===================================================================== */

  /* wait until script.js has drawn the static cards (or timeout) */
  function waitInitialRender(container) {
    var deadline = Date.now() + 4000;
    return new Promise(function (resolve) {
      (function poll() {
        if (container && container.children.length) return resolve(true);
        if (Date.now() > deadline) return resolve(false);
        setTimeout(poll, 120);
      })();
    });
  }

  /* highest visible page number in the pagination bar */
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

  /* detect the class script.js uses for the active page button
     (only tokens that CONTAIN active/current/selected — never matches "pagination") */
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

  /* build a journalData entry out of a submission (Layer A) */
  function entryFromSubmission(d, fallbackImg) {
    var img = d.imageUrl || fallbackImg;
    var date = fmtDate(d.submittedAt);
    var abs = esc(d.abstract || "");
    var content =
      "<h1>" + esc(d.title || "(Untitled)") + "</h1>" +
      "<p><strong>Author:</strong> " + esc(d.fullName || "Anonymous") +
        (d.institution ? "<br><strong>Institution:</strong> " + esc(d.institution) : "") + "</p>" +
      "<h2>Abstract</h2><p>" + abs + "</p>" +
      (d.fileUrl
        ? '<p style="margin-top:1rem"><a href="' + esc(d.fileUrl) + '" target="_blank" rel="noopener"><strong>View / Download PDF</strong></a></p>'
        : "");
    return {
      title: d.title || "(Untitled)",
      image: img,
      articles: [{ title: d.title || "(Untitled)", image: img, fullContent: content }],
      menuDetails: {
        "Aims & Scope": "<p>" + abs + "</p>",
        "Articles": "<p>This journal contains 1 submitted article.</p>",
        "Archive": "<p>Submitted " + (date || "recently") + ".</p>",
        "Editorial Board": "<p><strong>Author:</strong> " + esc(d.fullName || "Anonymous") + (d.institution ? "<br>" + esc(d.institution) : "") + "</p>",
        "Editorial Policies": "<p>This is a reader-submitted article, reviewed by the ARC Journals editorial team.</p>",
        "Publication Fees": "<p>Not applicable.</p>",
        "Ethics": "<p>The author declares this is original work.</p>"
      },
      __arcSubmissionId: d.id || null
    };
  }

  /* re-point submission cards to submission-view.html (runs on every
     pagination re-render, so it covers cards on every page) */
  function linkMyCards(container, subs) {
    if (!container || !subs || !subs.length) return;
    var cards = container.children;
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      if (el.getAttribute("data-arc-linked")) continue;
      var h = el.querySelector("h1,h2,h3,h4,h5,h6");
      var title = (h ? h.textContent : el.textContent || "").trim();
      for (var j = 0; j < subs.length; j++) {
        if (subs[j].title && title === String(subs[j].title).trim()) {
          var url = "submission-view.html?sub=" + encodeURIComponent(subs[j].id);
          if (el.matches && el.matches("a")) el.setAttribute("href", url);
          var links = el.querySelectorAll("a[href]");
          if (links.length) {
            for (var k = 0; k < links.length; k++) links[k].setAttribute("href", url);
          } else if (!(el.matches && el.matches("a"))) {
            el.style.cursor = "pointer";
            (function (u) { el.addEventListener("click", function () { location.href = u; }); })(url);
          }
          el.setAttribute("data-arc-linked", "1");
          break;
        }
      }
    }
  }

  /* ---------- Layer A: inject into journalData, re-run script.js ---------- */
  function attemptA(slug, subs, container, pag, countEl) {
    return new Promise(function (resolve) {
      var arr = null;
      try {
        if (typeof journalData === "undefined" || !journalData[slug] || !Array.isArray(journalData[slug])) {
          dbg("A: journalData['" + slug + "'] not available");
          return resolve(false);
        }
        arr = journalData[slug];
      } catch (e) { dbg("A: journalData access failed: " + e.message); return resolve(false); }

      var staticCount = arr.length;
      var fallbackImg = (arr[0] && arr[0].image) || makePlaceholder(slug.charAt(0));
      var entries = subs.map(function (d) { return entryFromSubmission(d, fallbackImg); });
      Array.prototype.push.apply(arr, entries);
      dbg("A: injected " + entries.length + " entr(y/ies) after " + staticCount + " static journals");

      var beforeHtml = container.innerHTML;
      var beforeCount = countEl ? countEl.textContent : "";
      var beforeMax = maxPageNumber(pag);

      /* invisible probe: if script.js re-renders (innerHTML="..."), the probe
         gets wiped — a guaranteed signal even when the markup looks identical */
      var probe = document.createElement("div");
      probe.setAttribute("data-arc-probe", "1");
      probe.style.display = "none";
      container.appendChild(probe);

      function rollback() {
        arr.length = staticCount;
        if (probe.parentNode) probe.remove();
      }

      var s = document.createElement("script");
      s.src = "script.js";
      s.onload = function () {
        /* script executed — now wait for a re-render signal */
        (function verify(attempt) {
          var wiped = !container.contains(probe);
          var changed = (container.innerHTML !== beforeHtml || wiped) && container.children.length > 0;
          var countChanged = countEl && countEl.textContent !== beforeCount;
          var maxChanged = maxPageNumber(pag) !== beforeMax;
          if (changed || countChanged || maxChanged) {
            if (probe.parentNode) probe.remove();
            dbg("A: script.js re-rendered" + (wiped ? " (probe wiped)" : "") + " — page now includes submissions");
            return resolve(true);
          }
          if (attempt > 25) { /* ~2.5s */
            rollback();
            dbg("A: no re-render signal — rolled back, falling back to layer B");
            return resolve(false);
          }
          setTimeout(function () { verify(attempt + 1); }, 100);
        })(0);
      };
      s.onerror = function () {
        rollback();
        dbg("A: could not load script.js — rolled back");
        resolve(false);
      };
      document.body.appendChild(s);
    });
  }

  /* ---------- Layer B: clone cards, extend the pagination bar ---------- */
  function attemptB(slug, subs, container, pag, countEl) {
    /* dupe guard: layer A may have rendered without being detected */
    var dupe = false;
    for (var i = 0; i < subs.length; i++) {
      for (var c = 0; c < container.children.length; c++) {
        var t = container.children[c].textContent || "";
        if (subs[i].title && t.indexOf(subs[i].title) !== -1) { dupe = true; break; }
      }
      if (dupe) break;
    }
    if (dupe) {
      dbg("B: submission already rendered (layer A worked) — nothing to do");
      return true;
    }

    var template = container.querySelector(".journal-card-horizontal") || container.firstElementChild;
    if (!template) { dbg("B: no card template available (empty category)"); return false; }

    var placeholder = makePlaceholder(CAT_NAMES[slug].charAt(0));
    var staticMax = maxPageNumber(pag);
    var activeClass = staticMax > 0 ? detectActiveClass(pag) : "arc-active";
    var myPages = Math.ceil(subs.length / SUBS_PER_PAGE);

    /* clone a static card and rewrite its contents for a submission */
    function makeCard(d) {
      var node = template.cloneNode(true);
      node.removeAttribute("id");
      node.setAttribute("data-arc-sub", d.id || "");

      /* 1. cover image */
      var img = node.querySelector("img");
      if (img) {
        img.removeAttribute("srcset");
        img.src = d.imageUrl || placeholder;
        img.alt = d.title || "Submission";
      }

      /* 2. title */
      var h = node.querySelector("h1,h2,h3,h4,h5,h6");
      if (h) h.textContent = d.title || "(Untitled)";

      /* 3. replace stale meta text (everything that is not a link/heading) */
      var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentElement;
          if (!p || !n.textContent.trim()) return NodeFilter.FILTER_REJECT;
          if (p.closest("a") || p.closest("h1,h2,h3,h4,h5,h6")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      var metaLine = "By " + (d.fullName || "Anonymous") +
        (d.institution ? " · " + d.institution : "") +
        (fmtDate(d.submittedAt) ? " · " + fmtDate(d.submittedAt) : "");
      for (var i = 0; i < texts.length; i++) texts[i].textContent = (i === 0) ? metaLine : "";

      /* 4. links (the whole card may itself be an <a>) */
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

    /* render one of MY pages into the grid (exactly like a page switch) */
    function renderMyPage(p) {
      container.innerHTML = "";
      var start = (p - 1) * SUBS_PER_PAGE;
      for (var i = start; i < start + SUBS_PER_PAGE && i < subs.length; i++) {
        container.appendChild(makeCard(subs[i]));
      }
      var btns = pag.querySelectorAll("a,button,span,li");
      for (var b = 0; b < btns.length; b++) btns[b].classList.remove(activeClass);
      var mine = pag.querySelector('[data-arc-page="' + p + '"]');
      if (mine) mine.classList.add(activeClass);
      window.scrollTo({ top: container.getBoundingClientRect().top + window.pageYOffset - 130, behavior: "smooth" });
      dbg("B: rendered submission page " + p + " (pages " + (staticMax + 1) + "-" + (staticMax + myPages) + " are submissions)");
    }

    /* keep "N submitted" next to the article count */
    function bumpCount() {
      if (!countEl) return;
      var t = countEl.textContent || "";
      if (t.indexOf("submitted") === -1) countEl.textContent = t + " · " + subs.length + " submitted";
    }
    bumpCount();
    if (countEl) {
      new MutationObserver(bumpCount).observe(countEl, { childList: true, characterData: true, subtree: true });
    }

    if (staticMax > 0) {
      /* ---- the normal case: append extra pages to the existing bar ---- */
      var pagSuppress = false;
      function appendMyButtons() {
        if (!pag || pagSuppress) return;
        pagSuppress = true;
        try {
          var old = pag.querySelectorAll("[data-arc-page]");
          for (var i = 0; i < old.length; i++) old[i].remove();
          var numBtns = [];
          var els = pag.querySelectorAll("a,button,span,li");
          for (var j = 0; j < els.length; j++) {
            var t = (els[j].textContent || "").trim();
            if (/^\d{1,3}$/.test(t) && !els[j].hasAttribute("data-arc-page")) numBtns.push(els[j]);
          }
          if (!numBtns.length) return;
          var anchor = numBtns[numBtns.length - 1];
          for (var p = 1; p <= myPages; p++) {
            var btn = numBtns[0].cloneNode(true);
            btn.setAttribute("data-arc-page", String(p));
            btn.removeAttribute("id");
            btn.removeAttribute("href");
            btn.style.cursor = "pointer";
            btn.textContent = String(staticMax + p);
            btn.classList.remove(activeClass);
            (function (page) {
              btn.addEventListener("click", function (e) {
                e.preventDefault(); e.stopPropagation();
                renderMyPage(page);
              });
            })(p);
            anchor.parentNode.insertBefore(btn, anchor.nextSibling);
            anchor = btn;
          }
          dbg("B: appended " + myPages + " page button(s) after static page " + staticMax);
        } finally {
          setTimeout(function () { pagSuppress = false; }, 80);
        }
      }
      appendMyButtons();
      /* script.js may rebuild the bar on every page click — re-append ours */
      new MutationObserver(function () {
        if (pagSuppress) return;
        if (!pag.querySelector("[data-arc-page]")) appendMyButtons();
      }).observe(pag, { childList: true, subtree: true });
      return true;
    }

    /* ---- no static pagination (few static journals): take over fully ---- */
    ensureStyles();
    var staticCards = [];
    for (var i = 0; i < container.children.length; i++) {
      if (container.children[i].getAttribute("data-arc-probe")) continue; /* skip probes */
      staticCards.push(container.children[i].cloneNode(true));
    }
    var all = staticCards.concat(subs.map(makeCard));
    var pages = Math.ceil(all.length / SUBS_PER_PAGE);

    if (pages <= 1) {
      for (var i = staticCards.length; i < all.length; i++) container.appendChild(all[i]);
      dbg("B: appended " + subs.length + " card(s), everything fits one page");
      return true;
    }

    if (!pag) {
      pag = document.createElement("div");
      pag.className = "pagination";
      container.parentNode.insertBefore(pag, container.nextSibling);
    }
    pag.innerHTML = "";
    function renderP(p) {
      container.innerHTML = "";
      var start = (p - 1) * SUBS_PER_PAGE;
      for (var i = start; i < start + SUBS_PER_PAGE && i < all.length; i++) container.appendChild(all[i]);
      var btns = pag.querySelectorAll(".arc-page-btn");
      for (var b = 0; b < btns.length; b++) btns[b].classList.toggle("arc-active", parseInt(btns[b].textContent, 10) === p);
      window.scrollTo({ top: container.getBoundingClientRect().top + window.pageYOffset - 130, behavior: "smooth" });
    }
    for (var p = 1; p <= pages; p++) {
      (function (page) {
        var a = document.createElement("a");
        a.className = "arc-page-btn";
        a.textContent = String(page);
        a.addEventListener("click", function (e) { e.preventDefault(); renderP(page); });
        pag.appendChild(a);
      })(p);
    }
    renderP(1);
    dbg("B: built full pagination (" + pages + " pages, " + all.length + " cards)");
    return true;
  }

  /* ---------- Layer C: simple section at the bottom (last resort) ---------- */
  function attemptC(slug, subs) {
    renderJournalsHomeSection(subs, true); /* same card design, bottom of page */
    dbg("C: rendered fallback section at the bottom");
  }

  /* =====================================================================
     Data loading (shared)
     ===================================================================== */
  async function fetchApproved() {
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
      if (!approved.length) {
        dbg("no approved submissions — page left unchanged");
        if (isJournalsHome) renderJournalsHomeSection([]);
        return;
      }

      if (isJournalsHome) {
        renderJournalsHomeSection(approved);
        return;
      }

      /* ---------------- category page: merge into pagination ---------------- */
      var container = document.getElementById("articlesContainer");
      var pag = document.getElementById("pagination");
      var countEl = document.getElementById("resultCount");
      if (!container) { dbgErr("#articlesContainer not found on this page"); return; }

      var target = CAT_NAMES[slug];
      var subs = approved.filter(function (d) { return catMatches(d.category, target); });
      dbg("category '" + target + "': " + subs.length + " approved submission(s)");
      if (!subs.length) {
        dbg("nothing for this category — page left unchanged");
        return;
      }

      /* always keep submission card links correct, on every re-render */
      new MutationObserver(function () { linkMyCards(container, subs); })
        .observe(container, { childList: true });

      await waitInitialRender(container);

      if (await attemptA(slug, subs, container, pag, countEl)) {
        linkMyCards(container, subs);
        dbg("done (layer A — native rendering)");
        return;
      }
      if (attemptB(slug, subs, container, pag, countEl)) {
        dbg("done (layer B — cloned cards + extended pagination)");
        return;
      }
      attemptC(slug, subs);
      dbg("done (layer C — fallback section)");
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
