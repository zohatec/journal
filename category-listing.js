import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD89i0iqHXWY6mG1P1ErFkf8Otbunsx6LU",
  authDomain: "my-journal-a0eaa.firebaseapp.com",
  projectId: "my-journal-a0eaa",
  storageBucket: "my-journal-a0eaa.firebasestorage.app",
  messagingSenderId: "577249786861",
  appId: "1:577249786861:web:489745d30cd82b6ca6c5e4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PAGE_SIZE = 6;
let allItems = [];
let currentPage = 1;

const container = document.getElementById("articlesContainer");
const resultCount = document.getElementById("resultCount");
const noResultsMsg = document.getElementById("noResultsMsg");
const pagination = document.getElementById("pagination");
const category = container.dataset.category;

function renderPage(page) {
  currentPage = page;
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = allItems.slice(start, start + PAGE_SIZE);

  container.innerHTML = pageItems.map(d => `
    <div class="jr-card">
      <h3>${d.title || "(শিরোনামহীন)"}</h3>
      <div class="jr-meta">${d.fullName || ""} ${d.institution ? "· " + d.institution : ""} ${d.submittedAt ? "· " + new Date(d.submittedAt).toLocaleDateString() : ""}</div>
      <p>${d.abstract || ""}</p>
      <a class="jr-pdf-link" href="${d.fileUrl}" target="_blank">📄 PDF দেখুন</a>
    </div>
  `).join("");

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(allItems.length / PAGE_SIZE);
  if (totalPages <= 1) { pagination.innerHTML = ""; return; }
  let html = "";
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="jr-page-btn ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
  }
  pagination.innerHTML = html;
  pagination.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => renderPage(Number(btn.dataset.page)));
  });
}

try {
  const q = query(
    collection(db, "submissions"),
    where("category", "==", category),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);
  allItems = snapshot.docs.map(doc => doc.data());
  resultCount.textContent = `${allItems.length} articles`;

  if (allItems.length === 0) {
    noResultsMsg.style.display = "block";
    container.innerHTML = "";
    pagination.innerHTML = "";
  } else {
    noResultsMsg.style.display = "none";
    renderPage(1);
  }
} catch (err) {
  container.innerHTML = "<p>ডেটা লোড করতে সমস্যা হয়েছে।</p>";
  console.error(err);
}
