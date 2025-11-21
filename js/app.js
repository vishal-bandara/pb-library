// =====================
// Service Worker registration
// =====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.error('Service Worker registration failed', err));
  });
}

/* =========================
   Year in footer
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});

/* =========================
   Menu + accordion handlers
   ========================= */
function toggleMenu() {
  const nav = document.getElementById("main-nav");
  if (!nav) return;
  nav.style.display = nav.style.display === "flex" ? "none" : "flex";
}

function toggleAcc(head) {
  const body = head.nextElementSibling;
  if (!body) return;
  const visible = body.style.display === "block";

  document.querySelectorAll(".acc-body").forEach((b) => {
    if (b !== body) b.style.display = "none";
  });

  body.style.display = visible ? "none" : "block";
}

/* =========================
   Firebase config (compat)
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyC8_9CMdG2MyS-P9XGYRtd1K_9kNaEQSyc",
  authDomain: "pb-library-1501a.firebaseapp.com",
  projectId: "pb-library-1501a",
  storageBucket: "pb-library-1501a.appspot.com",
  messagingSenderId: "351111194912",
  appId: "1:351111194912:web:a24d7385a22ac51e220f45",
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  // ignore if already initialized
}
const db = firebase.firestore();

/* =========================
   Books data (IDs + default images)
   ========================= */
const books = [];
for (let i = 1; i <= 20; i++) {
  books.push({
    id: i,
    title: `Book ${i}`, // default title, will be overridden by Firestore if present
    image: `images/book${i}.jpg`, // default local image
  });
}

/* =========================
   Helper: escape HTML text
   ========================= */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* =========================
   Load book data (title + image) from Firestore
   Collection: "books"
   Doc ID: "1", "2", ... "20"
   Fields: title (string), imageUrl (string)
   ========================= */
async function loadBooksFromFirestore() {
  try {
    const snapshot = await db.collection("books").get();
    if (snapshot.empty) return;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const bookId = Number(doc.id);
      const book = books.find((b) => b.id === bookId);
      if (!book || !data) return;

      if (data.title) {
        book.title = data.title;
      }
      if (data.imageUrl) {
        book.image = data.imageUrl;
      }
    });
  } catch (err) {
    console.error("Error loading books:", err);
  }
}

/* =========================
   Render books
   ========================= */
const bookList = document.getElementById("book-list");

async function renderBooks() {
  if (!bookList) return;

  // Load titles and images from Firestore
  await loadBooksFromFirestore();

  // Clear old content
  bookList.innerHTML = "";

  // Fetch reservations
  const reservedSnapshot = await db.collection("reservations").get();
  const reservedMap = {};
  reservedSnapshot.forEach((d) => {
    const data = d.data();
    if (data && data.bookId) reservedMap[Number(data.bookId)] = true;
  });

  // Render books
  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "book-card";
    card.setAttribute("data-id", book.id);

    card.innerHTML = `
      <img src="${book.image}" alt="${escapeHtml(book.title)}"
           onerror="this.src='https://via.placeholder.com/200x260?text=No+Image'">
      <h3>${escapeHtml(book.title)}</h3>
      <button>${reservedMap[book.id] ? "Already Reserved" : "Reserve"}</button>
    `;
    bookList.appendChild(card);

    const btn = card.querySelector("button");
    if (reservedMap[book.id]) btn.disabled = true;

    btn.addEventListener("click", async () => {
      const staffId = prompt("Enter your Staff ID:");
      if (!staffId) return;

      const phone = prompt("Enter your Phone Number:");
      if (!phone) return;

      // Double-check in Firestore
      const q = await db.collection("reservations").where("bookId", "==", book.id).get();
      if (!q.empty) {
        alert("This book is already reserved!");
        btn.disabled = true;
        btn.textContent = "Already Reserved";
        return;
      }

      // Add reservation
      await db.collection("reservations").add({
        bookId: book.id,
        title: book.title,
        staffId,
        phone,
        reservedAt: new Date(),
      });

      alert("Book reserved successfully!");
      btn.disabled = true;
      btn.textContent = "Already Reserved";

      if (document.getElementById("admin-panel")?.style.display === "block") showReservations();
    });
  });
}

