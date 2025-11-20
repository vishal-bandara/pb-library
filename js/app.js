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
  if (nav.style.display === "flex") {
    nav.style.display = "none";
  } else {
    nav.style.display = "flex";
  }
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
   Books data
   ========================= */
const books = [];
for (let i = 1; i <= 20; i++) {
  books.push({
    id: i,
    title: `Book ${i}`,
    image: `../images/book${i}.jpg`.replace("../", "images/"), // keep it simple
  });
}

/* =========================
   Render books
   ========================= */
const bookList = document.getElementById("book-list");

async function renderBooks() {
  if (!bookList) return;

  bookList.innerHTML = "";

  // Fetch all reservations first
  const reservedSnapshot = await db.collection("reservations").get();
  const reservedMap = {};
  reservedSnapshot.forEach((d) => {
    const data = d.data();
    if (data && data.bookId) {
      reservedMap[Number(data.bookId)] = true;
    }
  });

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "book-card";
    card.setAttribute("data-id", book.id);

    card.innerHTML = `
      <img src="${book.image}" alt="${escapeHtml(book.title)}" 
           onerror="this.src='https://via.placeholder.com/200x260?text=No+Image'">
      <h3>${escapeHtml(book.title)}</h3>
      <button id="btn-${book.id}">${reservedMap[book.id] ? "Already Reserved" : "Reserve"}</button>
    `;
    bookList.appendChild(card);

    const btn = card.querySelector("button");
    if (reservedMap[book.id]) {
      btn.disabled = true;
    }

    btn.addEventListener("click", async () => {
      const staffId = prompt("Enter your Staff ID:");
      if (!staffId) return;

      const phone = prompt("Enter your Phone Number:");
      if (!phone) return;

      // Double-check in Firestore
      const q = await db
        .collection("reservations")
        .where("bookId", "==", book.id)
        .get();

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

      // Refresh admin if open
      const panel = document.getElementById("admin-panel");
      if (panel && panel.style.display === "block") {
        showReservations();
      }
    });
  });
}

/* Helper: escape HTML text */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
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
    if (panel) {
      panel.style.display = "block";
    }
    showReservations();

    const adminCard = document.getElementById("admin-card");
    if (adminCard) {
      adminCard.scrollIntoView({ behavior: "smooth" });
    }
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

  body.innerHTML = "";

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
        } catch (e) {
          dateText = "";
        }
      }
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(data.title || `Book ${data.bookId || ""}`)}</td>
      <td>${escapeHtml(data.staffId || "")}</td>
      <td>${escapeHtml(data.phone || "")}</td>
      <td>${escapeHtml(dateText)}</td>
      <td class="res-actions">
        <button class="edit" data-doc="${doc.id}" data-book="${data.bookId}">Edit</button>
        <button class="reset" data-doc="${doc.id}" data-book="${data.bookId}">Reset</button>
      </td>
    `;
    body.appendChild(tr);
  });

  // Buttons
  body.querySelectorAll("button.edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      editBookTitle(btn.dataset.doc, Number(btn.dataset.book));
    });
  });

  body.querySelectorAll("button.reset").forEach((btn) => {
    btn.addEventListener("click", () => {
      resetReservation(btn.dataset.doc, Number(btn.dataset.book));
    });
  });
}

/* =========================
   Edit book title (Admin)
   ========================= */
async function editBookTitle(docId, bookId) {
  try {
    const docRef = db.collection("reservations").doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      alert("Reservation not found");
      return;
    }

    const data = docSnap.data();
    const currentTitle = data.title || `Book ${bookId}`;
    const newTitle = prompt("Enter new book name:", currentTitle);
    if (!newTitle || !newTitle.trim()) return;

    const cleaned = newTitle.trim();

    // Update reservation
    await docRef.update({ title: cleaned });

    // Update local book title
    const book = books.find((b) => b.id === bookId);
    if (book) {
      book.title = cleaned;
    }

    // Update book card on the page
    const card = document.querySelector(
      `#book-list .book-card[data-id="${bookId}"]`
    );
    if (card) {
      const titleEl = card.querySelector("h3");
      if (titleEl) titleEl.textContent = cleaned;
    }

    // Refresh reservation table
    await showReservations();
    alert("Book name updated successfully!");
  } catch (err) {
    console.error("editBookTitle error", err);
    alert("Failed to update book name. See console for details.");
  }
}

/* =========================
   Reset reservation (Admin)
   ========================= */
async function resetReservation(docId, bookId) {
  if (!confirm("Reset this book to available?")) return;

  try {
    await db.collection("reservations").doc(docId).delete();

    // Update book button on main page
    const card = document.querySelector(
      `#book-list .book-card[data-id="${bookId}"]`
    );
    if (card) {
      const btn = card.querySelector("button");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Reserve";
      }
    }

    await showReservations();
    alert("Book is now available!");
  } catch (err) {
    console.error("resetReservation error", err);
    alert("Failed to reset. See console.");
  }
}

/* =========================
   Init
   ========================= */
(async function init() {
  try {
    await renderBooks();
  } catch (e) {
    console.error("init error", e);
  }
})();
