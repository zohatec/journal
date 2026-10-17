/* =====================================================================
   ARC Journals — site-submissions.js  (v4 — self-diagnosing, drop-in)
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

  var MAX_ON_JOURNALS_HOME = 12;
  var DEBUG = /subdebug/i.test(location.hash + ";" + location.search);

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* "Arts & Culture" → "artsandculture" (case/punctuation insensitive) */
  function normCat(s) {
    return String(s || "").toLowerCase()
      .replace(/\s*&\s*/g, " and ")
      .replace(/[^a-z0-9]+/g, "");
  }

  /* submittedAt can be a number, a Firestore Timestamp or a string */
  function tsNum(v) {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "string") { var n = Date.parse(v); return isNaN(n) ? 0 : n; }
    if (typeof v.toMillis === "function") return v.toMillis();
    return 0;
  }

  function isApproved(d) {
    if (d.approved === true || d.approved === "true" || d.approved === 1) return true;
    var st = String(d.status || "").toLowerCase();
    if (st === "approved" || st === "published") return true;
    if (d.published === true || d.published === "true") return true;
    return false;
  }

  /* exact match first, then substring fallbacks for old/manual data */
  function catMatches(docCat, targetName) {
    var n = normCat(docCat), t = normCat(targetName);
    if (!n || !t) return false;
    if (n === t) return true;
    if (n.length >= 4 && t.indexOf(n) !== -1) return true;
    if (t.length >= 4 && n.indexOf(t) !== -1) return true;
    return false;
  }

  /* ---------------- debug box (open page with #subdebug) ---------------- */
  var dbgLines = ["site-submissions.js v4 loaded"];
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
      ? "The database refused to read the submissions (Firestore Security Rules). "
        + "Fix: Firebase Console -> Firestore Database -> Rules -> for the submissions collection set: allow read: if true;  (full snippet was provided with this file)"
      : "";
    var el = document.createElement("div");
    el.style.cssText = "margin-top:1.6rem;padding:.85rem 1rem;border-radius:10px;background:#fdeeee;border:1px solid #f2c2c2;color:#b91c1c;font-size:.86rem;line-height:1.65;";
    el.innerHTML = '<b><i class="fas fa-exclamation-triangle"></i> Submissions could not be loaded.</b>'
      + (friendly ? "<br>" + esc(friendly) : "")
      + "<br><small>Details: " + esc(message) + "</small>"
      + '<br><small>Tip: open this page with <b>#subdebug</b> at the end of the URL for a full report.</small>';
    mainContent.appendChild(el);
  }

  /* ---------------- main ---------------- */
  function boot() {
    (async function () {

      /* 1. page detection */
      var page = (location.pathname.split("/").pop() || "").toLowerCase();
      var catMatch = page.match(/^journals-([a-z]+)\.html$/);
      var slug = catMatch ? catMatch[1] : null;
      var isCategoryPage = !!slug && Object.prototype.hasOwnProperty.call(CAT_NAMES, slug);
      var isJournalsHome = page === "journals.html";

      dbg("page: " + page);
      if (!isCategoryPage && !isJournalsHome) { dbg("not a submissions page - nothing to do"); return; }
      dbg("mode: " + (isCategoryPage ? "category page -> " + CAT_NAMES[slug] : "journals home"));

      var mainContent = document.querySelector(".main-content");
      if (!mainContent) { dbgErr(".main-content not found on this page"); return; }

      /* 2. remove the old duplicate "New Submissions" block if still present */
      var old = document.getElementById("newSubmissionsList");
      if (old) {
        var head = old.previousElementSibling;
        if (head && head.classList && head.classList.contains("section-header")) head.remove();
        old.remove();
        dbg("removed old 'New Submissions' block");
      }

      /* 3. load Firebase (dynamic import works in classic scripts too) */
      var appMod, fsMod;
      try {
        appMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
        fsMod  = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
        dbg("firebase SDK loaded");
      } catch (err) {
        dbgErr("firebase SDK failed to load: " + (err && err.message ? err.message : err));
        showErrorBanner("Could not load the Firebase SDK (network problem).");
        return;
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

      /* 4. fetch — ordered query first, plain read as fallback */
      var docs = [];
      try {
        var q = fsMod.query(
          fsMod.collection(db, "submissions"),
          fsMod.orderBy("submittedAt", "desc"),
          fsMod.limit(200)
        );
        var snap = await fsMod.getDocs(q);
        snap.forEach(function (s) { var d = s.data(); d.id = s.id; docs.push(d); });
        dbg("query A (orderBy + limit 200): ok, " + docs.length + " document(s)");
      } catch (e1) {
        dbgErr("query A failed: " + (e1 && e1.message ? e1.message : e1));
        try {
          var snap2 = await fsMod.getDocs(fsMod.collection(db, "submissions"));
          snap2.forEach(function (s) { var d = s.data(); d.id = s.id; docs.push(d); });
          dbg("query B (plain collection read): ok, " + docs.length + " document(s)");
        } catch (e2) {
          dbgErr("query B failed: " + (e2 && e2.message ? e2.message : e2));
          showErrorBanner(String((e2 && e2.message) || e2));
          return;
        }
      }

      docs.sort(function (a, b) { return tsNum(b.submittedAt) - tsNum(a.submittedAt); });

      /* 5. inspect documents (visible with #subdebug) */
      docs.forEach(function (d) {
        dbg("doc " + String(d.id).slice(0, 6) + "... "
          + "category='" + (d.category || "") + "' "
          + "approved=" + (d.approved === undefined ? "(unset)" : JSON.stringify(d.approved))
          + (d.status ? " status=" + d.status : ""));
      });

      var approved = docs.filter(isApproved);
      dbg("approved: " + approved.length + " of " + docs.length);

      /* 6. category filter */
      var shown = approved;
      if (isCategoryPage) {
        var target = CAT_NAMES[slug];
        shown = approved.filter(function (d) { return catMatches(d.category, target); });
        dbg("matching '" + target + "': " + shown.length + " submission(s)");
      }

      /* 7. styles (once) */
      if (!document.getElementById("arcSubStyles")) {
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
          "@media (max-width:640px){.us-grid{grid-template-columns:1fr;}}"
        ].join("");
        document.head.appendChild(style);
      }

      function place(el) {
        if (isJournalsHome) mainContent.insertBefore(el, mainContent.firstChild);
        else mainContent.appendChild(el);
      }

      function sectionShell(inner) {
        var heading = isJournalsHome ? "Submitted Journals" : "Submitted Articles in " + esc(CAT_NAMES[slug]);
        var icon = isJournalsHome ? "fa-inbox" : "fa-upload";
        var count = isJournalsHome ? approved.length : shown.length;
        var section = document.createElement("div");
        section.className = "us-section";
        section.innerHTML =
          '<div class="section-header">' +
            "<h2><i class=\"fas " + icon + "\"></i> " + heading + "</h2>" +
            '<div class="results-count">' + count + (count === 1 ? " submission" : " submissions") + "</div>" +
          "</div>" + inner;
        return section;
      }

      /* 8a. nothing approved at all */
      if (!approved.length) {
        if (isJournalsHome) {
          place(sectionShell('<p class="us-empty">No approved submissions yet. Approve submissions in the admin panel and they will appear here.</p>'));
          dbg("rendered empty state (nothing approved)");
        } else {
          dbg("nothing approved - no section on this category page");
        }
        return;
      }

      /* 8b. approved exist, but none in this category */
      if (!shown.length) {
        place(sectionShell('<p class="us-empty">No approved submissions in this category yet.</p>'));
        dbg("rendered empty state (none in this category)");
        return;
      }

      /* 8c. normal render */
      function card(d) {
        var view = "submission-view.html?sub=" + encodeURIComponent(d.id);
        var t = tsNum(d.submittedAt);
        var date = t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
        var thumb = d.imageUrl
          ? '<img src="' + esc(d.imageUrl) + '" alt="' + esc(d.title) + '" loading="lazy">'
          : '<div class="us-thumb-empty"><i class="fas fa-scroll"></i></div>';
        var abs = String(d.abstract || "");
        var catChip = (!isCategoryPage && d.category) ? '<span class="us-cat">' + esc(d.category) + "</span>" : "";
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

      var capped = isJournalsHome ? shown.slice(0, MAX_ON_JOURNALS_HOME) : shown;
      var extra = shown.length > capped.length
        ? '<p class="us-more">Showing the latest ' + capped.length + " of " + shown.length + " submissions.</p>"
        : "";

      place(sectionShell('<div class="us-grid">' + capped.map(card).join("") + "</div>" + extra));
      dbg("rendered " + capped.length + " card(s)");

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
