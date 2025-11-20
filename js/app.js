// Firebase config (compat version)
const firebaseConfig = {
  apiKey: "AIzaSyC8_9CMdG2MyS-P9XGYRtd1K_9kNaEQSyc",
  authDomain: "pb-library-1501a.firebaseapp.com",
  projectId: "pb-library-1501a",
  storageBucket: "pb-library-1501a.appspot.com",
  messagingSenderId: "351111194912",
  appId: "1:351111194912:web:a24d7385a22ac51e220f45"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------------- Books array ----------------
const books = [];
for (let i = 1; i <= 20; i++) {
  books.push({ id: i, title: "Book " + i, image: "images/book" + i + ".jpg" });
}

// ---------------- Display books and check reservation ----------------
const bookList = document.getElementById("book-list");

books.forEach(async (book) => {
  const div = document.createElement("div");
  div.innerHTML = `
    <img src="${book.image}" width="100">
    <h3>${book.title}</h3>
    <button id="btn-${book.id}">Reserve</button>
  `;
  bookList.appendChild(div);

  const btn = document.getElementById("btn-" + book.id);

  // Check if the book is already reserved in Firestore
  const snapshot = await db
    .collection("reservations")
    .where("bookId", "==", book.id)
    .get();

  if (!snapshot.empty) {
    btn.disabled = true;
    btn.textContent = "Already Reserved";
  }

  btn.addEventListener("click", async () => {
    const staffId = prompt("Enter your Staff ID:");
    if (!staffId) return;
    const phone = prompt("Enter your Phone Number:");
    if (!phone) return;

    // Double-check Firestore before adding
    const check = await db
      .collection("reservations")
      .where("bookId", "==", book.id)
      .get();

    if (!check.empty) {
      alert("This book is already reserved!");
      btn.disabled = true;
      btn.textContent = "Already Reserved";
      return;
    }

    await db.collection("reservations").add({
      bookId: book.id,
      title: book.title, // this will be updated if admin changes name later
      staffId,
      phone,
      reservedAt: new Date()
    });

    alert("Book reserved successfully!");
    btn.disabled = true;
    btn.textContent = "Already Reserved";
  });
});

// ---------------- Admin Login ----------------
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

function adminLogin() {
  const username = prompt("Enter admin username:");
  const password = prompt("Enter admin password:");
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const panel = document.getElementById("admin-panel");
    panel.style.display = "block";
    showReservations();
  } else {
    alert("Wrong credentials!");
  }
}

// ---------------- Show reservations and allow admin to edit/reset ----------------
async function showReservations() {
  const table = document.getElementById("reservation-table");
  table.innerHTML = `
    <tr>
      <th>Book</th>
      <th>Staff ID</th>
      <th>Phone</th>
      <th>Date</th>
      <th>Action</th>
    </tr>
  `;

  const snapshot = await db.collection("reservations").get();
  snapshot.forEach((doc) => {
    const data = doc.data();

    // FIX: define dateText safely
    const dateText = data.reservedAt && data.reservedAt.toDate
      ? data.reservedAt.toDate().toLocaleString()
      : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data.title}</td>
      <td>${data.staffId}</td>
      <td>${data.phone}</td>
      <td>${dateText}</td>
      <td>
        <button onclick="editBookTitle('${doc.id}', ${data.bookId})">Edit</button>
        <button onclick="resetReservation('${doc.id}', ${data.bookId})">Reset</button>
      </td>
    `;
    table.appendChild(tr);
  });
}

// ---------------- Admin edit book title ----------------
async function editBookTitle(docId, bookId) {
  const docRef = db.collection("reservations").doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    alert("Reservation not found!");
    return;
  }

  const data = docSnap.data();
  const currentTitle = data.title || "Book " + bookId;

  const newTitle = prompt("Enter new book name:", currentTitle);
  if (!newTitle || newTitle.trim() === "") {
    return;
  }

  const cleanedTitle = newTitle.trim();

  // 1) Update Firestore document (reservation)
  await docRef.update({
    title: cleanedTitle
  });

  // 2) Update local books array
  const bookObj = books.find((b) => b.id === bookId);
  if (bookObj) {
    bookObj.title = cleanedTitle;
  }

  // 3) Update main page display (book card)
  const bookCards = document.querySelectorAll("#book-list div");
  bookCards.forEach((card) => {
    const btn = card.querySelector("button");
    if (!btn) return;

    const idStr = btn.id.replace("btn-", ""); // "btn-3" -> "3"
    const idNum = parseInt(idStr, 10);
    if (idNum === bookId) {
      const titleElement = card.querySelector("h3");
      if (titleElement) {
        titleElement.textContent = cleanedTitle;
      }
    }
  });

  // 4) Refresh admin table
  await showReservations();

  alert("Book name updated successfully!");
}

// ---------------- Admin reset function ----------------
async function resetReservation(docId, bookId) {
  if (confirm("Reset this book to available?")) {
    await db.collection("reservations").doc(docId).delete();
    alert("Book is now available!");

    // Update button on page
    const btn = document.getElementById("btn-" + bookId);
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Reserve";
    }

    showReservations(); // Refresh table
  }
}
