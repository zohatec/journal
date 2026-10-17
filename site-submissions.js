// ================================================================
// site-submissions.js (v2) — Approved সাবমিশন মূল লিস্টের একদম উপরে
//   • journals-<cat>.html → পেজিনেশন গ্রিডের একদম উপরে (শুধু ১ম পেজে)
//   • journals.html      → পেজের একদম উপরে
//   • articles.html      → আর্টিকেল লিস্টের একদম উপরে
//   • কোনো আলাদা "New/Recent Submissions" সেকশন নেই
// ================================================================
(async function () {

  var appMod, fsMod;
  try {
    appMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
    fsMod  = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
  } catch (e) { console.error("site-submissions: Firebase load failed", e); return; }

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

  var CAT_NAMES = {
    arts: "Arts & Culture", comparative: "Comparative & International Studies",
    economics: "Economics & Business", education: "Education Studies",
    space: "Future & Space Studies", health: "Health, Psychology & Bioethics",
    history: "History & Memory Studies", human: "Human Rights & Indigenous Studies",
    inter: "Interdisciplinary Studies", law: "Law & Environment",
    justice: "Law & Justice", migration: "Migration & Geopolitics",
    philosophy: "Philosophy & Ethics", digital: "Technology & Digital Studies"
  };

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
      console.error("site-submissions: Firestore read failed", e);
      return [];
    }
  }

  var all = await fetchAllApproved();
  if (!all.length) return;

  var journalSubs = all.filter(function (s) { return s.submissionType === "Journal"; });
  var articleSubs = all.filter(function (s) { return s.submissionType !== "Journal"; });

  // বিল্ট-ইন কার্ডের হুবহু একই মার্কআপ — ডিজাইন/সাইজ একই থাকবে
  function subCardHTML(s) {
    var media = (s.imageUrl && String(s.imageUrl).trim() !== "")
      ? '<img src="' + esc(s.imageUrl) + '" alt="' + esc(s.title) + '">'
      : '<i class="fas fa-file-pdf"></i>';
    return `
      <article class="journal-card-horizontal" data-user-submission="1">
        <a href="submission-view.html?sub=${encodeURIComponent(s._id)}" class="journal-card-link-horizontal">
          <div class="card-image">${media}</div>
          <div class="card-details">
            <h3 class="card-title">${esc(s.title)}</h3>
            <p class="card-meta">By ${esc(s.fullName || "Anonymous")} · ${fmtDate(s.submittedAt)}</p>
          </div>
        </a>
      </article>`;
  }

  function subArticleItemHTML(s) {
    return `
      <a href="submission-view.html?sub=${encodeURIComponent(s._id)}" target="_blank" rel="noopener noreferrer" class="article-list-item" data-user-submission="1">
        <div class="article-item-icon"><i class="fas fa-file-pdf"></i></div>
        <span class="article-item-title">${esc(s.title)}</span>
        <i class="fas fa-external-link-alt article-item-arrow"></i>
      </a>`;
  }

  // কাউন্টারে সাবমিশন সংখ্যা যোগ করে (নিজের লেখা হলে আর বাড়ায় না)
  function makeBump(span, addN, isArticle) {
    var last = null;
    return function () {
      if (!span || !addN) return;
      var t = span.textContent;
      if (t === last) return;
      var m = t.match(/\d+/);
      if (!m) return;
      var n = parseInt(m[0], 10) + addN;
      last = isArticle ? (n + " articles") : (n + " journal" + (n !== 1 ? "s" : ""));
      span.textContent = last;
    };
  }

  function isOurs(el) {
    return !!(el && el.hasAttribute && el.hasAttribute("data-user-submission"));
  }

  // ---------- ১) ক্যাটেগরি পেজ: গ্রিডের একদম উপরে (শুধু ১ম পেজে) ----------
  var catMatch = location.pathname.match(/journals-([a-z]+)\.html/);
  if (catMatch && CAT_NAMES[catMatch[1]]) {
    var subs = journalSubs.filter(function (s) { return s.category === CAT_NAMES[catMatch[1]]; });
    var grid = document.getElementById("articlesContainer");
    if (subs.length && grid) {
      var cardsHTML = subs.map(subCardHTML).join("");
      var bump = makeBump(document.getElementById("resultCount"), subs.length, false);

      function pageOne() {
        var h = location.hash;
        return !h || h === "#page-1";
      }
      function ensure() {
        bump();
        if (!pageOne()) return;                    // ২য় পেজের পর সাবমিশন কার্ড নেই
        if (isOurs(grid.firstElementChild)) return; // আগেই বসানো আছে
        grid.insertAdjacentHTML("afterbegin", cardsHTML);
        var noRes = document.getElementById("noResultsMsg");
        if (noRes) noRes.style.display = "none";
      }
      ensure();
      // পেজিনেশনে গ্রিড নতুন করে আঁকলেও কার্ডগুলো আবার উপরে বসে যাবে
      new MutationObserver(ensure).observe(grid, { childList: true });
    }
  }

  // ---------- ২) journals.html: পেজের একদম উপরে ----------
  var allJournalsContainer = document.getElementById("allJournalsContainer");
  if (allJournalsContainer && journalSubs.length) {
    allJournalsContainer.insertAdjacentHTML("beforebegin", `
      <div class="category-section" id="userSubmittedJournals">
        <h3><i class="fas fa-user-edit"></i> Submitted Journals</h3>
        <div class="journals-grid">
          ${journalSubs.map(function (s) {
            return `<a href="submission-view.html?sub=${encodeURIComponent(s._id)}" class="journal-name-link">${esc(s.title)}</a>`;
          }).join("")}
        </div>
      </div>`);
    var bumpJ = makeBump(document.getElementById("resultCount"), journalSubs.length, false);
    bumpJ();
    new MutationObserver(bumpJ).observe(allJournalsContainer, { childList: true });
  }

  // ---------- ৩) articles.html: লিস্টের একদম উপরে ----------
  var allArticlesContainer = document.getElementById("allArticlesContainer");
  if (allArticlesContainer && articleSubs.length) {
    var itemsHTML = articleSubs.map(subArticleItemHTML).join("");
    var bumpA = makeBump(document.getElementById("resultCount"), articleSubs.length, true);
    function ensureA() {
      bumpA();
      if (isOurs(allArticlesContainer.firstElementChild)) return;
      allArticlesContainer.insertAdjacentHTML("afterbegin", itemsHTML);
    }
    ensureA();
    new MutationObserver(ensureA).observe(allArticlesContainer, { childList: true });
  }

})();
