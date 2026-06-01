// ======================== script.js (Complete) ========================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

document.addEventListener('DOMContentLoaded', function () {

  // ========== MOBILE MENU TOGGLE ==========
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () {
      navLinks.classList.toggle('show');
      const icon = menuToggle.querySelector('i');
      if (icon.classList.contains('fa-bars')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });
  }

  // ========== ACTIVE MENU HIGHLIGHT ==========
  function setActiveMenuItem() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinksItems = document.querySelectorAll('.nav-links a');
    navLinksItems.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  setActiveMenuItem();

  // ========== SCROLL TO TOP BUTTON ==========
  function createScrollToTopButton() {
    if (document.querySelector('.scroll-top-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'scroll-top-btn';
    btn.innerHTML = '<i class="fas fa-arrow-up"></i> Top';
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  createScrollToTopButton();

  // ========== MODAL FOR READ MORE ==========
  function createModal() {
    if (document.querySelector('.modal-overlay')) return;
    const modalHTML = `
      <div class="modal-overlay" id="articleModal">
        <div class="modal-container">
          <span class="modal-close">&times;</span>
          <h2 class="modal-title" id="modalTitle"></h2>
          <div class="modal-authors" id="modalAuthors"></div>
          <div class="modal-meta" id="modalMeta"></div>
          <div class="modal-body" id="modalBody"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('articleModal');
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
  createModal();

  // ========== READ MORE FUNCTIONALITY (static article cards) ==========
  function initReadMore() {
    const articleCards = document.querySelectorAll('.article-card');
    if (!articleCards.length) return;
    articleCards.forEach(card => {
      const excerptEl = card.querySelector('.article-excerpt');
      const fullContent = card.querySelector('.full-article-content');
      const readMoreBtn = card.querySelector('.read-more-btn');
      if (!excerptEl || !fullContent || !readMoreBtn) return;
      const excerptText = excerptEl.innerText;
      const wordCount = excerptText.trim().split(/\s+/).length;
      if (wordCount <= 20) {
        readMoreBtn.style.display = 'none';
      } else {
        readMoreBtn.style.display = 'inline-block';
      }
      readMoreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const title = card.querySelector('.article-title')?.innerText || '';
        const authors = card.querySelector('.article-authors')?.innerText || '';
        const meta = card.querySelector('.article-meta')?.innerHTML || '';
        const fullHTML = fullContent.innerHTML;
        const modal = document.getElementById('articleModal');
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalAuthors').innerText = authors;
        document.getElementById('modalMeta').innerHTML = meta;
        document.getElementById('modalBody').innerHTML = fullHTML;
        modal.classList.add('active');
      });
    });
  }
  initReadMore();

  // ========== SEARCH FUNCTIONALITY (index, books, news) ==========
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const articlesContainer = document.getElementById('articlesContainer');
  const noResultsDiv = document.getElementById('noResultsMsg');
  const resultCountSpan = document.getElementById('resultCount');

  if (searchInput && searchButton && articlesContainer) {
    const allArticles = Array.from(document.querySelectorAll('.article-card'));
    function updateFilter() {
      const query = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;
      if (query === '') {
        allArticles.forEach(article => { article.style.display = 'block'; });
        visibleCount = allArticles.length;
        if (noResultsDiv) noResultsDiv.style.display = 'none';
        articlesContainer.style.display = 'flex';
      } else {
        allArticles.forEach(article => {
          const titleEl = article.querySelector('.article-title');
          const authorEl = article.querySelector('.article-authors');
          const titleText = titleEl ? titleEl.innerText.toLowerCase() : '';
          const authorText = authorEl ? authorEl.innerText.toLowerCase() : '';
          const matches = titleText.includes(query) || authorText.includes(query);
          if (matches) {
            article.style.display = 'block';
            visibleCount++;
          } else {
            article.style.display = 'none';
          }
        });
      }
      if (resultCountSpan) {
        resultCountSpan.innerText = visibleCount + (visibleCount === 1 ? ' publication' : ' publications');
      }
      if (visibleCount === 0 && noResultsDiv) {
        noResultsDiv.style.display = 'block';
        articlesContainer.style.display = 'none';
      } else if (noResultsDiv) {
        noResultsDiv.style.display = 'none';
        articlesContainer.style.display = 'flex';
      }
    }
    searchButton.addEventListener('click', updateFilter);
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') updateFilter();
      else updateFilter();
    });
    updateFilter();
  }

  // ========== JOURNAL LISTING PAGES (journals-*.html) ==========
  (function () {
    let currentCategory = '';
    const path = window.location.pathname;
    if (path.includes('journals-arts')) currentCategory = 'arts';
    else if (path.includes('journals-comparative')) currentCategory = 'comparative';
    else if (path.includes('journals-economics')) currentCategory = 'economics';
    else if (path.includes('journals-education')) currentCategory = 'education';
    else if (path.includes('journals-space')) currentCategory = 'space';
    else if (path.includes('journals-health')) currentCategory = 'health';
    else if (path.includes('journals-history')) currentCategory = 'history';
    else if (path.includes('journals-human')) currentCategory = 'human';
    else if (path.includes('journals-inter')) currentCategory = 'inter';
    else if (path.includes('journals-law')) currentCategory = 'law';
    else if (path.includes('journals-justice')) currentCategory = 'justice';
    else if (path.includes('journals-migration')) currentCategory = 'migration';
    else if (path.includes('journals-philosophy')) currentCategory = 'philosophy';
    else if (path.includes('journals-digital')) currentCategory = 'digital';
    else return;

    const container = document.getElementById('articlesContainer');
    const paginationDiv = document.getElementById('pagination');
    const resultCountSpan = document.getElementById('resultCount');
    const noResultsDiv = document.getElementById('noResultsMsg');
    const itemsPerPage = 6;
    let currentPage = 1;
    let totalPages = 1;
    let journals = [];

    function renderJournals() {
      if (!container) return;
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageJournals = journals.slice(start, end);
      if (pageJournals.length === 0) {
        container.innerHTML = '';
        if (noResultsDiv) noResultsDiv.style.display = 'block';
        if (resultCountSpan) resultCountSpan.innerText = '0 journals';
        return;
      }
      if (noResultsDiv) noResultsDiv.style.display = 'none';
      let html = '';
      pageJournals.forEach(function (journal, i) {
        const globalIndex = start + i;
        const articleListUrl = 'article-listing.html?cat=' + encodeURIComponent(currentCategory) + '&id=' + globalIndex;
        html += `
          <article class="article-card journal-card-simple">
            <a href="${articleListUrl}" target="_blank" class="journal-card-link" title="${escapeHtml(journal.title)}">
              <div class="article-image"><i class="fas ${escapeHtml(journal.iconClass)} fa-3x"></i></div>
              <div class="article-title">${escapeHtml(journal.title)}</div>
            </a>
          </article>
        `;
      });
      container.innerHTML = html;
      if (resultCountSpan) {
        resultCountSpan.innerText = journals.length + ' journal' + (journals.length !== 1 ? 's' : '');
      }
      const mainContent = document.querySelector('.main-content');
      if (mainContent && currentPage > 1) mainContent.scrollIntoView({ behavior: 'smooth' });
    }

    function buildPagination() {
      if (!paginationDiv) return;
      if (totalPages <= 1) { paginationDiv.innerHTML = ''; return; }
      let paginationHtml = '<div class="pagination-controls">';
      paginationHtml += `<button class="page-prev" ${currentPage === 1 ? 'disabled' : ''}>&#8249; Previous</button>`;
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);
      if (endPage - startPage < 4) {
        if (startPage === 1) endPage = Math.min(totalPages, 5);
        if (endPage === totalPages) startPage = Math.max(1, totalPages - 4);
      }
      for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<button class="page-num ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      paginationHtml += `<button class="page-next" ${currentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
      paginationHtml += '</div>';
      paginationDiv.innerHTML = paginationHtml;
      const prevBtn = paginationDiv.querySelector('.page-prev');
      const nextBtn = paginationDiv.querySelector('.page-next');
      const pageBtns = paginationDiv.querySelectorAll('.page-num');
      if (prevBtn && !prevBtn.disabled) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; updatePage(); } });
      if (nextBtn && !nextBtn.disabled) nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; updatePage(); } });
      pageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const page = parseInt(btn.getAttribute('data-page'), 10);
          if (!isNaN(page) && page !== currentPage) { currentPage = page; updatePage(); }
        });
      });
    }

    function updatePage() {
      renderJournals();
      buildPagination();
      window.location.hash = 'page-' + currentPage;
    }

    function init() {
      if (typeof journalData === 'undefined' || !journalData[currentCategory]) return;
      journals = journalData[currentCategory];
      totalPages = Math.ceil(journals.length / itemsPerPage);
      const hash = window.location.hash;
      if (hash.startsWith('#page-')) {
        const pageNum = parseInt(hash.replace('#page-', ''), 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) currentPage = pageNum;
      }
      renderJournals();
      buildPagination();
      window.addEventListener('hashchange', () => {
        const newHash = window.location.hash;
        if (newHash.startsWith('#page-')) {
          const pageNum = parseInt(newHash.replace('#page-', ''), 10);
          if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
            currentPage = pageNum;
            updatePage();
          }
        }
      });
    }
    init();
  })();

	  // ========== ARTICLE LISTING PAGE (article-listing.html) WITH SIDEBAR MENU ==========
  (function () {
    const path = window.location.pathname;
    if (!path.includes('article-listing')) return;

    const catNames = {
      arts: 'Arts & Culture',
      comparative: 'Comparative & International Studies',
      economics: 'Economics & Business',
      education: 'Education Studies',
      space: 'Future & Space Studies',
      health: 'Health, Psychology & Bioethics',
      history: 'History & Memory Studies',
      human: 'Human Rights & Indigenous Studies',
      inter: 'Interdisciplinary Studies',
      law: 'Law & Environment',
      justice: 'Law & Justice',
      migration: 'Migration & Geopolitics',
      philosophy: 'Philosophy & Ethics',
      digital: 'Technology & Digital Studies'
    };

    // Variables for articles list
    let currentJournal = null;
    let currentArticles = [];
    let sectionHeaderH2 = null; // reference to the <h2> inside .section-header

    // Helper: show menu content (HTML)
		function getIconForMenu(menuName) { 
		  const iconMap = {
			"Aims & Scope": "fa-bullseye",
			"Articles": "fa-scroll",
			"Archive": "fa-archive",
			"Editorial Board": "fa-users",
			"Editorial Policies": "fa-file-contract",
			"Publication Fees": "fa-dollar-sign",
			"Ethics": "fa-shield-alt"
		  };
  return iconMap[menuName] || "fa-book";
}
		function showMenuContent(htmlContent, menuTitle) {
		  let dynamicDiv = document.getElementById('dynamic-menu-content');
		  if (!dynamicDiv) {
			dynamicDiv = document.createElement('div');
			dynamicDiv.id = 'dynamic-menu-content';
			dynamicDiv.className = 'menu-content-area';
			const sectionHeader = document.querySelector('.main-content .section-header');
			if (sectionHeader) {
			  sectionHeader.insertAdjacentElement('afterend', dynamicDiv);
			} else {
			  document.querySelector('.main-content').appendChild(dynamicDiv);
			}
		  }
		  dynamicDiv.innerHTML = htmlContent;
		  dynamicDiv.style.display = 'block';
		  
		  const articleListDiv = document.getElementById('articleListContainer');
		  const noResultsMsg = document.getElementById('noResultsMsg');
		  if (articleListDiv) articleListDiv.style.display = 'none';
		  if (noResultsMsg) noResultsMsg.style.display = 'none';

		  if (sectionHeaderH2) {
			const iconClass = getIconForMenu(menuTitle);
			sectionHeaderH2.innerHTML = `<i class="fas ${iconClass}"></i> ${menuTitle}`;
		  }
}; 

    // Helper: show article list (the original article listing)
		function showArticleList() {
		  const articleListDiv = document.getElementById('articleListContainer');
		  const noResultsMsg = document.getElementById('noResultsMsg');
		  const dynamicDiv = document.getElementById('dynamic-menu-content');
		  if (articleListDiv) articleListDiv.style.display = 'block';
		  if (noResultsMsg) {
			if (currentArticles.length === 0) noResultsMsg.style.display = 'block';
			else noResultsMsg.style.display = 'none';
		  }
		  if (dynamicDiv) dynamicDiv.style.display = 'none';

		  if (sectionHeaderH2) {
			const iconClass = getIconForMenu("Articles");
			sectionHeaderH2.innerHTML = `<i class="fas ${iconClass}"></i> Articles`;
		  }
}; 

    // Render journal sidebar menu
function renderJournalMenu(journal) {
  const menuContainer = document.getElementById('journalMenuList');
  if (!menuContainer) return;
  const menuDetails = journal.menuDetails;
  if (!menuDetails) {
    menuContainer.innerHTML = '<li>No menu available</li>';
    return;
  }

  // প্রতিটি মেনু আইটেমের জন্য আইকন ম্যাপ (পছন্দমতো পরিবর্তন করতে পারেন)
  const menuIcons = {
    "Aims & Scope": "fa-bullseye",
    "Articles": "fa-list-ul",
    "Archive": "fa-archive",
    "Editorial Board": "fa-users",
    "Editorial Policies": "fa-file-contract",
    "Publication Fees": "fa-dollar-sign",
    "Ethics": "fa-balance-scale"
  };
  const defaultIcon = "fa-scroll";

  let html = '';
  for (let key in menuDetails) {
    const iconClass = menuIcons[key] || defaultIcon;
    html += `<li><a href="#" data-menu-key="${escapeHtml(key)}"><i class="fas ${iconClass}"></i> ${escapeHtml(key)}</a></li>`;
  }
  menuContainer.innerHTML = html;

  // attach click events
  document.querySelectorAll('#journalMenuList a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const key = link.getAttribute('data-menu-key');
      if (key === 'Articles') {
        showArticleList();
      } 
      else if (key === 'Archive') {
        // আর্কাইভ পেজে রিডাইরেক্ট করুন (আপনার সেটিং অনুযায়ী)
        window.location.href = 'archive.html';
      }
      else {
        showMenuContent(journal.menuDetails[key], key);
      }
      // active style
      document.querySelectorAll('#journalMenuList li').forEach(li => li.classList.remove('active'));
      link.parentElement.classList.add('active');
    });
  });

  // Default: show "Archive" if exists, otherwise first menu (যেমন আগে সেট করে দিয়েছিলেন)
  let defaultKey = 'Archive';
  if (!menuDetails[defaultKey]) {
    defaultKey = Object.keys(menuDetails)[0];
  }
  if (defaultKey === 'Articles') {
    showArticleList();
  } else {
    showMenuContent(menuDetails[defaultKey], defaultKey);
    const defaultLink = document.querySelector(`#journalMenuList a[data-menu-key="${defaultKey}"]`);
    if (defaultLink) defaultLink.parentElement.classList.add('active');
  }
}

    // Render articles list (the original listing)
    function renderArticleList(articles, journalTitle) {
      const container = document.getElementById('articleListContainer');
      const resultCountSpan = document.getElementById('resultCount');
      const noResultsDiv = document.getElementById('noResultsMsg');
      if (!container) return;
      if (articles.length === 0) {
        container.innerHTML = '';
        if (noResultsDiv) noResultsDiv.style.display = 'block';
        if (resultCountSpan) resultCountSpan.innerText = '0 articles';
        return;
      }
      if (noResultsDiv) noResultsDiv.style.display = 'none';
      let html = '';
      articles.forEach((article, idx) => {
        const viewerUrl = `article-viewer.html?cat=${currentCategory}&journalId=${currentJournalIndex}&articleId=${idx}`;
        html += `
          <a href="${viewerUrl}" target="_blank" rel="noopener noreferrer" class="article-list-item">
            <div class="article-item-icon"><i class="fas ${escapeHtml(article.iconClass || 'fa-file-alt')}"></i></div>
            <span class="article-item-title">${escapeHtml(article.title)}</span>
            <i class="fas fa-external-link-alt article-item-arrow"></i>
          </a>
        `;
      });
      container.innerHTML = html;
      if (resultCountSpan) resultCountSpan.innerText = articles.length + ' article' + (articles.length !== 1 ? 's' : '');
    }

    let currentCategory = null;
    let currentJournalIndex = null;

    function init() {
      // Cache the section header <h2>
      sectionHeaderH2 = document.querySelector('.main-content .section-header h2');

      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat');
      const id = parseInt(params.get('id'), 10);
      if (!cat || isNaN(id) || typeof journalData === 'undefined' || !journalData[cat] || !journalData[cat][id]) {
        document.getElementById('heroTitle').innerText = 'Journal not found';
        return;
      }
      currentCategory = cat;
      currentJournalIndex = id;
      const journal = journalData[cat][id];
      currentJournal = journal;
      currentArticles = journal.articles || [];

      // Update page title, hero, etc.
      document.title = journal.title + ' — ABC Law Firm';
      const heroTitle = document.getElementById('heroTitle');
      const heroTagline = document.getElementById('heroTagline');
      if (heroTitle) heroTitle.innerText = journal.title;
      if (heroTagline) heroTagline.innerText = 'Articles published in this journal — ' + (catNames[cat] || cat);

      // Journal header card
      const journalHeaderIcon = document.getElementById('journalHeaderIcon');
      const journalHeaderTitle = document.getElementById('journalHeaderTitle');
      const journalHeaderCat = document.getElementById('journalHeaderCat');
      if (journalHeaderIcon) journalHeaderIcon.innerHTML = '<i class="fas ' + escapeHtml(journal.iconClass) + '"></i>';
      if (journalHeaderTitle) journalHeaderTitle.innerText = journal.title;
      if (journalHeaderCat) journalHeaderCat.innerText = catNames[cat] || cat;

      // Render article list (static)
      renderArticleList(currentArticles, journal.title);

      // Render sidebar menu (this will also set default menu content/header)
      renderJournalMenu(journal);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();

  // ========== ALL JOURNALS PAGE (journals.html) WITH SEARCH ==========
  if (document.getElementById('allJournalsContainer')) {
    const container = document.getElementById('allJournalsContainer');
    const resultSpan = document.getElementById('resultCount');
    const noMsg = document.getElementById('noJournalsMsg');
    const searchInput = document.getElementById('searchJournalsInput');
    const searchButton = document.getElementById('searchJournalsButton');
    let allJournalsData = [];
    let currentSearchTerm = '';

    function buildJournalsList() {
      if (typeof journalData === 'undefined') return [];
      const list = [];
      const categories = [
        { key: 'arts', label: 'Arts & Culture' },
        { key: 'comparative', label: 'Comparative & International Studies' },
        { key: 'economics', label: 'Economics & Business' },
        { key: 'education', label: 'Education Studies' },
        { key: 'space', label: 'Future & Space Studies' },
        { key: 'health', label: 'Health, Psychology & Bioethics' },
        { key: 'history', label: 'History & Memory Studies' },
        { key: 'human', label: 'Human Rights & Indigenous Studies' },
        { key: 'inter', label: 'Interdisciplinary Studies' },
        { key: 'law', label: 'Law & Environment' },
        { key: 'justice', label: 'Law & Justice' },
        { key: 'migration', label: 'Migration & Geopolitics' },
        { key: 'philosophy', label: 'Philosophy & Ethics' },
        { key: 'digital', label: 'Technology & Digital Studies' }
      ];
      for (let cat of categories) {
        const journals = journalData[cat.key];
        if (journals && journals.length) {
          list.push({ categoryLabel: cat.label, categoryKey: cat.key, journals: journals });
        }
      }
      return list;
    }

    function renderFilteredJournals() {
      if (!container) return;
      let totalJournals = 0;
      let html = '';
      const searchTerm = currentSearchTerm.trim().toLowerCase();
      for (let cat of allJournalsData) {
        let filteredJournals = [];
        if (searchTerm === '') {
          filteredJournals = cat.journals;
        } else {
          filteredJournals = cat.journals.filter(journal => journal.title.toLowerCase().includes(searchTerm));
        }
        if (filteredJournals.length === 0) continue;
        totalJournals += filteredJournals.length;
        html += `<div class="category-section" style="margin-bottom: 2rem;">
                    <h3 style="font-size: 1.3rem; border-left: 4px solid #c4452c; padding-left: 1rem; margin-bottom: 1rem;">${escapeHtml(cat.categoryLabel)}</h3>
                    <div class="journals-grid">`;
        filteredJournals.forEach((journal, idx) => {
          const originalIndex = cat.journals.findIndex(j => j.title === journal.title);
          const listUrl = `article-listing.html?cat=${cat.categoryKey}&id=${originalIndex}`;
          html += `<a href="${listUrl}" target="_blank" class="journal-name-link">${escapeHtml(journal.title)}</a>`;
        });
        html += `</div></div>`;
      }
      if (totalJournals === 0) {
        container.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
      } else {
        container.innerHTML = html;
        if (noMsg) noMsg.style.display = 'none';
      }
      if (resultSpan) resultSpan.innerText = totalJournals + ' journal' + (totalJournals !== 1 ? 's' : '');
    }

    function updateSearch() {
      if (searchInput) currentSearchTerm = searchInput.value;
      renderFilteredJournals();
    }

    allJournalsData = buildJournalsList();
    renderFilteredJournals();
    if (searchButton && searchInput) {
      searchButton.addEventListener('click', updateSearch);
      searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') updateSearch();
        else updateSearch();
      });
    }
  }

  // ========== ALL ARTICLES PAGE (articles.html) WITH PAGINATION & SEARCH ==========
  if (document.getElementById('allArticlesContainer')) {
    const container = document.getElementById('allArticlesContainer');
    const resultSpan = document.getElementById('resultCount');
    const noMsg = document.getElementById('noArticlesMsg');
    const searchInputArt = document.getElementById('searchInputArticles');
    const searchBtnArt = document.getElementById('searchButtonArticles');
    const paginationDiv = document.getElementById('paginationControls');
    let allArticlesArray = [];
    let filteredArticles = [];
    let currentPage = 1;
    const itemsPerPage = 12;

    function buildArticleArray() {
      if (typeof journalData === 'undefined') return [];
      const articlesList = [];
      const categories = ['arts','comparative','economics','education','space','health','history','human','inter','law','justice','migration','philosophy','digital'];
      for (let cat of categories) {
        const journals = journalData[cat];
        if (!journals) continue;
        journals.forEach((journal, journalIdx) => {
          if (journal.articles && journal.articles.length) {
            journal.articles.forEach((article, articleIdx) => {
              const viewerUrl = `article-viewer.html?cat=${cat}&journalId=${journalIdx}&articleId=${articleIdx}`;
              articlesList.push({ title: article.title, url: viewerUrl });
            });
          }
        });
      }
      return articlesList;
    }

    function renderArticleList() {
      if (!container) return;
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageArticles = filteredArticles.slice(start, end);
      if (pageArticles.length === 0) {
        container.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
        paginationDiv.innerHTML = '';
        return;
      }
      if (noMsg) noMsg.style.display = 'none';
      let html = '';
      pageArticles.forEach(art => {
        html += `<a href="${art.url}" target="_blank" class="article-list-item">
                    <div class="article-item-icon"><i class="fas fa-file-alt"></i></div>
                    <span class="article-item-title">${escapeHtml(art.title)}</span>
                    <i class="fas fa-external-link-alt article-item-arrow"></i>
                  </a>`;
      });
      container.innerHTML = html;
      if (resultSpan) resultSpan.innerText = filteredArticles.length + ' articles';
      renderPagination();
    }

    function renderPagination() {
      if (!paginationDiv) return;
      const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
      if (totalPages <= 1) { paginationDiv.innerHTML = ''; return; }
      let pagHtml = '<div class="pagination-controls">';
      pagHtml += `<button class="page-prev" ${currentPage === 1 ? 'disabled' : ''}>&#8249; Previous</button>`;
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);
      if (endPage - startPage < 4) {
        if (startPage === 1) endPage = Math.min(totalPages, 5);
        if (endPage === totalPages) startPage = Math.max(1, totalPages - 4);
      }
      for (let i = startPage; i <= endPage; i++) {
        pagHtml += `<button class="page-num ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      pagHtml += `<button class="page-next" ${currentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
      pagHtml += '</div>';
      paginationDiv.innerHTML = pagHtml;
      const prevBtn = paginationDiv.querySelector('.page-prev');
      const nextBtn = paginationDiv.querySelector('.page-next');
      const pageBtns = paginationDiv.querySelectorAll('.page-num');
      if (prevBtn && !prevBtn.disabled) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderArticleList(); } });
      if (nextBtn && !nextBtn.disabled) nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderArticleList(); } });
      pageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const page = parseInt(btn.getAttribute('data-page'), 10);
          if (!isNaN(page) && page !== currentPage) { currentPage = page; renderArticleList(); }
        });
      });
    }

    function filterArticles(searchTerm) {
      if (!searchTerm.trim()) {
        filteredArticles = [...allArticlesArray];
      } else {
        const term = searchTerm.trim().toLowerCase();
        filteredArticles = allArticlesArray.filter(art => art.title.toLowerCase().includes(term));
      }
      currentPage = 1;
      renderArticleList();
    }

    allArticlesArray = buildArticleArray();
    filteredArticles = [...allArticlesArray];
    renderArticleList();
    if (searchBtnArt && searchInputArt) {
      searchBtnArt.addEventListener('click', () => filterArticles(searchInputArt.value));
      searchInputArt.addEventListener('keyup', (e) => { if (e.key === 'Enter') filterArticles(searchInputArt.value); });
    }
  }
});