/* =========================
   Admin login
   ========================= */
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

function adminLogin() {
  const username = prompt("Enter admin username:");
  const password = prompt("Enter admin password:");

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const panel = document.getElementById("admin-panel");
    if (panel) panel.style.display = "block";
    showReservations();
    showBookAdminList();
    showNoticeAdminList();

    document.getElementById("admin-card")?.scrollIntoView({ behavior: "smooth" });
  } else {
    alert("Wrong credentials!");
  }
}

/* =========================
   Show reservations
   ========================= */
async function showReservations() {
  const table = document.getElementById("reservation-table");
  if (!table) return;

  table.innerHTML = `
    <thead>
      <tr>
        <th style="min-width:140px">Book</th>
        <th>Staff ID</th>
        <th>Phone</th>
        <th style="min-width:140px">Date</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody id="res-body"></tbody>
  `;

  const body = document.getElementById("res-body");
  if (!body) return;

  const snapshot = await db.collection("reservations").get();
  if (snapshot.empty) {
    body.innerHTML = `<tr><td colspan="5" class="empty">No reservations yet</td></tr>`;
    return;
  }

  snapshot.forEach((doc) => {
    const data = doc.data();
    let dateText = "";
    if (data.reservedAt) {
      if (typeof data.reservedAt.toDate === "function") {
        dateText = data.reservedAt.toDate().toLocaleString();
      } else {
        try {
          dateText = new Date(data.reservedAt).toLocaleString();
        } catch (e) {}
      }
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(data.title || `Book ${data.bookId || ""}`)}</td>
      <td>${escapeHtml(data.staffId || "")}</td>
      <td>${escapeHtml(data.phone || "")}</td>
      <td>${escapeHtml(dateText)}</td>
      <td class="res-actions">
        <button class="edit" data-doc="${doc.id}" data-book="${data.bookId}">Edit Name</button>
        <button class="reset" data-doc="${doc.id}" data-book="${data.bookId}">Reset</button>
      </td>
    `;
    body.appendChild(tr);
  });

  // Buttons
  body.querySelectorAll("button.edit").forEach((btn) => {
    btn.addEventListener("click", () => editBookTitle(btn.dataset.doc, Number(btn.dataset.book)));
  });

  body.querySelectorAll("button.reset").forEach((btn) => {
    btn.addEventListener("click", () => resetReservation(btn.dataset.doc, Number(btn.dataset.book)));
  });
}

/* =========================
   Edit book title (from reservation row)
   - updates reservation + books collection + cards
   ========================= */
async function editBookTitle(docId, bookId) {
  try {
    const docRef = db.collection("reservations").doc(docId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return alert("Reservation not found");

    const data = docSnap.data();
    const currentTitle = data.title || `Book ${bookId}`;
    const newTitle = prompt("Enter new book name:", currentTitle);
    if (!newTitle || !newTitle.trim()) return;

    const cleaned = newTitle.trim();

    // 1) Update reservation document
    await docRef.update({ title: cleaned });

    // 2) Update master book title in `books` collection
    const bookDocRef = db.collection("books").doc(String(bookId));
    await bookDocRef.set({ title: cleaned }, { merge: true });

    // 3) Update local books array
    const book = books.find((b) => b.id === bookId);
    if (book) book.title = cleaned;

    // 4) Update UI card title
    const card = document.querySelector(`#book-list .book-card[data-id="${bookId}"]`);
    if (card) card.querySelector("h3").textContent = cleaned;

    // 5) Refresh reservations table to show new name
    await showReservations();
    alert("Book name updated successfully!");
  } catch (err) {
    console.error("editBookTitle error", err);
    alert("Failed to update book name. See console for details.");
  }
}

/* =========================
   Reset reservation
   ========================= */
async function resetReservation(docId, bookId) {
  if (!confirm("Reset this book to available?")) return;

  try {
    await db.collection("reservations").doc(docId).delete();

    const card = document.querySelector(`#book-list .book-card[data-id="${bookId}"]`);
    if (card) {
      const btn = card.querySelector("button");
      btn.disabled = false;
      btn.textContent = "Reserve";
    }

    await showReservations();
    alert("Book is now available!");
  } catch (err) {
    console.error("resetReservation error", err);
    alert("Failed to reset. See console.");
  }
}

/* =========================
   Admin: Show book list (Manage Books)
   ========================= */
async function showBookAdminList() {
  const table = document.getElementById("book-admin-table");
  if (!table) return;

  // Ensure book titles & images are loaded from Firestore
  await loadBooksFromFirestore();

  table.innerHTML = `
    <thead>
      <tr>
        <th style="min-width:60px">ID</th>
        <th style="min-width:160px">Book Name</th>
        <th style="min-width:100px">Action</th>
      </tr>
    </thead>
    <tbody id="book-admin-body"></tbody>
  `;

  const body = document.getElementById("book-admin-body");
  if (!body) return;

  if (!books.length) {
    body.innerHTML = `<tr><td colspan="3" class="empty">No books defined</td></tr>`;
    return;
  }

  books.forEach((book) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${book.id}</td>
      <td>${escapeHtml(book.title)}</td>
      <td class="res-actions">
        <button class="edit-book" data-book="${book.id}">Edit Name</button>
        <button class="edit-image" data-book="${book.id}">Change Photo</button>
      </td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll("button.edit-book").forEach((btn) => {
    btn.addEventListener("click", () => adminEditBookName(Number(btn.dataset.book)));
  });

  body.querySelectorAll("button.edit-image").forEach((btn) => {
    btn.addEventListener("click", () => adminEditBookImage(Number(btn.dataset.book)));
  });
}

/* =========================
   Admin: Edit book name from list
   ========================= */
async function adminEditBookName(bookId) {
  try {
    // Get current book
    const book = books.find((b) => b.id === bookId);
    const currentTitle = book ? book.title : `Book ${bookId}`;

    const newTitle = prompt("Enter new book name:", currentTitle);
    if (!newTitle || !newTitle.trim()) return;

    const cleaned = newTitle.trim();

    // 1) Update `books` collection (master titles)
    const bookDocRef = db.collection("books").doc(String(bookId));
    await bookDocRef.set({ title: cleaned }, { merge: true });

    // 2) Update local array
    if (book) book.title = cleaned;

    // 3) Update all reservations with this bookId
    const resSnap = await db.collection("reservations").where("bookId", "==", bookId).get();
    if (!resSnap.empty) {
      const batch = db.batch();
      resSnap.forEach((doc) => {
        batch.update(doc.ref, { title: cleaned });
      });
      await batch.commit();
    }

    // 4) Update UI cards (New Arrivals section)
    const card = document.querySelector(`#book-list .book-card[data-id="${bookId}"]`);
    if (card) {
      const titleEl = card.querySelector("h3");
      if (titleEl) titleEl.textContent = cleaned;
    }

    // 5) Refresh admin book list & reservations table
    await showBookAdminList();
    await showReservations();

    alert("Book name updated successfully!");
  } catch (err) {
    console.error("adminEditBookName error", err);
    alert("Failed to update book name. See console for details.");
  }
}

/* =========================
   Admin: Edit book image (URL)
   ========================= */
async function adminEditBookImage(bookId) {
  try {
    const book = books.find((b) => b.id === bookId);
    const currentImage = book ? book.image : "";

    const newUrl = prompt(
      "Enter image URL for this book.\n(Use a direct link from GitHub raw, Firebase Storage, or any image hosting):",
      currentImage
    );

    if (!newUrl || !newUrl.trim()) return;
    const cleaned = newUrl.trim();

    // 1) Update `books` collection with new imageUrl
    const bookDocRef = db.collection("books").doc(String(bookId));
    await bookDocRef.set({ imageUrl: cleaned }, { merge: true });

    // 2) Update local array
    if (book) book.image = cleaned;

    // 3) Update UI card in New Arrivals
    const card = document.querySelector(`#book-list .book-card[data-id="${bookId}"]`);
    if (card) {
      const imgEl = card.querySelector("img");
      if (imgEl) imgEl.src = cleaned;
    }

    // 4) Refresh admin book list (optional)
    await showBookAdminList();

    alert("Book image updated successfully!");
  } catch (err) {
    console.error("adminEditBookImage error", err);
    alert("Failed to update book image. See console for details.");
  }
}

/* =========================
   Notices: Load for public view
   Collection: "notices"
   Fields: text (string), createdAt (Timestamp/Date)
   ========================= */
async function loadNotices() {
  const list = document.getElementById("notice-list");
  if (!list) return;

  list.innerHTML = ""; // clear existing items

  try {
    const snapshot = await db.collection("notices").orderBy("createdAt", "desc").get();
    if (snapshot.empty) {
      list.innerHTML = "<li>No notices yet</li>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = data.text || "";
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading notices:", err);
    list.innerHTML = "<li>Failed to load notices</li>";
  }
}

/* =========================
   Admin: Add notice
   ========================= */
async function addNotice() {
  const textarea = document.getElementById("notice-input");
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) {
    alert("Please enter a notice.");
    return;
  }

  try {
    await db.collection("notices").add({
      text,
      createdAt: new Date(),
    });

    textarea.value = "";
    await loadNotices();
    await showNoticeAdminList();

    alert("Notice added successfully!");
  } catch (err) {
    console.error("addNotice error", err);
    alert("Failed to add notice. See console.");
  }
}

/* =========================
   Admin: Show notices list (for delete)
   ========================= */
async function showNoticeAdminList() {
  const table = document.getElementById("notice-admin-table");
  if (!table) return;

  table.innerHTML = `
    <thead>
      <tr>
        <th style="min-width:80px">ID</th>
        <th>Notice</th>
        <th style="min-width:80px">Action</th>
      </tr>
    </thead>
    <tbody id="notice-admin-body"></tbody>
  `;

  const body = document.getElementById("notice-admin-body");
  if (!body) return;

  try {
    const snapshot = await db.collection("notices").orderBy("createdAt", "desc").get();
    if (snapshot.empty) {
      body.innerHTML = `<tr><td colspan="3" class="empty">No notices</td></tr>`;
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${doc.id}</td>
        <td>${escapeHtml(data.text || "")}</td>
        <td class="res-actions">
          <button class="delete-notice" data-id="${doc.id}">Delete</button>
        </td>
      `;
      body.appendChild(tr);
    });

    body.querySelectorAll("button.delete-notice").forEach((btn) => {
      btn.addEventListener("click", () => deleteNotice(btn.dataset.id));
    });
  } catch (err) {
    console.error("showNoticeAdminList error", err);
  }
}

/* =========================
   Admin: Delete notice
   ========================= */
async function deleteNotice(noticeId) {
  if (!confirm("Delete this notice?")) return;

  try {
    await db.collection("notices").doc(noticeId).delete();
    await loadNotices();
    await showNoticeAdminList();
    alert("Notice deleted.");
  } catch (err) {
    console.error("deleteNotice error", err);
    alert("Failed to delete notice. See console.");
  }
}

/* =========================
   Init
   ========================= */
(async function init() {
  try {
    await renderBooks();
    await loadNotices();
  } catch (e) {
    console.error("init error", e);
  }
})();
