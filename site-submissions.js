// ================================================================
// site-submissions.js — Admin-এ Approved সাবমিশন মূল সাইটে দেখায়
//   • journals-<cat>.html → "Journal" টাইপ, বিদ্যমান কার্ড-ডিজাইনেই
//   • journals.html      → ক্যাটেগরি অনুযায়ী লিস্ট
//   • articles.html      → "Article" টাইপের লিস্ট
//   • কার্ডে ক্লিক → submission-view.html?sub=<id>
//   (script.js / journals-data.js কিছুই বদলাতে হয় না)
// ================================================================
(async function () {

  // ---------- Firebase লোড ----------
  var appMod, fsMod;
  try {
    appMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
    fsMod  = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
  } catch (e) {
    console.error("site-submissions: Firebase load failed", e);
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
  var db  = fsMod.getFirestore(app);

  // ---------- হেল্পার ----------
  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function fmtDate(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return ""; }
  }

  // slug ("arts") → ফর্মে ব্যবহৃত পূর্ণ নাম ("Arts & Culture")
  var CAT_NAMES = {
    arts: "Arts & Culture", comparative: "Comparative & International Studies",
    economics: "Economics & Business", education: "Education Studies",
    space: "Future & Space Studies", health: "Health, Psychology & Bioethics",
    history: "History & Memory Studies", human: "Human Rights & Indigenous Studies",
    inter: "Interdisciplinary Studies", law: "Law & Environment",
    justice: "Law & Justice", migration: "Migration & Geopolitics",
    philosophy: "Philosophy & Ethics", digital: "Technology & Digital Studies"
  };

  // সব approved সাবমিশন একবারে আনা (single query — ইনডেক্স লাগে না)
  async function fetchAllApproved() {
    try {
      var snap = await fsMod.getDocs(
        fsMod.query(fsMod.collection(db, "submissions"), fsMod.where("approved", "==", true))
      );
      var out = [];
      snap.forEach(function (d) { var v = d.data(); v._id = d.id; out.push(v); });
      out.sort(function (a, b) {
        return String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""));
      });
      return out;
    } catch (e) {
      console.error("site-submissions: Firestore পড়া যায়নি (Rules দেখুন)", e);
      return [];
    }
  }

  var all = await fetchAllApproved();
  if (!all.length) return; // প্রকাশিত কিছু নেই — কিছুই বসানোর নেই

  // বিদ্যমান জার্নাল কার্ডের হুবহু একই ডিজাইন
  function journalCardHTML(s) {
    return `
      <article class="journal-card-horizontal">
        <a href="submission-view.html?sub=${encodeURIComponent(s._id)}" class="journal-card-link-horizontal">
          <div class="card-image"><i class="fas fa-file-pdf"></i></div>
          <div class="card-details">
            <h3 class="card-title">${esc(s.title)}</h3>
            <p class="card-meta">By ${esc(s.fullName || "Anonymous")} · ${fmtDate(s.submittedAt)}</p>
          </div>
        </a>
      </article>`;
  }

  // ---------- ১) ক্যাটেগরি পেজ (journals-arts.html ইত্যাদি) ----------
  var catMatch = location.pathname.match(/journals-([a-z]+)\.html/);
  if (catMatch && CAT_NAMES[catMatch[1]]) {
    var slug = catMatch[1];
    var subs = all.filter(function (s) {
      return s.submissionType === "Journal" && s.category === CAT_NAMES[slug];
    });
    if (subs.length) {
      var main = document.querySelector(".main-content");
      if (main) {
        main.insertAdjacentHTML("beforeend", `
          <div class="section-header" style="margin-top:2.5rem;">
            <h2><i class="fas fa-user-edit"></i> Recently Published Submissions</h2>
            <div class="results-count">${subs.length} submission${subs.length !== 1 ? "s" : ""}</div>
          </div>
          <div class="journals-grid-view">
            ${subs.map(journalCardHTML).join("")}
          </div>`);
      }
    }
  }

  // ---------- ২) All Journals পেজ (journals.html) ----------
  var allJournalsContainer = document.getElementById("allJournalsContainer");
  if (allJournalsContainer) {
    var journalSubs = all.filter(function (s) { return s.submissionType === "Journal"; });
    if (journalSubs.length) {
      var byCat = {};
      journalSubs.forEach(function (s) {
        var key = Object.keys(CAT_NAMES).filter(function (k) { return CAT_NAMES[k] === s.category; })[0] || "other";
        (byCat[key] = byCat[key] || []).push(s);
      });
      var html = "";
      Object.keys(byCat).forEach(function (k) {
        var label = (k === "other") ? "Other Submissions" : CAT_NAMES[k];
        html += `
          <div class="category-section">
            <h3><i class="fas fa-user-edit"></i> User Published — ${esc(label)}</h3>
            <div class="journals-grid">
              ${byCat[k].map(function (s) {
                return `<a href="submission-view.html?sub=${encodeURIComponent(s._id)}" class="journal-name-link">${esc(s.title)}</a>`;
              }).join("")}
            </div>
          </div>`;
      });
      allJournalsContainer.insertAdjacentHTML("afterend", html);
    }
  }

  // ---------- ৩) All Articles পেজ (articles.html) ----------
  if (document.getElementById("allArticlesContainer")) {
    var artSubs = all.filter(function (s) { return s.submissionType !== "Journal"; });
    if (artSubs.length) {
      var mainArt = document.querySelector(".main-content");
      if (mainArt) {
        mainArt.insertAdjacentHTML("beforeend", `
          <div class="section-header" style="margin-top:2.5rem;">
            <h2><i class="fas fa-user-edit"></i> Recently Published Articles</h2>
            <div class="results-count">${artSubs.length} article${artSubs.length !== 1 ? "s" : ""}</div>
          </div>
          ${artSubs.map(function (s) {
            return `<a href="submission-view.html?sub=${encodeURIComponent(s._id)}" class="article-list-item">
                      <div class="article-item-icon"><i class="fas fa-file-pdf"></i></div>
                      <span class="article-item-title">${esc(s.title)}</span>
                      <i class="fas fa-external-link-alt article-item-arrow"></i>
                    </a>`;
          }).join("")}`);
      }
    }
  }

})();