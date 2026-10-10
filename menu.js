// menu.js - Dynamic menu with Donate dropdown (click toggles on all devices, hover works on desktop)
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
      
      // বর্তমানে ড্রপডাউন খোলা আছে কিনা
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadMenu();
      setActiveMenuItem();
    });
  } else {
    loadMenu();
    setActiveMenuItem();
  }
})();
