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

const container = document.getElementById("newSubmissionsList");
const category = container.dataset.category;

try {
  const q = query(
    collection(db, "submissions"),
    where("category", "==", category),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    container.innerHTML = "<p>এই ক্যাটাগরিতে এখনো কোনো নতুন সাবমিশন নেই।</p>";
  } else {
    container.innerHTML = snapshot.docs.map(doc => {
      const d = doc.data();
      const date = d.submittedAt ? new Date(d.submittedAt).toLocaleDateString() : "";
      return `
        <div class="jr-card">
          <h3>${d.title || "(শিরোনামহীন)"}</h3>
          <div class="jr-meta">${d.fullName || ""} ${d.institution ? "· " + d.institution : ""} ${date ? "· " + date : ""}</div>
          <p>${d.abstract || ""}</p>
          <a class="jr-pdf-link" href="${d.fileUrl}" target="_blank">📄 PDF দেখুন</a>
        </div>`;
    }).join("");
  }
} catch (err) {
  container.innerHTML = "<p>ডেটা লোড করতে সমস্যা হয়েছে।</p>";
  console.error(err);
}
