document.addEventListener("DOMContentLoaded", () => {
  // Footer year
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyC8_9CMdG2MyS-P9XGYRtd1K_9kNaEQSyc",
    authDomain: "pb-library-1501a.firebaseapp.com",
    projectId: "pb-library-1501a",
    storageBucket: "pb-library-1501a.appspot.com",
    messagingSenderId: "351111194912",
    appId: "1:351111194912:web:a24d7385a22ac51e220f45",
  };

  try { firebase.initializeApp(firebaseConfig); } catch(e){}
  const db = firebase.firestore();

  const books = [];
  for (let i=1; i<=20; i++){
    books.push({id:i, title:`Book ${i}`, image:`images/book${i}.jpg`});
  }

  const bookList = document.getElementById("book-list");

  async function renderBooks(){
    if(!bookList) return;

    const reservedSnapshot = await db.collection("reservations").get();
    const reservedMap = {};
    reservedSnapshot.forEach((d)=>{ const data=d.data(); if(data?.bookId) reservedMap[data.bookId]=true; });

    books.forEach((book)=>{
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
      if(reservedMap[book.id]) btn.disabled=true;

      btn.addEventListener("click", async ()=>{
        const staffId = prompt("Enter your Staff ID:");
        if(!staffId) return;
        const phone = prompt("Enter your Phone Number:");
        if(!phone) return;

        const q = await db.collection("reservations").where("bookId","==",book.id).get();
        if(!q.empty){ alert("This book is already reserved!"); btn.disabled=true; btn.textContent="Already Reserved"; return; }

        await db.collection("reservations").add({
          bookId: book.id, title: book.title, staffId, phone, reservedAt: new Date()
        });

        alert("Book reserved successfully!");
        btn.disabled=true; btn.textContent="Already Reserved";
        if(document.getElementById("admin-panel")?.style.display==="block") showReservations();
      });
    });
  }

  function escapeHtml(str){ return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  window.toggleMenu = function(){
    const nav = document.getElementById("main-nav");
    if(!nav) return;
    nav.style.display = nav.style.display==="flex" ? "none" : "flex";
  };

  window.toggleAcc = function(head){
    const body = head.nextElementSibling;
    if(!body) return;
    const visible = body.style.display==="block";
    document.querySelectorAll(".acc-body").forEach(b=>{ if(b!==body) b.style.display="none"; });
    body.style.display = visible ? "none" : "block";
  };

  const ADMIN_USER="admin", ADMIN_PASS="1234";
  window.adminLogin=function(){
    const username=prompt("Enter admin username:");
    const password=prompt("Enter admin password:");
    if(username===ADMIN_USER && password===ADMIN_PASS){
      document.getElementById("admin-panel").style.display="block";
      showReservations();
      document.getElementById("admin-card")?.scrollIntoView({behavior:"smooth"});
    } else alert("Wrong credentials!");
  };

  async function showReservations(){
    const table=document.getElementById("reservation-table");
    if(!table) return;

    table.innerHTML=`<thead>
      <tr><th style="min-width:140px">Book</th><th>Staff ID</th><th>Phone</th><th style="min-width:140px">Date</th><th>Action</th></tr>
    </thead><tbody id="res-body"></tbody>`;

    const body=document.getElementById("res-body");
    if(!body) return;
    body.innerHTML="";

    const snapshot = await db.collection("reservations").get();
    if(snapshot.empty){ body.innerHTML=`<tr><td colspan="5" class="empty">No reservations yet</td></tr>`; return; }

    snapshot.forEach((doc)=>{
      const data=doc.data();
      let dateText = data.reservedAt?.toDate ? data.reservedAt.toDate().toLocaleString() : new Date(data.reservedAt).toLocaleString();
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td>${escapeHtml(data.title||`Book ${data.bookId||""}`)}</td>
        <td>${escapeHtml(data.staffId||"")}</td>
        <td>${escapeHtml(data.phone||"")}</td>
        <td>${escapeHtml(dateText)}</td>
        <td class="res-actions">
          <button class="edit" data-doc="${doc.id}" data-book="${data.bookId}">Edit</button>
          <button class="reset" data-doc="${doc.id}" data-book="${data.bookId}">Reset</button>
        </td>
      `;
      body.appendChild(tr);
    });

    body.querySelectorAll("button.edit").forEach(btn=>btn.addEventListener("click",()=>editBookTitle(btn.dataset.doc,Number(btn.dataset.book))));
    body.querySelectorAll("button.reset").forEach(btn=>btn.addEventListener("click",()=>resetReservation(btn.dataset.doc,Number(btn.dataset.book))));
  }

  async function editBookTitle(docId, bookId){
    try{
      const docRef = db.collection("reservations").doc(docId);
      const docSnap = await docRef.get();
      if(!docSnap.exists){ alert("Reservation not found"); return; }
      const data = docSnap.data();
      const newTitle = prompt("Enter new book name:", data.title||`Book ${bookId}`);
      if(!newTitle?.trim()) return;
      await docRef.update({title:newTitle.trim()});
      const book = books.find(b=>b.id===bookId);
      if(book) book.title=newTitle.trim();
      const card = document.querySelector(`#book-list .book-card[data-id="${bookId}"] h3`);
      if(card) card.textContent = newTitle.trim();
      showReservations();
      alert("Book name updated successfully!");
    }catch(e){ console.error(e); alert("Failed to update book name."); }
  }

  async function resetReservation(docId, bookId){
    if(!confirm("Reset this book to available?")) return;
    try{
      await db.collection("reservations").doc(docId).delete();
      const btn = document.querySelector(`#book-list .book-card[data-id="${bookId}"] button`);
      if(btn){ btn.disabled=false; btn.textContent="Reserve"; }
      showReservations();
      alert("Book is now available!");
    }catch(e){ console.error(e); alert("Failed to reset reservation."); }
  }

  renderBooks();
});
