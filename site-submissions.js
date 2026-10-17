/* =====================================================================
   ARC Journals — site-submissions.js  (v3 — self-contained, drop-in)

   ===================================================================== */

(function () {
  "use strict";

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

  var MAX_ON_JOURNALS_HOME = 12; /* how many cards to show on journals.html */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* "Arts & Culture" → "artsandculture"  (also matches "Arts and Culture",
     "arts & culture", the bare slug "arts", etc.) */
  function normCat(s) {
    return String(s || "").toLowerCase()
      .replace(/\s*&\s*/g, " and ")
      .replace(/[^a-z0-9]+/g, "");
  }

  function isApproved(d) {
    return d.approved === true || d.status === "approved" || d.status === "published";
  }

  function boot() {
    (async function () {
      /* ---------- 1. Which page are we on? ---------- */
      var page = (location.pathname.split("/").pop() || "").toLowerCase();
      var catMatch = page.match(/^journals-([a-z]+)\.html$/);
      var slug = catMatch ? catMatch[1] : null;
      var isCategoryPage = !!slug && Object.prototype.hasOwnProperty.call(CAT_NAMES, slug);
      var isJournalsHome = page === "journals.html";

      /* Do nothing on articles.html, submission-view.html, index.html, admin pages... */
      if (!isCategoryPage && !isJournalsHome) return;

      var mainContent = document.querySelector(".main-content");
      if (!mainContent) {
        console.warn("[ARC submissions] .main-content not found on", page);
        return;
      }

      /* ---------- 2. Remove the old duplicate "New Submissions" block if present ---------- */
      var old = document.getElementById("newSubmissionsList");
      if (old) {
        var head = old.previousElementSibling;
        if (head && head.classList && head.classList.contains("section-header")) head.remove();
        old.remove();
      }

      /* ---------- 3. Load Firebase (dynamic import — works in classic scripts too) ---------- */
      var appMod, fsMod;
      try {
        appMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
        fsMod  = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
      } catch (err) {
        console.error("[ARC submissions] Firebase SDK failed to load:", err);
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

      /* ---------- 4. Fetch the latest submissions (single-field index only — no setup needed) ---------- */
      var items = [];
      try {
        var q = fsMod.query(
          fsMod.collection(db, "submissions"),
          fsMod.orderBy("submittedAt", "desc"),
          fsMod.limit(200)
        );
        var snap = await fsMod.getDocs(q);
        snap.forEach(function (docSnap) {
          var d = docSnap.data();
          d.id = docSnap.id;
          if (isApproved(d)) items.push(d);
        });
      } catch (err) {
        console.error("[ARC submissions] Could not load submissions:", err);
        return;
      }

      /* ---------- 5. Category page → keep only this category's submissions ---------- */
      if (isCategoryPage) {
        var target = normCat(CAT_NAMES[slug]);
        items = items.filter(function (d) {
          var n = normCat(d.category);
          return n === target || (n.length >= 4 && target.indexOf(n) === 0);
        });
      }

      if (!items.length) {
        console.info("[ARC submissions] No approved submissions to show on", page);
        return; /* keep the page clean — no empty section */
      }

      /* ---------- 6. Build the section ---------- */
      var shown = isJournalsHome ? items.slice(0, MAX_ON_JOURNALS_HOME) : items;

      var style = document.createElement("style");
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
        ".us-more{margin-top:.9rem;font-size:.82rem;color:#8a92a1;}",
        "@media (max-width:640px){.us-grid{grid-template-columns:1fr;}}"
      ].join("");
      document.head.appendChild(style);

      function card(d) {
        var view = "submission-view.html?sub=" + encodeURIComponent(d.id);
        var date = d.submittedAt
          ? new Date(d.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "";
        var thumb = d.imageUrl
          ? '<img src="' + esc(d.imageUrl) + '" alt="' + esc(d.title) + '" loading="lazy">'
          : '<div class="us-thumb-empty"><i class="fas fa-scroll"></i></div>';
        var abs = String(d.abstract || "");
        var catChip = (!isCategoryPage && d.category)
          ? '<span class="us-cat">' + esc(d.category) + "</span>"
          : "";
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
                (d.fileUrl
                  ? '<a class="us-pdf" href="' + esc(d.fileUrl) + '" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> PDF</a>'
                  : "") +
              "</div>" +
            "</div>" +
          "</div>";
      }

      var heading = isJournalsHome
        ? "Submitted Journals"
        : "Submitted Articles in " + esc(CAT_NAMES[slug]);
      var icon = isJournalsHome ? "fa-inbox" : "fa-upload";

      var section = document.createElement("div");
      section.className = "us-section";
      section.innerHTML =
        '<div class="section-header">' +
          "<h2><i class=\"fas " + icon + "\"></i> " + heading + "</h2>" +
          '<div class="results-count">' + items.length + (items.length === 1 ? " submission" : " submissions") + "</div>" +
        "</div>" +
        '<div class="us-grid">' + shown.map(card).join("") + "</div>" +
        (items.length > shown.length
          ? '<p class="us-more">Showing the latest ' + shown.length + " of " + items.length + " submissions.</p>"
          : "");

      /* journals.html → section at the TOP of the content area;
         category pages → section at the BOTTOM (below the pagination),
         so the article grid and pagination are never disturbed. */
      if (isJournalsHome) mainContent.insertBefore(section, mainContent.firstChild);
      else mainContent.appendChild(section);

      console.log("[ARC submissions] Rendered", shown.length, "submission(s) on", page);
    })().catch(function (err) {
      console.error("[ARC submissions] Unexpected error:", err);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
