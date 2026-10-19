// menu.js - Dynamic menu with Donate dropdown (click toggles on all devices, hover works on desktop)
// v2 — টপ-বারের "Log In" বাটনে অ্যাকাউন্ট-স্টেট যোগ হয়েছে (নিচে initAccountButton)। বাকি সব আগের মতোই।
// v3 — অ্যাডমিন লগ-ইন থাকলে টপ-বারে "Admin" বাটনও দেখায় (admin.html প্যানেলে যায়)।
(function() {
    // ===== ফেভিকন: menu.js সব পেজে লোড হয়, তাই এক জায়গায় দিলেই সব পেজে সেট হয়ে যাবে =====
  (function () {
    if (document.querySelector("link[rel='icon']")) return;
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230a2540'/%3E%3Ctext x='32' y='41' font-family='Georgia,serif' font-size='24' font-weight='bold' fill='%23ebc7b5' text-anchor='middle'%3EARC%3C/text%3E%3C/svg%3E";
    document.head.appendChild(link);
  })();
  function getMenuHTML() {
    return `
      <a href="index.html">Home</a>
      <a href="articles.html">Articles</a>
      <a href="journals.html">Journals</a>
      <a href="archive.html">Archive</a>
      <a href="books.html">Books</a>
      <a href="news.html">News</a>
      <a href="about.html">About</a>
      <a href="services.html">Services</a>
      <a href="submit.html">Submit</a>
      <div class="dropdown" id="donateDropdownContainer">
        <a href="javascript:void(0);" class="dropbtn" id="donateBtn">Donate <i class="fas fa-chevron-down"></i></a>
        <div class="dropdown-content" id="donateDropdown">
          <a href="donate-one-time.html"><i class="fas fa-hand-holding-usd"></i> One-time Donation</a>
          <a href="donate-monthly.html"><i class="fas fa-calendar-check"></i> Monthly Donation</a>
          <a href="donate-research.html"><i class="fas fa-flask"></i> Research Grant Support</a>
          <a href="donate-openaccess.html"><i class="fas fa-unlock-alt"></i> Open Access Fund</a>
          <a href="sponsor-article.html"><i class="fas fa-star"></i> Sponsor an Article</a>
        </div>
      </div>
    `;
  }

  function loadMenu() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
      navLinks.innerHTML = getMenuHTML();
      attachDropdownToggle();
    }
  }

  function attachDropdownToggle() {
    const donateBtn = document.getElementById('donateBtn');
    const dropdown = document.getElementById('donateDropdown');
    if (!donateBtn || !dropdown) return;

    // সব ডিভাইসে ক্লিক টগল যোগ করা
    donateBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // বর্তমানে ড্রপডাউন খোলা আছে কি না
      const isOpen = dropdown.style.display === 'block';
      // সব ড্রপডাউন বন্ধ করে (পেজে অন্য কোনো ড্রপডাউন থাকলে)
      document.querySelectorAll('.dropdown-content').forEach(dd => dd.style.display = 'none');

      if (!isOpen) {
        dropdown.style.display = 'block';
      } else {
        dropdown.style.display = 'none';
      }
    });

    // বাইরে ক্লিক করলে বন্ধ
    document.addEventListener('click', function(e) {
      const container = document.getElementById('donateDropdownContainer');
      if (container && !container.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Active menu highlight
  function setActiveMenuItem() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('#navLinks a');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /* ============================================================
     v2 — টপ-বারের "Log In" বাটন (সাইটের একমাত্র লগইন বাটন)
     ------------------------------------------------------------
     প্রতি পেজের top-bar-এ থাকা .login-link বাটনটি এখানে নিয়ন্ত্রিত হয়:
       • লগআউট অবস্থায় → "Log In" → login.html?next=<এই পেজ> (লগইন করে
         স্বয়ংক্রিয়ভাবে এই পেজেই ফিরে আসবে)
       • লগইন অবস্থায়  → ব্যবহারকারীর নাম → profile.html
     admin-login.html এখন শুধু অ্যাডমিনদের জন্য — ওই পেজ নিজেই যাচাই
     করে, তাই এই বাটন কখনো ওখানে পাঠায় না।
     v3 — অ্যাডমিন লগ-ইন থাকলে এই বাটনের পাশে আলাদা "Admin" বাটন
     যোগ হয় (শুধু অ্যাডমিনরা দেখবে), যেটা সরাসরি admin.html প্যানেলে যায়।
     Firebase লোড ব্যর্থ হলে বাটন login.html-এই থাকে — কখনো ভাঙা
     বা অ্যাডমিন-লগইনে যাওয়া অবস্থায় পড়ে না।
     ============================================================ */
  function initAccountButton() {
    var link = document.querySelector('.login-link');
    if (!link) return; /* এই পেজে top-bar/বাটন নেই (যেমন admin প্যানেল) */

    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    function escVal(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function loginHref() {
      if (page === 'login.html') return 'login.html';
      return 'login.html?next=' + encodeURIComponent(page || 'index.html');
    }
    function shortName(n) {
      var parts = String(n || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return 'My Profile';
      var two = parts.slice(0, 2).join(' ');
      return two.length > 24 ? parts[0] : two;
    }

    function paintLoggedOut() {
      link.innerHTML = '<i class="fas fa-user-shield"></i> Log In';
      link.href = loginHref();
      link.title = 'Log in or create an account';
    }

    function paintLoggedIn(name) {
      link.innerHTML = '<i class="fas fa-user-circle"></i> ' + escVal(shortName(name));
      link.href = 'profile.html';
      link.title = 'Go to your profile';
    }

    /* ============================================================
       v3 — অ্যাডমিন বাটন
       ------------------------------------------------------------
       লগ-ইন করা ব্যবহারকারী যদি অ্যাডমিন হন, তাহলে টপ-বারের Log In /
       নামের বাটনের ঠিক আগে একটি "Admin" লিংক বসানো হয় — যেটা
       সরাসরি admin.html (এডমিন প্যানেল) খোলে। সাধারণ ব্যবহারকারী
       বা লগআউট অবস্থায় এই বাটন লুকানো থাকে।
       ADMIN_EMAILS তালিকাটি admin.html, admin-login.html, login.html
       এবং Firestore rules-এর সাথে সিংকে রাখুন।
       ============================================================ */
    var ADMIN_EMAILS = [
      'ssbcpoint@gmail.com',
      'zulfiquarcyberlaw@gmail.com'
    ];
    function isAdminEmail(e) {
      return ADMIN_EMAILS.indexOf(String(e || '').trim().toLowerCase()) !== -1;
    }
    function showAdminLink() {
      var admin = document.querySelector('.admin-link');
      if (!admin) {
        admin = document.createElement('a');
        admin.className = 'admin-link';
        admin.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
        admin.title = 'Open the admin panel';
        if (link.parentNode) link.parentNode.insertBefore(admin, link);
      }
      admin.href = 'admin.html';
      admin.style.display = '';
    }
    function hideAdminLink() {
      var admin = document.querySelector('.admin-link');
      if (admin) admin.style.display = 'none';
    }

    /* ডিফল্ট স্টেট (Firebase চেক হওয়ার আগেই): লগআউট */
    paintLoggedOut();

    /* Firebase সেশন চেক — ব্যর্থ হলে উপরের ডিফল্টই থাকে (নিরাপদ) */
    Promise.all([
      import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js')
    ]).then(function (mods) {
      var firebaseConfig = {
        apiKey: "AIzaSyD89i0iqHXWY6mG1P1ErFkf8Otbunsx6LU",
        authDomain: "my-journal-a0eaa.firebaseapp.com",
        projectId: "my-journal-a0eaa",
        storageBucket: "my-journal-a0eaa.firebasestorage.app",
        messagingSenderId: "577249786861",
        appId: "1:577249786861:web:489745d30cd82b6ca6c5e4"
      };
      var app = mods[0].initializeApp(firebaseConfig);
      var auth = mods[1].getAuth(app);
      var db = mods[2].getFirestore(app);

      mods[1].onAuthStateChanged(auth, function (user) {
        if (!user) { paintLoggedOut(); hideAdminLink(); return; }
        /* v3: অ্যাডমিন হলে "Admin" বাটন দেখাও, না হলে লুকাও */
        if (isAdminEmail(user.email)) { showAdminLink(); } else { hideAdminLink(); }
        var name = user.displayName || (user.email || 'My Profile').split('@')[0];
        /* users ডকুমেন্ট থেকে পুরো নাম আনার চেষ্টা — ব্যর্থ হলে auth-এর নামই থাকে */
        mods[2].getDoc(mods[2].doc(db, 'users', user.uid)).then(function (snap) {
          if (snap.exists() && snap.data() && snap.data().fullName) name = snap.data().fullName;
        }).catch(function () { /* rules বা নেটওয়ার্ক — auth-এর নামই যথেষ্ট */ })
          .finally(function () { paintLoggedIn(name); });
      });
    }).catch(function (err) {
      console.warn('[ARC menu] Firebase unavailable — the Log In button keeps its default state:', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadMenu();
      setActiveMenuItem();
      initAccountButton();
    });
  } else {
    loadMenu();
    setActiveMenuItem();
    initAccountButton();
  }
})();
