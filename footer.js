// ================================================================
// footer.js — সব পেজের জন্য ইউনিফাইড ফুটার
//  • পুরনো হার্ডকোড করা <footer class="footer"> থাকলে অটো বদলে যাবে
//  • ফুটার না থাকলে নতুন ফুটার নিজেই বসে যাবে
//  • কোনো পেজে ফুটার না চাইলে সেই পেজের <body> ট্যাগে data-no-footer লিখুন
// ================================================================
(function () {

  // ---- সোশ্যাল লিংক  ----
  var SOCIAL = {
    facebook: "#",
    twitter: "#",
    linkedin: "#"
  };

  // ---- ফেভিকন: menu.js না থাকা পেজের (admin) জন্য; আগে থেকে সেট থাকলে বাদ যাবে ----
  (function () {
    if (document.querySelector("link[rel='icon']")) return;
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230a2540'/%3E%3Ctext x='32' y='41' font-family='Georgia,serif' font-size='24' font-weight='bold' fill='%23ebc7b5' text-anchor='middle'%3EARC%3C/text%3E%3C/svg%3E";
    document.head.appendChild(link);
  })();

  function getFooterHTML() {
    // ২০২৬ থেকে শুরু; সাল বাড়লে ভবিষ্যতে নিজে থেকেই আপডেট হবে
    var year = Math.max(2026, new Date().getFullYear());
    return `
      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-col">
            <h4>ARC Journals</h4>
            <p>Rabindronath Thakur Academic Building<br>University of Rajshahi.</p>
            <p><i class="fas fa-phone"></i> +880 1712 534 626</p>
          </div>
          <div class="footer-col">
            <h4>Resources</h4>
            <p><a href="#">Attorney Directory</a></p>
            <p><a href="#">Legal Research Portal</a></p>
            <p><a href="#">Pro Bono Initiatives</a></p>
          </div>
          <div class="footer-col">
            <h4>Publishing &amp; News</h4>
            <p><a href="#">Subscribe to Legal Brief</a></p>
            <p><a href="#">Media Inquiries</a></p>
            <p><a href="#">Annual Review 2025</a></p>
          </div>
          <div class="footer-col">
            <h4>Follow Us</h4>
            <div class="footer-social">
              <a href="${SOCIAL.facebook}" target="_blank" rel="noopener noreferrer" class="social-facebook" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
              <a href="${SOCIAL.twitter}" target="_blank" rel="noopener noreferrer" class="social-twitter" aria-label="Twitter / X"><i class="fab fa-twitter"></i></a>
              <a href="${SOCIAL.linkedin}" target="_blank" rel="noopener noreferrer" class="social-linkedin" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
            </div>
          </div>
        </div>
        <div class="copyright">&copy; ${year} ARC Journals | An Academic &amp; Professional Research Center</div>
      </footer>
    `;
  }

  function buildFooter() {
    var temp = document.createElement('div');
    temp.innerHTML = getFooterHTML().trim();
    return temp.firstElementChild;
  }

  function initFooter() {
    // Opt-out: <body data-no-footer> লেখা পেজে ফুটার আসবে না
    if (document.body.hasAttribute('data-no-footer')) return;

    var old = document.querySelectorAll('footer.footer');

    if (old.length > 0) {
      old[0].replaceWith(buildFooter());                     // প্রথমটা নতুন দিয়ে বদল
      for (var i = 1; i < old.length; i++) old[i].remove();  // বাড়তি থাকলে মুছে ফেল
    } else {
      // site-wrapper থাকলে তার ভেতরে, না থাকলে (admin পেজ) body-এর শেষে
      var target = document.querySelector('.site-wrapper') || document.body;
      target.insertAdjacentElement('beforeend', buildFooter());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
  } else {
    initFooter();
  }
})();