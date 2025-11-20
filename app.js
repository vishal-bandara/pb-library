// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "xxx",
  appId: "xxx"
};
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Books array (from images folder)
const books = [];
for(let i=1;i<=20;i++){
  books.push({id:i, title:"Book "+i, image:"images/book"+i+".jpg"});
}

// Display books
const bookList = document.getElementById("book-list");
books.forEach(book=>{
  const div = document.createElement("div");
  div.innerHTML = `<img src="${book.image}" width="100"><h3>${book.title}</h3><button id="btn-${book.id}">Reserve</button>`;
  bookList.appendChild(div);

  document.getElementById("btn-"+book.id).addEventListener("click", ()=>{
    if(localStorage.getItem("reserved_book_"+book.id) === "true"){
      alert("This book is already reserved");
      return;
    }
    const staffId = prompt("Enter your Staff ID:");
    if(!staffId) return;
    const phone = prompt("Enter your Phone Number:");
    if(!phone) return;

    db.collection("reservations").add({
      bookId: book.id,
      title: book.title,
      staffId,
      phone,
      reservedAt: new Date()
    })
    .then(()=>{
      alert("Book reserved successfully!");
      localStorage.setItem("reserved_book_"+book.id,"true");
      document.getElementById("btn-"+book.id).disabled = true;
      document.getElementById("btn-"+book.id).textContent="Already Reserved";
    })
    .catch(err=>console.error(err));
  });
});

// Admin Login
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";
function adminLogin(){
  const username = prompt("Enter admin username:");
  const password = prompt("Enter admin password:");
  if(username===ADMIN_USER && password===ADMIN_PASS){
    document.getElementById("admin-panel").style.display="block";
    showReservations();
  }else{ alert("Wrong credentials!"); }
}

function showReservations(){
  const table = document.getElementById("reservation-table");
  db.collection("reservations").get().then(snapshot=>{
    snapshot.forEach(doc=>{
      const data = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${data.title}</td><td>${data.staffId}</td><td>${data.phone}</td><td>${data.reservedAt.toDate().toLocaleString()}</td>`;
      table.appendChild(tr);
    });
  });
}

