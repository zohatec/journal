/* =====================================================================
   ARC Journals — profile-auth.js  (v1 — floating account button)
   ---------------------------------------------------------------------
   PART OF FEATURE #3 (user profiles) + #11 (clickable author names).

   Adds a floating account button to EVERY page that loads this file:

   • Not logged in  → a navy "Log In" pill (bottom-right) that opens
     login.html and returns to the current page afterwards (?next=).
   • Logged in      → the user's avatar / initials; clicking it opens a
     small menu:  My Profile · Submit New Article · Log Out.

   HOW IT GETS LOADED
   • On category pages + journals.html it is loaded automatically by
     site-submissions.js v9+ (no HTML change needed).
   • On any other page (index.html, submit.html, ...) add one line
     before </body>:
         <script src="profile-auth.js"></script>

   EXCLUDED PAGES (button hidden): login.html, profile.html,
   admin.html, admin-login.html — those pages already manage the
   session, and the admin area must not show the user button.

   TECH NOTES
   • Classic script (works with a plain <script src> tag) — the Firebase
     SDK is pulled in with dynamic import(), same as site-submissions.js.
   • Never throws if Firebase or the network is unavailable: the button
     simply falls back to a plain link to login.html.
   ===================================================================== */

(function () {
  "use strict";

  if (window.__ARC_PROFILE_AUTH) return; /* double-load guard */
  window.__ARC_PROFILE_AUTH = true;

  var VERSION = "v1";

  /* pages where the floating button must NOT appear */
  var page = (location.pathname.split("/").pop() || "").toLowerCase();
  if (/^(login|profile|admin|admin-login)\.html$/.test(page)) return;

  var CSS_READY = false;
  function ensureStyles() {
    if (CSS_READY) return;
    CSS_READY = true;
    var s = document.createElement("style");
    s.id = "arcAuthStyles";
    s.textContent = [
      ".arc-auth-fab{position:fixed;right:18px;bottom:18px;z-index:99990;display:inline-flex;align-items:center;gap:8px;",
      "background:#1f3d7a;color:#fff;border:0;border-radius:999px;padding:0 18px 0 14px;height:48px;cursor:pointer;",
      "font:600 .88rem 'Inter',sans-serif;text-decoration:none;box-shadow:0 8px 24px rgba(20,40,90,.35);",
      "transition:transform .15s ease, background .15s ease;}",
      ".arc-auth-fab:hover{background:#16305f;transform:translateY(-2px);}",
      ".arc-auth-fab .fab-ico{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 auto;font-size:.85rem;background:rgba(255,255,255,.16);}",
      ".arc-auth-fab .fab-ico img{width:24px;height:24px;border-radius:50%;object-fit:cover;display:block;}",
      ".arc-auth-menu{position:fixed;right:18px;bottom:76px;z-index:99991;width:250px;background:#fff;border:1px solid #e2e6ef;",
      "border-radius:12px;box-shadow:0 14px 40px rgba(15,25,55,.22);overflow:hidden;font-family:'Inter',sans-serif;",
      "animation:arcAuthIn .18s ease both;}",
      "@keyframes arcAuthIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
      ".arc-auth-head{padding:.85rem 1rem;background:#f4f7fc;border-bottom:1px solid #e6ebf5;}",
      ".arc-auth-head b{display:block;font-size:.88rem;color:#1c2b4a;line-height:1.3;word-break:break-word;}",
      ".arc-auth-head span{display:block;font-size:.76rem;color:#8a92a1;margin-top:2px;word-break:break-all;}",
      ".arc-auth-item{display:flex;align-items:center;gap:.6rem;padding:.68rem 1rem;font-size:.86rem;font-weight:500;",
      "color:#3a4763;text-decoration:none;cursor:pointer;border:0;background:#fff;width:100%;transition:background .12s;}",
      ".arc-auth-item:hover{background:#f0f4fb;color:#1f3d7a;}",
      ".arc-auth-item i{width:16px;text-align:center;color:#1f3d7a;}",
      ".arc-auth-item.logout{color:#b91c1c;border-top:1px solid #eef1f7;}",
      ".arc-auth-item.logout i{color:#b91c1c;}",
      ".arc-auth-item.logout:hover{background:#fdeeee;color:#b91c1c;}",
      "@media (max-width:480px){.arc-auth-fab{right:12px;bottom:12px;}.arc-auth-menu{right:12px;bottom:70px;width:230px;}}"
    ].join("");
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "?";
  }
  function nextPage() {
    var cur = page || "index.html";
    if (!cur) cur = "index.html";
    return "login.html?next=" + encodeURIComponent(cur);
  }

  var fab = null, menu = null, open = false;

  function closeMenu() {
    if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
    menu = null;
    open = false;
  }

  function buildFab() {
    ensureStyles();
    if (fab) return;
    fab = document.createElement("a");
    fab.className = "arc-auth-fab";
    fab.id = "arcAuthFab";
    fab.href = nextPage();
    fab.innerHTML = '<span class="fab-ico"><i class="fas fa-user"></i></span> Log In';
    fab.setAttribute("aria-label", "Log in or create an account");
    (document.body || document.documentElement).appendChild(fab);
  }

  function showMenu(user, name, avatarUrl) {
    closeMenu();
    ensureStyles();
    menu = document.createElement("div");
    menu.className = "arc-auth-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML =
      '<div class="arc-auth-head"><b>' + esc(name || "My Account") + "</b><span>" + esc(user.email || "") + "</span></div>" +
      '<a class="arc-auth-item" role="menuitem" href="profile.html"><i class="fas fa-user-circle"></i> My Profile</a>' +
      '<a class="arc-auth-item" role="menuitem" href="submit.html"><i class="fas fa-paper-plane"></i> Submit New Article</a>' +
      '<a class="arc-auth-item" role="menuitem" href="journals.html"><i class="fas fa-book"></i> Browse Journals</a>' +
      '<button type="button" class="arc-auth-item logout" role="menuitem"><i class="fas fa-sign-out-alt"></i> Log Out</button>';
    (document.body || document.documentElement).appendChild(menu);
    open = true;

    menu.querySelector(".logout").addEventListener("click", async function () {
      var btn = this;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Logging out...';
      try { await arcAuth.signOut(); }
      catch (e) { console.warn("[ARC auth] signOut:", e); }
      closeMenu();
      paintLoggedOut();
    });

    /* close on outside click / Escape */
    setTimeout(function () {
      document.addEventListener("click", outside, true);
      document.addEventListener("keydown", onKey, true);
    }, 0);
    function outside(e) {
      if (menu && !menu.contains(e.target) && e.target !== fab && !(fab && fab.contains(e.target))) cleanup();
    }
    function onKey(e) { if (e.key === "Escape") cleanup(); }
    function cleanup() {
      closeMenu();
      document.removeEventListener("click", outside, true);
      document.removeEventListener("keydown", onKey, true);
    }
  }

  function paintLoggedOut() {
    if (!fab) return;
    fab.innerHTML = '<span class="fab-ico"><i class="fas fa-user"></i></span> Log In';
    fab.href = nextPage();
    fab.onclick = null;
  }

  function paintLoggedIn(user, name, avatarUrl) {
    if (!fab) return;
    var ico = avatarUrl
      ? '<span class="fab-ico"><img src="' + esc(avatarUrl) + '" alt=""></span>'
      : '<span class="fab-ico">' + esc(initials(name)) + "</span>";
    fab.innerHTML = ico + '<span>' + esc((name || "My Profile").split(/\s+/).slice(0, 2).join(" ")) + "</span>";
    fab.href = "profile.html";
    fab.onclick = function (e) {
      e.preventDefault();
      if (open) { closeMenu(); return; }
      showMenu(user, name, avatarUrl);
    };
  }

  /* ---------------- Firebase (dynamic import, fail-safe) ---------------- */
  var arcAuth = null;

  async function init() {
    buildFab();
    try {
      var appMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
      var authMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js");
      var fsMod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

      var firebaseConfig = {
        apiKey: "AIzaSyD89i0iqHXWY6mG1P1ErFkf8Otbunsx6LU",
        authDomain: "my-journal-a0eaa.firebaseapp.com",
        projectId: "my-journal-a0eaa",
        storageBucket: "my-journal-a0eaa.firebasestorage.app",
        messagingSenderId: "577249786861",
        appId: "1:577249786861:web:489745d30cd82b6ca6c5e4"
      };
      var app = appMod.initializeApp(firebaseConfig);
      var auth = authMod.getAuth(app);
      arcAuth = auth;
      var db = fsMod.getFirestore(app);

      authMod.onAuthStateChanged(auth, function (user) {
        if (!user) { paintLoggedOut(); return; }
        /* try to enrich with the profile document (name + photo) */
        var name = user.displayName || (user.email || "My Profile").split("@")[0];
        var avatar = null;
        fsMod.getDoc(fsMod.doc(db, "users", user.uid)).then(function (snap) {
          if (snap.exists()) {
            var d = snap.data();
            if (d.fullName) name = d.fullName;
            if (d.avatarUrl) avatar = d.avatarUrl;
          }
        }).catch(function () { /* rules or network — the auth name is enough */ })
          .finally(function () { paintLoggedIn(user, name, avatar); });
      });
    } catch (err) {
      console.warn("[ARC auth] Firebase unavailable, the login button still links to login.html:", err);
      /* fab already points to login.html — nothing else to do */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
